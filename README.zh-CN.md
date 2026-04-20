# DeOpenRouter

**Language:** [English](README.md) · Chinese (this document)

一个基于 Solidity、Next.js、Hono 和 FastAPI 构建的透明、低信任假设的 AI API 市场原型。

DeOpenRouter 采用混合架构：**信任协调、定价、支付和审计锚定放在链上**，**模型推理保留在链下**。提供方在智能合约中登记模型元数据并质押，用户按次付费调用，请求与响应的哈希会被记录到链上，便于后续审计与对账。

> [!NOTE]
> 这个仓库当前是 MVP 原型，重点展示信任和结算模型，而不是一个生产级的去中心化推理网络。

## 项目目标

传统 AI 网关通常要求用户把定价、路由、计费和争议处理都交给一个中心化运营方。DeOpenRouter 尝试把其中一部分关键的信任边界迁移到 EVM：

- 提供方身份承诺与元数据在链上公开登记
- 调价不是即时生效，而是带有可观察的延迟
- 每次付费调用都会留下可审计的链上记录
- 当前 MVP 中，质押可被操作员执行罚没
- 外部审计结果可以以报告哈希的形式锚定到链上

真正的模型推理依然在链下完成，这样既保留了现实可用性，也让结算和审计过程更透明、难以篡改。

## 仓库包含什么

- **智能合约市场**：支持提供方注册、质押、延迟调价、按次结算、罚没和审计锚定
- **Web 前端**：区分用户视角和提供方视角，支持浏览提供方、注册提供方、发起调用
- **Relay API**：可运行在本地 mock 模式，也可以代理到 OpenRouter
- **审计服务**：对 relay 做结构化检查，并可将结果摘要回写到链上

## 工作流程

1. 提供方在链上注册模型，提交价格、质押、元数据 URI、身份哈希、能力哈希和 `endpointCommitment`。
2. Web 应用把这些提供方展示在市场页面中，用户可先通过 relay API 模拟请求。
3. 前端对请求和响应做哈希，然后带着付款发起链上 `invoke(...)`。
4. 合约把费用转给提供方，保存调用记录，并发出 `CallRecorded` 事件。
5. 如启用审计流程，系统会在线下探测 relay，把生成的 JSON 报告做哈希后，通过 `recordAudit(...)` 锚定到链上。

## 核心合约能力

主合约位于 `contracts/src/DeOpenRouterMarketplace.sol`。

- `register`：带质押注册一个新的提供方
- `updateProviderMetadata`：更新 `metadataURI`、`metadataHash` 和 `identityHash`
- `announcePriceChange`：声明未来生效的新价格
- `getEffectivePrice`：读取当前实际收费价格，不修改状态
- `invoke`：收款、记录哈希并发出 `CallRecorded`
- `deactivate` + `withdrawStake`：停用提供方并在锁定期结束后提取质押
- `slash`：减少提供方质押，并把罚没金额转给 `slashOperator`
- `recordAudit`：把链下审计报告哈希和风险等级锚定到链上

> [!WARNING]
> 当前 MVP 中，罚没和审计锚定都依赖操作员权限。还没有投诉、仲裁、托管、证明推理执行等更完整的机制。

## 仓库结构

| 路径 | 说明 |
| --- | --- |
| `contracts/` | Foundry 工程，包含 `DeOpenRouterMarketplace`、部署脚本、测试和 cast 本地演示文档 |
| `apps/web/` | Next.js 14 + wagmi 前端，包含用户端和提供方端流程 |
| `apps/api/` | Hono relay API，用于 mock 推理或代理到 OpenRouter |
| `apps/audit-server/` | FastAPI 服务，对 relay 进行结构化检查 |
| `README.md` | 本 README 的英文版本 |

## 技术栈

- **合约：** Solidity `0.8.24`、Foundry
- **前端：** Next.js 14、React 18、TypeScript、Tailwind CSS、wagmi、viem
- **API：** Node.js、TypeScript、Hono
- **审计服务：** Python 3.11+、FastAPI

## 快速开始

### 环境要求

- [Foundry](https://getfoundry.sh)（`forge`、`anvil`、`cast`）
- Node.js 20+ 与 npm
- Python 3.11+（仅 `apps/audit-server/` 需要）
- 一个浏览器钱包，例如 MetaMask

### 1. 启动本地链

```bash
anvil
```

默认 RPC：`http://127.0.0.1:8545`，链 ID：`31337`。

### 2. 部署市场合约

在 `contracts/` 下，将 `.env.example` 复制为 `.env`，保留默认的 Anvil 测试私钥即可，仅用于本地开发。然后执行：

```bash
cd contracts
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

部署脚本会创建 `DeOpenRouterMarketplace(100)`，因此默认本地/Web 流程里，调价会在 100 个区块后生效。

从脚本输出或下列文件中复制已部署合约地址：

`contracts/broadcast/Deploy.s.sol/<chainId>/run-latest.json`

### 3. 启动 relay API

在 `apps/api/` 下，可选地把 `.env.example` 复制为 `.env`，然后执行：

```bash
cd apps/api
npm install
npm run dev
```

默认地址：`http://127.0.0.1:8787`

可用接口：

- `GET /health`
- `POST /v1/chat`
- `POST /v1/chat/completions`

行为说明：

- 未设置 `OPENROUTER_API_KEY` 时，API 返回本地 `echo:<prompt>`，方便离线开发
- 设置 `OPENROUTER_API_KEY` 后，API 会代理到 OpenRouter

### 4. 启动 Web 前端

在 `apps/web/` 下，将 `.env.local.example` 复制为 `.env.local`，把 `NEXT_PUBLIC_MARKETPLACE_ADDRESS` 改成刚部署的合约地址，然后执行：

```bash
cd apps/web
npm install
npm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000)，连接钱包，并在需要时切换到 Anvil 网络（`31337`）。

前端包含两个主要模式：

- **用户视角**：查看提供方、模拟 prompt、提交链上 `invoke`
- **提供方视角**：注册提供方、查看自己的提供方、检查来电记录

### 5. 可选：启动审计服务

在 `apps/audit-server/` 下执行：

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# Unix: source .venv/bin/activate
pip install -e ".[dev]"
uvicorn main:app --app-dir src --host 0.0.0.0 --port 8765
```

默认地址：`http://127.0.0.1:8765`

可用接口：

- `GET /health`
- `POST /v1/audit`

请求示例和更多参数说明见 `apps/audit-server/README.md`。

## 环境变量

### `contracts/.env`

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `PRIVATE_KEY` | 是 | `forge script` 部署用私钥；示例值为 Anvil 账户 `#0` |

### `apps/web/.env.local`

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `NEXT_PUBLIC_MARKETPLACE_ADDRESS` | 是 | 已部署的 `DeOpenRouterMarketplace` 地址 |
| `NEXT_PUBLIC_ANVIL_RPC` | 否 | 默认 `http://127.0.0.1:8545` |
| `NEXT_PUBLIC_MOCK_API` | 否 | 默认 `http://127.0.0.1:8787` |

### `apps/api/.env`

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | 否 | 未设置时 relay 运行在本地 echo 模式 |
| `OPENROUTER_MODEL` | 否 | 默认 `openai/gpt-4o-mini` |
| `OPENROUTER_BASE_URL` | 否 | 覆盖上游接口地址 |
| `OPENROUTER_HTTP_REFERER` | 否 | OpenRouter 可选归因头 |
| `OPENROUTER_TITLE` | 否 | OpenRouter 可选标题头 |
| `PORT` | 否 | 默认 `8787` |
| `AUDIT_INTERVAL_MS` | 否 | 大于 `0` 时启用定时审计调度 |
| `AUDIT_SERVER_URL` | 否 | 审计服务地址，通常是 `http://127.0.0.1:8765` |
| `AUDIT_RELAY_BASE_URL` | 否 | 要被探测的 relay 地址，默认就是本地 API |
| `AUDIT_PROVIDER_ID` | 否 | 调用 `recordAudit(...)` 时使用的 provider ID |
| `AUDIT_TIMEOUT_SEC` | 否 | 透传给审计服务的超时秒数 |
| `CHAIN_RPC_URL` | 否 | 审计锚定交易使用的 EVM RPC |
| `MARKETPLACE_ADDRESS` | 否 | 审计锚定所用的市场合约地址 |
| `AUDIT_PRIVATE_KEY` | 否 | 审计锚定签名私钥；当前 MVP 通常使用部署者账户 |

## 本地演示路径

把整套服务跑起来后，推荐这样体验：

1. 打开 Web 并连接一个带测试币的 Anvil 钱包。
2. 进入 **Provider** 页签，注册一个提供方。
3. 切到 **User** 页签，对这个提供方发起一次调用。
4. 在前端或链上日志里查看调用记录。
5. 如需演示审计锚定，可在 `apps/api/.env` 中开启审计调度。

如果你只想走命令行流程、不使用前端，请查看 `contracts/LOCAL_LOOP.md`。

## 测试

### 合约

```bash
cd contracts
forge test
```

### 前端

```bash
cd apps/web
npm install
npm run test:run
```

### 审计服务

```bash
cd apps/audit-server
pytest
```

## 当前 MVP 边界

- 链上只存 `endpointId` 的承诺值，不直接公开真实 endpoint URL
- 调用记录只存请求/响应哈希，不存完整明文
- 结算是单次即时结算，没有托管、流式结算或异步结算
- 罚没权限集中在 `slashOperator`
- 审计锚定只保存报告哈希和粗粒度风险等级，不把完整报告写入链上
- 目前还没有去中心化发现、信誉系统、投诉处理或推理执行证明机制

## 参考文档

- `contracts/LOCAL_LOOP.md`：只用 cast 跑通本地链上流程
- `apps/audit-server/README.md`：审计服务细节与请求示例
- `contracts/src/DeOpenRouterMarketplace.sol`：合约实现
- `contracts/test/DeOpenRouterMarketplace.t.sol`：合约测试覆盖
