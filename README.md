# DeOpenRouter

**Language / 语言:** **English** · [简体中文](README.zh-CN.md)

**Transparent and trust-minimized AI API marketplace (prototype)**

DeOpenRouter explores a hybrid **on-chain trust + off-chain inference** design: providers register pricing and metadata on-chain, users pay per call through a smart contract, and request/response **hashes** are anchored for auditability. Heavy model execution stays off-chain—currently mocked for the MVP.

### On-chain surface (MVP)

- **Provider registration** (`register`): `modelId`, `endpoint`, `pricePerCall`, plus commitments `metadataURI`, `metadataHash`, `identityHash`, initial stake, and block timestamps (`createdAtBlock` / `updatedAtBlock` after updates).
- **Metadata updates** (`updateProviderMetadata`): provider owner can change `metadataURI` / `metadataHash` / `identityHash`.
- **Calls** (`invoke`): pays `pricePerCall`, emits `CallRecorded` with `requestHash`, `responseHash`, `paid`, monotonic `callId`, and `requestFormat` / `responseFormat` (uint8) to avoid hash semantic drift.
- **Slashing (minimal)**: `slashOperator` (deployer by default; transferable) may `slash()` with `reasonHash`; slashed ETH is sent to `slashOperator`, stake is reduced, `slashedTotal` / `lastSlashedAtBlock` updated. No complaint/arbitration flow.

---

## Repository layout


| Path         | Description                                                                           |
| ------------ | ------------------------------------------------------------------------------------- |
| `contracts/` | Foundry project: `DeOpenRouterMarketplace` (register, stake, `invoke`, slash, events) |
| `apps/api/`  | Mock inference HTTP API (Hono): `GET /health`, `POST /v1/chat`                        |
| `apps/web/`  | Next.js + wagmi UI: browse providers, mock completion, submit `invoke` tx             |
| `apps/audit-server/` | Python (FastAPI): runs **deopenrouter_audit** against a relay; `GET /health`, `POST /v1/audit` — see [apps/audit-server/README.md](apps/audit-server/README.md) |

---

## Prerequisites

- **Foundry** (`forge`, `anvil`, `cast`) — [getfoundry.sh](https://getfoundry.sh)
- **Node.js** 20+ and npm
- **Python** 3.11+ (optional, for `apps/audit-server/`)

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
# Set NEXT_PUBLIC_MARKETPLACE_ADDRESS to the deployed contract (RPC and mock API defaults suit local Anvil).
npm install
npm run dev
```

Keep **apps/api** running (step 3) so `NEXT_PUBLIC_MOCK_API` (default `http://127.0.0.1:8787`) can serve `POST /v1/chat` before the UI submits an on-chain `invoke` with hashed request/response. For a cast-only chain loop without the web app, see [contracts/LOCAL_LOOP.md](contracts/LOCAL_LOOP.md).

Open [http://localhost:3000](http://localhost:3000), connect a browser wallet (e.g. MetaMask) to **Chain ID 31337**, RPC `http://127.0.0.1:8545`, and (if needed) import Anvil’s test private key for a funded account.

### 5. Audit server (optional)

Runs structured relay checks (risk-style JSON). From `apps/audit-server/`:

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# Unix: source .venv/bin/activate
pip install -e ".[dev]"
uvicorn main:app --app-dir src --host 0.0.0.0 --port 8765
```

Defaults: `GET /health`, `POST /v1/audit` on `http://127.0.0.1:8765`. Full options and `curl` examples: [apps/audit-server/README.md](apps/audit-server/README.md).

### CLI-only chain loop (optional)

To exercise **register → invoke → `CallRecorded`** with `cast` only (no web UI), see [contracts/LOCAL_LOOP.md](contracts/LOCAL_LOOP.md).

---

## Contracts: tests

```bash
cd contracts
forge test
```

---

## License

This project is licensed under the [MIT License](LICENSE). Third-party dependencies (e.g. `forge-std`, npm packages) remain under their respective licenses.