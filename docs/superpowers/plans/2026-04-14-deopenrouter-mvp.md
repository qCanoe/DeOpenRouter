# DeOpenRouter MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an end-to-end prototype: Solidity marketplace (register providers with stake, pay-per-call, immutable call log via events), a minimal chain-off mock inference HTTP API, and a Next.js wallet UI to browse providers, get a mock completion, hash request/response, and submit one `invoke` transaction on a local chain.

**Architecture:** Foundry contract is the trust anchor for pricing, provider metadata, stake, and per-call payment + `(requestHash, responseHash)` audit trail. Inference stays off-chain; the API returns deterministic mock text so hashes are reproducible. The web app uses viem/wagmi against Anvil (or a testnet) and never sends private keys to the API—only JSON for mock completion.

**Tech Stack:** Solidity ^0.8.24, Foundry (forge/forge-std/anvil/cast), Node.js 20+, TypeScript 5+, Hono 4, Next.js 14 (App Router), wagmi 2 + viem 2 + @tanstack/react-query, Tailwind CSS 3.

---

## File structure (greenfield)


| Path                                           | Responsibility                                                                                            |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `contracts/foundry.toml`                       | Solidity version, optimizer, remappings                                                                   |
| `contracts/src/DeOpenRouterMarketplace.sol`    | Register, stake lock, deactivate, invoke + pay, `CallRecorded` event                                      |
| `contracts/test/DeOpenRouterMarketplace.t.sol` | Unit tests (registration, invoke pay, events)                                                             |
| `contracts/script/Deploy.s.sol`                | Deploy to Anvil                                                                                           |
| `apps/api/package.json`                        | API dependencies                                                                                          |
| `apps/api/tsconfig.json`                       | TS strict config                                                                                          |
| `apps/api/src/index.ts`                        | Hono server: `GET /health`, `POST /v1/chat` mock completion                                               |
| `apps/web/`                                    | Next.js app: list providers, chat mock, hash + `invoke` tx                                                |
| `apps/web/src/lib/marketplaceAbi.ts`           | Exported minimal ABI for `providers`, `nextProviderId`, `invoke`, `register`                              |
| `.gitignore`                                   | Ignore `out/`, `cache/`, `node_modules/`, `.next/`                                                        |
| `README.md`                                    | How to run Anvil, deploy, API, web (minimal; optional for repo, not duplicated in tasks beyond bootstrap) |


Files that change together for the demo: contract ABI slice on the web when `DeOpenRouterMarketplace.sol` changes—regenerate ABI JSON or hand-update `marketplaceAbi.ts` in the same commit as Solidity changes.

---

### Task 1: Repository root and `.gitignore`

**Files:**

- Create: `C:\Users\yeste\OneDrive\Desktop\code\DeOpenRouter\.gitignore`
- Modify: (none)
- **Step 1: Create ignore rules**

```gitignore
node_modules/
.next/
out/
cache/
broadcast/
.env
.env.local
*.log
```

- **Step 2: Initialize git from repo root**

Run (PowerShell):

```powershell
cd C:\Users\yeste\OneDrive\Desktop\code\DeOpenRouter
git init
```

Expected: `Initialized empty Git repository` (or message that `.git` exists).

- **Step 3: Commit**

```powershell
git add .gitignore
git commit -m "chore: add root gitignore for node and foundry artifacts"
```

---

### Task 2: Foundry project scaffolding

**Files:**

- Create: `contracts/foundry.toml` (merge with `forge init` output)

`foundry.toml` must include at least:

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.24"
optimizer = true
optimizer_runs = 200
```

- **Step 1: Install Foundry (if missing)**

Run:

```powershell
forge --version
```

Expected: version string. If command missing, install per [https://getfoundry.sh/](https://getfoundry.sh/) then re-run.

- **Step 2: Initialize in `contracts`**

Run:

```powershell
cd C:\Users\yeste\OneDrive\Desktop\code\DeOpenRouter\contracts
forge init --no-commit --force
```

Expected: `src/`, `test/`, `script/`, `lib/forge-std` created.

- **Step 3: Replace default `Counter.sol` path — delete sample**

Delete `contracts/src/Counter.sol`, `contracts/test/Counter.t.sol`, `contracts/script/Counter.s.sol` if present.

- **Step 4: Merge `foundry.toml`**

Ensure `contracts/foundry.toml` contains the table above (merge optimizer settings if `forge init` created defaults).

- **Step 5: Verify compile (empty or after next task)**

Run:

```powershell
cd C:\Users\yeste\OneDrive\Desktop\code\DeOpenRouter\contracts
forge build
```

Expected: Pass after `DeOpenRouterMarketplace.sol` exists; until then Step 5 can wait until Task 3 complete.

- **Step 6: Commit**

```powershell
cd C:\Users\yeste\OneDrive\Desktop\code\DeOpenRouter
git add contracts
git commit -m "chore(contracts): scaffold foundry project"
```

---

### Task 3: Failing Foundry test first (TDD) — `register` requires `MIN_STAKE`

**Files:**

- Create: `contracts/test/DeOpenRouterMarketplace.t.sol`
- Create: `contracts/src/DeOpenRouterMarketplace.sol` (stub only if needed)
- **Step 1: Add test file without full implementation**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/DeOpenRouterMarketplace.sol";

contract DeOpenRouterMarketplaceTest is Test {
    DeOpenRouterMarketplace public m;

    function setUp() public {
        m = new DeOpenRouterMarketplace();
    }

    function test_register_reverts_below_min_stake() public {
        vm.expectRevert(DeOpenRouterMarketplace.InvalidStake.selector);
        m.register{value: 0}("m1", "http://localhost:8787", 1 ether);
    }

    function test_register_emits_and_increments() public {
        vm.deal(address(this), 10 ether);
        vm.expectEmit(true, true, true, true);
        emit DeOpenRouterMarketplace.ProviderRegistered(
            0,
            address(this),
            "m1",
            "http://localhost:8787",
            1 ether,
            DeOpenRouterMarketplace.MIN_STAKE()
        );
        m.register{value: DeOpenRouterMarketplace.MIN_STAKE()}("m1", "http://localhost:8787", 1 ether);
        assertEq(m.nextProviderId(), 1);
        (address owner,,,, uint256 stake, bool active) = m.providers(0);
        assertEq(owner, address(this));
        assertEq(stake, DeOpenRouterMarketplace.MIN_STAKE());
        assertTrue(active);
    }
}
```

- **Step 2: Run tests — expect failure**

Run:

```powershell
cd C:\Users\yeste\OneDrive\Desktop\code\DeOpenRouter\contracts
forge test -vvv
```

Expected: **FAIL** — `DeOpenRouterMarketplace` not found or compile error.

- **Step 3: Commit test**

```powershell
git add contracts/test/DeOpenRouterMarketplace.t.sol
git commit -m "test(contracts): add marketplace registration tests"
```

---

### Task 4: Implement `DeOpenRouterMarketplace.sol` to pass tests + invoke flow tests added

**Files:**

- Create: `contracts/src/DeOpenRouterMarketplace.sol`
- **Step 1: Implement full contract**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract DeOpenRouterMarketplace {
    uint256 public constant MIN_STAKE = 0.01 ether;

    struct Provider {
        address owner;
        string modelId;
        string endpoint;
        uint256 pricePerCall;
        uint256 stake;
        bool active;
    }

    uint256 public nextProviderId;
    mapping(uint256 => Provider) public providers;

    event ProviderRegistered(
        uint256 indexed id,
        address indexed owner,
        string modelId,
        string endpoint,
        uint256 pricePerCall,
        uint256 stake
    );
    event CallRecorded(
        uint256 indexed providerId,
        address indexed caller,
        bytes32 requestHash,
        bytes32 responseHash,
        uint256 paid
    );

    error InvalidStake();
    error ProviderInactive();
    error PaymentTooLow();
    error NotOwner();

    function register(string calldata modelId, string calldata endpoint, uint256 pricePerCall) external payable {
        if (msg.value < MIN_STAKE) revert InvalidStake();
        uint256 id = nextProviderId++;
        providers[id] = Provider({
            owner: msg.sender,
            modelId: modelId,
            endpoint: endpoint,
            pricePerCall: pricePerCall,
            stake: msg.value,
            active: true
        });
        emit ProviderRegistered(id, msg.sender, modelId, endpoint, pricePerCall, msg.value);
    }

    function deactivate(uint256 providerId) external {
        Provider storage p = providers[providerId];
        if (msg.sender != p.owner) revert NotOwner();
        p.active = false;
    }

    function invoke(uint256 providerId, bytes32 requestHash, bytes32 responseHash) external payable {
        Provider storage p = providers[providerId];
        if (!p.active) revert ProviderInactive();
        if (msg.value < p.pricePerCall) revert PaymentTooLow();
        uint256 paid = p.pricePerCall;
        uint256 refund = msg.value - paid;
        (bool okOwner,) = p.owner.call{value: paid}("");
        require(okOwner, "pay owner");
        if (refund > 0) {
            (bool okRefund,) = msg.sender.call{value: refund}("");
            require(okRefund, "refund");
        }
        emit CallRecorded(providerId, msg.sender, requestHash, responseHash, paid);
    }

    function withdrawStake(uint256 providerId) external {
        Provider storage p = providers[providerId];
        if (msg.sender != p.owner) revert NotOwner();
        if (p.active) revert ProviderInactive();
        uint256 s = p.stake;
        if (s == 0) revert InvalidStake();
        p.stake = 0;
        (bool ok,) = msg.sender.call{value: s}("");
        require(ok, "withdraw");
    }
}
```

- **Step 2: Append tests for invoke in `contracts/test/DeOpenRouterMarketplace.t.sol`**

Add inside `contract DeOpenRouterMarketplaceTest`:

```solidity
    function test_invoke_reverts_inactive() public {
        vm.deal(address(this), 20 ether);
        m.register{value: DeOpenRouterMarketplace.MIN_STAKE()}("m1", "http://x", 1 ether);
        m.deactivate(0);
        vm.expectRevert(DeOpenRouterMarketplace.ProviderInactive.selector);
        m.invoke{value: 2 ether}(0, bytes32(uint256(1)), bytes32(uint256(2)));
    }

    function test_invoke_pays_owner_and_records() public {
        address ownerBob = address(0xB0B);
        vm.deal(ownerBob, 20 ether);
        vm.startPrank(ownerBob);
        m.register{value: DeOpenRouterMarketplace.MIN_STAKE()}("m1", "http://x", 1 ether);
        vm.stopPrank();
        address userAlice = address(0xA11CE);
        vm.deal(userAlice, 5 ether);
        vm.startPrank(userAlice);
        bytes32 rq = keccak256("req");
        bytes32 rs = keccak256("res");
        vm.expectEmit(true, true, true, true);
        emit DeOpenRouterMarketplace.CallRecorded(0, userAlice, rq, rs, 1 ether);
        m.invoke{value: 2 ether}(0, rq, rs);
        vm.stopPrank();
        assertEq(userAlice.balance, 4 ether);
        assertEq(ownerBob.balance, 20 ether - DeOpenRouterMarketplace.MIN_STAKE() + 1 ether);
    }
```

**Exact balances:** Alice ends with `4 ether` (paid `2 ether`, refunded `1 ether`). Bob ends with `20 ether - MIN_STAKE + 1 ether` (invoke payment). These tests do not account for gas; `vm.deal` ensures solvency. If gas breaks exact equality for Alice, switch to `assertGe`/`assertApproxEqAbs` with a small epsilon—only if observed in CI.

- **Step 3: Run full suite**

Run:

```powershell
forge test -vvv
```

Expected: **PASS** all.

- **Step 4: Commit**

```powershell
git add contracts/src/DeOpenRouterMarketplace.sol contracts/test/DeOpenRouterMarketplace.t.sol
git commit -m "feat(contracts): add DeOpenRouter marketplace and tests"
```

---

### Task 5: Deploy script for Anvil

**Files:**

- Create: `contracts/script/Deploy.s.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/DeOpenRouterMarketplace.sol";

contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        new DeOpenRouterMarketplace();
        vm.stopBroadcast();
    }
}
```

- **Step 1: Add script, compile**

Run:

```powershell
cd C:\Users\yeste\OneDrive\Desktop\code\DeOpenRouter\contracts
forge build
```

Expected: success.

- **Step 2: Commit**

```powershell
git add contracts/script/Deploy.s.sol
git commit -m "feat(contracts): add anvil deploy script"
```

---

### Task 6: Mock inference API (Hono)

**Files:**

- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/index.ts`

`package.json`:

```json
{
  "name": "deopenrouter-api",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "build": "tsc -p ."
  },
  "dependencies": {
    "@hono/node-server": "^1.13.0",
    "hono": "^4.6.0"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

`src/index.ts`:

```typescript
import { serve } from "@hono/node-server";
import { Hono } from "hono";

const app = new Hono();

app.get("/health", (c) => c.json({ ok: true }));

app.post("/v1/chat", async (c) => {
  let body: { prompt?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  const response = `echo:${prompt}`;
  return c.json({ model: "mock-mvp", response });
});

const port = Number(process.env.PORT ?? "8787");
serve({ fetch: app.fetch, port });
console.log(`[api] listening on http://127.0.0.1:${port}`);
```

- **Step 1: Install deps**

Run:

```powershell
cd C:\Users\yeste\OneDrive\Desktop\code\DeOpenRouter\apps\api
npm install
```

- **Step 2: Run server**

Run:

```powershell
npm run dev
```

Expected: log `listening on http://127.0.0.1:8787`.

- **Step 3: Manual HTTP check (second terminal)**

Run:

```powershell
curl -s http://127.0.0.1:8787/health
curl -s -H "content-type: application/json" -d "{\"prompt\":\"hi\"}" http://127.0.0.1:8787/v1/chat
```

Expected: `{"ok":true}` and JSON with `echo:hi`.

- **Step 4: Commit**

```powershell
cd C:\Users\yeste\OneDrive\Desktop\code\DeOpenRouter
git add apps/api
git commit -m "feat(api): add mock chat completion server"
```

---

### Task 7: Next.js web app + wagmi + minimal ABI

**Files:**

- Create under `apps/web/`: Next.js 14 app with App Router (use `npx create-next-app@14` non-interactive)

Generation command:

```powershell
cd C:\Users\yeste\OneDrive\Desktop\code\DeOpenRouter\apps
npx create-next-app@14 web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --turbopack
```

Answer file creation prompts by flags only; if CLI still asks, choose default YES for ESLint.

Install wallet stack:

```powershell
cd C:\Users\yeste\OneDrive\Desktop\code\DeOpenRouter\apps\web
npm install wagmi viem@2 @tanstack/react-query
```

- **Step 1: Add `apps/web/src/lib/marketplaceAbi.ts`**

```typescript
export const marketplaceAbi = [
  { type: "function", name: "nextProviderId", stateMutability: "view", inputs: [], outputs: [{ type: "uint256", name: "" }] },
  {
    type: "function",
    name: "providers",
    stateMutability: "view",
    inputs: [{ type: "uint256", name: "" }],
    outputs: [
      { type: "address", name: "owner" },
      { type: "string", name: "modelId" },
      { type: "string", name: "endpoint" },
      { type: "uint256", name: "pricePerCall" },
      { type: "uint256", name: "stake" },
      { type: "bool", name: "active" },
    ],
  },
  {
    type: "function",
    name: "register",
    stateMutability: "payable",
    inputs: [
      { type: "string", name: "modelId" },
      { type: "string", name: "endpoint" },
      { type: "uint256", name: "pricePerCall" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "invoke",
    stateMutability: "payable",
    inputs: [
      { type: "uint256", name: "providerId" },
      { type: "bytes32", name: "requestHash" },
      { type: "bytes32", name: "responseHash" },
    ],
    outputs: [],
  },
] as const;
```

- **Step 2: Add `apps/web/src/lib/wagmi.ts`**

```typescript
import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { anvil } from "wagmi/chains";

export const config = createConfig({
  chains: [anvil],
  connectors: [injected()],
  transports: {
    [anvil.id]: http(process.env.NEXT_PUBLIC_ANVIL_RPC ?? "http://127.0.0.1:8545"),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
```

- **Step 3: Add `apps/web/src/components/providers.tsx`**

```typescript
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { config } from "@/lib/wagmi";
import { ReactNode, useState } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
```

- **Step 4: Modify `apps/web/src/app/layout.tsx`** — wrap children with `Providers`.

Example body:

```tsx
import { Providers } from "@/components/providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- **Step 5: Replace `apps/web/src/app/page.tsx` with MVP UI**

```tsx
"use client";

import { useMemo, useState } from "react";
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useReadContract,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { marketplaceAbi } from "@/lib/marketplaceAbi";
import { keccak256, stringToHex, formatEther } from "viem";

const MOCK_API =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_MOCK_API ?? "http://127.0.0.1:8787"
    : "http://127.0.0.1:8787";

export default function Page() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const marketplace = (process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS ??
    "0x0000000000000000000000000000000000000000") as `0x${string}`;

  const { data: nextId } = useReadContract({
    address: marketplace,
    abi: marketplaceAbi,
    functionName: "nextProviderId",
    query: { enabled: marketplace !== "0x0000000000000000000000000000000000000000" },
  });

  const ids = useMemo(() => {
    const n = nextId ?? 0n;
    return Array.from({ length: Number(n) }, (_, i) => BigInt(i));
  }, [nextId]);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">DeOpenRouter MVP</h1>
        <p className="text-sm text-neutral-600">
          Local Anvil + mock API. Set <code>NEXT_PUBLIC_MARKETPLACE_ADDRESS</code> after deploy.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {!isConnected ? (
            <button
              type="button"
              className="rounded bg-black px-3 py-1.5 text-sm text-white"
              onClick={() => connect({ connector: connectors[0] })}
            >
              Connect
            </button>
          ) : (
            <button type="button" className="rounded border px-3 py-1.5 text-sm" onClick={() => disconnect()}>
              Disconnect {address?.slice(0, 6)}…
            </button>
          )}
          {chainId !== 31337 ? (
            <button
              type="button"
              className="rounded border px-3 py-1.5 text-sm"
              onClick={() => switchChain({ chainId: 31337 })}
            >
              Switch to Anvil (31337)
            </button>
          ) : (
            <span className="text-sm text-green-700">Chain: Anvil</span>
          )}
        </div>
      </header>

      <section className="flex flex-col gap-3 rounded border p-4">
        <h2 className="font-medium">Providers</h2>
        {ids.length === 0 ? <p className="text-sm text-neutral-600">No providers yet.</p> : null}
        {ids.map((id) => (
          <ProviderRow key={id.toString()} marketplace={marketplace} providerId={id} mockApi={MOCK_API} />
        ))}
      </section>
    </main>
  );
}

function ProviderRow({
  marketplace,
  providerId,
  mockApi,
}: {
  marketplace: `0x${string}`;
  providerId: bigint;
  mockApi: string;
}) {
  const { data: p } = useReadContract({
    address: marketplace,
    abi: marketplaceAbi,
    functionName: "providers",
    args: [providerId],
  });
  const [prompt, setPrompt] = useState("hello");
  const [lastHashes, setLastHashes] = useState<{ rq: string; rs: string } | null>(null);
  const { writeContractAsync, isPending } = useWriteContract();

  if (!p) return <div className="text-sm">Loading provider {providerId.toString()}…</div>;
  const [owner, modelId, endpoint, pricePerCall, , active] = p;
  if (!active) return null;

  async function onCall() {
    const body = JSON.stringify({ prompt });
    const res = await fetch(`${mockApi}/v1/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    const json = (await res.json()) as { response?: string };
    const responseText = typeof json.response === "string" ? json.response : "";
    const rq = keccak256(stringToHex(body));
    const rs = keccak256(stringToHex(JSON.stringify({ model: "mock-mvp", response: responseText })));
    setLastHashes({ rq, rs });
    await writeContractAsync({
      address: marketplace,
      abi: marketplaceAbi,
      functionName: "invoke",
      args: [providerId, rq, rs],
      value: pricePerCall,
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded border p-3">
      <div className="text-sm">
        <div>
          <span className="font-mono">id={providerId.toString()}</span> · {modelId}
        </div>
        <div className="text-neutral-600">owner {owner}</div>
        <div className="text-neutral-600">endpoint {endpoint}</div>
        <div>pricePerCall {formatEther(pricePerCall)} ETH</div>
      </div>
      <textarea className="min-h-24 w-full rounded border p-2 text-sm" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      <button
        type="button"
        disabled={isPending}
        className="w-fit rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
        onClick={() => void onCall()}
      >
        {isPending ? "Sending…" : "Mock complete + invoke on-chain"}
      </button>
      {lastHashes ? (
        <pre className="overflow-x-auto text-xs">{JSON.stringify(lastHashes, null, 2)}</pre>
      ) : null}
    </div>
  );
}
```

- **Step 6: Build web**

Run:

```powershell
cd C:\Users\yeste\OneDrive\Desktop\code\DeOpenRouter\apps\web
npm run build
```

Expected: success.

- **Step 7: Commit**

```powershell
git add apps/web
git commit -m "feat(web): add wagmi UI for providers and invoke flow"
```

---

### Task 8: End-to-end manual verification on Anvil

**Files:**

- None (env only) — Create: `apps/web/.env.local.example`

`.env.local.example`:

```
NEXT_PUBLIC_ANVIL_RPC=http://127.0.0.1:8545
NEXT_PUBLIC_MOCK_API=http://127.0.0.1:8787
NEXT_PUBLIC_MARKETPLACE_ADDRESS=0xYourDeployedAddress
```

- **Step 1: Terminal A — Anvil**

```powershell
anvil
```

- **Step 2: Terminal B — deploy**

Pick Anvil default private key `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`, `PRIVATE_KEY` in hex without `0x` sometimes — Foundry expects `0x` prefixed in env.

Run:

```powershell
cd C:\Users\yeste\OneDrive\Desktop\code\DeOpenRouter\contracts
$env:PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

Copy `Deployed to: 0x...` from output.

- **Step 3: Register one provider via cast (optional quick path)**

```powershell
$M = "0x...." # marketplace — replace with Deploy script output address
cast send $M "register(string,string,uint256)" "mock" "http://127.0.0.1:8787" 1000000000000000 --value 0.02ether --rpc-url http://127.0.0.1:8545 --private-key $env:PRIVATE_KEY
```

`--value 0.02ether` exceeds `MIN_STAKE` (0.01 ether). `1000000000000000` is `pricePerCall` in wei (= 0.001 ETH per call).

- **Step 4: Web env**

Create `apps/web/.env.local` with `NEXT_PUBLIC_MARKETPLACE_ADDRESS` set to deployed address.

- **Step 5: Run API + web**

```powershell
cd apps/api && npm run dev
cd apps/web && npm run dev
```

Open `http://localhost:3000`, connect MetaMask to localhost Anvil (chain id 31337, RPC `127.0.0.1:8545`), import test key if needed, click invoke flow.

Expected: transaction succeeds; Cast `cast logs` may show `CallRecorded`.

- **Step 6: Commit example env**

```powershell
git add apps/web/.env.local.example
git commit -m "docs(web): add env example for local anvil"
```

---

## Self-review

**1. Spec coverage**


| 文档要求             | 对应任务                                             |
| ---------------- | ------------------------------------------------ |
| 链上注册服务（模型、接口、价格） | Task 4 `register`                                |
| 支付与调用记录绑定        | Task 4 `invoke` + `CallRecorded`                 |
| 抵押（质押）           | `MIN_STAKE` + `withdrawStake` after `deactivate` |
| Slash / 惩罚       | **未包含** — MVP 用质押锁定与停用；slash 留给后续迭代              |
| 链下推理             | Task 6 mock API                                  |
| 链上请求/响应哈希        | `invoke` 的 `bytes32` 参数                          |
| ZK / 可验证计算       | **未包含** — 文档允许简化；计划明确为后续                         |
| 简单前端浏览与调用        | Task 7                                           |


**Gap:** Slashing 与 ZK 验证不在本 MVP 计划内；若产品要求 MVP 必须含 slash，应在合并前追加 `contracts` 任务与测试。

**2. Placeholder scan**

- 计划中不得保留 TBD；`0x....` 仅在手动步骤中作为「从你机器上的 forge 输出替换」的操作说明，配套给出了 `cast send` 与完整命令上下文。

**3. Type consistency**

- `marketplaceAbi` 与 `DeOpenRouterMarketplace.sol` 对外函数一致；若修改合约函数名或顺序，必须同步 ABI 与测试。

---

## Execution handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-14-deopenrouter-mvp.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration. **REQUIRED SUB-SKILL:** superpowers:subagent-driven-development.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints. **REQUIRED SUB-SKILL:** superpowers:executing-plans.

**Which approach?**