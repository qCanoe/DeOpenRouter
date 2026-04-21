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
- stake can be slashed after a **challengeable on-chain proposal** (funds go to a configurable treasury)
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
5. Optionally, the audit flow probes a relay off-chain, **canonicalizes** the JSON report, optionally publishes it off-chain, and anchors `keccak256(canonicalJson)` on-chain via `recordAudit` / `recordAuditWithUri`.

## Core Contract Surface

The main contract is `contracts/src/DeOpenRouterMarketplace.sol`.

- `register`: adds a new provider with stake and metadata
- `updateProviderMetadata`: updates `metadataURI`, `metadataHash`, and `identityHash`
- `announcePriceChange`: schedules a future price update after `priceDelayBlocks`
- `getEffectivePrice`: reads the currently chargeable price without mutating state
- `getProviderCore`: compact view of owner, pricing, stake, and slash metadata
- `invoke`: collects payment, records hashes, and emits `CallRecorded`
- `deactivate` + `withdrawStake`: disables a provider and allows stake withdrawal after the lock period
- **Governance:** `proposeSlashOperator` / `acceptSlashOperator`, `proposeAuditRecorder` / `acceptAuditRecorder`, `setSlashTreasury`, `setSlashChallengePeriodBlocks`
- **Audits:** `recordAudit`, `recordAuditWithUri`, `beginAuditRound`, `setAuditor`, `attestAudit` (multi-attestor events)
- **Slashing:** `proposeSlash` → provider `challengeSlashProposal` (during the challenge window) → `finalizeSlashProposal` (sends ETH to `slashTreasury`)

> [!WARNING]
> Economic security still depends on how you configure multisigs / treasuries. On-chain rules implement **delay + challenge** for slashes and **allowlisted auditors** for attestations, but there is no full arbitration market, escrow settlement, or cryptographic proof-of-inference yet. See `docs/AUDIT_GOVERNANCE.md` and `docs/TRUST_LAYERS.md`.

## Repository Layout

| Path | Description |
| --- | --- |
| `contracts/` | Foundry project containing `DeOpenRouterMarketplace`, deployment script, tests, and a cast-only local loop guide |
| `apps/web/` | Next.js 14 + wagmi frontend with user and provider workflows |
| `apps/api/` | Hono relay API for mock inference or OpenRouter proxying |
| `apps/audit-server/` | FastAPI service that runs structured relay checks and returns risk-style JSON |
| `docs/` | Governance notes for audits/slashing and optional trust layers |
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

The deployment script creates `DeOpenRouterMarketplace(100, 100)` — price changes apply after **100 blocks**, and slash proposals can be challenged for **100 blocks** before finalization in the default Anvil flow.

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
- `GET /v1/audit/cached-report?hash=0x...`
- `POST /v1/chat`
- `POST /v1/chat/completions`
- `POST /v1/audit/trigger`

Behavior:

- without `OPENROUTER_API_KEY`, the API returns a local `echo:<prompt>` response for offline development, plus a synthetic `id` and structured `usage`
- with `OPENROUTER_API_KEY`, the API proxies to OpenRouter and forwards `id`, token usage, and `usage.cost` when OpenRouter includes them
- `GET /health` reports relay mode plus audit scheduler state as `requested`, `scheduled`, `reason`, `chainId`, and `audit.onDemandReady`
- `GET /v1/audit/cached-report?hash=0x...` returns the relay-local cached canonical audit report for a report hash when available
- `POST /v1/audit/trigger` accepts `{ "transactionHash": "0x..." }`, decodes a successful `register` transaction, and runs one audit for the newly registered provider

Response shape highlights:

```json
{
  "id": "chatcmpl-or-mock-id",
  "model": "openai/gpt-4o-mini",
  "response": "hello",
  "usage": {
    "prompt_tokens": 12,
    "completion_tokens": 34,
    "total_tokens": 46,
    "cost": 0.0000123
  }
}
```

```json
{
  "ok": true,
  "mode": "openrouter",
  "audit": {
    "requested": true,
    "scheduled": true,
    "reason": null,
    "chainId": 31337,
    "onDemandReady": true
  }
}
```

### 4. Start the web app

In `apps/web/`, copy `.env.local.example` to `.env.local`, set `NEXT_PUBLIC_MARKETPLACE_ADDRESS` to the deployed contract address, then run:

```bash
cd apps/web
npm install
npm run dev
```

Open [http://localhost:3020](http://localhost:3020) (see `apps/web/package.json` `dev` port), connect your wallet, and switch to Anvil (`31337`) if needed.

The web app has two main modes:

- **User view:** inspect providers, open a per-provider playground, review anchored audit history, open an API access helper modal, and see session-local relay request receipts alongside demo rows
- **Provider view:** register providers, review your providers, update metadata, manage lifecycle actions, and inspect incoming call activity

When the audit relay is configured, the web app also POSTs the registration transaction hash to `POST /v1/audit/trigger` after a successful provider registration so the new provider can receive an immediate audit anchor.

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

### 6. Recommended full-system bring-up

If you want to run the whole local demo stack with the fewest surprises, use separate terminals in this order:

1. **Terminal A: local chain**

```bash
anvil
```

2. **Terminal B: deploy contracts once**

```bash
cd contracts
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

3. **Terminal C: audit server** (optional, but required for on-demand / scheduled audit flows)

```bash
cd apps/audit-server
python -m venv .venv
# Windows: .venv\Scripts\activate
# Unix: source .venv/bin/activate
pip install -e ".[dev]"
uvicorn main:app --app-dir src --host 0.0.0.0 --port 8765
```

4. **Terminal D: relay API**

```bash
cd apps/api
npm install
npm run dev
```

5. **Terminal E: web app**

```bash
cd apps/web
npm install
npm run dev
```

Use this as the minimum environment checklist before opening the browser:

- `contracts/broadcast/Deploy.s.sol/<chainId>/run-latest.json` exists and contains the deployed contract address
- `apps/web/.env.local` has `NEXT_PUBLIC_MARKETPLACE_ADDRESS=<deployed address>`
- `apps/api/.env` is optional for mock mode, but required if you want audit automation or a live OpenRouter-backed relay
- if you want audit triggering from the web UI, `apps/api/.env` should include `AUDIT_SERVER_URL`, `MARKETPLACE_ADDRESS`, and `AUDIT_PRIVATE_KEY`

### 7. Smoke test checklist

Before doing a full demo, verify that each service is actually reachable:

1. Check the relay API:

```bash
curl -s http://127.0.0.1:8787/health
```

2. If the audit server is running, check it too:

```bash
curl -s http://127.0.0.1:8765/health
```

3. Open the web app at [http://localhost:3020](http://localhost:3020).
4. Connect a MetaMask account funded by Anvil and switch to chain `31337`.
5. Register a provider in the **Provider** tab.
6. Switch to the **User** tab and invoke that provider from the playground.
7. If audit integration is configured, confirm that the provider receives an audit anchor and that audit history is visible in the UI.

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
| `NEXT_PUBLIC_AUDIT_LOGS_FROM_BLOCK` | No | First block to scan for audit events (defaults to `0`) |

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
| `AUDIT_PROVIDER_ID` | No | Provider ID used by the periodic scheduler when anchoring `recordAudit(...)`; on-demand audit derives the provider ID from the registration tx receipt |
| `AUDIT_TIMEOUT_SEC` | No | Audit request timeout passed through to the audit server |
| `CHAIN_RPC_URL` | No | EVM RPC URL for `recordAudit(...)` transactions |
| `CHAIN_ID` | No | Defaults to `31337` (Anvil); set to match your RPC network |
| `MARKETPLACE_ADDRESS` | No | Marketplace contract address for audit anchoring |
| `AUDIT_PRIVATE_KEY` | No | Signer for audit anchoring; typically the deployer in this MVP |
| `AUDIT_REPORT_PUBLISH_URL` | No | `POST` canonical JSON; response is a plain URI or JSON `{ uri, url, cid }` |

For `POST /v1/audit/trigger`, the relay must have `AUDIT_SERVER_URL`, `MARKETPLACE_ADDRESS`, and `AUDIT_PRIVATE_KEY` configured. `OPENROUTER_API_KEY` is optional for local demos because the relay can still run in echo mode; when the required audit settings are present, `/health` reports `audit.onDemandReady: true`.

## Local Demo Flow

**Step-by-step runbook (Chinese):** [`docs/DEMO_RUN.zh-CN.md`](docs/DEMO_RUN.zh-CN.md).

Once the stack is running:

1. Open the web app and connect an Anvil-funded wallet.
2. Switch to the **Provider** tab and register a provider.
3. If the audit relay is configured, the frontend automatically calls `POST /v1/audit/trigger` after the register transaction confirms, anchoring an initial audit for that provider.
4. Switch to the **User** tab and invoke that provider from the playground.
5. Inspect emitted call records, per-provider audit history, and relay request receipts in the UI or on-chain logs.
6. Optionally enable the audit scheduler in `apps/api/.env` to anchor audit reports periodically after the first on-demand audit.

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

### Relay API (unit tests)

```bash
cd apps/api
npm install
npm test
```

## Current MVP Limits

- endpoint URLs are not published on-chain; only a commitment to a short `endpointId` is stored
- call records store hashes, not full prompts or responses
- settlement is immediate and single-shot; there is no escrow, streaming, or async settlement
- slash **proposals** still originate from `slashOperator`, but execution is delayed, challengeable, and pays `slashTreasury` (not necessarily the operator)
- multi-auditor **quorum / aggregation** is off-chain; the contract stores attestations as events
- audit anchoring stores hashes (+ optional URI) and a coarse risk level, not full reports on-chain
- there is no decentralized discovery, reputation, automated arbitration market, or proof-of-execution network yet

## Useful References

- `contracts/LOCAL_LOOP.md`: cast-only local chain walkthrough
- `apps/audit-server/README.md`: audit server details and example requests
- `contracts/src/DeOpenRouterMarketplace.sol`: contract implementation
- `contracts/test/DeOpenRouterMarketplace.t.sol`: contract test coverage
- `docs/AUDIT_GOVERNANCE.md`: roles, audit rounds, slash flow
- `docs/TRUST_LAYERS.md`: optional TEE / zk / AVS directions