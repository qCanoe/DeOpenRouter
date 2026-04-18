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
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

(Alternatively set `$env:PRIVATE_KEY` to the same value if your `forge`/`cast` reads it; on Windows PowerShell, explicit `--private-key` avoids “no wallet” errors.)

Copy `DeOpenRouterMarketplace` address from the output (e.g. `0x5FbDB2315678afecb367f032d93F642f64180aa3` on fresh Anvil) into `$M` below.

```powershell
$M = "0x5fbdb2315678afecb367f032d93f642f64180aa3"
```

## Account A (deployer): register provider

Uses Anvil account #0 (same key as deploy). `pricePerCall` = 0.001 ether = `1000000000000000` wei. Stake must be ≥ `MIN_STAKE` (0.01 ether).

`register` takes `(modelId, modelVersion, endpointCommitment, capabilityHash, pricePerCall, stakeLockBlocks, metadataURI, metadataHash, identityHash)`.  
`endpointCommitment` must be non-zero; here it is `keccak256(utf8("mock"))` (same rule as the web app: `cast keccak $(cast from-utf8 "mock")` → `0xfa88ac588f5b956d02c6098e901a7351ac7e50b41ac55814346d8c5f9ade6811`). Placeholder bytes32 values for hashes are fine for local smoke tests.

```powershell
cast send $M "register((string,string,bytes32,bytes32,uint256,uint256,string,bytes32,bytes32))" "(\"mock\",\"1.0.0\",0xfa88ac588f5b956d02c6098e901a7351ac7e50b41ac55814346d8c5f9ade6811,0x0000000000000000000000000000000000000000000000000000000000000000,1000000000000000,0,\"ipfs://empty\",0x0000000000000000000000000000000000000000000000000000000000000000,0x0000000000000000000000000000000000000000000000000000000000000000)" --value 0.02ether --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

## Account B: invoke

Anvil account #1 private key (must be **exactly** 32 bytes hex; Foundry default #1 ends in `...78690d`, not `...78690d0`):

`invoke` includes `requestFormat`, `responseFormat` (uint8), and `usageUnits` (uint256). Use `1` for both formats to match the web MVP’s hash format; `usageUnits` can be `0`.

```powershell
cast send $M "invoke(uint256,bytes32,bytes32,uint8,uint8,uint256)" 0 0x0000000000000000000000000000000000000000000000000000000000000001 0x0000000000000000000000000000000000000000000000000000000000000002 1 1 0 --value 0.002ether --rpc-url http://127.0.0.1:8545 --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
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
