import { useState } from "react";
import { Button } from "../../../shared/ui";

type UserMemoSectionProps = {
  memo: string;
};

export function UserMemoSection({ memo }: UserMemoSectionProps) {
  const [value, setValue] = useState(memo);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-primary">手動メモ</h3>
        {/* TODO(backend): メモ保存は viewer-profile repository を実データ化した後に永続化する。 */}
        <Button className="px-2 py-1 text-xs" type="button" variant="secondary">
          保存
        </Button>
      </div>
      <textarea
        className="min-h-28 w-full resize-none rounded-2xl border border-border bg-elevated/70 p-3 text-sm leading-6 text-primary outline-none ring-brand-pink/30 placeholder:text-muted focus:ring-2"
        onChange={(event) => setValue(event.target.value)}
        placeholder="例：東方好き、仕事が忙しい、いじりすぎ注意、初スパチャあり..."
        value={value}
      />
    </div>
  );
}
