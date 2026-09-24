/*
  Spoločné ikony rozhrania – jedna rodina (obrys, hrúbka 1.8, zaoblené konce,
  mriežka 24 px), aby sa nemiešali emoji a textové znaky (⌄ × ✓ ←) s SVG.
  Ikona je vždy dekoratívna (aria-hidden) – význam nesie text alebo aria-label
  prvku, v ktorom je. Veľkosť určuje className (predvolene size-5).
*/

import type { ReactNode } from "react";

function Icon({ className = "size-5", children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

type P = { className?: string };

export const ChevronDownIcon = (p: P) => <Icon {...p}><path d="m6 9 6 6 6-6" /></Icon>;
export const ChevronLeftIcon = (p: P) => <Icon {...p}><path d="m15 18-6-6 6-6" /></Icon>;
export const CheckIcon = (p: P) => <Icon {...p}><path d="M5 12.5 9.5 17 19 7.5" /></Icon>;
export const CloseIcon = (p: P) => <Icon {...p}><path d="M6 6l12 12M18 6 6 18" /></Icon>;
export const MinusIcon = (p: P) => <Icon {...p}><path d="M5 12h14" /></Icon>;
export const PlusIcon = (p: P) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>;
export const UndoIcon = (p: P) => <Icon {...p}><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></Icon>;
export const AlertIcon = (p: P) => <Icon {...p}><path d="M12 8v5M12 16.5h.01" /><circle cx="12" cy="12" r="9" /></Icon>;
export const CameraIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
    <circle cx="12" cy="13" r="3.5" />
  </Icon>
);
export const SmileIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01" />
  </Icon>
);
export const BanIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m5.7 5.7 12.6 12.6" />
  </Icon>
);
