import { createConfig, http } from "wagmi";
import { injected } from "@wagmi/core";
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
