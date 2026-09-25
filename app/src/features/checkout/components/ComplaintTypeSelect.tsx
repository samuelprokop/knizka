"use client";

import { useId, useState, type ReactNode } from "react";

import { FluidSelect } from "@/components/FluidSelect";

/** Typ hlásenia na stránke objednávky – vlastný výber (FluidSelect) s hodnotou pre formulár. */
export function ComplaintTypeSelect({
  label,
  options,
}: {
  label: string;
  options: { value: string; label: string; icon: ReactNode }[];
}) {
  const ids = useId();
  const [value, setValue] = useState(options[0]?.value ?? null);
  return (
    <div className="flex flex-col gap-2.5">
      <span id={`${ids}-label`} className="text-sm font-semibold text-ink">
        {label}
      </span>
      <FluidSelect id={`${ids}-type`} name="type" labelledBy={`${ids}-label`} value={value} onChange={setValue} options={options} placeholder={label} />
    </div>
  );
}
