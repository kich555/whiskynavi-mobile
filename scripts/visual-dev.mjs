import { spawn } from "node:child_process";
import { comparisonApiOrigin } from "./visual-config.mjs";
const origin = comparisonApiOrigin();
console.log(`Visual comparison API: ${origin}`);
const child = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["expo", "start", "--web", "--port", "8082"],
  {
    stdio: "inherit",
    env: { ...process.env, EXPO_PUBLIC_API_BASE_URL: origin },
  },
);
child.on("exit", (code) => process.exit(code ?? 1));
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
