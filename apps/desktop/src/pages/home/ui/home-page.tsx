import { useState } from "react";
import {
  CommentStreamPanel,
  HeaderBar,
  SettingsPopover,
} from "../../../widgets";

export function HomePage() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="h-screen overflow-hidden bg-base text-primary transition">
      <HeaderBar onOpenSettings={() => setIsSettingsOpen(true)} />
      <main className="flex h-[calc(100vh-4rem)] min-h-0 p-4">
        <CommentStreamPanel />
      </main>
      <SettingsPopover
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
