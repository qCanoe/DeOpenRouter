# DeOpenRouter Presentation Script

This script is designed for a 12-minute presentation, covering the first 9 slides. The pacing is approximately 1 minute and 15 seconds to 1 minute and 30 seconds per slide.

---

### Slide 1: Title (0:00 - 1:00) 
**【EN】**
Good morning, everyone. I’m excited to walk you through our course project, **DeOpenRouter**.

At a high level, it’s a prototype marketplace for AI APIs that tries to be transparent and “low-trust” on the parts that matter most. In plain English: we keep the heavy model inference off-chain so it stays fast and practical, but we move the trust-sensitive stuff—like coordination, pricing, and payments—on-chain so the rules are easier to verify and harder to quietly rewrite.

**【CN】**
各位评委、同学大家早上好。今天我非常荣幸为大家展示我们的课程项目：**DeOpenRouter**。
这是一个透明的、低信任假设的 AI API 市场原型。在 AI 普及的今天，我们这个项目的核心目标是搭建一座安全的桥梁：为了保证性能，我们将繁重的大模型推理保留在链下；但为了保证透明度，我们将信任协调、定价和支付结算迁移到了区块链上。

---

### Slide 2: Background (1:00 - 2:15)
**【EN】**
Let’s start with why this project exists.

We’re living through a boom in LLMs and AI apps. If you’re a developer and you want to call lots of different models, you usually end up juggling a pile of APIs, auth flows, and billing systems. It’s painful.

That’s why centralized AI gateways—think something like OpenRouter—became popular. They sit in the middle: one API surface, one place to route traffic, one place to settle costs. That’s genuinely useful—it lowers friction.

But here’s the tradeoff: once everything funnels through one operator, access to AI becomes, in practice, centralized again.

**【CN】**
首先我们来看看行业背景。我们正处在大语言模型和 AI 应用爆发的时代。开发者如果想接入各种不同的模型，往往要面对极其繁杂的 API 接口和计费系统。
为了解决这个问题，像 OpenRouter 这样的“中心化 AI 网关”应运而生。它们作为聚合器，只提供一个统一的 API 就能路由到不同的模型，并统一结算费用，这大大降低了开发门槛。然而，这也导致了一个现实局面：我们对 AI 能力的获取，严重依赖于少数几个中心化的平台。

---

### Slide 3: Problem (2:15 - 3:30)
**【EN】**
So what’s the problem with that setup?

These gateways are convenient, but they’re also trust-heavy. A lot of important decisions—pricing, routing, billing, even disputes—end up bundled behind one company.

As a user, it’s hard to independently check things like: “Did the routing rules change without me noticing?” “Did I actually get charged what was advertised?” “Could someone rewrite the record after the fact?”

That’s the question DeOpenRouter is built around: **Which parts of this workflow should live on an EVM so the rules and settlement are public, inspectable, and harder to tamper with—without pretending we can magically put full inference on-chain?**

**【CN】**
这就引出了我们的核心痛点：中心化 AI 网关的“信任假设”太重了，它们本质上是一个黑盒。
它们将定价、路由、计费和争议处理全部集中在一个运营方手中。虽然用起来方便，但作为用户，我们根本无法验证：路由规则是不是被暗中修改了（比如模型被悄悄降级）？扣费是不是完全符合公开策略？或者调用记录事后有没有被篡改？
因此，我们这个项目的切入点是：**在这个工作流中，到底哪些部分应该放到区块链上，从而让规则和结算变得公开可见且难以篡改？**

---

### Slide 4: Solutions (3:30 - 4:45)
**【EN】**
Our answer is a hybrid design.

We don’t try to force model inference on-chain—that’s not realistic for latency and cost. Instead, we pull the trust boundary forward: the things you want to be able to audit and argue about later.

Concretely: providers register publicly with commitments and metadata. Price changes aren’t instant—there’s a visible delay window so users aren’t hit by surprise “rug-pull” pricing. Each paid call leaves an on-chain trail you can point to later.

And if something goes wrong, stake can be challenged through an on-chain slashing flow, while audit outcomes can be anchored as hashes—so you’re not just trusting a blog post; you’re anchoring evidence.

**【CN】**
这是我们的解决方案。我们采用了一种混合架构，严格将“计算”与“结算”分离。
我们没有强行把 AI 推理放到链上，而是把“信任边界”移到了链上。提供方必须在区块链上公开注册他们的身份和元数据。当他们想要修改价格时，不能即时生效，而是必须经过一个可观察的区块延迟，以此防止突袭式的恶意涨价。
此外，每一次付费调用都会留下可审计的链上记录。最关键的是，如果提供方作恶，可以通过链上提案扣除他们的质押金，同时外部的审计结果也会以密码学哈希的形式安全地锚定在链上。

---

### Slide 5: System (4:45 - 6:00)
**【EN】**
If you want the mental model, the system is basically four pieces working together.

First, a **Solidity marketplace contract**—that’s where registration, delayed pricing, per-call settlement, and slashing hooks live.

Second, a **Next.js web app**—two modes: users browse and invoke, providers manage their listing.

Third, a **Relay API**—this is where the actual chat traffic goes; it can run locally in mock mode or proxy upstream.

And fourth, an **audit server** in Python/FastAPI—this probes the relay in a structured way and can write summaries back on-chain.

**【CN】**
为了实现这一构想，我们的系统主要由四个组件构成。
首先是用 Solidity 编写的**智能合约市场**，负责注册、延迟定价、清算和罚没机制。
其次是基于 Next.js 构建的 **Web 前端**，它既是用户浏览市场的界面，也是提供方管理节点的后台。
第三是 **Relay API（中继接口）**，它负责承载实际的 AI 推理流量，作为上游模型的代理。
最后是一个独立的**审计服务器（Audit Server）**，基于 Python 和 FastAPI 构建，它负责对中继节点进行结构化检查，并将审计摘要写回链上。

---

### Slide 6: Work Flow (6:00 - 7:30)
**【EN】**
Let me walk you through the end-to-end flow using the diagram.

You’ll see a dashed line: on the left is on-chain EVM, on the right is off-chain reality.

Step one: a provider registers on-chain and locks stake.

Step two: a user picks a provider in the web app and talks to the relay off-chain—fast, no gas for the chat itself.

Steps three and four: after you get a response, the client hashes the request and response and calls `invoke()` with payment. The contract settles the fee and emits `CallRecorded`—that’s your receipt.

Step five: if auditing is enabled, the audit service probes the relay off-chain, then anchors a report hash on-chain—so the “health check” isn’t just vibes; it leaves a trace.

**【CN】**
让我们结合右侧的架构图，过一遍端到端的工作流。大家注意中间这条虚线，它分隔了“链上”和“链下”环境。
第 1 步：提供方跨越边界在链上注册，并锁入质押金。
第 2 步：用户在链下浏览网页，选中提供方后，直接通过绿色的 Relay API 进行快速、零 Gas 费的 AI 推理聊天。
第 3 和第 4 步：推理完成后，客户端将请求和回答的哈希值打包，带着 ETH 调用链上的 `invoke()`。智能合约瞬间完成费用的去信任化清算，并开出 `CallRecorded` 的链上凭证。
第 5 步：粉色的审计服务器会定期在后台探测中继节点，并通过 `recordAudit` 将“健康体检报告”作为铁证锚定到区块链上。

---

### Slide 7: Governance (7:30 - 8:45)
**【EN】**
Okay—what if a provider misbehaves?

We model governance and slashing explicitly. On the left you’ll see a simple lifecycle: `proposeSlash`, then a window where the provider can `challengeSlashProposal`, and finally `finalizeSlashProposal` if nothing blocks it.

Two things I want you to remember.

First, slashed funds are meant to go to a configurable `slashTreasury`—not automatically into the operator’s pocket—so the incentives aren’t “slash and profit.”

Second, sensitive role changes use a two-step propose/accept pattern, which is boring on paper but really matters when you’re trying not to brick a multisig deployment.

**【CN】**
那么，如果提供方作恶会发生什么？我们引入了严格的治理与罚没（Slashing）架构。
看左侧，我们设计了三段式的罚没生命周期：首先通过 `proposeSlash()` 发起处罚。但我们会给提供方一个申诉窗口，他们可以通过 `challenge` 暂停处决。如果无人申诉，最后执行 `finalize`。
非常重要的一点是，没收的 ETH 会直接流入公共的 `slashTreasury`（国库），而不是给操作员。这种利益分离彻底杜绝了“为了私吞资产而恶意举报”的动机。此外，我们对关键角色的交接也强制使用了“提议-接收”的两步握手，确保安全。

---

### Slide 8: Audit Capability (8:45 - 10:15)
**【EN】**
On the audit side, we’re not hand-waving “security.”

The audit server runs a structured battery of checks and summarizes risk in a 6D-style matrix—things like injection and override behavior, tool substitution, error leakage, stream integrity, and optional Web3-focused probes.

The important part for a live demo: it doesn’t just print vibes. It produces structured JSON, then we canonicalize it and hash it so the same report always maps to the same hash. That hash gets anchored on-chain so anyone can later say, “This is the exact artifact we committed to.”

**【CN】**
为了精准捕捉这些恶意行为，我们的审计服务器采用了全面的 6D 风险矩阵。
它会主动探测 API，检查是否存在：隐藏提示词注入与指令覆盖（D1-D2），工具调用篡改（比如投毒包）与错误信息泄露（D3-D4），以及流式数据异常和针对 Web3 钱包的危险注入（D5-D6）。
为了避免误判，FastAPI 服务不依赖主观的 AI 评价，而是通过确定性规则输出严格的 LOW、MEDIUM 或 HIGH 评级。最终，这份 JSON 报告会被规范序列化并哈希，生成确定性的铁证，永久锚定在区块链上。

---

### Slide 9: Weakness & Future Dev (10:15 - 11:45)
**【EN】**
Before we wrap this section, I want to be upfront about what this is—and what it isn’t.

We did move a lot of settlement and audit anchoring on-chain, which is real progress for transparency. But economic safety still depends on how you configure multisigs and treasuries in practice.

This is an MVP: there’s no full decentralized arbitration market here, and we’re not claiming cryptographic proof that a model “thought correctly.”

If you’re thinking roadmap: tighten governance first, make published audit artifacts easier to fetch and verify—think IPFS-style hosting—and only then chase heavier crypto primitives like TEEs, ZK, or AVS for very specific high-value claims.

**【CN】**
在结束之前，我们必须对项目的局限性和未来发展保持诚实。
虽然我们成功将结算和审计移到了链上，但目前的经济安全仍然高度依赖于多签和国库操作员的诚实度。
这只是一个最小可行性产品（MVP）。我们目前还没有完全去中心化的仲裁市场，也没有对 AI 推理过程进行密码学证明。因此我们的路线图很清晰：首先，进一步强化多签治理；其次，通过 IPFS 提升审计证据的可用性；最后，在未来针对高价值场景，引入 TEE（可信执行环境）、零知识证明（ZK）或 AVS 等高级密码学技术。

---

### Closing (11:45 - 12:00)
**【EN】**
Thanks for listening. On the next slides, we’ll zoom into the contract mechanics that make this story concrete.

**【CN】**
感谢大家的聆听。在接下来的 Deep Dive 环节中，我们将深入探讨实现这些功能的智能合约源码细节。
