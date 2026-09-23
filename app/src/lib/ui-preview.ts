/*
  Režim náhľadu UI (npm run ui): celý frontend s ukážkovými dátami, bez
  zápisov a bez volaní AI, platieb či e-mailov. Akcie vrátia chybu
  "common.ui_preview" a stránky nič neukladajú. Len mimo produkcie.

  Ukážkové dáta pripraví `npm run ui:setup` do oddelenej DB knizka_ui.
*/

export const UI_PREVIEW_ERROR = "common.ui_preview" as const;

/** Text chyby pre administráciu (tá má hlášky po slovensky priamo v kóde). */
export const UI_PREVIEW_ADMIN_ERROR = "Toto je náhľad rozhrania – nič sa neukladá.";

export const isUiPreview = () => process.env.UI_PREVIEW === "1" && process.env.NODE_ENV !== "production";
