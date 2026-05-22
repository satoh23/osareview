import type { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: ReactNode;
};

export function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-elevated/50 p-3">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="mt-1 text-base font-bold text-primary">{value}</p>
    </div>
  );
}
