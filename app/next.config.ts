import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  logging: {
    // Argumenty server actions obsahujú meno dieťaťa a e-mail – do logu nesmú (A2, S5).
    serverFunctions: false,
  },
};

export default nextConfig;
