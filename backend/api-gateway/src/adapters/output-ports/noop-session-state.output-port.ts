import { injectable } from "tsyringe";
import type {
  SessionStateOutputEvent,
  SessionStateOutputPort,
} from "../../usecases/interfaces/session-state-output-port.interface.js";

@injectable()
export class NoopSessionStateOutputPort implements SessionStateOutputPort {
  async publishSessionState(_event: SessionStateOutputEvent): Promise<void> {
    // WebSocket 配信口は後続タスクで実装する。
  }
}
