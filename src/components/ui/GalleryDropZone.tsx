import { cn } from '@/lib/utils';
import { ImagePlus, X } from 'lucide-react';
import { useCallback, useState } from 'react';

export type GalleryItemPreview = {
  key: string;
  label: string;
  previewUrl?: string;
};

export function GalleryDropZone({
  items,
  onAddFiles,
  onRemove,
  className,
}: {
  items: GalleryItemPreview[];
  onAddFiles: (files: File[]) => void;
  onRemove: (key: string) => void;
  className?: string;
}) {
  const [dragOver, setDragOver] = useState(false);

  const addFromList = useCallback(
    (list: FileList | null) => {
      if (!list?.length) return;
      onAddFiles(Array.from(list));
    },
    [onAddFiles]
  );

  return (
    <div className={cn('space-y-3', className)}>
      <label
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFromList(e.dataTransfer.files);
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition',
          dragOver
            ? 'border-coral bg-coral/10 text-ink'
            : 'border-ink-20 bg-gradient-to-br from-ink-5/60 to-white text-ink-60 hover:border-coral/40 hover:bg-ink-5/80'
        )}
      >
        <ImagePlus className="h-10 w-10 text-coral" strokeWidth={1.75} />
        <span className="text-[13px] font-semibold text-ink">Drop images here or browse</span>
        <span className="max-w-sm text-[12px] text-ink-40">PNG, JPG, WebP — multiple files supported (demo: stored as filenames)</span>
        <input
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            addFromList(e.target.files);
            e.target.value = '';
          }}
        />
      </label>

      {items.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <li
              key={it.key}
              className="group relative overflow-hidden rounded-2xl border border-ink-10 bg-white shadow-card-sm ring-1 ring-ink/5"
            >
              <div className="aspect-[4/3] bg-ink-5">
                {it.previewUrl ? (
                  <img src={it.previewUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center p-4 text-center text-[11px] font-medium text-ink-40">
                    {it.label}
                  </div>
                )}
              </div>
              <p className="truncate px-3 py-2 text-[11px] font-semibold text-ink-60">{it.label}</p>
              <button
                type="button"
                onClick={() => onRemove(it.key)}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-ink/80 text-white opacity-90 shadow-md backdrop-blur transition hover:bg-coral"
                aria-label="Remove"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
