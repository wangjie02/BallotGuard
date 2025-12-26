export const CONTRACT_ADDRESS = '0xd39AFFD7c2cD20901728320Ba22e6aC05BcC45da';

export const CONTRACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "uint8[5]",
        "name": "optionCounts",
        "type": "uint8[5]"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "participant",
        "type": "address"
      }
    ],
    "name": "AlreadyParticipated",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "questionId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "optionId",
        "type": "uint256"
      }
    ],
    "name": "InvalidOption",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "questionId",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "optionCount",
        "type": "uint8"
      }
    ],
    "name": "InvalidOptionConfiguration",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "questionId",
        "type": "uint256"
      }
    ],
    "name": "InvalidQuestion",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ZamaProtocolUnsupported",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "questionId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "optionCount",
        "type": "uint8"
      }
    ],
    "name": "QuestionResultsUnlocked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "respondent",
        "type": "address"
      }
    ],
    "name": "ResponsesSubmitted",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "MAX_OPTIONS",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "QUESTION_COUNT",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "confidentialProtocolId",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "questionId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "optionId",
        "type": "uint256"
      }
    ],
    "name": "getEncryptedCount",
    "outputs": [
      {
        "internalType": "euint32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "questionId",
        "type": "uint256"
      }
    ],
    "name": "getEncryptedCounts",
    "outputs": [
      {
        "internalType": "euint32[4]",
        "name": "counts",
        "type": "bytes32[4]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "hasResponded",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "optionsPerQuestion",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "questionId",
        "type": "uint256"
      }
    ],
    "name": "requestQuestionResults",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "externalEuint8[5]",
        "name": "encryptedChoices",
        "type": "bytes32[5]"
      },
      {
        "internalType": "bytes",
        "name": "inputProof",
        "type": "bytes"
      }
    ],
    "name": "submitResponses",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export const OPTION_COUNTS = [3, 4, 3, 2, 4];

export type SurveyQuestion = {
  id: number;
  title: string;
  description: string;
  options: string[];
};

export const QUESTIONS: SurveyQuestion[] = [
  {
    id: 0,
    title: 'What anchors your onchain portfolio?',
    description: 'Choose the asset class that represents the largest share of your holdings.',
    options: ['Bitcoin or wrapped BTC', 'Ether and staking derivatives', 'Stablecoins and treasuries'],
  },
  {
    id: 1,
    title: 'How do you use your crypto daily?',
    description: 'Tell us the main way you rely on digital assets.',
    options: ['Passive holding and long-term conviction', 'Active DeFi and liquidity provision', 'Payments and settlements', 'Onchain games or social'],
  },
  {
    id: 2,
    title: 'Preferred custody style',
    description: 'Select the custody pattern you trust the most.',
    options: ['Hardware wallet self-custody', 'Smart-account / MPC wallets', 'Centralized exchange accounts'],
  },
  {
    id: 3,
    title: 'Risk appetite for new protocols',
    description: 'How quickly do you move funds into brand-new releases?',
    options: ['I wait for audits and battle testing', 'I ape early to capture upside'],
  },
  {
    id: 4,
    title: 'Most used settlement layer',
    description: 'Pick the network that sees the most of your transactions.',
    options: ['Arbitrum or Orbit rollups', 'Optimism / OP Stack', 'Base ecosystem', 'Alternative L2s & appchains'],
  },
];
