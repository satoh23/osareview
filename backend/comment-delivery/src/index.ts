import "reflect-metadata";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { registerCommentDeliveryDependencies } from "./register-di-dependencies.js";
import { runCommentDeliveryApp } from "./app/main.js";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFilePath);
dotenv.config({
  path: resolve(currentDir, "../../../.env"),
});

registerCommentDeliveryDependencies();

runCommentDeliveryApp().catch((error: unknown) => {
  console.error("[comment-delivery] fatal error", error);
  process.exitCode = 1;
});
