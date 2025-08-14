export const ORACLE_ABI = [
  'function commit(address market, uint8 outcome, bytes32 dataHash)',
  'function finalize(address market)',
  'function pendingResolutions(address) view returns (uint8 outcome, bytes32 dataHash, uint256 commitTime)',
  'function DISPUTE_WINDOW() view returns (uint256)'
];

export const MARKET_ABI = [
  'function resolved() view returns (bool)',
  'function cancelled() view returns (bool)',
  'function winningOutcome() view returns (uint8)',
  'function params() view returns (tuple(string title, string description, tuple(uint8 kind, bytes32 metricId, address token, uint8 valueDecimals) subject, tuple(uint8 op, int256 threshold) predicate, tuple(uint8 kind, uint64 tStart, uint64 tEnd) window, tuple(bytes32 primarySourceId, bytes32 fallbackSourceId, uint8 roundingDecimals) oracle, uint64 cutoffTime, address creator, tuple(uint16 feeBps, uint16 creatorFeeShareBps, uint256 maxTotalPool) econ, bool isProtocolMarket))'
];