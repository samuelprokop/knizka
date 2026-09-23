import "server-only";

/*
  Logovanie AI volaní do ai_jobs (I2) je teraz zjednotené v server/ai (balík B).
  Tento súbor ostáva ako stabilná cesta pre existujúce importy v konfigurátore.
*/
export { withAiJob } from "@/server/ai";
