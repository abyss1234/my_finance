import { ChevronUp, ListFilter } from 'lucide-react';

type Props = {
  visible: boolean;
  summary: string;
  onOpen: () => void;
};

export default function StickyAnalysisFilters({ visible, summary, onOpen }: Props) {
  return (
    <div className="sticky top-16 z-30 !m-0 h-0">
      <button
        type="button"
        className={`absolute inset-x-0 top-2 flex min-h-11 items-center gap-2 rounded-md border border-zinc-300 bg-white/95 px-3 text-left text-sm shadow-md backdrop-blur transition ${
          visible
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-2 opacity-0'
        }`}
        aria-label={`Open analysis filters. Current filters: ${summary}`}
        tabIndex={visible ? 0 : -1}
        onClick={onOpen}
      >
        <ListFilter className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate font-medium text-zinc-800">{summary}</span>
        <ChevronUp className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden="true" />
      </button>
    </div>
  );
}
