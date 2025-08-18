import {
  RouterDeposit as RouterDepositEvent,
  RouterClaim as RouterClaimEvent
} from "../generated/MarketRouter/MarketRouter"
import {
  RouterDeposit,
  RouterClaim,
  RouterStats,
  User,
  Market
} from "../generated/schema"
import { BigInt, BigDecimal } from "@graphprotocol/graph-ts"

// Helper to get or create router stats
function getRouterStats(): RouterStats {
  let stats = RouterStats.load("1")
  if (stats == null) {
    stats = new RouterStats("1")
    stats.totalDeposits = BigInt.fromI32(0)
    stats.totalClaims = BigInt.fromI32(0)
    stats.totalVolumeRouted = BigDecimal.fromString("0")
    stats.totalPayoutsRouted = BigDecimal.fromString("0")
    stats.uniqueUsers = BigInt.fromI32(0)
    stats.save()
  }
  return stats
}

// Helper to get or create user (reused from market.ts logic)
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
    
    // Update router stats for unique users
    let stats = getRouterStats()
    stats.uniqueUsers = stats.uniqueUsers.plus(BigInt.fromI32(1))
    stats.save()
  }
  return user
}

export function handleRouterDeposit(event: RouterDepositEvent): void {
  // Get or create user
  let user = getOrCreateUser(
    event.params.user.toHexString(),
    event.block.timestamp,
    event.block.number
  )
  
  // Create router deposit entity
  let routerDeposit = new RouterDeposit(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  )
  routerDeposit.user = user.id
  routerDeposit.market = event.params.market.toHexString()
  routerDeposit.outcome = event.params.outcome
  routerDeposit.amount = toBigDecimal(event.params.amount, 18)
  routerDeposit.timestamp = event.block.timestamp
  routerDeposit.blockNumber = event.block.number
  routerDeposit.transactionHash = event.transaction.hash
  routerDeposit.logIndex = event.logIndex
  routerDeposit.save()
  
  // Update router stats
  let stats = getRouterStats()
  stats.totalDeposits = stats.totalDeposits.plus(BigInt.fromI32(1))
  stats.totalVolumeRouted = stats.totalVolumeRouted.plus(routerDeposit.amount)
  stats.save()
  
  // Update user activity
  user.lastActiveAt = event.block.timestamp
  user.lastActiveAtBlock = event.block.number
  user.save()
}

export function handleRouterClaim(event: RouterClaimEvent): void {
  // Get user
  let user = User.load(event.params.user.toHexString())
  if (user == null) return
  
  // Create router claim entity
  let routerClaim = new RouterClaim(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  )
  routerClaim.user = user.id
  routerClaim.market = event.params.market.toHexString()
  routerClaim.payout = toBigDecimal(event.params.payout, 18)
  routerClaim.timestamp = event.block.timestamp
  routerClaim.blockNumber = event.block.number
  routerClaim.transactionHash = event.transaction.hash
  routerClaim.logIndex = event.logIndex
  routerClaim.save()
  
  // Update router stats
  let stats = getRouterStats()
  stats.totalClaims = stats.totalClaims.plus(BigInt.fromI32(1))
  stats.totalPayoutsRouted = stats.totalPayoutsRouted.plus(routerClaim.payout)
  stats.save()
  
  // Update user activity
  user.lastActiveAt = event.block.timestamp
  user.lastActiveAtBlock = event.block.number
  user.save()
}

// Helper function
// @ts-ignore - AssemblyScript types (i32, u8) are correct for subgraph
function toBigDecimal(value: BigInt, decimals: i32): BigDecimal {
  // @ts-ignore
  let divisor = BigInt.fromI32(10).pow(decimals as u8)
  return value.toBigDecimal().div(divisor.toBigDecimal())
}