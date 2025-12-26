# BallotGuard

BallotGuard is an end-to-end encrypted survey dApp for crypto asset holders. It uses Zama's FHEVM to keep every answer
private on-chain while still producing verifiable tallies that can be selectively revealed per question.

## Table of Contents

- [Project Summary](#project-summary)
- [Problems Solved](#problems-solved)
- [Advantages](#advantages)
- [Core Capabilities](#core-capabilities)
- [System Architecture](#system-architecture)
- [Detailed Flow](#detailed-flow)
- [Contract Design](#contract-design)
- [Frontend Design](#frontend-design)
- [Technology Stack](#technology-stack)
- [Repository Layout](#repository-layout)
- [Requirements](#requirements)
- [Setup](#setup)
- [Local Development](#local-development)
- [Deployment](#deployment)
- [ABI Synchronization](#abi-synchronization)
- [Operational Notes](#operational-notes)
- [Limitations](#limitations)
- [Future Plans](#future-plans)
- [License](#license)

## Project Summary

BallotGuard implements a 5-question survey where each question has 2 to 4 options. User selections are encrypted in the
browser, submitted on-chain, and aggregated into encrypted counts. Any user can request a result for a single question,
which converts that question's encrypted option counts into a public, decryptable form without exposing raw votes.

This project emphasizes:

- Confidentiality of individual answers.
- Verifiability of aggregated results.
- Selective disclosure of survey outcomes.
- End-to-end encryption with no plaintext on-chain.

## Problems Solved

- **Privacy leakage in on-chain voting**: Raw answers are never stored in plaintext.
- **Trust in survey operators**: Aggregation is performed by the contract using encrypted arithmetic.
- **Selective disclosure**: Only the requested question is revealed; other questions remain encrypted.
- **Data minimization**: No personal data is stored, and responses never leave the encrypted domain.
- **Replay-free participation**: Each address can respond only once.

## Advantages

- **End-to-end confidentiality** via client-side encryption and FHEVM-compatible ciphertexts.
- **On-chain verifiability** of submission and tally updates.
- **Granular results access** by question, not the entire survey.
- **Composable architecture** that separates survey logic, deployment, tasks, and frontend.
- **Protocol-aligned UX** that uses the relayer to manage proofs and decryption safely.

## Core Capabilities

- **Encrypted submission**: Each answer is encrypted in the browser before it reaches the chain.
- **Encrypted tallies**: Counts per option remain encrypted at rest and in state transitions.
- **On-demand reveal**: A user can request public results for a single question.
- **No mock data**: All UI actions correspond to live contract calls.
- **User-level gating**: A wallet address can submit only once.

## System Architecture

- **Frontend (app/)**
  - Collects 5 answers in a single survey session.
  - Encrypts answers using the Zama relayer SDK.
  - Submits encrypted answers via ethers.
  - Reads encrypted tallies via viem.
  - Requests public result unlocks when the user asks.

- **Smart Contract (contracts/)**
  - Stores encrypted counters for each option.
  - Enforces 2-4 options per question.
  - Enforces one submission per address.
  - Exposes encrypted counts and result unlocks.

- **Deployment + Tasks**
  - Hardhat deploy scripts manage local and Sepolia deployments.
  - Hardhat tasks provide CLI workflows for submissions and result unlocks.

## Detailed Flow

### User Flow

1. Connect a wallet.
2. Select answers for all 5 questions.
3. The frontend encrypts each answer and submits them on-chain in one transaction.
4. The contract updates encrypted tallies per option.
5. A user can request results for a specific question only.
6. The contract marks that question's tallies as publicly decryptable.
7. The frontend or CLI decrypts those counts via the relayer.

### On-Chain Flow

- **Submission**
  - The contract receives encrypted answers plus the relayer proof.
  - Each answer is compared to each option using encrypted equality checks.
  - Matching options increment encrypted counts.
- **Aggregation**
  - Counters are updated using FHEVM arithmetic.
  - Counters remain encrypted in storage.
- **Reveal**
  - When a question is requested, only that question's counters become publicly decryptable.
  - The contract grants decryption allowances to the caller and itself.

## Contract Design

- **Contract**: `BallotGuard`
- **Constants**:
  - `QUESTION_COUNT = 5`
  - `MAX_OPTIONS = 4`
- **State**:
  - `optionsPerQuestion`: number of options per question (2-4).
  - `_encryptedCounts`: encrypted tallies per question/option.
  - `hasResponded`: one submission per address.
- **Key Methods**:
  - `submitResponses`: accepts encrypted answers and updates tallies.
  - `requestQuestionResults`: unlocks a single question's results for public decryption.
  - `getEncryptedCount` / `getEncryptedCounts`: read encrypted tallies.

## Frontend Design

- **React + Vite** app contained in `app/`.
- **Reads via viem**, **writes via ethers**.
- **No local storage** or frontend environment variables.
- **No JSON files** in the frontend codebase.
- **No Tailwind CSS**.
- **No localhost RPCs**: users connect through their wallet provider.

## Technology Stack

- **Smart contracts**: Solidity + Hardhat
- **FHE**: Zama FHEVM (`@fhevm/solidity`)
- **Relayer**: Zama relayer SDK (`@zama-fhe/relayer-sdk`)
- **Deployment**: `hardhat-deploy`
- **Frontend**: React + Vite + RainbowKit
- **Wallet integration**: RainbowKit + wagmi
- **Reads**: viem
- **Writes**: ethers

## Repository Layout

```
.
├── app/                # React frontend (Vite)
├── contracts/          # Solidity contracts
├── deploy/             # Deployment scripts
├── deployments/        # Generated deployment artifacts and ABIs
├── tasks/              # Hardhat tasks
├── test/               # Contract tests
├── types/              # Typechain outputs
└── hardhat.config.ts   # Hardhat configuration
```

## Requirements

- **Node.js**: 20+
- **npm**: 7+

## Setup

### Install Dependencies

```bash
npm install
```

```bash
cd app
npm install
```

### Compile Contracts

```bash
npm run compile
```

## Local Development

### Start a Local FHEVM-Ready Node

```bash
npm run chain
```

### Deploy to Local Node

```bash
npm run deploy:localhost
```

### Run Tests and Tasks

```bash
npm run test
```

```bash
npx hardhat task:address --network localhost
npx hardhat task:submit --network localhost
npx hardhat task:request-results --question 0 --network localhost
```

## Deployment

### Sepolia Deployment

The deployment scripts use a private key from `.env`. Set the following variables before deploying:

- `INFURA_API_KEY`
- `PRIVATE_KEY`

Deploy:

```bash
npm run deploy:sepolia
```

Optional verification:

```bash
npm run verify:sepolia -- <CONTRACT_ADDRESS>
```

## ABI Synchronization

The frontend must use the ABI generated by the deployed contract:

1. Deploy to Sepolia.
2. Copy the ABI from `deployments/sepolia` into the frontend code.
3. Do not replace it with a handcrafted ABI.

## Operational Notes

- The survey consists of exactly 5 questions.
- Each question has 2 to 4 options.
- One wallet address can submit only once.
- Only one question can be publicly revealed at a time per request.
- Result decryption must be performed via the relayer SDK.

## Limitations

- Results are revealed per question, not per respondent.
- The frontend requires a wallet capable of signing and submitting transactions.
- FHE operations are computationally heavier than plaintext operations.
- Public decryption is scoped to unlocked questions only.

## Future Plans

- Support configurable question sets and dynamic option counts.
- Add anti-sybil or rate-limiting mechanisms without exposing identities.
- Expand to additional networks when FHEVM support is available.
- Provide result dashboards and export tooling based on decrypted aggregates only.
- Improve UX for status feedback during encryption and result retrieval.
- Add admin tooling for survey lifecycle management (open, close, archive).

## License

BSD-3-Clause-Clear. See `LICENSE`.
