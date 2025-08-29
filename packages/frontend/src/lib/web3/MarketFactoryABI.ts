export default [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "_stakeToken",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_stHYPE",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_treasury",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_oracle",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "STAKE_PER_MARKET",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "cpmmImplementation",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "createCPMMMarket",
    "inputs": [
      {
        "name": "p",
        "type": "tuple",
        "internalType": "struct MarketTypes.MarketParams",
        "components": [
          {
            "name": "title",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "description",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "subject",
            "type": "tuple",
            "internalType": "struct MarketTypes.SubjectParams",
            "components": [
              {
                "name": "kind",
                "type": "uint8",
                "internalType": "enum MarketTypes.SubjectKind"
              },
              {
                "name": "metricId",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "tokenIdentifier",
                "type": "string",
                "internalType": "string"
              },
              {
                "name": "valueDecimals",
                "type": "uint8",
                "internalType": "uint8"
              }
            ]
          },
          {
            "name": "predicate",
            "type": "tuple",
            "internalType": "struct MarketTypes.PredicateParams",
            "components": [
              {
                "name": "op",
                "type": "uint8",
                "internalType": "enum MarketTypes.PredicateOp"
              },
              {
                "name": "threshold",
                "type": "int256",
                "internalType": "int256"
              }
            ]
          },
          {
            "name": "window",
            "type": "tuple",
            "internalType": "struct MarketTypes.WindowParams",
            "components": [
              {
                "name": "kind",
                "type": "uint8",
                "internalType": "enum MarketTypes.WindowKind"
              },
              {
                "name": "tStart",
                "type": "uint64",
                "internalType": "uint64"
              },
              {
                "name": "tEnd",
                "type": "uint64",
                "internalType": "uint64"
              }
            ]
          },
          {
            "name": "oracle",
            "type": "tuple",
            "internalType": "struct MarketTypes.OracleSpec",
            "components": [
              {
                "name": "primarySourceId",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "fallbackSourceId",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "roundingDecimals",
                "type": "uint8",
                "internalType": "uint8"
              }
            ]
          },
          {
            "name": "cutoffTime",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "creator",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "econ",
            "type": "tuple",
            "internalType": "struct MarketTypes.Economics",
            "components": [
              {
                "name": "feeBps",
                "type": "uint16",
                "internalType": "uint16"
              },
              {
                "name": "creatorFeeShareBps",
                "type": "uint16",
                "internalType": "uint16"
              },
              {
                "name": "maxTotalPool",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "timeDecayBps",
                "type": "uint16",
                "internalType": "uint16"
              }
            ]
          },
          {
            "name": "isProtocolMarket",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      },
      {
        "name": "liquidityAmount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "createMarket",
    "inputs": [
      {
        "name": "p",
        "type": "tuple",
        "internalType": "struct MarketTypes.MarketParams",
        "components": [
          {
            "name": "title",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "description",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "subject",
            "type": "tuple",
            "internalType": "struct MarketTypes.SubjectParams",
            "components": [
              {
                "name": "kind",
                "type": "uint8",
                "internalType": "enum MarketTypes.SubjectKind"
              },
              {
                "name": "metricId",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "tokenIdentifier",
                "type": "string",
                "internalType": "string"
              },
              {
                "name": "valueDecimals",
                "type": "uint8",
                "internalType": "uint8"
              }
            ]
          },
          {
            "name": "predicate",
            "type": "tuple",
            "internalType": "struct MarketTypes.PredicateParams",
            "components": [
              {
                "name": "op",
                "type": "uint8",
                "internalType": "enum MarketTypes.PredicateOp"
              },
              {
                "name": "threshold",
                "type": "int256",
                "internalType": "int256"
              }
            ]
          },
          {
            "name": "window",
            "type": "tuple",
            "internalType": "struct MarketTypes.WindowParams",
            "components": [
              {
                "name": "kind",
                "type": "uint8",
                "internalType": "enum MarketTypes.WindowKind"
              },
              {
                "name": "tStart",
                "type": "uint64",
                "internalType": "uint64"
              },
              {
                "name": "tEnd",
                "type": "uint64",
                "internalType": "uint64"
              }
            ]
          },
          {
            "name": "oracle",
            "type": "tuple",
            "internalType": "struct MarketTypes.OracleSpec",
            "components": [
              {
                "name": "primarySourceId",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "fallbackSourceId",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "roundingDecimals",
                "type": "uint8",
                "internalType": "uint8"
              }
            ]
          },
          {
            "name": "cutoffTime",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "creator",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "econ",
            "type": "tuple",
            "internalType": "struct MarketTypes.Economics",
            "components": [
              {
                "name": "feeBps",
                "type": "uint16",
                "internalType": "uint16"
              },
              {
                "name": "creatorFeeShareBps",
                "type": "uint16",
                "internalType": "uint16"
              },
              {
                "name": "maxTotalPool",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "timeDecayBps",
                "type": "uint16",
                "internalType": "uint16"
              }
            ]
          },
          {
            "name": "isProtocolMarket",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      },
      {
        "name": "_marketType",
        "type": "uint8",
        "internalType": "enum MarketFactory.MarketType"
      },
      {
        "name": "liquidityAmount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "createMarketWithPermit",
    "inputs": [
      {
        "name": "p",
        "type": "tuple",
        "internalType": "struct MarketTypes.MarketParams",
        "components": [
          {
            "name": "title",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "description",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "subject",
            "type": "tuple",
            "internalType": "struct MarketTypes.SubjectParams",
            "components": [
              {
                "name": "kind",
                "type": "uint8",
                "internalType": "enum MarketTypes.SubjectKind"
              },
              {
                "name": "metricId",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "tokenIdentifier",
                "type": "string",
                "internalType": "string"
              },
              {
                "name": "valueDecimals",
                "type": "uint8",
                "internalType": "uint8"
              }
            ]
          },
          {
            "name": "predicate",
            "type": "tuple",
            "internalType": "struct MarketTypes.PredicateParams",
            "components": [
              {
                "name": "op",
                "type": "uint8",
                "internalType": "enum MarketTypes.PredicateOp"
              },
              {
                "name": "threshold",
                "type": "int256",
                "internalType": "int256"
              }
            ]
          },
          {
            "name": "window",
            "type": "tuple",
            "internalType": "struct MarketTypes.WindowParams",
            "components": [
              {
                "name": "kind",
                "type": "uint8",
                "internalType": "enum MarketTypes.WindowKind"
              },
              {
                "name": "tStart",
                "type": "uint64",
                "internalType": "uint64"
              },
              {
                "name": "tEnd",
                "type": "uint64",
                "internalType": "uint64"
              }
            ]
          },
          {
            "name": "oracle",
            "type": "tuple",
            "internalType": "struct MarketTypes.OracleSpec",
            "components": [
              {
                "name": "primarySourceId",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "fallbackSourceId",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "roundingDecimals",
                "type": "uint8",
                "internalType": "uint8"
              }
            ]
          },
          {
            "name": "cutoffTime",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "creator",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "econ",
            "type": "tuple",
            "internalType": "struct MarketTypes.Economics",
            "components": [
              {
                "name": "feeBps",
                "type": "uint16",
                "internalType": "uint16"
              },
              {
                "name": "creatorFeeShareBps",
                "type": "uint16",
                "internalType": "uint16"
              },
              {
                "name": "maxTotalPool",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "timeDecayBps",
                "type": "uint16",
                "internalType": "uint16"
              }
            ]
          },
          {
            "name": "isProtocolMarket",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      },
      {
        "name": "_marketType",
        "type": "uint8",
        "internalType": "enum MarketFactory.MarketType"
      },
      {
        "name": "liquidityAmount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "deadline",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "v",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "r",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "s",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "createParimutuelMarket",
    "inputs": [
      {
        "name": "p",
        "type": "tuple",
        "internalType": "struct MarketTypes.MarketParams",
        "components": [
          {
            "name": "title",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "description",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "subject",
            "type": "tuple",
            "internalType": "struct MarketTypes.SubjectParams",
            "components": [
              {
                "name": "kind",
                "type": "uint8",
                "internalType": "enum MarketTypes.SubjectKind"
              },
              {
                "name": "metricId",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "tokenIdentifier",
                "type": "string",
                "internalType": "string"
              },
              {
                "name": "valueDecimals",
                "type": "uint8",
                "internalType": "uint8"
              }
            ]
          },
          {
            "name": "predicate",
            "type": "tuple",
            "internalType": "struct MarketTypes.PredicateParams",
            "components": [
              {
                "name": "op",
                "type": "uint8",
                "internalType": "enum MarketTypes.PredicateOp"
              },
              {
                "name": "threshold",
                "type": "int256",
                "internalType": "int256"
              }
            ]
          },
          {
            "name": "window",
            "type": "tuple",
            "internalType": "struct MarketTypes.WindowParams",
            "components": [
              {
                "name": "kind",
                "type": "uint8",
                "internalType": "enum MarketTypes.WindowKind"
              },
              {
                "name": "tStart",
                "type": "uint64",
                "internalType": "uint64"
              },
              {
                "name": "tEnd",
                "type": "uint64",
                "internalType": "uint64"
              }
            ]
          },
          {
            "name": "oracle",
            "type": "tuple",
            "internalType": "struct MarketTypes.OracleSpec",
            "components": [
              {
                "name": "primarySourceId",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "fallbackSourceId",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "roundingDecimals",
                "type": "uint8",
                "internalType": "uint8"
              }
            ]
          },
          {
            "name": "cutoffTime",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "creator",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "econ",
            "type": "tuple",
            "internalType": "struct MarketTypes.Economics",
            "components": [
              {
                "name": "feeBps",
                "type": "uint16",
                "internalType": "uint16"
              },
              {
                "name": "creatorFeeShareBps",
                "type": "uint16",
                "internalType": "uint16"
              },
              {
                "name": "maxTotalPool",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "timeDecayBps",
                "type": "uint16",
                "internalType": "uint16"
              }
            ]
          },
          {
            "name": "isProtocolMarket",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "createProtocolMarket",
    "inputs": [
      {
        "name": "p",
        "type": "tuple",
        "internalType": "struct MarketTypes.MarketParams",
        "components": [
          {
            "name": "title",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "description",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "subject",
            "type": "tuple",
            "internalType": "struct MarketTypes.SubjectParams",
            "components": [
              {
                "name": "kind",
                "type": "uint8",
                "internalType": "enum MarketTypes.SubjectKind"
              },
              {
                "name": "metricId",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "tokenIdentifier",
                "type": "string",
                "internalType": "string"
              },
              {
                "name": "valueDecimals",
                "type": "uint8",
                "internalType": "uint8"
              }
            ]
          },
          {
            "name": "predicate",
            "type": "tuple",
            "internalType": "struct MarketTypes.PredicateParams",
            "components": [
              {
                "name": "op",
                "type": "uint8",
                "internalType": "enum MarketTypes.PredicateOp"
              },
              {
                "name": "threshold",
                "type": "int256",
                "internalType": "int256"
              }
            ]
          },
          {
            "name": "window",
            "type": "tuple",
            "internalType": "struct MarketTypes.WindowParams",
            "components": [
              {
                "name": "kind",
                "type": "uint8",
                "internalType": "enum MarketTypes.WindowKind"
              },
              {
                "name": "tStart",
                "type": "uint64",
                "internalType": "uint64"
              },
              {
                "name": "tEnd",
                "type": "uint64",
                "internalType": "uint64"
              }
            ]
          },
          {
            "name": "oracle",
            "type": "tuple",
            "internalType": "struct MarketTypes.OracleSpec",
            "components": [
              {
                "name": "primarySourceId",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "fallbackSourceId",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "roundingDecimals",
                "type": "uint8",
                "internalType": "uint8"
              }
            ]
          },
          {
            "name": "cutoffTime",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "creator",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "econ",
            "type": "tuple",
            "internalType": "struct MarketTypes.Economics",
            "components": [
              {
                "name": "feeBps",
                "type": "uint16",
                "internalType": "uint16"
              },
              {
                "name": "creatorFeeShareBps",
                "type": "uint16",
                "internalType": "uint16"
              },
              {
                "name": "maxTotalPool",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "timeDecayBps",
                "type": "uint16",
                "internalType": "uint16"
              }
            ]
          },
          {
            "name": "isProtocolMarket",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      },
      {
        "name": "_marketType",
        "type": "uint8",
        "internalType": "enum MarketFactory.MarketType"
      },
      {
        "name": "liquidityAmount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "creatorLockedStake",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "marketCreator",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "marketType",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "enum MarketFactory.MarketType"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "minCPMMLiquidity",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "oracle",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "parimutuelImplementation",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "protocolMarkets",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "releaseStake",
    "inputs": [
      {
        "name": "market",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "renounceOwnership",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setCPMMImplementation",
    "inputs": [
      {
        "name": "_implementation",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setImplementation",
    "inputs": [
      {
        "name": "_implementation",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setMinCPMMLiquidity",
    "inputs": [
      {
        "name": "_minLiquidity",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setOracle",
    "inputs": [
      {
        "name": "_oracle",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setParimutuelImplementation",
    "inputs": [
      {
        "name": "_implementation",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setTreasury",
    "inputs": [
      {
        "name": "_treasury",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "stHYPE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IstHYPE"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "stakeToken",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IERC20"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "transferOwnership",
    "inputs": [
      {
        "name": "newOwner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "treasury",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "MarketCreated",
    "inputs": [
      {
        "name": "market",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "creator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "marketType",
        "type": "uint8",
        "indexed": true,
        "internalType": "enum MarketFactory.MarketType"
      },
      {
        "name": "params",
        "type": "tuple",
        "indexed": false,
        "internalType": "struct MarketTypes.MarketParams",
        "components": [
          {
            "name": "title",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "description",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "subject",
            "type": "tuple",
            "internalType": "struct MarketTypes.SubjectParams",
            "components": [
              {
                "name": "kind",
                "type": "uint8",
                "internalType": "enum MarketTypes.SubjectKind"
              },
              {
                "name": "metricId",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "tokenIdentifier",
                "type": "string",
                "internalType": "string"
              },
              {
                "name": "valueDecimals",
                "type": "uint8",
                "internalType": "uint8"
              }
            ]
          },
          {
            "name": "predicate",
            "type": "tuple",
            "internalType": "struct MarketTypes.PredicateParams",
            "components": [
              {
                "name": "op",
                "type": "uint8",
                "internalType": "enum MarketTypes.PredicateOp"
              },
              {
                "name": "threshold",
                "type": "int256",
                "internalType": "int256"
              }
            ]
          },
          {
            "name": "window",
            "type": "tuple",
            "internalType": "struct MarketTypes.WindowParams",
            "components": [
              {
                "name": "kind",
                "type": "uint8",
                "internalType": "enum MarketTypes.WindowKind"
              },
              {
                "name": "tStart",
                "type": "uint64",
                "internalType": "uint64"
              },
              {
                "name": "tEnd",
                "type": "uint64",
                "internalType": "uint64"
              }
            ]
          },
          {
            "name": "oracle",
            "type": "tuple",
            "internalType": "struct MarketTypes.OracleSpec",
            "components": [
              {
                "name": "primarySourceId",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "fallbackSourceId",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "roundingDecimals",
                "type": "uint8",
                "internalType": "uint8"
              }
            ]
          },
          {
            "name": "cutoffTime",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "creator",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "econ",
            "type": "tuple",
            "internalType": "struct MarketTypes.Economics",
            "components": [
              {
                "name": "feeBps",
                "type": "uint16",
                "internalType": "uint16"
              },
              {
                "name": "creatorFeeShareBps",
                "type": "uint16",
                "internalType": "uint16"
              },
              {
                "name": "maxTotalPool",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "timeDecayBps",
                "type": "uint16",
                "internalType": "uint16"
              }
            ]
          },
          {
            "name": "isProtocolMarket",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MinCPMMLiquidityUpdated",
    "inputs": [
      {
        "name": "newMinLiquidity",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OwnershipTransferred",
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "StakeLocked",
    "inputs": [
      {
        "name": "creator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "market",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "StakeReleased",
    "inputs": [
      {
        "name": "creator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "market",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "FailedDeployment",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InsufficientBalance",
    "inputs": [
      {
        "name": "balance",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "needed",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "OwnableInvalidOwner",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "OwnableUnauthorizedAccount",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "SafeERC20FailedOperation",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      }
    ]
  }
]
