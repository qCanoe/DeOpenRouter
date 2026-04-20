"use client";

import { formatEther, type Address } from "viem";
import type { CallLogRow } from "@/hooks/useMyCallLogs";
import {
  formatProtocolFormats,
  formatRecordedAt,
  formatSettlementStatus,
} from "@/lib/callLogDisplay";
import { chainLabel, txExplorerUrl, addressExplorerUrl } from "@/lib/chainUi";
import { CopyRow } from "@/components/chain/CopyRow";
import {
  MOCK_CALL_RECORD_BASE,
  MOCK_CHAIN_ID_LABEL,
  MOCK_MARKETPLACE_CONTRACT,
  MOCK_NETWORK_LABEL,
  MOCK_PANEL_COPY,
  ON_CHAIN_PANEL_DESIGN_MOCK,
} from "@/lib/mockOnChainPanel";

type CallRecordOnChainDetailsProps = {
  call: CallLogRow;
  marketplace: Address | null;
  chainId: number;
};

function DesignMockBanner() {
  return (
    <p className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
      {MOCK_PANEL_COPY.banner}
    </p>
  );
}

function MockCallBody({ call }: { call: CallLogRow }) {
  const m = MOCK_CALL_RECORD_BASE;
  return (
    <>
      <DesignMockBanner />
      <div className="rounded-xl border border-[var(--border)] bg-[var(--muted-bg)]/40 px-3 py-2.5 text-sm text-[var(--foreground)]">
        <span className="font-medium text-[var(--muted)]">Table row mapping (illustrative)</span>
        <span className="mt-1 block font-mono text-[13px]">
          Row <span className="text-[var(--foreground)]">{call.id}</span>
          {" · "}
          Call ID <span className="text-[var(--foreground)]">{call.callId.toString()}</span>
          {" · "}
          Provider <span className="text-[var(--foreground)]">#{call.providerId.toString()}</span>
        </span>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Hashes and amounts below are placeholders; with live RPC data they will match chain events.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <CopyRow
          label="Network (simulated)"
          value={`${MOCK_NETWORK_LABEL} · chainId ${MOCK_CHAIN_ID_LABEL}`}
          monospace={false}
        />
        <CopyRow label="Marketplace contract (simulated)" value={MOCK_MARKETPLACE_CONTRACT} />
        <p className="text-xs text-[var(--muted)]">{MOCK_PANEL_COPY.explorerDisabled}</p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Transaction & log (simulated)</h3>
        <CopyRow label="Transaction hash" value={m.txHash} />
        <CopyRow label="Block number" value={m.blockNumber} monospace={false} />
        <CopyRow label="Log index" value={m.logIndex} monospace={false} />
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">CallRecorded fields (simulated)</h3>
        <CopyRow label="Caller" value={m.caller} />
        <CopyRow label="Provider ID" value={m.providerId} monospace={false} />
        <CopyRow label="Call ID" value={m.callId} monospace={false} />
        <CopyRow label="Paid (wei)" value={m.paidWei} monospace={false} />
        <CopyRow label="Paid (ETH)" value={m.paidEth} monospace={false} />
        <CopyRow label="Request hash" value={m.requestHash} />
        <CopyRow label="Response hash" value={m.responseHash} />
        <CopyRow label="Usage units" value={m.usageUnits} monospace={false} />
        <CopyRow label="Recorded at (event)" value={m.recordedAtLabel} monospace={false} />
        <CopyRow label="Protocol formats" value={m.protocolFormats} monospace={false} />
        <CopyRow label="Settlement" value={m.settlement} monospace={false} />
      </div>
    </>
  );
}

export function CallRecordOnChainDetails({
  call,
  marketplace,
  chainId,
}: CallRecordOnChainDetailsProps) {
  if (ON_CHAIN_PANEL_DESIGN_MOCK) {
    return (
      <div className="flex flex-col gap-5">
        <MockCallBody call={call} />
      </div>
    );
  }

  const network = chainLabel(chainId);
  const txLink = txExplorerUrl(chainId, call.txHash);
  const contractLink = marketplace ? addressExplorerUrl(chainId, marketplace) : null;

  return (
    <div className="flex flex-col gap-5">
      {call.isDemo ? (
        <p className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted-bg)]/50 px-3 py-2.5 text-sm text-[var(--muted)]">
          This row is from the demo catalog merged into the table for illustration. It is not produced by{" "}
          <code className="rounded bg-[var(--background)] px-1 font-mono text-[12px]">getLogs</code> for your
          wallet.
        </p>
      ) : null}

      {chainId === 31_337 && !call.isDemo ? (
        <p className="rounded-xl border border-[var(--border)] bg-[var(--muted-bg)]/60 px-3 py-2.5 text-sm text-[var(--muted)]">
          Local chain: transaction links to a public explorer are unavailable. Copy hashes below and inspect with
          cast, Foundry, or your RPC client.
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        <CopyRow label="Network" value={`${network} (chainId ${chainId})`} monospace={false} />
        {marketplace ? <CopyRow label="Marketplace contract" value={marketplace} /> : null}
        {contractLink ? (
          <a
            href={contractLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-[var(--foreground)] underline underline-offset-2 hover:text-[var(--muted)]"
          >
            View contract in explorer
          </a>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Transaction & log</h3>
        <CopyRow label="Transaction hash" value={call.txHash} />
        {txLink ? (
          <a
            href={txLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-[var(--foreground)] underline underline-offset-2 hover:text-[var(--muted)]"
          >
            View transaction in explorer
          </a>
        ) : null}
        <CopyRow label="Block number" value={call.blockNumber.toString()} monospace={false} />
        {call.logIndex != null ? (
          <CopyRow label="Log index" value={String(call.logIndex)} monospace={false} />
        ) : (
          <p className="text-xs text-[var(--muted)]">Log index not available for this row.</p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">CallRecorded fields</h3>
        <CopyRow label="Caller" value={call.caller} />
        <CopyRow label="Provider ID" value={call.providerId.toString()} monospace={false} />
        <CopyRow label="Call ID" value={call.callId.toString()} monospace={false} />
        <CopyRow label="Paid (wei)" value={call.paid.toString()} monospace={false} />
        <CopyRow label="Paid (ETH)" value={`${formatEther(call.paid)} ETH`} monospace={false} />
        <CopyRow label="Request hash" value={call.requestHash} />
        <CopyRow label="Response hash" value={call.responseHash} />
        {call.usageUnits != null ? (
          <CopyRow label="Usage units" value={call.usageUnits.toString()} monospace={false} />
        ) : null}
        <CopyRow
          label="Recorded at (event)"
          value={formatRecordedAt(call.recordedAt)}
          monospace={false}
        />
        <CopyRow
          label="Protocol formats"
          value={formatProtocolFormats(call.requestFormat, call.responseFormat)}
          monospace={false}
        />
        <CopyRow
          label="Settlement"
          value={formatSettlementStatus(call.settlementStatus)}
          monospace={false}
        />
      </div>
    </div>
  );
}
