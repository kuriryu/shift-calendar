"use client";

import { use } from "react";
import HopeFlow from "@/components/workspace/HopeFlow";

export default function HopePage({
  params,
}: {
  params: Promise<{ storeId: string; month: string }>;
}) {
  const { storeId, month } = use(params);
  return <HopeFlow storeId={storeId} month={month} />;
}
