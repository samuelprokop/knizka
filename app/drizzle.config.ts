import { existsSync } from "node:fs";

import { defineConfig } from "drizzle-kit";

// drizzle-kit nečíta .env.local sám – bez toho by migrácia v kópii balíka
// (worktree s vlastnou DB) pobežala nad predvolenou knizka_dev.
if (!process.env.DATABASE_URL && existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://localhost:5432/knizka_dev",
  },
});
