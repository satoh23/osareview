import { Tag } from "lucide-react";
import { tagCandidates } from "../../../entities/viewer-profile";
import { Badge } from "../../../shared/ui";

type UserTagSectionProps = {
  tags: readonly string[];
};

export function UserTagSection({ tags }: UserTagSectionProps) {
  const suggestedTags = tagCandidates
    .filter((tag) => !tags.includes(tag))
    .slice(0, 4);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-primary">
          <Tag aria-hidden="true" className="h-4 w-4 text-brand-pink-strong" />
          タグ
        </h3>
        {/* TODO(backend): タグ編集は viewer-profile repository を実データ化した後に永続化する。 */}
        <button
          className="text-xs text-brand-pink-strong hover:text-brand-pink"
          type="button"
        >
          編集
        </button>
      </div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <Badge key={tag} tone="pink">
            {tag}
          </Badge>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5 opacity-70">
        {suggestedTags.map((tag) => (
          <button
            className="rounded-full border border-dashed border-border-strong px-2 py-0.5 text-[11px] text-muted hover:border-brand-pink-strong/40 hover:text-brand-pink-strong"
            key={tag}
            type="button"
          >
            + {tag}
          </button>
        ))}
      </div>
    </div>
  );
}
