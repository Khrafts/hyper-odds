import { MarketCreated, StakeReleased } from "../generated/MarketFactory/MarketFactory"
import { ParimutuelMarket } from "../generated/templates"
import { Market, User, MarketCreated as MarketCreatedEntity, Protocol } from "../generated/schema"
import { BigInt, BigDecimal, Bytes } from "@graphprotocol/graph-ts"

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
  let params = event.params.params
  
  // Get or create creator
  let creator = getOrCreateUser(
    params.creator.toHexString(),
    event.block.timestamp,
    event.block.number
  )
  
  // Basic info
  market.creator = creator.id
  market.title = params.title
  market.description = params.description
  
  // Subject
  market.subjectKind = getSubjectKindString(params.subject.kind)
  market.metricId = params.subject.metricId
  market.token = params.subject.token
  market.valueDecimals = params.subject.valueDecimals
  
  // Predicate
  market.predicateOp = getPredicateOpString(params.predicate.op)
  market.threshold = params.predicate.threshold
  
  // Window
  market.windowKind = getWindowKindString(params.window.kind)
  market.windowStart = params.window.tStart
  market.windowEnd = params.window.tEnd
  
  // Oracle
  market.primarySourceId = params.oracle.primarySourceId
  market.fallbackSourceId = params.oracle.fallbackSourceId
  market.roundingDecimals = params.oracle.roundingDecimals
  
  // Economics
  market.feeBps = params.econ.feeBps
  market.creatorFeeShareBps = params.econ.creatorFeeShareBps
  market.maxTotalPool = toBigDecimal(params.econ.maxTotalPool, 18)
  
  // Timing
  market.cutoffTime = params.cutoffTime
  market.resolveTime = params.window.tEnd // Resolve time is window end
  
  // State
  market.isProtocolMarket = params.isProtocolMarket
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

// Helper functions
function getSubjectKindString(kind: i32): string {
  switch (kind) {
    case 0: return "HL_METRIC"
    case 1: return "TOKEN_PRICE"
    case 2: return "GENERIC"
    default: return "UNKNOWN"
  }
}

function getPredicateOpString(op: i32): string {
  switch (op) {
    case 0: return "GT"
    case 1: return "GTE"
    case 2: return "LT"
    case 3: return "LTE"
    case 4: return "EQ"
    case 5: return "NEQ"
    default: return "UNKNOWN"
  }
}

function getWindowKindString(kind: i32): string {
  switch (kind) {
    case 0: return "SNAPSHOT_AT"
    case 1: return "TIME_AVERAGE"
    case 2: return "EXTREMUM"
    default: return "UNKNOWN"
  }
}

function toBigDecimal(value: BigInt, decimals: i32): BigDecimal {
  let divisor = BigInt.fromI32(10).pow(decimals as u8)
  return value.toBigDecimal().div(divisor.toBigDecimal())
}