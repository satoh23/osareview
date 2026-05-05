import type { Provider } from "../../provider.js";

export interface LoginPolicy {
  getScopes(provider: Provider): readonly string[];
  getCallbackTimeoutMs(provider: Provider): number;
}
