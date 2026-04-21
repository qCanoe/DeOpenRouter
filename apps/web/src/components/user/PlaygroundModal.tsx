"use client";

import { useEffect, useState, useRef } from "react";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { formatEther, type Address } from "viem";
import {
  marketplaceAbi,
  REQUEST_FORMAT_V1,
  RESPONSE_FORMAT_V1,
} from "@/lib/marketplaceAbi";
import type { ChainProviderRow } from "@/hooks/useMarketplaceProviders";
import { postChat } from "@/lib/chatClient";
import { getMockApiBase } from "@/lib/marketplaceEnv";
import { requestHashV1, responseHashV1 } from "@/lib/hashMvp";
import type { ApiRequestHistoryRow } from "@/lib/apiRequestHistoryDemo";
import { apiRequestHistoryRowFromRelayChat } from "@/lib/relayApiRequestHistory";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type PlaygroundModalProps = {
  isOpen: boolean;
  onClose: () => void;
  marketplace: Address;
  row: ChainProviderRow;
  isMock?: boolean;
  onInvoked?: () => void;
  /** Called after a successful relay chat (before on-chain invoke in live mode). */
  onRelayChatLogged?: (entry: ApiRequestHistoryRow) => void;
};

export function PlaygroundModal({
  isOpen,
  onClose,
  marketplace,
  row,
  isMock = false,
  onInvoked,
  onRelayChatLogged,
}: PlaygroundModalProps) {
  const { isConnected } = useAccount();
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  // States for mock simulation
  const [isSimulatingChain, setIsSimulatingChain] = useState(false);
  const [simulatedSuccess, setSimulatedSuccess] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const isActuallyPending = isPending || isSimulatingChain;
  const isActuallySuccess = isSuccess || simulatedSuccess;
  const working = isChatting || isActuallyPending || isConfirming;

  useEffect(() => {
    if (!error) return;
    setLocalErr(error.message);
    setIsChatting(false);
  }, [error]);

  useEffect(() => {
    if (isSuccess) {
      onInvoked?.();
      setPrompt("");
      reset();
    }
  }, [isSuccess, onInvoked, reset]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isChatting]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setMessages([]);
      setPrompt("");
      setLocalErr(null);
      setSimulatedSuccess(false);
      setIsSimulatingChain(false);
      reset();
    }
  }, [isOpen, reset]);

  if (!isOpen) return null;

  async function handleSend() {
    setLocalErr(null);
    if (!prompt.trim()) return;
    
    if (!isMock && !isConnected) {
      setLocalErr("Please connect your wallet first.");
      return;
    }
    if (!isMock && !row.active) {
      setLocalErr("Provider is currently inactive.");
      return;
    }

    const currentPrompt = prompt;
    setMessages((prev) => [...prev, { role: "user", content: currentPrompt }]);
    setPrompt("");
    setIsChatting(true);
    setSimulatedSuccess(false);

    if (isMock) {
      // Simulate chat network delay
      setTimeout(async () => {
        try {
          const chatResult = await postChat(getMockApiBase(), currentPrompt);
          setMessages((prev) => [...prev, { role: "assistant", content: chatResult.response }]);
          setIsChatting(false);
          onRelayChatLogged?.(
            apiRequestHistoryRowFromRelayChat({
              providerId: row.id,
              providerModelId: row.modelId,
              prompt: currentPrompt,
              result: chatResult,
            }),
          );
          setIsSimulatingChain(true);
          
          // Simulate blockchain transaction delay
          setTimeout(() => {
            setIsSimulatingChain(false);
            setSimulatedSuccess(true);
            onInvoked?.();
          }, 1500);

        } catch (e) {
          setLocalErr(e instanceof Error ? e.message : "Playground request failed.");
          setIsChatting(false);
        }
      }, 800);
      return;
    }

    try {
      const chatResult = await postChat(getMockApiBase(), currentPrompt);
      setMessages((prev) => [...prev, { role: "assistant", content: chatResult.response }]);
      setIsChatting(false);
      onRelayChatLogged?.(
        apiRequestHistoryRowFromRelayChat({
          providerId: row.id,
          providerModelId: row.modelId,
          prompt: currentPrompt,
          result: chatResult,
        }),
      );

      const reqH = requestHashV1(currentPrompt);
      const resH = responseHashV1(chatResult.response);

      writeContract({
        address: marketplace,
        abi: marketplaceAbi,
        functionName: "invoke",
        args: [
          BigInt(row.id),
          reqH,
          resH,
          REQUEST_FORMAT_V1,
          RESPONSE_FORMAT_V1,
          chatResult.usageUnits,
        ],
        value: row.effectivePriceWei,
      });
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : "Invoke failed.");
      setIsChatting(false);
    }
  }

  // Handle Enter to send
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm sm:p-6">
      <div className="flex h-full max-h-[44rem] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)] shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">Model Playground</h2>
            <p className="text-xs text-[var(--muted)]">
              Testing {row.modelId} via Provider #{row.id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--muted-bg)] hover:text-[var(--foreground)]"
            title="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto bg-[var(--muted-bg)] p-6">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--background)] border border-[var(--border)] shadow-sm">
                <svg className="h-6 w-6 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-[var(--muted)]">Send a message to start testing</p>
              <p className="mt-1 text-xs text-[var(--muted)] opacity-70">
                Cost per call: {formatEther(row.effectivePriceWei)} ETH
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm ${
                      msg.role === "user"
                        ? "bg-[var(--foreground)] text-[var(--background)] rounded-br-sm"
                        : "bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] rounded-bl-sm shadow-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              
              {/* Loading Indicators */}
              {(isChatting && !isActuallyPending && !isConfirming) && (
                <div className="flex justify-start">
                  <div className="flex max-w-[85%] items-center gap-1.5 rounded-2xl rounded-bl-sm border border-[var(--border)] bg-[var(--background)] px-5 py-4 shadow-sm">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--muted)]" style={{ animationDelay: "0ms" }}></span>
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--muted)]" style={{ animationDelay: "150ms" }}></span>
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--muted)]" style={{ animationDelay: "300ms" }}></span>
                  </div>
                </div>
              )}

              {(isActuallyPending || isConfirming) && (
                <div className="flex justify-center pt-2 pb-1">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-4 py-1.5 text-xs font-medium text-[var(--muted)] shadow-sm">
                    <svg className="h-3 w-3 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isActuallyPending ? "Awaiting wallet signature..." : "Confirming on chain..."}
                  </div>
                </div>
              )}
              
              {isActuallySuccess && (
                <div className="flex justify-center pt-2 pb-1">
                  <div className="inline-flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-1.5 text-xs font-medium text-green-600 dark:bg-green-500/20 dark:text-green-400">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Payment confirmed
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="shrink-0 border-t border-[var(--border)] bg-[var(--background)] p-4 sm:p-6">
          {localErr && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {localErr}
            </div>
          )}
          
          <div className="relative flex items-end gap-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask the model something... (Press Enter to send)"
              disabled={working}
              className="input-modern max-h-32 min-h-[44px] resize-none py-3 pr-14"
              rows={1}
            />
            <div className="absolute bottom-1 right-1">
              <button
                onClick={() => void handleSend()}
                disabled={!prompt.trim() || working}
                className="flex h-[36px] w-[36px] items-center justify-center rounded-lg bg-[var(--foreground)] text-[var(--background)] transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between px-1">
            <span className="text-[11px] text-[var(--muted)]">
              Powered by DeOpenRouter Marketplace
            </span>
            <span className="text-[11px] font-medium text-[var(--foreground)]">
              Cost: {formatEther(row.effectivePriceWei)} ETH
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
