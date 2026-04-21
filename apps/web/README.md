# DeOpenRouter Web

Next.js 14 frontend for the DeOpenRouter MVP. This app sits on top of the `DeOpenRouterMarketplace` contract and the relay API in `apps/api/`, giving you separate user and provider workflows in one interface.

## What This App Includes

- **User view** for browsing providers, opening a per-provider playground, invoking calls, and reviewing anchored audit history
- **Provider view** for registering providers, updating metadata, managing lifecycle actions, and inspecting incoming activity
- **Audit UX** for viewing on-chain audit anchors, loading relay-cached reports, and opening published `reportUri` payloads
- **API helper modal** for quick local relay access details during demos

## Requirements

- Node.js 20+
- npm
- A deployed `DeOpenRouterMarketplace` contract
- A running relay API from `apps/api/`
- A browser wallet such as MetaMask

## Local Development

1. Deploy the marketplace contract first (see the root `README.md` or `../../contracts/README.md`).
2. Copy `.env.local.example` to `.env.local`.
3. Set `NEXT_PUBLIC_MARKETPLACE_ADDRESS` to your deployed contract address.
4. Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3020](http://localhost:3020).

## Scripts

- `npm run dev` - start Next.js in development mode on port `3020`
- `npm run build` - production build
- `npm run start` - start the production server on port `3020`
- `npm run lint` - run the Next.js ESLint checks
- `npm run test` - watch-mode Vitest
- `npm run test:run` - one-shot Vitest run

## Environment Variables

Copy `.env.local.example` to `.env.local` and configure:

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_MARKETPLACE_ADDRESS` | Yes | Deployed `DeOpenRouterMarketplace` address |
| `NEXT_PUBLIC_ANVIL_RPC` | No | Defaults to `http://127.0.0.1:8545` |
| `NEXT_PUBLIC_MOCK_API` | No | Defaults to `http://127.0.0.1:8787` |
| `NEXT_PUBLIC_AUDIT_LOGS_FROM_BLOCK` | No | First block to scan for audit events; defaults to `0` |

## Typical Local Flow

1. Start `anvil`.
2. Deploy the contract from `contracts/`.
3. Start the relay API from `apps/api/`.
4. Start this web app with `npm run dev`.
5. Connect an Anvil-funded wallet and switch to chain `31337`.
6. Register a provider in the **Provider** tab, then exercise it from the **User** tab.

If the relay has on-demand audit settings configured, the frontend automatically POSTs the provider registration transaction hash to `POST /v1/audit/trigger` after a successful registration.

## Related Docs

- `../../README.md` - full project overview and end-to-end quick start
- `../../README.zh-CN.md` - Chinese root README
- `../../docs/DEMO_RUN.zh-CN.md` - step-by-step local demo runbook
