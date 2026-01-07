#!/usr/bin/env node

import { spawn } from "node:child_process";

const userArgs = process.argv.slice(2);
const defaultFolder = process.env.RUST_IMG_VIEWER_DEFAULT_FOLDER;
const folderArgs =
  userArgs.length > 0
    ? userArgs
    : defaultFolder
    ? [defaultFolder]
    : [];

const cargoArgs = ["run", "--manifest-path=backend/Cargo.toml"];
if (folderArgs.length > 0) {
  cargoArgs.push("--", ...folderArgs);
} else {
  console.warn(
    "[dev] No folder path provided. Pass a folder path after `npm run dev --` or set RUST_IMG_VIEWER_DEFAULT_FOLDER."
  );
}

const backend = spawn("cargo", cargoArgs, {
  stdio: "inherit",
  shell: process.platform === "win32",
});

const frontend = spawn("npm", ["run", "--silent", "dev:frontend"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

const children = [backend, frontend];

const shutdown = (signal = "SIGINT") => {
  children.forEach((child) => {
    if (child && !child.killed) {
      child.kill(signal);
    }
  });
};

backend.on("exit", (code) => {
  if (code !== 0) {
    console.error(`[dev] Backend exited with code ${code}`);
  }
  shutdown();
  process.exitCode = process.exitCode ?? code ?? 0;
});

frontend.on("exit", (code) => {
  if (code !== 0) {
    console.error(`[dev] Frontend exited with code ${code}`);
  }
  shutdown();
  process.exitCode = process.exitCode ?? code ?? 0;
});

process.on("SIGINT", () => {
  shutdown("SIGINT");
  process.exit();
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
  process.exit();
});
