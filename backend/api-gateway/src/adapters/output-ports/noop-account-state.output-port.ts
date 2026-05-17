import { injectable } from "tsyringe";
import type {
  AccountStateOutputEvent,
  AccountStateOutputPort,
} from "../../usecases/interfaces/account-state-output-port.interface.js";

@injectable()
export class NoopAccountStateOutputPort implements AccountStateOutputPort {
  async publishAccountState(_event: AccountStateOutputEvent): Promise<void> {
    // WebSocket 配信口は後続タスクで実装する。
  }
}
