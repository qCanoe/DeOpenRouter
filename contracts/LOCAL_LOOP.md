# Local chain loop (Anvil + cast)

Reproduce **register → invoke → CallRecorded** without the web app.

## Prerequisites

- Foundry installed (`forge`, `anvil`, `cast` on PATH).
- Terminal A: `anvil` (chain id 31337, RPC `http://127.0.0.1:8545`).

## Deploy marketplace

Terminal B (PowerShell):

```powershell
cd contracts
$env:Path = "$env:USERPROFILE\.foundry\bin;$env:Path"
$env:PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

Copy `DeOpenRouterMarketplace` address from the output (e.g. `0x5FbDB2315678afecb367f032d93F642f64180aa3` on fresh Anvil) into `$M` below.

```powershell
$M = "0x5fbdb2315678afecb367f032d93f642f64180aa3"
```

## Account A (deployer): register provider

Uses Anvil account #0 (same key as deploy). `pricePerCall` = 0.001 ether = `1000000000000000` wei. Stake must be ≥ `MIN_STAKE` (0.01 ether).

```powershell
$env:PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
cast send $M "register(string,string,uint256)" "mock" "http://127.0.0.1:8787" 1000000000000000 --value 0.02ether --rpc-url http://127.0.0.1:8545
```

## Account B: invoke

Anvil account #1 private key:

```powershell
$env:PRIVATE_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d0"
cast send $M "invoke(uint256,bytes32,bytes32)" 0 0x0000000000000000000000000000000000000000000000000000000000000001 0x0000000000000000000000000000000000000000000000000000000000000002 --value 0.002ether --rpc-url http://127.0.0.1:8545
```

(`0.002 ether` > `0.001 ether` price so refund path is exercised.)

## Verify logs

```powershell
cast logs --address $M --rpc-url http://127.0.0.1:8545
```

Look for `CallRecorded` topics.

---

## 中文摘要

在 Anvil 上：先部署合约 → 账户 A `register` → 账户 B `invoke` → 用 `cast logs` 查看 `CallRecorded`。私钥仅用于本地 Anvil，切勿用于主网。
