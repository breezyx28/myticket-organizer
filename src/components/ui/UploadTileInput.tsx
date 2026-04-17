import { cn } from '@/lib/utils';

export function UploadTileInput({
  title,
  subtitle,
  accept,
  onPick,
  className,
}: {
  title: string;
  subtitle: string;
  accept: string;
  onPick: (file: File) => void;
  className?: string;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer flex-col rounded-2xl border-2 border-dashed border-ink-20 bg-gradient-to-br from-ink-5/80 to-white px-5 py-4 text-[13px] font-semibold text-ink-70 shadow-inner transition hover:border-coral/50 hover:bg-ink-5',
        className
      )}
    >
      <span className="text-ink">{title}</span>
      <span className="mt-1 text-[12px] font-normal text-ink-40">{subtitle}</span>
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = '';
        }}
      />
    </label>
  );
}
