# DeOpenRouter 前端双角色视图设计

**日期**: 2026-04-17
**范围**: `apps/web` 前端重构，引入 User / Provider 双角色单页切换
**后端依赖**: 无（第一期使用静态 mock 数据，不接入合约/API）

---

## 1. 目标与非目标

### 目标
- 重构 `apps/web/src/app/page.tsx`，呈现 User 与 Provider 两套角色视图
- 顶部共享 Header 提供 Tab 切换；切换立即重渲染视图内容
- 两套视图完整呈现核心按钮与数据展示区，让未来接入后端时只需替换数据源
- 沿用现有视觉语言（`font-mono`、高对比黑白配色、`border-2`、`uppercase tracking-widest` 标签）
- 符合 frontend-design 理念：避免 AI 通用模板感，保持 DeOpenRouter 已有的 "terminal / 白皮书" 质感

### 非目标
- 不接入合约调用、不发起真实���易
- 不接入 mock API / audit-server
- 不引入路由（保持单页 `/`）
- 不新增设计 token 或颜色系统
- 不做移动端之外的额外响应式细化（沿用现有断点即可）

---

## 2. 架构

### 目录结构

```
apps/web/src/
├── app/
│   ├── page.tsx                   顶层容器：角色状态 + 视图分发
│   ├── layout.tsx                 (保留不动)
│   └── globals.css                (保留不动)
├── components/
│   ├── Header.tsx                 共享顶栏：logo + RoleTabs + 钱包占位
│   ├── RoleTabs.tsx               User / Provider 切换按钮组
│   ├── user/
│   │   ├── UserView.tsx           User 视图根组件（编排三大区块）
│   │   ├── UserDashboard.tsx      仪表盘三连卡
│   │   ├── ProviderMarketplace.tsx  列表 + 搜索 + 排序
│   │   ├── ProviderCard.tsx       单个 provider 卡片
│   │   └── MyCallHistory.tsx      我的调用历史表格
│   └── provider/
│       ├── ProviderView.tsx       Provider 视图根组件
│       ├── MyProviderCard.tsx     我的 provider 卡片 + 收益统计头
│       ├── ProviderRegisterForm.tsx  注册 / 编辑表单
│       └── ProviderCallLog.tsx    收到的调用表格
└── lib/
    ├── mockData.ts                静态 mock 数据导出
    └── marketplaceAbi.ts          (保留不动)
```

### 组件职责与边界

- **page.tsx**：仅持有 `role` 状态（`'user' | 'provider'`），渲染 `<Header>` 与对应视图。不含业务逻辑。
- **Header.tsx**：接收 `role` 与 `onRoleChange`，渲染品牌 logo + `<RoleTabs>` + 钱包按钮占位（纯 UI，不接 wagmi）。
- **RoleTabs.tsx**：受控组件；双按钮样式，激活态用反色（`bg-inverse text-inverse-fg`）。
- **UserView / ProviderView**：容器组件，从 `mockData.ts` 取数据并下发到子组件；所有交互通过同一个 `simulateAction(label)` 工具触发 toast。
- **子组件**：纯展示组件，props 只接收数据 + 回调。不直接 import mock 文件，便于未来替换数据源。

### 状态管理

- `useState<'user' | 'provider'>('user')` 置于 `page.tsx`，仅此一处全局状态
- Mock 数据为导入常量（不可变），不做内存修改
- 表单仅用本地 `useState` 持有输入，提交后清空 + toast，**不写回 mockData**（符合"无真实后端"原则）
- Toast：使用极简自建实现（一个 `useState<string | null>` + 2 秒 timeout），避免引入 `sonner`/`react-hot-toast` 依赖

---

## 3. 视图内容

### 3.1 Header（共享顶栏）

```
┌──────────────────────────────────────────────────────┐
│  DEOPEN                         [钱包: 0x1a…b2]      │
│  ROUTER                                              │
│  ──────────────────────────────────────────────────  │
│  DECENTRALIZED AI ROUTING · TRANSPARENT MARKETPLACE  │
│                                                      │
│    ┌─────────┐┌─────────────┐                        │
│    │ ▓ USER ▓││  PROVIDER   │   ← RoleTabs           │
│    └─────────┘└─────────────┘                        │
└──────────────────────────────────────────────────────┘
```

- 复用现有大号 `uppercase tracking-tighter` 标题
- 钱包按钮复用现有 wagmi hook（`useAccount` / `useConnect` / `useDisconnect`）显示地址与连接态，是本页面中唯一保留的真实后端交互点——因为它属于钱包连接而非业务后端
- Tabs 位于标题栏底部，粗边框、方正角、无圆角

### 3.2 User 视图

三个区块垂直堆叠，区块间用 `border-t-2 border-theme` 分隔：

**(a) UserDashboard**：三连卡（余额 / 总花费 / 调用次数），每卡 `border-2 p-6`，数字用大号字体 + 小字 uppercase 标签。

**(b) ProviderMarketplace**：
- 顶部一行：搜索框（modelId 关键词）+ 排序下拉（价格 / 风险）
- 卡片网格（`grid md:grid-cols-2 lg:grid-cols-3`）
- 每张卡：modelId、endpoint 截断、价格、stake、风险徽章（LOW/MED/HIGH 配色：muted/黄/红），一个 `[INVOKE]` 按钮 → toast

**(c) MyCallHistory**：
- 表格：provider | 模型 | 时间 | 花费 | reqHash (截断)
- 空状态：`"NO CALLS YET"` 居中 uppercase

### 3.3 Provider 视图

三个区块垂直堆叠：

**(a) MyProviderCard**：
- 顶部统计条：总调用数 / 累计收益 / 当前质押
- 下方大卡：modelId、endpoint、price、stake、active 状态徽章
- 右下三按钮：`[EDIT]` `[DEACTIVATE]` `[WITHDRAW STAKE]` → 全部 toast

**(b) ProviderRegisterForm**：
- 字段：modelId / endpoint / pricePerCall (ETH) / stake (ETH) / metadataURI / identityHash
- 提交按钮 `[SIMULATE REGISTER]`，提交后 toast + 重置表单
- 编辑模式：从 `MyProviderCard` 点 `[EDIT]` 时滚动到表单并预填当前值（用 `useRef` + `scrollIntoView`）

**(c) ProviderCallLog**：
- 表格：caller | 时间 | 金额 | reqHash | responseHash
- 无分页（mock 只 6-8 条）

---

## 4. 数据契约

```ts
// src/lib/mockData.ts

export type RiskLevel = 'low' | 'medium' | 'high';

export interface MockProvider {
  id: number;
  owner: `0x${string}`;
  modelId: string;
  endpoint: string;
  pricePerCall: string;  // ETH, 字符串避免精度问题
  stake: string;
  active: boolean;
  risk: RiskLevel;
  metadataURI: string;
  identityHash: `0x${string}`;
}

export interface MockCall {
  id: number;
  providerId: number;
  caller: `0x${string}`;
  amount: string;
  requestHash: `0x${string}`;
  responseHash: `0x${string}`;
  timestamp: number;  // unix seconds
  modelId: string;    // 冗余，方便表格展示
}

export interface MockUserStats {
  balance: string;
  totalSpent: string;
  callCount: number;
}

export interface MockProviderStats {
  totalCalls: number;
  totalEarned: string;
  currentStake: string;
}

export const mockProviders: MockProvider[];        // 4-5 条
export const mockUserCalls: MockCall[];            // 6-8 条（当前 user 视角）
export const mockProviderCalls: MockCall[];        // 6-8 条（当前 provider 视角）
export const mockMyProvider: MockProvider;         // 当前 user 作为 provider 的那条
export const mockUserStats: MockUserStats;
export const mockProviderStats: MockProviderStats;

export const CURRENT_USER_ADDRESS: `0x${string}` = '0x1a2b3c...';
```

子组件只接 props，不直接 import mock——未来替换数据源时只改两个 View 容器。

---

## 5. 视觉与风格

### 沿用
- 配色：`--background` / `--foreground` / `--border` / `--muted` / `--inverse-*`（globals.css 已定义）
- 字体：`font-mono`（Geist Mono）
- 边框：`border-2 border-theme`
- 标签：`uppercase tracking-widest text-xs text-muted font-bold`
- 按钮：方正、无圆角、hover 反色
- 标题：`uppercase tracking-tighter font-bold`

### frontend-design 理念落地
- **非通用 AI 感**：避免 rounded-xl + 柔色渐变 + emoji 装饰；保持 terminal / brutalist 白皮书质感
- **信息密度高**：表格多用等宽字体，哈希值截断 `0xab…cd` 形式
- **动态元素克制**：hover 仅切反色，不做位移/阴影动画；活跃状态用粗下划线 `border-b-4` 而非颜色块
- **状态可读**：风险徽章用文字 + 不同边框厚度，而非纯颜色（可访问性）
- **留白**：区块间用 `border-t-2` 硬分隔，不依赖阴影或背景色

### 响应式
- 沿用现有 `sm:` `md:` `lg:` 断点
- Dashboard 三连卡：`grid-cols-1 md:grid-cols-3`
- Provider 卡片：`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- 表格：小屏用 `overflow-x-auto` 水平滚动，不做卡片化回退（保持一致性）

---

## 6. 交互策略（无后端）

所有按钮走统一函数：

```ts
function simulateAction(label: string) {
  showToast(`${label.toUpperCase()} — SIMULATED (NO BACKEND)`);
}
```

- Toast 样式：屏幕底部中央，`border-2` 黑白反色，2 秒自动消失
- 表单提交：验证必填 + 格式（ETH 数字 / 0x 前缀），通过则 toast + reset
- 无乐观更新：按钮点击不改变卡片状态（避免用户误以为已生效）
- 例外：`[DEACTIVATE]` / `[WITHDRAW]` 这类破坏性操作，toast 文案写 `"SIMULATED — WOULD CALL deactivate()"`，让意图清晰

---

## 7. 测试策略

本次不引入测试框架（项目当前无 web 测试套件）。验证手段：

- 手动过一遍：启动 `pnpm dev`（或项目实际命令），切换 Tab，点击每个按钮确认 toast，填写表单确认验证与重置
- 两个断点：桌面（1440）+ 手机（375）各过一次
- 后续接入真实数据时再引入 Vitest / Playwright

---

## 8. 实施顺序（供 writing-plans 参考）

1. 建立 `mockData.ts`（类型 + 常量）
2. 抽 `Header` + `RoleTabs`，替换现有 header 部分
3. 改造 `page.tsx`：只保留容器 + role 状态
4. 实现 `UserView` + 三个子组件
5. 实现 `ProviderView` + 三个子组件
6. 加入简易 toast
7. 响应式 + 视觉打磨
8. 手动验证清单

---

## 9. 取舍与风险

- **风险 1**：现有 `page.tsx` 的 wagmi 钱包连接逻辑会被整体替换 → 保留 `marketplaceAbi.ts`，Header 里保留钱包按钮视觉占位，未来一次性接回。
- **风险 2**：mockData 为只读常量 → 表单提交后 UI 看不到"新增"效果，可能让用户感觉按钮无反应 → 用 toast 明确"SIMULATED"消除歧义。
- **取舍**：不引入 React Context 或 Zustand——仅一个 role 状态，prop drilling 成本极低。
- **取舍**：不引入第三方 toast 库——保持 `package.json` 干净，20 行自建足够。

---

## 10. 完成标准

- [ ] 顶部 Header 显示双 Tab，点击即时切换
- [ ] User 视图三个区块全部渲染 mock 数据
- [ ] Provider 视图三个区块全部渲染 mock 数据
- [ ] 所有按钮点击触发 toast
- [ ] 表单验证必填 + 数字格式
- [ ] 桌面 + 手机两个断点视觉正常
- [ ] 沿用现有 mono/brutalist 风格，无引入 rounded-xl / 渐变 / emoji
