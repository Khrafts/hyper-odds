import { 
  MarketInitialized,
  SharesPurchased, 
  SharesSold,
  Resolved, 
  Claimed,
  CPMMMarketImplementation
} from "../generated/templates/CPMMMarket/CPMMMarketImplementation"

import { 
  Market, 
  User, 
  Position, 
  SharesPurchased as SharesPurchasedEntity,
  SharesSold as SharesSoldEntity,
  Claim,
  Resolution,
  MarketInitialized as MarketInitializedEntity,
  Protocol
} from "../generated/schema"

import { BigInt, BigDecimal, Address } from "@graphprotocol/graph-ts"

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
    
    // Update protocol stats
    let protocol = Protocol.load("1")
    if (protocol != null) {
      protocol.totalUsers = protocol.totalUsers.plus(BigInt.fromI32(1))
      protocol.save()
    }
  } else {
    user.lastActiveAt = timestamp
    user.lastActiveAtBlock = block
    user.save()
  }
  return user
}

// Helper to get or create position
function getOrCreatePosition(marketId: string, userId: string, timestamp: BigInt): Position {
  let positionId = marketId + "-" + userId
  let position = Position.load(positionId)
  if (position == null) {
    position = new Position(positionId)
    position.market = marketId
    position.user = userId
    
    // Initialize parimutuel fields
    position.stakeNo = BigDecimal.fromString("0")
    position.stakeYes = BigDecimal.fromString("0")
    position.totalStake = BigDecimal.fromString("0")
    position.effectiveStakeNo = BigDecimal.fromString("0")
    position.effectiveStakeYes = BigDecimal.fromString("0")
    position.totalEffectiveStake = BigDecimal.fromString("0")
    
    // Initialize CPMM fields
    position.sharesNo = BigDecimal.fromString("0")
    position.sharesYes = BigDecimal.fromString("0")
    position.totalShares = BigDecimal.fromString("0")
    position.totalSpent = BigDecimal.fromString("0")
    
    // Initialize outcome fields
    position.claimed = false
    position.payout = BigDecimal.fromString("0")
    position.profit = BigDecimal.fromString("0")
    
    position.createdAt = timestamp
    position.updatedAt = timestamp
    position.save()
  }
  return position
}

export function handleMarketInitialized(event: MarketInitialized): void {
  // Load market
  let market = Market.load(event.address.toHexString())
  if (market == null) {
    return
  }
  
  // Update market with initial liquidity info (convert from USDC 6-decimal format)
  let liquidityRaw = BigDecimal.fromString(event.params.liquidityAmount.toString())
  let liquidityDecimal = liquidityRaw.div(BigDecimal.fromString("1000000")) // Convert from 6 decimals to human readable
  market.initialLiquidity = liquidityDecimal
  market.reserveYes = liquidityDecimal.div(BigDecimal.fromString("2"))
  market.reserveNo = liquidityDecimal.div(BigDecimal.fromString("2"))
  market.spotPrice = BigDecimal.fromString("0.5") // 50% initial price
  market.save()
  
  // Create MarketInitialized event entity
  let marketInitEvent = new MarketInitializedEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  )
  marketInitEvent.market = market.id
  marketInitEvent.creator = market.creator
  marketInitEvent.initialLiquidity = liquidityDecimal
  marketInitEvent.cutoffTime = event.params.cutoffTime
  marketInitEvent.resolveTime = event.params.resolveTime
  marketInitEvent.timestamp = event.block.timestamp
  marketInitEvent.blockNumber = event.block.number
  marketInitEvent.transactionHash = event.transaction.hash
  marketInitEvent.logIndex = event.logIndex
  marketInitEvent.save()
}

export function handleSharesPurchased(event: SharesPurchased): void {
  // Load market
  let market = Market.load(event.address.toHexString())
  if (market == null) {
    return
  }
  
  // Get or create user
  let user = getOrCreateUser(
    event.params.buyer.toHexString(),
    event.block.timestamp,
    event.block.number
  )
  
  // Get or create position
  let position = getOrCreatePosition(
    market.id,
    user.id,
    event.block.timestamp
  )
  
  // Update position with new shares (convert from USDC 6-decimal format)
  let sharesOut = BigDecimal.fromString(event.params.sharesOut.toString()).div(BigDecimal.fromString("1000000"))
  let amountIn = BigDecimal.fromString(event.params.amountIn.toString()).div(BigDecimal.fromString("1000000"))
  
  if (event.params.outcome == 1) {
    position.sharesYes = position.sharesYes.plus(sharesOut)
  } else {
    position.sharesNo = position.sharesNo.plus(sharesOut)
  }
  position.totalShares = position.sharesYes.plus(position.sharesNo)
  position.totalSpent = position.totalSpent.plus(amountIn)
  position.updatedAt = event.block.timestamp
  position.save()
  
  // Update market reserves and price from contract (convert from USDC 6-decimal format)
  let contract = CPMMMarketImplementation.bind(event.address)
  let reserveYes = contract.try_reserveYES()
  let reserveNo = contract.try_reserveNO()
  let totalFees = contract.try_totalFeesCollected()
  
  if (!reserveYes.reverted && !reserveNo.reverted) {
    // Convert reserves from 6-decimal USDC format to human readable
    market.reserveYes = BigDecimal.fromString(reserveYes.value.toString()).div(BigDecimal.fromString("1000000"))
    market.reserveNo = BigDecimal.fromString(reserveNo.value.toString()).div(BigDecimal.fromString("1000000"))
    
    // Calculate spot price: reserveYes / (reserveYes + reserveNo)
    let totalReserves = market.reserveYes.plus(market.reserveNo)
    if (totalReserves.gt(BigDecimal.fromString("0"))) {
      market.spotPrice = market.reserveYes.div(totalReserves)
    }
  }
  
  if (!totalFees.reverted) {
    // Convert fees from 6-decimal USDC format to human readable
    market.totalFeesCollected = BigDecimal.fromString(totalFees.value.toString()).div(BigDecimal.fromString("1000000"))
  }
  
  market.save()
  
  // Create SharesPurchased event entity
  let purchaseEvent = new SharesPurchasedEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  )
  purchaseEvent.market = market.id
  purchaseEvent.user = user.id
  purchaseEvent.outcome = event.params.outcome
  purchaseEvent.amountIn = amountIn
  purchaseEvent.sharesOut = sharesOut
  purchaseEvent.feeAmount = BigDecimal.fromString(event.params.feeAmount.toString()).div(BigDecimal.fromString("1000000"))
  purchaseEvent.spotPrice = BigDecimal.fromString(event.params.newPrice.toString()).div(BigDecimal.fromString("1000000"))
  purchaseEvent.timestamp = event.block.timestamp
  purchaseEvent.blockNumber = event.block.number
  purchaseEvent.transactionHash = event.transaction.hash
  purchaseEvent.logIndex = event.logIndex
  purchaseEvent.save()
  
  // Update user stats
  user.totalDeposited = user.totalDeposited.plus(amountIn)
  user.save()
  
  // Update protocol stats
  let protocol = Protocol.load("1")
  if (protocol != null) {
    protocol.totalVolume = protocol.totalVolume.plus(amountIn)
    protocol.totalDeposits = protocol.totalDeposits.plus(BigInt.fromI32(1))
    protocol.save()
  }
}

export function handleSharesSold(event: SharesSold): void {
  // Load market
  let market = Market.load(event.address.toHexString())
  if (market == null) {
    return
  }
  
  // Get user
  let user = User.load(event.params.seller.toHexString())
  if (user == null) {
    return
  }
  
  // Get position
  let position = Position.load(market.id + "-" + user.id)
  if (position == null) {
    return
  }
  
  // Update position with sold shares (convert from USDC 6-decimal format)
  let sharesIn = BigDecimal.fromString(event.params.sharesIn.toString()).div(BigDecimal.fromString("1000000"))
  let amountOut = BigDecimal.fromString(event.params.amountOut.toString()).div(BigDecimal.fromString("1000000"))
  
  if (event.params.outcome == 1) {
    position.sharesYes = position.sharesYes.minus(sharesIn)
  } else {
    position.sharesNo = position.sharesNo.minus(sharesIn)
  }
  position.totalShares = position.sharesYes.plus(position.sharesNo)
  position.updatedAt = event.block.timestamp
  position.save()
  
  // Update market reserves and price (convert from USDC 6-decimal format)
  let contract = CPMMMarketImplementation.bind(event.address)
  let reserveYes = contract.try_reserveYES()
  let reserveNo = contract.try_reserveNO()
  let totalFees = contract.try_totalFeesCollected()
  
  if (!reserveYes.reverted && !reserveNo.reverted) {
    // Convert reserves from 6-decimal USDC format to human readable
    market.reserveYes = BigDecimal.fromString(reserveYes.value.toString()).div(BigDecimal.fromString("1000000"))
    market.reserveNo = BigDecimal.fromString(reserveNo.value.toString()).div(BigDecimal.fromString("1000000"))
    
    // Calculate spot price
    let totalReserves = market.reserveYes.plus(market.reserveNo)
    if (totalReserves.gt(BigDecimal.fromString("0"))) {
      market.spotPrice = market.reserveYes.div(totalReserves)
    }
  }
  
  if (!totalFees.reverted) {
    // Convert fees from 6-decimal USDC format to human readable
    market.totalFeesCollected = BigDecimal.fromString(totalFees.value.toString()).div(BigDecimal.fromString("1000000"))
  }
  
  market.save()
  
  // Create SharesSold event entity
  let sellEvent = new SharesSoldEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  )
  sellEvent.market = market.id
  sellEvent.user = user.id
  sellEvent.outcome = event.params.outcome
  sellEvent.sharesIn = sharesIn
  sellEvent.amountOut = amountOut
  sellEvent.feeAmount = BigDecimal.fromString(event.params.feeAmount.toString()).div(BigDecimal.fromString("1000000"))
  sellEvent.spotPrice = BigDecimal.fromString(event.params.newPrice.toString()).div(BigDecimal.fromString("1000000"))
  sellEvent.timestamp = event.block.timestamp
  sellEvent.blockNumber = event.block.number
  sellEvent.transactionHash = event.transaction.hash
  sellEvent.logIndex = event.logIndex
  sellEvent.save()
  
  // Update user stats
  user.totalClaimed = user.totalClaimed.plus(amountOut)
  user.save()
  
  // Update protocol stats
  let protocol = Protocol.load("1")
  if (protocol != null) {
    protocol.totalVolume = protocol.totalVolume.plus(amountOut)
    protocol.save()
  }
}

export function handleResolved(event: Resolved): void {
  // Load market
  let market = Market.load(event.address.toHexString())
  if (market == null) {
    return
  }
  
  // Update market resolution
  market.resolved = true
  market.winningOutcome = event.params.winningOutcome
  market.resolutionDataHash = event.params.dataHash
  market.resolvedAt = event.block.timestamp
  market.resolvedAtBlock = event.block.number
  market.resolvedAtTx = event.transaction.hash
  market.save()
  
  // Create Resolution event entity
  let resolution = new Resolution(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  )
  resolution.market = market.id
  resolution.outcome = event.params.winningOutcome
  resolution.dataHash = event.params.dataHash
  resolution.timestamp = event.block.timestamp
  resolution.blockNumber = event.block.number
  resolution.transactionHash = event.transaction.hash
  resolution.logIndex = event.logIndex
  resolution.save()
  
  // Update protocol stats
  let protocol = Protocol.load("1")
  if (protocol != null) {
    protocol.activeMarkets = protocol.activeMarkets.minus(BigInt.fromI32(1))
    protocol.resolvedMarkets = protocol.resolvedMarkets.plus(BigInt.fromI32(1))
    protocol.save()
  }
}

export function handleClaimed(event: Claimed): void {
  // Load market
  let market = Market.load(event.address.toHexString())
  if (market == null) {
    return
  }
  
  // Get user
  let user = User.load(event.params.user.toHexString())
  if (user == null) {
    return
  }
  
  // Get position
  let position = Position.load(market.id + "-" + user.id)
  if (position == null) {
    return
  }
  
  // Update position with claim (convert from USDC 6-decimal format)
  let payout = BigDecimal.fromString(event.params.payout.toString()).div(BigDecimal.fromString("1000000"))
  position.claimed = true
  position.payout = payout
  position.profit = payout.minus(position.totalSpent)
  position.claimedAt = event.block.timestamp
  position.save()
  
  // Create Claim event entity
  let claim = new Claim(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  )
  claim.market = market.id
  claim.user = user.id
  claim.payout = payout
  claim.timestamp = event.block.timestamp
  claim.blockNumber = event.block.number
  claim.transactionHash = event.transaction.hash
  claim.logIndex = event.logIndex
  claim.save()
  
  // Update user stats
  user.totalClaimed = user.totalClaimed.plus(payout)
  user.totalProfit = user.totalProfit.plus(position.profit)
  user.save()
  
  // Update protocol stats
  let protocol = Protocol.load("1")
  if (protocol != null) {
    protocol.totalClaims = protocol.totalClaims.plus(BigInt.fromI32(1))
    protocol.save()
  }
}