# DeOpenRouter

**语言 / Language:** [English](README.md) · **简体中文**

**透明、低信任假设的 AI API 市场（原型）**

DeOpenRouter 采用 **链上信任协调 + 链下推理** 混合架构：提供方在链上注册报价与元数据，用户通过智能合约按次付费，并将请求/响应 **哈希** 上链以便审计。重计算仍在链下执行——当前 MVP 使用模拟推理。

### 链上内容（MVP）

- **注册**（`register`）：`modelId`、`endpoint`、`pricePerCall`，以及链下元数据承诺 `metadataURI`、`metadataHash`、`identityHash`，初始质押与区块时间戳（`createdAtBlock`；更新后为 `updatedAtBlock`）。
- **元数据更新**（`updateProviderMetadata`）：仅提供者可改 `metadataURI` / `metadataHash` / `identityHash`。
- **调用**（`invoke`）：按次付费，发出 `CallRecorded`，包含 `requestHash`、`responseHash`、`paid`、单调递增 `callId`，以及 `requestFormat` / `responseFormat`（uint8），用于避免哈希语义漂移。
- **罚没（最小实现）**：`slashOperator`（部署合约的地址，可 `transferSlashOperator`）可执行 `slash`，携带 `reasonHash`；罚没金额从质押中扣除并转给 `slashOperator`，并更新 `slashedTotal` / `lastSlashedAtBlock`。不含投诉/仲裁流程。

---

## 仓库结构

| 路径 | 说明 |
|------|------|
| `contracts/` | Foundry：`DeOpenRouterMarketplace`（注册、质押、`invoke`、罚没、事件） |
| `apps/api/` | 模拟推理 HTTP API（Hono）：`GET /health`、`POST /v1/chat` |
| `apps/web/` | Next.js + wagmi：浏览提供方、模拟补全、提交 `invoke` 交易 |

---

## 环境要求

- **Foundry**（`forge`、`anvil`、`cast`）— [getfoundry.sh](https://getfoundry.sh)
- **Node.js** 20+ 与 npm

---

## 快速开始（本地 Anvil）

### 1. 启动链：Anvil

```bash
anvil
```

### 2. 部署市场合约

另开终端（示例私钥为 Anvil 首个测试账户—**切勿用于主网**）：

```bash
cd contracts
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

从脚本输出或 `contracts/broadcast/Deploy.s.sol/31337/run-latest.json` 复制已部署的 `DeOpenRouterMarketplace` 地址。

### 3. 模拟 API

```bash
cd apps/api
npm install
npm run dev
```

默认 `http://127.0.0.1:8787`（`/health`、`/v1/chat`）。

### 4. 前端（Next.js）

```bash
cd apps/web
cp .env.local.example .env.local
# 将 NEXT_PUBLIC_MARKETPLACE_ADDRESS 设为已部署合约地址。
npm install
npm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000)，使用 MetaMask 等连接 **Chain ID 31337**，RPC `http://127.0.0.1:8545`；如需资金可导入 Anvil 测试私钥。

---

## 合约测试

```bash
cd contracts
forge test
```

---

## 许可证

本项目以 [MIT 许可证](LICENSE) 发布。第三方依赖（如 `forge-std`、npm 包）仍适用各自许可条款。
