# DeOpenRouter

**语言 / Language:** [English](README.md) · **简体中文**

**透明、低信任假设的 AI API 市场（原型）**

DeOpenRouter 采用 **链上信任协调 + 链下推理** 混合架构：提供方在链上注册报价与元数据，用户通过智能合约按次付费，并将请求/响应 **哈希** 上链以便审计。重计算仍在链下执行——当前 MVP 使用模拟推理。

### 链上内容（MVP）

- **构造函数**：`priceDelayBlocks`（必须 > 0；部署脚本在主网风格网络上使用 `100`；测试使用较小值）。已宣布的调价在满此区块数后生效。
- **注册**（`register`）：`modelId`、`modelVersion`、`endpointCommitment`（bytes32，非零；前端将短 **endpointId** 用 `keccak256(utf8(endpointId))` 哈希）、`capabilityHash`、`pricePerCall`、`stakeLockBlocks`（停用后提取质押需满足 `block.number >= createdAtBlock + stakeLockBlocks`），以及 `metadataURI`、`metadataHash`、`identityHash`、初始质押与区块时间戳（`createdAtBlock`；更新后为 `updatedAtBlock`）。
- **元数据更新**（`updateProviderMetadata`）：仅提供者可改 `metadataURI` / `metadataHash` / `identityHash`（本版不改 `endpointCommitment`）。
- **定价**（`announcePriceChange`）：所有者预约新价格；满 `priceDelayBlocks` 后作为实际扣费价。`getEffectivePrice` 返回下一次 `invoke` 将收取的价格。
- **调用**（`invoke`）：支付有效单次调用价，发出 `CallRecorded`，包含 `requestHash`、`responseHash`、`paid`、`usageUnits`、`recordedBlock`、`recordedAt`、单调递增 `callId`、`requestFormat` / `responseFormat` 与 `settlementStatus`。`calls(callId)` 映射保存相同字段供审计读取。
- **罚没（最小实现）**：`slashOperator`（默认部署者；可转移）可执行 `slash`，携带 `reasonHash`；罚没金额从质押中扣除并转给 `slashOperator`，并更新 `slashedTotal` / `lastSlashedAtBlock`，`slashRecords(slashId)` 记录事件。不含投诉/仲裁流程。
- **审计锚定（运维 / 演示）**：`auditRecorder`（默认部署者；可 `transferAuditRecorder`）可调用 `recordAudit(providerId, reportHash, riskLevel)`；发出 `AuditRecorded`，含单调递增 `auditId`。`riskLevel` 为 LOW=0、MEDIUM=1、HIGH=2。

---

## 仓库结构

| 路径 | 说明 |
|------|------|
| `contracts/` | Foundry：`DeOpenRouterMarketplace`（注册、质押、`invoke`、罚没、事件） |
| `apps/api/` | 模拟推理 HTTP API（Hono）：`GET /health`、`POST /v1/chat` |
| `apps/web/` | Next.js + wagmi：浏览提供方、模拟补全、提交 `invoke` 交易 |
| `apps/audit-server/` | Python（FastAPI）：对中继运行 **deopenrouter_audit** 检查；`GET /health`、`POST /v1/audit` — 详见 [apps/audit-server/README.md](apps/audit-server/README.md) |

---

## 环境要求

- **Foundry**（`forge`、`anvil`、`cast`）— [getfoundry.sh](https://getfoundry.sh)
- **Node.js** 20+ 与 npm
- **Python** 3.11+（可选，用于 `apps/audit-server/`）

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
# 可选：复制 .env.example 为 .env，让 Forge 自动加载 PRIVATE_KEY（仅本地开发）。
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

从脚本输出或本地执行 `--broadcast` 后的 `contracts/broadcast/Deploy.s.sol/<chainId>/run-latest.json` 复制已部署的 `DeOpenRouterMarketplace` 地址。

### 3. 模拟 API

```bash
cd apps/api
npm install
npm run dev
```

默认 `http://127.0.0.1:8787`（`/health`、`/v1/chat`，以及 OpenAI 兼容的 `POST /v1/chat/completions`）。

未设置 `OPENROUTER_API_KEY` 时返回本地 echo，便于离线调试前端；设置密钥后 API 会转发至 OpenRouter。可选：将 `AUDIT_INTERVAL_MS` 设为大于 0，并配置 `AUDIT_SERVER_URL`、`MARKETPLACE_ADDRESS`、`CHAIN_RPC_URL`、`AUDIT_PRIVATE_KEY`、`AUDIT_PROVIDER_ID`，可运行后台循环将审计哈希锚定上链（该循环同样需要 `OPENROUTER_API_KEY`）。是否启动见 `GET /health` 返回中的 `audit` 字段。

### 4. 前端（Next.js）

```bash
cd apps/web
cp .env.local.example .env.local
# 将 NEXT_PUBLIC_MARKETPLACE_ADDRESS 设为已部署合约地址（示例中的 RPC 与 Mock API 默认适合本地 Anvil）。
npm install
npm run dev
```

请保持 **apps/api** 运行（上文步骤 3），以便 `NEXT_PUBLIC_MOCK_API`（默认 `http://127.0.0.1:8787`）提供 `POST /v1/chat`，前端在提交链上 `invoke` 前可对请求/响应做哈希。若只需命令行走链上流程、不用网页，见 [contracts/LOCAL_LOOP.md](contracts/LOCAL_LOOP.md)。

浏览器打开 [http://localhost:3000](http://localhost:3000)，使用 MetaMask 等连接 **Chain ID 31337**，RPC `http://127.0.0.1:8545`；如需资金可导入 Anvil 测试私钥。

### 5. 审计服务（可选）

对中继做结构化检查（风险维度 JSON）。在 `apps/audit-server/` 目录下：

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# Unix: source .venv/bin/activate
pip install -e ".[dev]"
uvicorn main:app --app-dir src --host 0.0.0.0 --port 8765
```

默认：`http://127.0.0.1:8765` 上提供 `GET /health`、`POST /v1/audit`。参数与 `curl` 示例见 [apps/audit-server/README.md](apps/audit-server/README.md)。

### 仅用命令行走通链上流程（可选）

仅用 `cast` 复现 **register → invoke → CallRecorded**（不经过前端），见 [contracts/LOCAL_LOOP.md](contracts/LOCAL_LOOP.md)。

---

## 合约测试

```bash
cd contracts
forge test
```

---

## 许可证

本项目以 [MIT 许可证](LICENSE) 发布。第三方依赖（如 `forge-std`、npm 包）仍适用各自许可条款。
