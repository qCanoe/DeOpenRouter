# DeOpenRouter

**Language / 语言:** **English** · [简体中文](README.zh-CN.md)

**Transparent and trust-minimized AI API marketplace (prototype)**

DeOpenRouter explores a hybrid **on-chain trust + off-chain inference** design: providers register pricing and metadata on-chain, users pay per call through a smart contract, and request/response **hashes** are anchored for auditability. Heavy model execution stays off-chain—currently mocked for the MVP.

For the full product narrative (Chinese source text), see [`DeOpenRouter.md`](./DeOpenRouter.md).

---

## Repository layout

| Path | Description |
|------|-------------|
| `contracts/` | Foundry project: `DeOpenRouterMarketplace` (register, stake, `invoke`, events) |
| `apps/api/` | Mock inference HTTP API (Hono): `GET /health`, `POST /v1/chat` |
| `apps/web/` | Next.js + wagmi UI: browse providers, mock completion, submit `invoke` tx |
| `docs/superpowers/plans/` | Implementation plan notes |

---

## Prerequisites

- **Foundry** (`forge`, `anvil`, `cast`) — [getfoundry.sh](https://getfoundry.sh)
- **Node.js** 20+ and npm

---

## Quick start (local Anvil)

### 1. Chain: Anvil

```bash
anvil
```

### 2. Deploy the marketplace

In a second terminal (example private key is Anvil’s first test account—**never use on mainnet**):

```bash
cd contracts
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

Copy the deployed `DeOpenRouterMarketplace` address from the script output or `contracts/broadcast/Deploy.s.sol/31337/run-latest.json`.

### 3. Mock API

```bash
cd apps/api
npm install
npm run dev
```

Default: `http://127.0.0.1:8787` (`/health`, `/v1/chat`).

### 4. Web (Next.js)

```bash
cd apps/web
cp .env.local.example .env.local
# Set NEXT_PUBLIC_MARKETPLACE_ADDRESS to the deployed contract address.
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), connect a browser wallet (e.g. MetaMask) to **Chain ID 31337**, RPC `http://127.0.0.1:8545`, and (if needed) import Anvil’s test private key for a funded account.

---

## Contracts: tests

```bash
cd contracts
forge test
```

---

## License

This project is licensed under the [MIT License](LICENSE). Third-party dependencies (e.g. `forge-std`, npm packages) remain under their respective licenses.
