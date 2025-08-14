import { MarketCreated, StakeReleased } from "../generated/MarketFactory/MarketFactory"
import { ParimutuelMarket } from "../generated/templates"
import { Market, User, MarketCreated as MarketCreatedEntity, Protocol } from "../generated/schema"
import { BigInt, BigDecimal } from "@graphprotocol/graph-ts"

// Helper to get or create protocol entity
function getOrCreateProtocol(): Protocol {
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
    
    // Update protocol stats
    let protocol = getOrCreateProtocol()
    protocol.totalUsers = protocol.totalUsers.plus(BigInt.fromI32(1))
    protocol.save()
  }
  return user
}

export function handleMarketCreated(event: MarketCreated): void {
  // Create market entity
  let market = new Market(event.params.market.toHexString())
  
  // Get or create creator
  let creator = getOrCreateUser(
    event.params.creator.toHexString(),
    event.block.timestamp,
    event.block.number
  )
  
  // Basic info from event (we only have bytes32 data now)
  market.creator = creator.id
  market.title = "Market " + event.params.market.toHexString().slice(0, 10)
  market.description = "Prediction market"
  
  // Decode subject from bytes32 (placeholder values)
  market.subjectKind = "HL_METRIC"
  market.metricId = event.params.subject
  market.token = null // Token is optional
  market.valueDecimals = 18
  
  // Decode predicate from bytes32 (placeholder values)
  market.predicateOp = "GT"
  market.threshold = BigInt.fromI32(0)
  
  // Decode window from bytes32 (placeholder values)
  market.windowKind = "SNAPSHOT_AT"
  market.windowStart = BigInt.fromI32(0)
  market.windowEnd = event.block.timestamp.plus(BigInt.fromI32(86400)) // 1 day from now
  
  // Oracle (placeholder values)
  market.primarySourceId = event.params.subject
  market.fallbackSourceId = event.params.predicate
  market.roundingDecimals = 2
  
  // Economics (default values)
  market.feeBps = 500 // 5%
  market.creatorFeeShareBps = 2000 // 20% of fees
  market.maxTotalPool = BigDecimal.fromString("1000000")
  
  // Timing
  market.cutoffTime = event.block.timestamp.plus(BigInt.fromI32(3600)) // 1 hour from now
  market.resolveTime = event.block.timestamp.plus(BigInt.fromI32(86400)) // 1 day from now
  
  // State
  market.isProtocolMarket = event.params.isProtocolMarket
  market.resolved = false
  market.cancelled = false
  
  // Pools
  market.poolNo = BigDecimal.fromString("0")
  market.poolYes = BigDecimal.fromString("0")
  market.totalPool = BigDecimal.fromString("0")
  market.feeCollected = BigDecimal.fromString("0")
  
  // Metadata
  market.createdAt = event.block.timestamp
  market.createdAtBlock = event.block.number
  market.createdAtTx = event.transaction.hash
  
  market.save()
  
  // Create MarketCreated event entity
  let marketCreatedEvent = new MarketCreatedEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  )
  marketCreatedEvent.market = market.id
  marketCreatedEvent.creator = creator.id
  marketCreatedEvent.timestamp = event.block.timestamp
  marketCreatedEvent.blockNumber = event.block.number
  marketCreatedEvent.transactionHash = event.transaction.hash
  marketCreatedEvent.logIndex = event.logIndex
  marketCreatedEvent.save()
  
  // Update creator stats
  creator.marketsCreated = creator.marketsCreated.plus(BigInt.fromI32(1))
  creator.lastActiveAt = event.block.timestamp
  creator.lastActiveAtBlock = event.block.number
  creator.save()
  
  // Update protocol stats
  let protocol = getOrCreateProtocol()
  protocol.totalMarkets = protocol.totalMarkets.plus(BigInt.fromI32(1))
  protocol.activeMarkets = protocol.activeMarkets.plus(BigInt.fromI32(1))
  protocol.save()
  
  // Create data source for this market
  ParimutuelMarket.create(event.params.market)
}

export function handleStakeReleased(event: StakeReleased): void {
  // Update user's last active time
  let user = User.load(event.params.creator.toHexString())
  if (user != null) {
    user.lastActiveAt = event.block.timestamp
    user.lastActiveAtBlock = event.block.number
    user.save()
  }
}