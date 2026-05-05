import { randomBytes } from "node:crypto";
import type { StateGenerator } from "../../../usecases/interfaces/state-generator.interface.js";

export class RandomStateGenerator implements StateGenerator {
  generate(): string {
    return randomBytes(16).toString("hex");
  }
}
