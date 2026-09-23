/** Prostredie náhľadu UI – oddelené od vývojovej DB a úložiska. */
export const UI_ENV = {
  DATABASE_URL: "postgres://localhost:5432/knizka_ui",
  STORAGE_DIR: "./.storage-ui",
  MOCK_AI_DELAY_MS: "0",
  AI_IMAGE_PROVIDER: "mock",
  AI_TEXT_PROVIDER: "mock",
};
