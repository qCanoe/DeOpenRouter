# DeOpenRouter 本地 Demo 跑通指南

按顺序启动各服务，再在浏览器里完成「注册 → 调用」即可体验完整链路。全程默认使用 **Anvil 本地链（chain id 31337）**。

## 环境要求

| 工具 | 用途 |
| --- | --- |
| [Foundry](https://getfoundry.sh)（`anvil`、`forge`） | 本地链与合约部署 |
| Node.js 20+ | 前端与 Relay API |
| Python 3.11+ | 审计服务（仅当你要跑审计时） |
| MetaMask 等浏览器钱包 | 连接 Anvil |

---

## 一、启动本地链

新开终端：

```bash
anvil
```

保持运行。默认 RPC：`http://127.0.0.1:8545`，链 ID：`31337`。

---

## 二、部署合约

```bash
cd contracts
cp .env.example .env
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

记下控制台里打印的 **DeOpenRouterMarketplace** 地址；或从  
`contracts/broadcast/Deploy.s.sol/31337/run-latest.json` 读取。

> **说明：** 部署账户（`PRIVATE_KEY` 对应地址）即为合约里的 **`auditRecorder`**。若后续要链上锚定审计结果，`apps/api` 里的 `AUDIT_PRIVATE_KEY` 必须与该私钥一致。

---

## 三、启动 Relay API

```bash
cd apps/api
npm install
npm run dev
```

默认：`http://127.0.0.1:8787`。未配置 `OPENROUTER_API_KEY` 时为 **echo 模式**，适合离线演示。

自检：`curl http://127.0.0.1:8787/health`

---

## 四、配置并启动前端

```bash
cd apps/web
cp .env.local.example .env.local
```

编辑 `apps/web/.env.local`：

- **`NEXT_PUBLIC_MARKETPLACE_ADDRESS`**：填第二步部署得到的合约地址  
- 其余可保持示例中的本地默认值（`NEXT_PUBLIC_ANVIL_RPC`、`NEXT_PUBLIC_MOCK_API`）

```bash
npm install
npm run dev
```

浏览器打开：**http://localhost:3020**

---

## 五、钱包与网络

1. 在 MetaMask 添加本地网络：RPC `http://127.0.0.1:8545`，链 ID `31337`。  
2. 从 Anvil 启动日志里复制 **Account #0** 私钥导入钱包，或把测试 ETH 转到你的地址（Anvil 预置账户有余额）。  
3. 在网页上 **连接钱包** 并切换到该网络。

---

## 六、在界面里走通主流程

1. **Provider（提供者）**  
   - 打开 Provider 视图，用表单 **Register on Chain** 注册一个提供者（可用页面上的预设一键填表）。  
   - 等待交易确认后，列表中应能看到你的提供者。

2. **User（用户）**  
   - 切换到 User 视图，在市场中选择提供者，发起一次 **invoke**（模拟对话 / 调用）。  
   - 确认链上交易后，可在界面中看到调用记录与相关链上信息。

3. **审计（可选）**  
   - 若未启动审计服务，注册后前端仍会请求 `POST /v1/audit/trigger`，API 会返回不可用（503），**不影响注册与调用**。  
   - 要完整跑审计：先按下一节启动 **audit-server** 并配置 `apps/api/.env`，再注册新提供者，会触发一次审计并尝试 `recordAudit`。

---

## 七、（可选）启动审计服务并打通链上锚定

**终端 A — 审计服务：**

```bash
cd apps/audit-server
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -e ".[dev]"
uvicorn main:app --app-dir src --host 0.0.0.0 --port 8765
```

**`apps/api/.env` 建议配置（在已有变量基础上补充）：**

| 变量 | 示例 | 说明 |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | （你的 key） | 审计会请求 Relay，再由 Relay 访问 OpenRouter；无 key 时 Relay 为 echo，审计仍可跑通基础检查 |
| `AUDIT_SERVER_URL` | `http://127.0.0.1:8765` | 审计服务地址 |
| `MARKETPLACE_ADDRESS` | 与前端相同的合约地址 | 上链锚定用 |
| `AUDIT_PRIVATE_KEY` | 与 `contracts/.env` 中 `PRIVATE_KEY` **相同** | 必须是 `auditRecorder`，否则 `recordAudit` 会失败 |
| `CHAIN_RPC_URL` | `http://127.0.0.1:8545` | 与 Anvil 一致 |
| `CHAIN_ID` | `31337` | 与 Anvil 一致 |

重启 `npm run dev`（API）后，`GET http://127.0.0.1:8787/health` 中 `audit.onDemandReady` 应为 `true`（**不依赖** `OPENROUTER_API_KEY`；未配 key 时 relay 为 echo，仍可跑审计）。

**定时审计（可选）：** 另设 `AUDIT_INTERVAL_MS`（毫秒）> 0，并设 `AUDIT_PROVIDER_ID` 为要轮询的提供者 ID，API 会按间隔对固定 provider 跑审计；与「注册后触发一次」是两套机制，可并存。

---

## 端口一览

| 服务 | 默认地址 |
| --- | --- |
| Anvil | `http://127.0.0.1:8545` |
| Relay API | `http://127.0.0.1:8787` |
| 前端 | `http://localhost:3020` |
| Audit server | `http://127.0.0.1:8765` |

---

## 常见问题

- **前端读不到合约：** 检查 `NEXT_PUBLIC_MARKETPLACE_ADDRESS` 是否与部署地址一致，且钱包在 **31337**。  
- **调用失败 / 余额不足：** 确认 Anvil 账户有足够 ETH。  
- **审计锚定失败：** 核对 `AUDIT_PRIVATE_KEY` 是否与部署合约时使用的 `PRIVATE_KEY` 一致，且 `AUDIT_SERVER_URL`、审计进程已启动。  
- **注册后「Audit history」里没有记录：** 按需审计需要 **三件事同时满足**：① 本机已启动 **audit-server**（如 `8765` 端口）；② `apps/api/.env` 中已配置 `AUDIT_SERVER_URL`、`MARKETPLACE_ADDRESS`、`AUDIT_PRIVATE_KEY`（与部署者相同），并已 **重启 relay**；③ 前端 `NEXT_PUBLIC_MOCK_API` 指向该 relay（默认 `http://127.0.0.1:8787`）。注册成功后会弹出简短提示：若提示「Audit not configured」，说明 relay 侧未就绪；若提示失败，查看 **relay 终端日志** 与 **audit-server** 是否报错。审计为异步 HTTP，完成后在 User 侧打开 **Audit history** 点 **Refresh**。

更完整的变量说明见仓库根目录 `README.md` 的 **Environment Variables** 小节；仅终端、不用前端的流程见 `contracts/LOCAL_LOOP.md`。
