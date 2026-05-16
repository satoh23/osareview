import "reflect-metadata";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { registerApiGatewayDependencies } from "./register-di-dependencies.js";
import { runApiGateway } from "./app/main.js";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFilePath);
dotenv.config({
  path: resolve(currentDir, "../../../.env"),
});

registerApiGatewayDependencies();

runApiGateway().catch((error: unknown) => {
  console.error("[api-gateway] fatal error", error);
  process.exitCode = 1;
});
