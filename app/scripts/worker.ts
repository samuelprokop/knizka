/*
  Samostatný proces frontu spracúva mimo Next.js (N3): ilustrácie, portréty
  a Karty postáv vygenerované na pozadí. Spúšťa sa: npm run worker
  (popri npm run dev – konfigurátor teraz úlohy len zaraďuje).
*/

import { reapStaleJobs, runOnce } from "../src/server/jobs";

const POLL_IDLE_MS = 1000;
const REAP_EVERY_TICKS = 30;

let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
});
process.on("SIGTERM", () => {
  stopping = true;
});

async function main() {
  console.log("[worker] beží, čaká na úlohy…");
  let tick = 0;
  while (!stopping) {
    const processed = await runOnce(`worker-${process.pid}`);
    if (!processed) {
      tick += 1;
      if (tick % REAP_EVERY_TICKS === 0) {
        const reaped = await reapStaleJobs();
        if (reaped > 0) console.log(`[worker] vrátených do fronty po páde: ${reaped}`);
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_IDLE_MS));
    }
  }
  console.log("[worker] zastavený.");
}

main().catch((error) => {
  console.error("[worker] neočakávaná chyba:", error);
  process.exit(1);
});
