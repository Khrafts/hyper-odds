import { MarketCreated, StakeReleased, MinCPMMLiquidityUpdated, MarketFactory } from "../generated/MarketFactory/MarketFactory"
import { ParimutuelMarket, CPMMMarket } from "../generated/templates"
import { Market, User, MarketCreated as MarketCreatedEntity, Protocol } from "../generated/schema"
import { BigInt, BigDecimal, Address } from "@graphprotocol/graph-ts"

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
    protocol.minCPMMLiquidity = BigDecimal.fromString("1000") // 1000 USDC (already converted to human readable)
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
  
  // Basic info from event - now we have full parameters!
  market.creator = creator.id
  market.title = event.params.params.title
  market.description = event.params.params.description
  
  // Market type (0 = PARIMUTUEL, 1 = CPMM)
  market.marketType = event.params.marketType == 0 ? "PARIMUTUEL" : "CPMM"
  
  // Subject parameters - now actual values!
  market.subjectKind = event.params.params.subject.kind == 0 ? "HL_METRIC" : "TOKEN_PRICE"
  market.metricId = event.params.params.subject.metricId
  market.token = event.params.params.subject.tokenIdentifier.length > 0 ? 
    Address.fromString(event.params.params.subject.tokenIdentifier) : null
  market.valueDecimals = event.params.params.subject.valueDecimals
  
  // Predicate parameters - actual values!
  if (event.params.params.predicate.op == 0) {
    market.predicateOp = "GT"
  } else if (event.params.params.predicate.op == 1) {
    market.predicateOp = "GTE" 
  } else if (event.params.params.predicate.op == 2) {
    market.predicateOp = "LT"
  } else {
    market.predicateOp = "LTE"
  }
  market.threshold = event.params.params.predicate.threshold
  
  // Window parameters - actual values!
  if (event.params.params.window.kind == 0) {
    market.windowKind = "SNAPSHOT_AT"
  } else if (event.params.params.window.kind == 1) {
    market.windowKind = "WINDOW_SUM"
  } else {
    market.windowKind = "WINDOW_COUNT"
  }
  market.windowStart = event.params.params.window.tStart
  market.windowEnd = event.params.params.window.tEnd
  
  // Oracle parameters - actual values!
  market.primarySourceId = event.params.params.oracle.primarySourceId
  market.fallbackSourceId = event.params.params.oracle.fallbackSourceId
  market.roundingDecimals = event.params.params.oracle.roundingDecimals
  
  // Economics - actual values! (convert maxTotalPool from USDC 6-decimal format)
  market.feeBps = event.params.params.econ.feeBps
  market.creatorFeeShareBps = event.params.params.econ.creatorFeeShareBps
  market.maxTotalPool = BigDecimal.fromString(event.params.params.econ.maxTotalPool.toString()).div(BigDecimal.fromString("1000000"))
  market.timeDecayBps = event.params.params.econ.timeDecayBps
  
  // Timing - actual values!
  market.cutoffTime = event.params.params.cutoffTime
  market.resolveTime = market.cutoffTime.plus(event.params.params.window.tEnd.minus(event.params.params.window.tStart))
  
  // State
  market.isProtocolMarket = event.params.params.isProtocolMarket
  market.resolved = false
  market.cancelled = false
  
  // Initialize fields based on market type
  if (market.marketType == "PARIMUTUEL") {
    // Parimutuel pools
    market.poolNo = BigDecimal.fromString("0")
    market.poolYes = BigDecimal.fromString("0")
    market.totalPool = BigDecimal.fromString("0")
    market.feeCollected = BigDecimal.fromString("0")
    
    // Effective pools (time decay)
    market.effectivePoolNo = BigDecimal.fromString("0")
    market.effectivePoolYes = BigDecimal.fromString("0")
    market.totalEffectivePool = BigDecimal.fromString("0")
    
    // CPMM fields (unused for parimutuel)
    market.reserveNo = BigDecimal.fromString("0")
    market.reserveYes = BigDecimal.fromString("0")
    market.initialLiquidity = BigDecimal.fromString("0")
    market.totalFeesCollected = BigDecimal.fromString("0")
    market.spotPrice = BigDecimal.fromString("0.5") // 50% default
  } else {
    // CPMM reserves (will be set by MarketInitialized event)
    market.reserveNo = BigDecimal.fromString("0")
    market.reserveYes = BigDecimal.fromString("0")
    market.initialLiquidity = BigDecimal.fromString("0")
    market.totalFeesCollected = BigDecimal.fromString("0")
    market.spotPrice = BigDecimal.fromString("0.5") // 50% default
    
    // Parimutuel fields (unused for CPMM)
    market.poolNo = BigDecimal.fromString("0")
    market.poolYes = BigDecimal.fromString("0")
    market.totalPool = BigDecimal.fromString("0")
    market.feeCollected = BigDecimal.fromString("0")
    market.effectivePoolNo = BigDecimal.fromString("0")
    market.effectivePoolYes = BigDecimal.fromString("0")
    market.totalEffectivePool = BigDecimal.fromString("0")
  }
  
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
  
  // Create data source for this market based on type
  if (market.marketType == "PARIMUTUEL") {
    ParimutuelMarket.create(event.params.market)
  } else {
    CPMMMarket.create(event.params.market)
  }
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

export function handleMinCPMMLiquidityUpdated(event: MinCPMMLiquidityUpdated): void {
  // Update protocol minimum liquidity (convert from USDC 6-decimal format)
  let protocol = getOrCreateProtocol()
  protocol.minCPMMLiquidity = BigDecimal.fromString(event.params.newMinLiquidity.toString()).div(BigDecimal.fromString("1000000"))
  protocol.save()
}