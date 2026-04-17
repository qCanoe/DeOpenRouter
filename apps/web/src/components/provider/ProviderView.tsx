"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  mockMyProvider,
  mockProviderCalls,
  mockProviderStats,
} from "@/lib/mockData";
import type { SimulateBundle } from "@/components/user/UserView";
import { MyProviderCard } from "@/components/provider/MyProviderCard";
import {
  ProviderRegisterForm,
  providerToFormValues,
  emptyRegisterValues,
  type RegisterFormValues,
} from "@/components/provider/ProviderRegisterForm";
import { ProviderCallLog } from "@/components/provider/ProviderCallLog";

type ProviderViewProps = {
  simulate: SimulateBundle;
};

export function ProviderView({ simulate }: ProviderViewProps) {
  const formRef = useRef<HTMLDivElement>(null);
  const [formSeed, setFormSeed] = useState(0);
  const [formInitial, setFormInitial] =
    useState<RegisterFormValues>(emptyRegisterValues);

  const defaultsFromChain = useMemo(
    () => providerToFormValues(mockMyProvider),
    [],
  );

  const scrollToForm = useCallback(() => {
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const handleEdit = useCallback(() => {
    setFormInitial(defaultsFromChain);
    setFormSeed((s) => s + 1);
    scrollToForm();
  }, [defaultsFromChain, scrollToForm]);

  return (
    <div className="flex flex-col gap-12 sm:gap-14">
      <MyProviderCard
        provider={mockMyProvider}
        totalCalls={mockProviderStats.totalCalls}
        totalEarned={mockProviderStats.totalEarned}
        currentStake={mockProviderStats.currentStake}
        simulate={simulate}
        onEdit={handleEdit}
      />
      <ProviderRegisterForm
        ref={formRef}
        seed={formSeed}
        initialValues={formInitial}
        simulate={simulate}
      />
      <ProviderCallLog calls={mockProviderCalls} />
    </div>
  );
}
