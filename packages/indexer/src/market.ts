import { 
  Deposited,
  Resolved,
  Claimed,
  ParimutuelMarketImplementation
} from "../generated/templates/ParimutuelMarket/ParimutuelMarketImplementation"
import { 
  Market,
  User,
  Position,
  Deposit,
  Claim,
  Resolution,
  Protocol,
  MarketPriceSnapshot
} from "../generated/schema"
import { BigInt, BigDecimal } from "@graphprotocol/graph-ts"

// Helper to get or create protocol
function getProtocol(): Protocol {
  let protocol = Protocol.load("1")
  if (protocol == null) {
    protocol = new Protocol("1")
    protocol.totalMarkets = BigInt.fromI32(0)
    protocol.activeMarkets = BigInt.fromI32(0)
    protocol.resolvedMarkets = BigInt.fromI32(0)
    protocol.cancelledMarkets = BigInt.fromI32(0)
    protocol.totalVolume = BigDecimal.fromString("0")
    protocol.totalFees = BigDecimal.fromString("0")
    protocol.totalUsers = BigInt.fromI32(0)
    protocol.totalDeposits = BigInt.fromI32(0)
    protocol.totalClaims = BigInt.fromI32(0)
    protocol.save()
  }
  return protocol
}

// Helper to get or create user
function getOrCreateUser(address: string, timestamp: BigInt, block: BigInt): User {
  let user = User.load(address)
  if (user == null) {
    user = new User(address)
    user.totalDeposited = BigDecimal.fromString("0")
    user.totalClaimed = BigDecimal.fromString("0")
    user.totalProfit = BigDecimal.fromString("0")
    user.marketsCreated = BigInt.fromI32(0)
    user.marketsParticipated = BigInt.fromI32(0)
    user.firstSeenAt = timestamp
    user.firstSeenAtBlock = block
    user.lastActiveAt = timestamp
    user.lastActiveAtBlock = block
    user.save()
    
    // Update protocol
    let protocol = getProtocol()
    protocol.totalUsers = protocol.totalUsers.plus(BigInt.fromI32(1))
    protocol.save()
  }
  return user
}

// Helper to get or create position
function getOrCreatePosition(
  marketId: string,
  userId: string,
  timestamp: BigInt
): Position {
  let positionId = marketId + "-" + userId
  let position = Position.load(positionId)
  
  if (position == null) {
    position = new Position(positionId)
    position.market = marketId
    position.user = userId
    position.stakeNo = BigDecimal.fromString("0")
    position.stakeYes = BigDecimal.fromString("0")
    position.totalStake = BigDecimal.fromString("0")
    position.effectiveStakeNo = BigDecimal.fromString("0")
    position.effectiveStakeYes = BigDecimal.fromString("0")
    position.totalEffectiveStake = BigDecimal.fromString("0")
    position.claimed = false
    position.payout = BigDecimal.fromString("0")
    position.profit = BigDecimal.fromString("0")
    position.createdAt = timestamp
    position.updatedAt = timestamp
    
    // Update user's markets participated
    let user = User.load(userId)
    if (user != null) {
      user.marketsParticipated = user.marketsParticipated.plus(BigInt.fromI32(1))
      user.save()
    }
  }
  
  return position
}

export function handleDeposited(event: Deposited): void {
  let marketId = event.address.toHexString()
  let market = Market.load(marketId)
  if (market == null) return
  
  // Get or create user
  let user = getOrCreateUser(
    event.params.user.toHexString(),
    event.block.timestamp,
    event.block.number
  )
  
  // Get or create position
  let position = getOrCreatePosition(
    marketId,
    user.id,
    event.block.timestamp
  )
  
  // Get time multiplier from contract
  let marketContract = ParimutuelMarketImplementation.bind(event.address)
  let timeMultiplierResult = marketContract.try_getTimeMultiplier()
  let timeMultiplier = timeMultiplierResult.reverted ? 
    BigInt.fromI32(10000) : timeMultiplierResult.value
  let timeMultiplierDecimal = toBigDecimal(timeMultiplier, 4) // 10000 = 1.0x
  
  // Calculate amounts
  let amount = toBigDecimal(event.params.amount, 6) // USDC has 6 decimals
  let effectiveAmount = amount.times(timeMultiplierDecimal)
  
  // Update position stakes
  if (event.params.outcome == 0) {
    position.stakeNo = position.stakeNo.plus(amount)
    position.effectiveStakeNo = position.effectiveStakeNo.plus(effectiveAmount)
    market.poolNo = market.poolNo.plus(amount)
    market.effectivePoolNo = market.effectivePoolNo.plus(effectiveAmount)
  } else {
    position.stakeYes = position.stakeYes.plus(amount)
    position.effectiveStakeYes = position.effectiveStakeYes.plus(effectiveAmount)
    market.poolYes = market.poolYes.plus(amount)
    market.effectivePoolYes = market.effectivePoolYes.plus(effectiveAmount)
  }
  position.totalStake = position.totalStake.plus(amount)
  position.totalEffectiveStake = position.totalEffectiveStake.plus(effectiveAmount)
  position.updatedAt = event.block.timestamp
  position.save()
  
  // Update market pools
  market.totalPool = market.totalPool.plus(amount)
  market.totalEffectivePool = market.totalEffectivePool.plus(effectiveAmount)
  market.save()
  
  // Create deposit entity
  let deposit = new Deposit(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  )
  deposit.market = marketId
  deposit.user = user.id
  deposit.outcome = event.params.outcome
  deposit.amount = amount
  deposit.effectiveAmount = effectiveAmount
  deposit.timeMultiplier = timeMultiplierDecimal
  deposit.timestamp = event.block.timestamp
  deposit.blockNumber = event.block.number
  deposit.transactionHash = event.transaction.hash
  deposit.logIndex = event.logIndex
  deposit.save()
  
  // Update user stats
  user.totalDeposited = user.totalDeposited.plus(amount)
  user.lastActiveAt = event.block.timestamp
  user.lastActiveAtBlock = event.block.number
  user.save()
  
  // Update protocol stats
  let protocol = getProtocol()
  protocol.totalVolume = protocol.totalVolume.plus(amount)
  protocol.totalDeposits = protocol.totalDeposits.plus(BigInt.fromI32(1))
  protocol.save()
  
  // Create price snapshot after deposit
  createMarketPriceSnapshot(
    market,
    event.block.timestamp,
    event.block.number,
    amount
  )
}

export function handleResolved(event: Resolved): void {
  let marketId = event.address.toHexString()
  let market = Market.load(marketId)
  if (market == null) return
  
  // Update market state
  market.resolved = true
  market.winningOutcome = event.params.winningOutcome
  market.resolutionDataHash = event.params.dataHash
  market.resolvedAt = event.block.timestamp
  market.resolvedAtBlock = event.block.number
  market.resolvedAtTx = event.transaction.hash
  
  // Calculate fees (5% of losing pool)
  let losingPool = event.params.winningOutcome == 0 ? market.poolYes : market.poolNo
  let fee = losingPool.times(BigDecimal.fromString("0.05"))
  market.feeCollected = fee
  
  market.save()
  
  // Create resolution entity
  let resolution = new Resolution(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  )
  resolution.market = marketId
  resolution.outcome = event.params.winningOutcome
  resolution.dataHash = event.params.dataHash
  resolution.timestamp = event.block.timestamp
  resolution.blockNumber = event.block.number
  resolution.transactionHash = event.transaction.hash
  resolution.logIndex = event.logIndex
  resolution.save()
  
  // Update protocol stats
  let protocol = getProtocol()
  protocol.activeMarkets = protocol.activeMarkets.minus(BigInt.fromI32(1))
  protocol.resolvedMarkets = protocol.resolvedMarkets.plus(BigInt.fromI32(1))
  protocol.totalFees = protocol.totalFees.plus(fee)
  protocol.save()
}

export function handleClaimed(event: Claimed): void {
  let marketId = event.address.toHexString()
  let market = Market.load(marketId)
  if (market == null) return
  
  let userId = event.params.user.toHexString()
  let user = User.load(userId)
  if (user == null) return
  
  // Update position
  let positionId = marketId + "-" + userId
  let position = Position.load(positionId)
  if (position != null) {
    let payout = toBigDecimal(event.params.payout, 6) // USDC has 6 decimals
    position.claimed = true
    position.payout = payout
    position.profit = payout.minus(position.totalStake)
    position.claimedAt = event.block.timestamp
    position.save()
    
    // Update user stats
    user.totalClaimed = user.totalClaimed.plus(payout)
    user.totalProfit = user.totalProfit.plus(position.profit)
    user.lastActiveAt = event.block.timestamp
    user.lastActiveAtBlock = event.block.number
    user.save()
  }
  
  // Create claim entity
  let claim = new Claim(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  )
  claim.market = marketId
  claim.user = userId
  claim.payout = toBigDecimal(event.params.payout, 6) // USDC has 6 decimals
  claim.timestamp = event.block.timestamp
  claim.blockNumber = event.block.number
  claim.transactionHash = event.transaction.hash
  claim.logIndex = event.logIndex
  claim.save()
  
  // Update protocol stats
  let protocol = getProtocol()
  protocol.totalClaims = protocol.totalClaims.plus(BigInt.fromI32(1))
  protocol.save()
}


// Helper function
// @ts-ignore - AssemblyScript types (i32, u8) are correct for subgraph
function toBigDecimal(value: BigInt, decimals: i32): BigDecimal {
  // @ts-ignore
  let divisor = BigInt.fromI32(10).pow(decimals as u8)
  return value.toBigDecimal().div(divisor.toBigDecimal())
}

// Helper to create market price snapshot
function createMarketPriceSnapshot(
  market: Market,
  timestamp: BigInt,
  blockNumber: BigInt,
  volumeDelta: BigDecimal
): void {
  let snapshotId = market.id + "-" + timestamp.toString()
  let snapshot = new MarketPriceSnapshot(snapshotId)
  
  snapshot.market = market.id
  snapshot.timestamp = timestamp
  snapshot.blockNumber = blockNumber
  
  // Current pool states
  snapshot.poolNo = market.poolNo
  snapshot.poolYes = market.poolYes
  snapshot.totalPool = market.totalPool
  
  // Calculate probabilities based on stake distribution
  // More stake on an outcome = higher probability for that outcome
  let total = market.poolNo.plus(market.poolYes)
  if (total.gt(BigDecimal.fromString("0"))) {
    // YES probability = YES pool / total (more stake = higher probability)
    snapshot.probabilityYes = market.poolYes.div(total)
    snapshot.probabilityNo = market.poolNo.div(total)
  } else {
    snapshot.probabilityYes = BigDecimal.fromString("0.5")
    snapshot.probabilityNo = BigDecimal.fromString("0.5")
  }
  
  // Volume tracking
  snapshot.volumeSinceLastSnapshot = volumeDelta
  
  // Get the previous snapshot to calculate cumulative volume
  let previousSnapshotId = market.id + "-prev"
  let previousSnapshot = MarketPriceSnapshot.load(previousSnapshotId)
  if (previousSnapshot != null) {
    snapshot.cumulativeVolume = previousSnapshot.cumulativeVolume.plus(volumeDelta)
    snapshot.tradeCount = previousSnapshot.tradeCount.plus(BigInt.fromI32(1))
  } else {
    snapshot.cumulativeVolume = volumeDelta
    snapshot.tradeCount = BigInt.fromI32(1)
  }
  
  snapshot.save()
  
  // Save reference to previous snapshot for next time
  let prevSnapshot = new MarketPriceSnapshot(previousSnapshotId)
  prevSnapshot.market = market.id
  prevSnapshot.timestamp = timestamp
  prevSnapshot.blockNumber = blockNumber
  prevSnapshot.poolNo = market.poolNo
  prevSnapshot.poolYes = market.poolYes
  prevSnapshot.totalPool = market.totalPool
  prevSnapshot.probabilityYes = snapshot.probabilityYes
  prevSnapshot.probabilityNo = snapshot.probabilityNo
  prevSnapshot.cumulativeVolume = snapshot.cumulativeVolume
  prevSnapshot.volumeSinceLastSnapshot = BigDecimal.fromString("0")
  prevSnapshot.tradeCount = snapshot.tradeCount
  prevSnapshot.save()
}