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
      {/* メイン高さの 4rem は `HEADER_BAR_VERTICAL_LAYOUT.heightClass` と同じ（h-16） */}
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
