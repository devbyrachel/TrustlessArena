# Trustless Arena

Trustless Arena is a privacy-preserving, on-chain soldier builder running on Zama FHEVM. Players join the arena, receive encrypted gold, and build one of four soldier types without revealing their choices or balances to the public chain. Only the player can decrypt their own state in the frontend.

This repository contains:
- Solidity smart contracts with encrypted state and privacy-preserving game logic.
- Hardhat tasks, tests, and deployment scripts.
- A React + Vite frontend that uses viem for reads, ethers for writes, and the Zama relayer SDK for encryption/decryption.

## Project Goals

- Keep player decisions (soldier type) confidential on-chain.
- Preserve fair gameplay by removing information leakage and front-running vectors.
- Demonstrate how FHE (Fully Homomorphic Encryption) can power simple games with confidential state.
- Provide a complete example: contracts, tasks/tests, deployment, and frontend UX.

## Problem Statement

Traditional on-chain games leak state and choices through public transactions. This enables:
- Front-running of player decisions.
- Copying or countering strategies before they settle.
- Public visibility of private balances or inventory.

Trustless Arena solves this by using encrypted inputs and encrypted on-chain state. Observers cannot see what a player built or how much gold remains, but the game rules are still enforced by the contract.

## Key Advantages

- Confidential gameplay: soldier types and balances are encrypted at all times.
- Trustless enforcement: contract logic validates inputs and deducts costs without revealing values.
- User-controlled privacy: only the player can decrypt their own data in the UI.
- Simple and auditable rules: four soldier types with fixed costs and a clear flow.
- Clear separation of responsibilities: on-chain rules, off-chain encryption/decryption, and frontend UX.

## Game Rules

- When a player joins, they receive 1000 encrypted gold.
- There are four soldier types with fixed costs:
  - Type 1: 100 gold
  - Type 2: 200 gold
  - Type 3: 400 gold
  - Type 4: 1000 gold
- The chosen soldier type is encrypted. The contract validates the choice and checks encrypted balance sufficiency.
- The frontend can decrypt and display the soldier type to the player when requested.

## How It Works

### Smart Contract Flow

- join()
  - Marks the player as joined.
  - Sets encrypted gold to 1000.
  - Sets encrypted built soldier type to 0 (none).
  - Grants FHE access to the contract and to the player.

- buildSoldier(externalEuint8 encryptedSoldierType, bytes inputProof)
  - Accepts an encrypted soldier type and proof from the client.
  - Validates the encrypted soldier type is in [1, 4].
  - Computes cost based on encrypted choice.
  - Checks encrypted balance sufficiency.
  - If valid, subtracts encrypted cost and stores encrypted soldier type.
  - Re-grants access to the contract and the player.

- View functions
  - hasJoined(address)
  - getEncryptedGold(address)
  - getEncryptedBuiltSoldierType(address)
  - These return ciphertext values only.

### Encrypted Data and Permissions

- Gold and soldier type are stored as euint64 and euint8.
- Inputs are passed as externalEuint8 plus an input proof.
- The contract uses FHE.select and FHE.eq to compute costs without revealing the choice.
- FHE.allow and FHE.allowThis restrict who can decrypt the ciphertext.

### Frontend Flow

- Wallet connection uses RainbowKit and wagmi.
- Reads use viem with the contract ABI.
- Writes use ethers to send join() and buildSoldier() transactions.
- Encryption/decryption uses the Zama relayer SDK.
- The frontend does not use localStorage or environment variables.
- The frontend targets Sepolia and does not connect to localhost networks.
- ABI and address are stored in TypeScript, not JSON.

## Technology Stack

Smart Contracts
- Solidity 0.8.24
- Zama FHEVM libraries: @fhevm/solidity
- Hardhat + hardhat-deploy + typechain

Frontend
- React 19 + Vite
- viem for reads
- ethers v6 for writes
- RainbowKit + wagmi for wallet connections
- @zama-fhe/relayer-sdk for encryption/decryption

Tooling
- TypeScript
- ESLint and Prettier
- Mocha/Chai test suite

## Repository Layout

- contracts/ - Solidity contracts
- deploy/ - Hardhat deploy scripts
- deployments/ - Deployed addresses and ABIs (source of truth for frontend ABI)
- tasks/ - Hardhat tasks for CLI interactions
- test/ - Unit and network tests
- src/ - React + Vite frontend

## Developer Guide

### Prerequisites

- Node.js 20+ and npm
- A funded Sepolia account for deployment
- Infura API key

### Install Dependencies

Root (contracts and Hardhat):

```bash
npm install
```

Frontend:

```bash
cd src
npm install
```

### Environment Setup (Root Only)

Create a .env in the repository root for deployments:

```bash
PRIVATE_KEY=0x...
INFURA_API_KEY=...
ETHERSCAN_API_KEY=... # optional
```

Notes:
- Deployment uses PRIVATE_KEY, not MNEMONIC.
- Frontend does not use environment variables.

### Compile and Test

```bash
npm run compile
npm run test
```

For Sepolia test runs:

```bash
npm run test:sepolia
```

### Local Node and Deployment

Start a local FHEVM-ready node:

```bash
npx hardhat node
```

Deploy locally:

```bash
npm run deploy:localhost
```

### Sepolia Deployment

1) Ensure tests and tasks run successfully.
2) Deploy to Sepolia:

```bash
npm run deploy:sepolia
```

3) Optionally verify:

```bash
npm run verify:sepolia -- <CONTRACT_ADDRESS>
```

### Hardhat Tasks

- Print contract address:
  - npx hardhat arena:address --network <network>
- Join the arena:
  - npx hardhat arena:join --network <network>
- Build a soldier (1-4):
  - npx hardhat arena:build --type 1 --network <network>
- Decrypt gold (CLI):
  - npx hardhat arena:decrypt-gold --network <network>
- Decrypt soldier type (CLI):
  - npx hardhat arena:decrypt-soldier --network <network>

### Frontend Setup

1) Copy the ABI from deployments/sepolia to the frontend contract config.
   - Source of truth: deployments/sepolia/TrustlessArena.json (generated by Hardhat deploy).
   - Target file: src/src/config/contracts.ts
2) Set the deployed Sepolia address in the same config file.
3) Start the dev server:

```bash
cd src
npm run dev
```

### Frontend Usage

- Connect a wallet on Sepolia.
- Paste the deployed contract address if prompted.
- Click Join to receive encrypted gold.
- Select a soldier type and submit a build transaction.
- Click Decrypt to reveal your soldier type in the UI.

## Security and Privacy Notes

- All player-sensitive values are encrypted on-chain.
- Only the player and contract are authorized to access ciphertext.
- The contract never uses msg.sender in view functions, preserving view purity.
- Invalid soldier types are ignored and do not change state.

## Limitations

- This is a minimal game loop focused on demonstrating FHE in Solidity.
- There is no matchmaking, combat resolution, or leaderboard yet.
- Frontend configuration is manual to keep ABI and address explicit.

## Roadmap (Planned)

- Encrypted matchmaking and battle resolution.
- More unit types with balanced costs and stats.
- Encrypted inventory and crafting.
- Tournament mode with verifiable but private results.
- Gas and UX optimizations for encrypted flows.
- Expanded test coverage and additional security checks.

## License

BSD-3-Clause-Clear. See LICENSE.
