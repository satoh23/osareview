import open from "open";
import type { BrowserLauncher } from "../../../usecases/interfaces/browser-launcher.interface.js";

export class OpenBrowserLauncher implements BrowserLauncher {
  async open(url: URL): Promise<void> {
    await open(url.toString());
  }
}
