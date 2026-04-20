"use client";

import { useAccount, usePublicClient } from "wagmi";
import { useCallback, useEffect, useState } from "react";
import {
  parseAbiItem,
  type Address,
  type Hex,
} from "viem";

export type CallLogRow = {
  id: string;
  providerId: bigint;
  caller: Address;
  requestHash: Hex;
  responseHash: Hex;
  paid: bigint;
  callId: bigint;
  blockNumber: bigint;
  txHash: Hex;
  /** Set when row comes from `getLogs` (missing for demo rows). */
  logIndex?: number;
  /** Sample rows merged for UI only. */
  isDemo?: boolean;
  /** Token-like units reported with the call (from `CallRecorded`). */
  usageUnits?: bigint;
  /** Block time at settlement (from `CallRecorded.recordedAt`). */
  recordedAt?: bigint;
  requestFormat?: number;
  responseFormat?: number;
  settlementStatus?: number;
  /** Demo-only: round-trip latency for display. */
  latencyMs?: number;
  /** Demo-only: short description of the user turn. */
  promptSummary?: string;
};

const callRecordedEvent = parseAbiItem(
  "event CallRecorded(uint256 indexed providerId, address indexed caller, bytes32 requestHash, bytes32 responseHash, uint256 paid, uint256 callId, uint256 usageUnits, uint256 recordedBlock, uint256 recordedAt, uint8 requestFormat, uint8 responseFormat, uint8 settlementStatus)",
);

export function useMyCallLogs(marketplace: Address | null) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [rows, setRows] = useState<CallLogRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!publicClient || !marketplace || !address) {
      setRows([]);
      return;
    }
    setIsLoading(true);
    try {
      const logs = await publicClient.getLogs({
        address: marketplace,
        event: callRecordedEvent,
        args: { caller: address },
        fromBlock: 0n,
        toBlock: "latest",
      });
      const mapped: CallLogRow[] = logs.map((log) => ({
        id: `${log.transactionHash}-${log.logIndex}`,
        providerId: log.args.providerId!,
        caller: log.args.caller!,
        requestHash: log.args.requestHash!,
        responseHash: log.args.responseHash!,
        paid: log.args.paid!,
        callId: log.args.callId!,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        logIndex: log.logIndex,
        usageUnits: log.args.usageUnits,
        recordedAt: log.args.recordedAt,
        requestFormat: log.args.requestFormat != null ? Number(log.args.requestFormat) : undefined,
        responseFormat: log.args.responseFormat != null ? Number(log.args.responseFormat) : undefined,
        settlementStatus: log.args.settlementStatus != null ? Number(log.args.settlementStatus) : undefined,
      }));
      setRows(mapped.slice().reverse());
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, marketplace, address]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  return { rows, isLoading, refetch: fetchLogs };
}

export function useProviderCallLogs(
  marketplace: Address | null,
  providerIds: number[],
) {
  const publicClient = usePublicClient();
  const [rows, setRows] = useState<CallLogRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const providerIdKey = providerIds
    .slice()
    .sort((a, b) => a - b)
    .join(",");

  const fetchLogs = useCallback(async () => {
    if (!publicClient || !marketplace || !providerIdKey) {
      setRows([]);
      return;
    }
    setIsLoading(true);
    try {
      const wantedProviderIds = new Set(providerIdKey.split(","));
      const logs = await publicClient.getLogs({
        address: marketplace,
        event: callRecordedEvent,
        fromBlock: 0n,
        toBlock: "latest",
      });
      const mapped: CallLogRow[] = logs
        .filter((log) => wantedProviderIds.has(log.args.providerId!.toString()))
        .map((log) => ({
          id: `${log.transactionHash}-${log.logIndex}`,
          providerId: log.args.providerId!,
          caller: log.args.caller!,
          requestHash: log.args.requestHash!,
          responseHash: log.args.responseHash!,
          paid: log.args.paid!,
          callId: log.args.callId!,
          blockNumber: log.blockNumber,
          txHash: log.transactionHash,
          logIndex: log.logIndex,
          usageUnits: log.args.usageUnits,
          recordedAt: log.args.recordedAt,
          requestFormat: log.args.requestFormat != null ? Number(log.args.requestFormat) : undefined,
          responseFormat: log.args.responseFormat != null ? Number(log.args.responseFormat) : undefined,
          settlementStatus: log.args.settlementStatus != null ? Number(log.args.settlementStatus) : undefined,
        }));
      setRows(mapped.slice().reverse());
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, marketplace, providerIdKey]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  return { rows, isLoading, refetch: fetchLogs };
}
