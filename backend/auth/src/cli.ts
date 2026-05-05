#!/usr/bin/env node
import "reflect-metadata";
import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createAuthClient,
  NotAuthorizedError,
  type Provider,
} from "./index.js";

// NOTE:
// このファイルは auth パッケージの手動操作用 CLI エントリポイント。
// 主用途は login/logout の動作確認と初期セットアップで、ライブラリ利用側
// (`createAuthClient` を import して使う経路) には直接影響しない。
const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFilePath);
dotenv.config({
  path: resolve(currentDir, "../../../.env"),
});

function parseProvider(raw: string | undefined): Provider {
  if (raw === "youtube" || raw === "twitch") {
    return raw;
  }
  throw new Error(`Unsupported provider: ${raw ?? "(empty)"}`);
}

function printUsage(): void {
  console.info("Usage:");
  console.info("  pnpm --filter @comment-dock/auth login <provider>");
  console.info("  pnpm --filter @comment-dock/auth logout <provider>");
  console.info("Example:");
  console.info("  pnpm --filter @comment-dock/auth login youtube");
}

async function main(): Promise<void> {
  const [, , command, providerArg] = process.argv;
  if (command !== "login" && command !== "logout") {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const provider = parseProvider(providerArg);
  const authClient = createAuthClient();

  if (command === "login") {
    await authClient.login(provider);
    console.info(`[auth] login succeeded for provider: ${provider}`);
    return;
  }

  await authClient.logout(provider);
  console.info(`[auth] logout succeeded for provider: ${provider}`);
}

main().catch((error: unknown) => {
  if (error instanceof NotAuthorizedError) {
    console.error(`[auth] ${error.message}`);
    process.exitCode = 1;
    return;
  }
  if (error instanceof Error) {
    console.error("[auth] fatal error", error.message);
  } else {
    console.error("[auth] fatal error", error);
  }
  process.exitCode = 1;
});
