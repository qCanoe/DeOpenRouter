# DeOpenRouter Contracts

Foundry project for the DeOpenRouter marketplace contract, deployment script, and Solidity test suite.

## What Is Here

- `src/DeOpenRouterMarketplace.sol` - the main marketplace contract
- `script/Deploy.s.sol` - local deployment script used by the demo flow
- `test/DeOpenRouterMarketplace.t.sol` - contract test coverage
- `LOCAL_LOOP.md` - cast-only walkthrough for a terminal-driven local demo

The contract covers provider registration, delayed price changes, per-call settlement, provider deactivation and stake withdrawal, challengeable slash proposals, and audit anchoring with optional report URIs.

## Requirements

- [Foundry](https://book.getfoundry.sh/) (`forge`, `cast`, `anvil`)
- A local or remote EVM RPC

## Setup

Copy `.env.example` to `.env` in this directory. For local Anvil demos, the example uses account `#0` and is intended for development only.

## Common Commands

### Build

```bash
forge build
```

### Test

```bash
forge test
```

### Format

```bash
forge fmt
```

### Gas snapshot

```bash
forge snapshot
```

### Start a local chain

```bash
anvil
```

### Deploy to local Anvil

```bash
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

The default local deployment creates `DeOpenRouterMarketplace(100, 100)`, which means:

- price changes become effective after `100` blocks
- slash proposals remain challengeable for `100` blocks before finalization

After deployment, the latest address is available in:

`broadcast/Deploy.s.sol/<chainId>/run-latest.json`

## Related Docs

- `../README.md` - repository overview and end-to-end quick start
- `../README.zh-CN.md` - Chinese root README
- `./LOCAL_LOOP.md` - cast-only local walkthrough
- `../docs/AUDIT_GOVERNANCE.md` - audit rounds, auditors, and slash governance
