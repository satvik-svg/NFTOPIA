# NFTOPIA

**AI Agent NFT Utility Platform on Hela Chain**

NFTOPIA is a decentralized platform where users mint autonomous AI agents as NFTs, deploy them for content generation or algorithmic trading, and trade their outputs through a marketplace with a bidding system. Built on Hela Chain testnet using ERC-6551 token-bound accounts.

---

## Architecture

```
NFTOPIA/
├── contracts/       # Solidity smart contracts (Hardhat)
├── backend/         # FastAPI + PostgreSQL backend
└── frontend/        # Angular 19 SPA
```

| Layer | Stack |
|-------|-------|
| **Blockchain** | Hela Chain Testnet, Solidity, Hardhat, ERC-721, ERC-6551, ERC-20 |
| **Backend** | Python, FastAPI, SQLAlchemy (async), PostgreSQL, Google Gemini API |
| **Frontend** | Angular 19, TypeScript, ethers.js v6 |
| **Infra** | Vercel (frontend), Railway (backend + DB) |

---

## Smart Contracts

| Contract | Purpose |
|----------|---------|
| `AgentNFT.sol` | ERC-721 NFT representing each AI agent |
| `ERC6551Registry.sol` | Creates token-bound accounts for agents |
| `ERC6551Account.sol` | Wallet implementation for each agent NFT |
| `ForgeToken.sol` | ERC-20 utility token ($FORGE) for platform transactions |
| `JobEscrow.sol` | Escrow contract for job assignments and payouts |
| `RentalMarket.sol` | Peer-to-peer agent rental marketplace |

---

## Core Features

### Forge
Mint content or trading AI agents with randomized DNA profiles. Each agent receives a unique specialization, personality traits, and skill scores. Minting requires wallet confirmation via MetaMask.

### Content Studio
Generate AI images using Google Gemini through your content agent. Generated outputs can be minted as NFTs and listed on the marketplace. Wallet popup confirms the mint fee before processing.

### Trading Dashboard
Build custom trading bots by configuring strategy, market type, assets, risk tolerance, and training period. Once minted, agents enter a multi-day training cycle across 15 observation vector dimensions visible in real-time from the My Empire dashboard.

### Marketplace
Browse all listed content NFTs and place bids through MetaMask. A content leaderboard ranks all listings by highest bid price. Bid prices fluctuate based on demand.

### My Empire
Dashboard showing all owned agents, portfolio overview, and a live trading agent monitor. The monitor displays per-agent training progress with individual countdowns and 15 RL parameters updating in real-time. Users can allocate funds to their agents through wallet-confirmed transactions.

### Rental Market
List agents for rent or browse available agents. Income is handled through the on-chain RentalMarket contract.

---

## Setup

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL
- MetaMask wallet

### Smart Contracts
```bash
cd contracts
npm install
npx hardhat compile
npx hardhat run scripts/deploy.js --network hela
```

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # Configure DATABASE_URL, GEMINI_API_KEY
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:4200` and the backend on `http://localhost:8000`.

---

## Environment Variables

### Backend (`backend/.env`)
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `GEMINI_API_KEY` | Google Gemini API key for image generation |
| `HELA_RPC_URL` | Hela Chain testnet RPC endpoint |
| `HELA_PRIVATE_KEY` | Deployer wallet private key |

### Frontend
Production API URL is configured in `src/environments/environment.prod.ts`.

---

## Deployment

| Service | Platform | Config |
|---------|----------|--------|
| Frontend | Vercel | Root directory: `frontend`, output: `dist/frontend/browser` |
| Backend | Railway | Dockerfile in `backend/`, auto-deploy from GitHub |
| Database | Railway | PostgreSQL addon |

---

## Tech Stack

- **Blockchain**: Hela Chain (EVM-compatible L1), HLUSD native token
- **AI**: Google Gemini 2.0 Flash for image generation
- **Auth**: MetaMask wallet connection via ethers.js
- **Token Standard**: ERC-721 (agents), ERC-20 ($FORGE), ERC-6551 (token-bound accounts)

---

## License

MIT
