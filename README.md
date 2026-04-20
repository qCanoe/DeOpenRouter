# DeOpenRouter

**Language:** English · [Chinese](README.zh-CN.md)

Transparent, trust-minimized AI API marketplace prototype built with Solidity, Next.js, Hono, and FastAPI.

DeOpenRouter explores a hybrid architecture where **trust, pricing, payments, and audit anchors live on-chain**, while **model inference stays off-chain**. Providers register model metadata and stake in a smart contract, users pay per call, and request/response hashes are recorded for later verification and ops visibility.

> [!NOTE]
> This repository is an MVP prototype. It demonstrates the trust and settlement model, not a production-complete decentralized inference network.

## Why DeOpenRouter

Traditional AI gateways usually ask users to trust a centralized operator for pricing, routing, accounting, and dispute handling. DeOpenRouter moves a narrow but important part of that trust boundary onto the EVM:

- provider identity commitments and metadata are registered on-chain
- pricing changes are delayed and observable on-chain
- each paid invocation emits a durable call record
- stake can be slashed by an operator in the current MVP
- external audit results can be anchored on-chain as report hashes

The actual model call remains off-chain, which keeps the system practical while still making settlement and auditability harder to fake.

## What This Repo Includes

- **Smart contract marketplace** for provider registration, staking, delayed price updates, per-call settlement, slashing, and audit anchoring
- **Web app** with separate user and provider views for browsing providers, registering providers, and invoking calls
- **Relay API** that can run in mock mode for local development or proxy requests to OpenRouter
- **Audit server** that evaluates a relay and can feed summarized risk results back on-chain

## How It Works

1. A provider registers a model on-chain with price, stake, metadata URI, identity hash, capability hash, and an `endpointCommitment`.
2. The web app shows registered providers in a marketplace UI and lets users simulate a request through the relay API.
3. The frontend hashes the request and response, then submits `invoke(...)` on-chain with payment.
4. The contract forwards payment to the provider, stores the call record, and emits `CallRecorded`.
5. Optionally, the audit flow probes a relay off-chain, hashes the resulting report JSON, and anchors that hash on-chain via `recordAudit(...)`.

## Core Contract Surface

The main contract is `contracts/src/DeOpenRouterMarketplace.sol`.

- `register`: adds a new provider with stake and metadata
- `updateProviderMetadata`: updates `metadataURI`, `metadataHash`, and `identityHash`
- `announcePriceChange`: schedules a future price update after `priceDelayBlocks`
- `getEffectivePrice`: reads the currently chargeable price without mutating state
- `invoke`: collects payment, records hashes, and emits `CallRecorded`
- `deactivate` + `withdrawStake`: disables a provider and allows stake withdrawal after the lock period
- `slash`: reduces provider stake and transfers the slashed ETH to `slashOperator`
- `recordAudit`: anchors an off-chain audit report hash with a coarse risk level

> [!WARNING]
> Slashing and audit recording are operator-driven in this MVP. There is no complaint, arbitration, escrow, or cryptographic proof-of-inference flow yet.

## Repository Layout

| Path | Description |
| --- | --- |
| `contracts/` | Foundry project containing `DeOpenRouterMarketplace`, deployment script, tests, and a cast-only local loop guide |
| `apps/web/` | Next.js 14 + wagmi frontend with user and provider workflows |
| `apps/api/` | Hono relay API for mock inference or OpenRouter proxying |
| `apps/audit-server/` | FastAPI service that runs structured relay checks and returns risk-style JSON |
| `README.zh-CN.md` | Chinese version of this README |

## Tech Stack

- **Contracts:** Solidity `0.8.24`, Foundry
- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS, wagmi, viem
- **API:** Node.js, TypeScript, Hono
- **Audit service:** Python 3.11+, FastAPI

## Quick Start

### Prerequisites

- [Foundry](https://getfoundry.sh) (`forge`, `anvil`, `cast`)
- Node.js 20+ and npm
- Python 3.11+ for `apps/audit-server/` only
- A browser wallet such as MetaMask for the web demo

### 1. Start a local chain

```bash
anvil
```

Anvil runs on `http://127.0.0.1:8545` with chain ID `31337`.

### 2. Deploy the marketplace contract

In `contracts/`, copy `.env.example` to `.env` and keep the default Anvil test private key for local use only. Then deploy:

```bash
cd contracts
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

The deployment script creates `DeOpenRouterMarketplace(100)`, so price changes become effective after 100 blocks in the default local/web flow.

Copy the deployed contract address from the script output or from:

`contracts/broadcast/Deploy.s.sol/<chainId>/run-latest.json`

### 3. Start the relay API

In `apps/api/`, optionally copy `.env.example` to `.env`, then run:

```bash
cd apps/api
npm install
npm run dev
```

Default base URL: `http://127.0.0.1:8787`

Available endpoints:

- `GET /health`
- `POST /v1/chat`
- `POST /v1/chat/completions`

Behavior:

- without `OPENROUTER_API_KEY`, the API returns a local `echo:<prompt>` response for offline development
- with `OPENROUTER_API_KEY`, the API proxies to OpenRouter

### 4. Start the web app

In `apps/web/`, copy `.env.local.example` to `.env.local`, set `NEXT_PUBLIC_MARKETPLACE_ADDRESS` to the deployed contract address, then run:

```bash
cd apps/web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), connect your wallet, and switch to Anvil (`31337`) if needed.

The web app has two main modes:

- **User view:** inspect providers, simulate a prompt, and submit an on-chain `invoke`
- **Provider view:** register providers, review your providers, and inspect incoming call activity

### 5. Optional: start the audit server

From `apps/audit-server/`:

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# Unix: source .venv/bin/activate
pip install -e ".[dev]"
uvicorn main:app --app-dir src --host 0.0.0.0 --port 8765
```

Default base URL: `http://127.0.0.1:8765`

Available endpoints:

- `GET /health`
- `POST /v1/audit`

For request examples and audit-specific options, see `apps/audit-server/README.md`.

## Environment Variables

### `contracts/.env`

| Variable | Required | Description |
| --- | --- | --- |
| `PRIVATE_KEY` | Yes | Private key used by `forge script` for deployment; default example is Anvil account `#0` |

### `apps/web/.env.local`

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_MARKETPLACE_ADDRESS` | Yes | Deployed `DeOpenRouterMarketplace` address |
| `NEXT_PUBLIC_ANVIL_RPC` | No | Defaults to `http://127.0.0.1:8545` |
| `NEXT_PUBLIC_MOCK_API` | No | Defaults to `http://127.0.0.1:8787` |

### `apps/api/.env`

| Variable | Required | Description |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | No | If unset, the relay runs in local echo mode |
| `OPENROUTER_MODEL` | No | Defaults to `openai/gpt-4o-mini` |
| `OPENROUTER_BASE_URL` | No | Override upstream endpoint |
| `OPENROUTER_HTTP_REFERER` | No | Optional OpenRouter attribution header |
| `OPENROUTER_TITLE` | No | Optional OpenRouter title header |
| `PORT` | No | Defaults to `8787` |
| `AUDIT_INTERVAL_MS` | No | Enables periodic audit scheduling when greater than `0` |
| `AUDIT_SERVER_URL` | No | Audit server base URL, usually `http://127.0.0.1:8765` |
| `AUDIT_RELAY_BASE_URL` | No | Relay base URL to probe; defaults to the local API |
| `AUDIT_PROVIDER_ID` | No | Provider ID used when anchoring `recordAudit(...)` |
| `AUDIT_TIMEOUT_SEC` | No | Audit request timeout passed through to the audit server |
| `CHAIN_RPC_URL` | No | EVM RPC URL for `recordAudit(...)` transactions |
| `MARKETPLACE_ADDRESS` | No | Marketplace contract address for audit anchoring |
| `AUDIT_PRIVATE_KEY` | No | Signer for audit anchoring; typically the deployer in this MVP |

## Local Demo Flow

Once the stack is running:

1. Open the web app and connect an Anvil-funded wallet.
2. Switch to the **Provider** tab and register a provider.
3. Switch to the **User** tab and invoke that provider.
4. Inspect emitted records in the UI or on-chain logs.
5. Optionally enable the audit scheduler in `apps/api/.env` to anchor audit reports periodically.

For a terminal-only walkthrough without the frontend, see `contracts/LOCAL_LOOP.md`.

## Testing

### Contracts

```bash
cd contracts
forge test
```

### Frontend

```bash
cd apps/web
npm install
npm run test:run
```

### Audit server

```bash
cd apps/audit-server
pytest
```

## Current MVP Limits

- endpoint URLs are not published on-chain; only a commitment to a short `endpointId` is stored
- call records store hashes, not full prompts or responses
- settlement is immediate and single-shot; there is no escrow, streaming, or async settlement
- slashing is centralized to `slashOperator`
- audit anchoring stores report hashes and a coarse risk level, not full reports on-chain
- there is no decentralized discovery, reputation, complaint handling, or proof-of-execution mechanism yet

## Useful References

- `contracts/LOCAL_LOOP.md`: cast-only local chain walkthrough
- `apps/audit-server/README.md`: audit server details and example requests
- `contracts/src/DeOpenRouterMarketplace.sol`: contract implementation
- `contracts/test/DeOpenRouterMarketplace.t.sol`: contract test coverage