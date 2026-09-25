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
export const ChevronRightIcon = (p: P) => <Icon {...p}><path d="m9 6 6 6-6 6" /></Icon>;
export const ArrowRightIcon = (p: P) => <Icon {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Icon>;
export const CopyIcon = (p: P) => (
  <Icon {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2.5" />
    <path d="M5 15V6.5A1.5 1.5 0 0 1 6.5 5H15" />
  </Icon>
);
export const TagIcon = (p: P) => (
  <Icon {...p}>
    <path d="M3.5 12.1V5a1.5 1.5 0 0 1 1.5-1.5h7.1a1.5 1.5 0 0 1 1.06.44l7.4 7.4a1.5 1.5 0 0 1 0 2.12l-7.1 7.1a1.5 1.5 0 0 1-2.12 0l-7.4-7.4a1.5 1.5 0 0 1-.44-1.06z" />
    <circle cx="8.5" cy="8.5" r="1.5" />
  </Icon>
);
export const CheckIcon = (p: P) => <Icon {...p}><path d="M5 12.5 9.5 17 19 7.5" /></Icon>;
export const CakeIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 20h16M5 20v-6.5A1.5 1.5 0 0 1 6.5 12h11a1.5 1.5 0 0 1 1.5 1.5V20" />
    <path d="M5 16c1.2 0 1.8-1 3.5-1s2.3 1 3.5 1 1.8-1 3.5-1 2.3 1 3.5 1M12 12V9M12 6.5c-.8-.8-.8-1.7 0-3 .8 1.3.8 2.2 0 3z" />
  </Icon>
);
export const StarIcon = (p: P) => <Icon {...p}><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" /></Icon>;
export const TreeIcon = (p: P) => <Icon {...p}><path d="M12 3 6.5 10h3L5.5 15.5h13l-4-5.5h3zM12 15.5V21" /></Icon>;
export const BackpackIcon = (p: P) => (
  <Icon {...p}>
    <path d="M6 10a6 6 0 0 1 12 0v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19z" />
    <path d="M9.5 4.5V4a2.5 2.5 0 0 1 5 0v.5M9 14h6v3.5" />
  </Icon>
);
export const BookIcon = (p: P) => <Icon {...p}><path d="M12 6.5C10.5 5 8.2 4.5 4 4.5v13c4.2 0 6.5.5 8 2 1.5-1.5 3.8-2 8-2v-13c-4.2 0-6.5.5-8 2zM12 6.5v13" /></Icon>;
export const HeartIcon = (p: P) => <Icon {...p}><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" /></Icon>;
export const CloseIcon = (p: P) => <Icon {...p}><path d="M6 6l12 12M18 6 6 18" /></Icon>;
export const MinusIcon = (p: P) => <Icon {...p}><path d="M5 12h14" /></Icon>;
export const PlusIcon = (p: P) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>;
export const UndoIcon = (p: P) => <Icon {...p}><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></Icon>;
export const PencilIcon = (p: P) => <Icon {...p}><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></Icon>;
export const BasketIcon = (p: P) => (
  <Icon {...p}>
    <path d="M3.5 9.5h17l-1.6 8.3a2 2 0 0 1-2 1.7H7.1a2 2 0 0 1-2-1.7z" />
    <path d="m8 9.5 3-5M16 9.5l-3-5M9.5 13v3M14.5 13v3" />
  </Icon>
);
export const TruckIcon = (p: P) => (
  <Icon {...p}>
    <path d="M3 6.5h11v9H3zM14 9.5h3.5l3 3.2v2.8H14" />
    <circle cx="7" cy="17.5" r="1.8" />
    <circle cx="17" cy="17.5" r="1.8" />
  </Icon>
);
export const HomeIcon = (p: P) => <Icon {...p}><path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19z" /></Icon>;
export const MenuIcon = (p: P) => <Icon {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Icon>;
export const QuestionIcon = (p: P) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.8M12 17h.01" /></Icon>;
export const MailIcon = (p: P) => <Icon {...p}><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="m4 7 8 6 8-6" /></Icon>;
export const GlobeIcon = (p: P) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9S14.5 18.4 12 21c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3z" /></Icon>;
export const TrashIcon = (p: P) => <Icon {...p}><path d="M4.5 7h15M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2M6.5 7l.8 11.6A1.5 1.5 0 0 0 8.8 20h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7M10 11v5M14 11v5" /></Icon>;
export const InfoIcon = (p: P) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.5h.01" /></Icon>;
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
