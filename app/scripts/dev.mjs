/*
  Vývoj: Next.js a worker fronty úloh (balík B) naraz – bez workera by sa
  ilustrácie v kroku 7 nikdy nevygenerovali. Argumenty idú do `next dev`
  (napr. npm run dev -- -p 3005). Samotný Next.js: npm run dev:next.

  Worker dostane PID tohto procesu (WORKER_PARENT_PID) a skončí sám, keď
  spúšťač zmizne – aj pri tvrdom ukončení (SIGKILL), kedy sa sem signál
  nedostane. Inak by po zastavení servera ostal bežať osirelý worker.
*/

import { spawn } from "node:child_process";

const start = (command, args) =>
  spawn(command, args, { stdio: "inherit", env: { ...process.env, WORKER_PARENT_PID: String(process.pid) } });

const children = [
  start("node_modules/.bin/next", ["dev", ...process.argv.slice(2)]),
  start("node_modules/.bin/tsx", ["--conditions=react-server", "--env-file-if-exists=.env.local", "scripts/worker.ts"]),
];

let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(code), 500);
}

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(signal, () => stop(0));
for (const child of children) child.on("exit", (code) => stop(code ?? 0));
