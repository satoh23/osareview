import "reflect-metadata";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { runCommentFetcherApp } from "./app/main.js";
import { ConsoleCommentOutputPort } from "./adapters/output-ports/console-comment.output-port.js";
import { registerCommentFetcherDependencies } from "./register-di-dependencies.js";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFilePath);
dotenv.config({
  path: resolve(currentDir, "../../../.env"),
});

registerCommentFetcherDependencies();

runCommentFetcherApp({}, new ConsoleCommentOutputPort()).catch(
  (error: unknown) => {
    console.error("[comment-fetcher] fatal error", error);
    process.exitCode = 1;
  },
);
