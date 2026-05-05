import open from "open";
import "reflect-metadata";
import { injectable } from "tsyringe";
import type { BrowserLauncher } from "../../../usecases/interfaces/browser-launcher.interface.js";

@injectable()
export class OpenBrowserLauncher implements BrowserLauncher {
  async open(url: URL): Promise<void> {
    await open(url.toString());
  }
}
