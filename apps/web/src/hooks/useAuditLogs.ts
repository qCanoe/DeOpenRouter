"use client";

import { useCallback, useEffect, useState } from "react";
import type { Address, Hash } from "viem";
import { parseAbiItem } from "viem";
import { usePublicClient } from "wagmi";

const auditRecorded = parseAbiItem(
  "event AuditRecorded(uint256 indexed auditId, uint256 indexed providerId, address indexed recorder, bytes32 reportHash, uint8 riskLevel)",
);
const auditReportUri = parseAbiItem("event AuditReportUri(uint256 indexed auditId, string reportUri)");

export type AuditLogRow = {
  auditId: bigint;
  providerId: bigint;
  recorder: Address;
  reportHash: Hash;
  riskLevel: number;
  reportUri?: string;
  blockNumber: bigint;
  transactionHash: Hash;
};

function auditFromBlock(): bigint {
  const raw = process.env.NEXT_PUBLIC_AUDIT_LOGS_FROM_BLOCK;
  if (raw && /^\d+$/.test(raw.trim())) return BigInt(raw.trim());
  return 0n;
}

export function useAuditLogs(marketplace: Address | null) {
  const client = usePublicClient();
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!client || !marketplace) {
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fromBlock = auditFromBlock();
      const [recLogs, uriLogs] = await Promise.all([
        client.getLogs({
          address: marketplace,
          event: auditRecorded,
          fromBlock,
          toBlock: "latest",
        }),
        client.getLogs({
          address: marketplace,
          event: auditReportUri,
          fromBlock,
          toBlock: "latest",
        }),
      ]);
      const uriByAudit = new Map<string, string>();
      for (const log of uriLogs) {
        const id = log.args.auditId;
        const uri = log.args.reportUri;
        if (id !== undefined && typeof uri === "string" && uri.length > 0) {
          uriByAudit.set(id.toString(), uri);
        }
      }
      const merged: AuditLogRow[] = recLogs.map((log) => {
        const aid = log.args.auditId!;
        return {
          auditId: aid,
          providerId: log.args.providerId!,
          recorder: log.args.recorder!,
          reportHash: log.args.reportHash!,
          riskLevel: Number(log.args.riskLevel!),
          reportUri: uriByAudit.get(aid.toString()),
          blockNumber: log.blockNumber ?? 0n,
          transactionHash: log.transactionHash ?? ("0x" as Hash),
        };
      });
      merged.sort((a, b) => {
        if (a.blockNumber > b.blockNumber) return -1;
        if (a.blockNumber < b.blockNumber) return 1;
        if (a.auditId > b.auditId) return -1;
        if (a.auditId < b.auditId) return 1;
        return 0;
      });
      setRows(merged);
    } catch (e) {
      setError(e instanceof Error ? e.message : "audit_logs_failed");
    } finally {
      setLoading(false);
    }
  }, [client, marketplace]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { rows, loading, error, refetch };
}
