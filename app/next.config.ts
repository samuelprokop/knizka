import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Náhľad UI (npm run ui) beží popri bežnom dev serveri – potrebuje vlastný priečinok zostavenia.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  logging: {
    // Argumenty server actions obsahujú meno dieťaťa a e-mail – do logu nesmú (A2, S5).
    serverFunctions: false,
  },
};

export default nextConfig;
