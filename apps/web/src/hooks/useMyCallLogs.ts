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
