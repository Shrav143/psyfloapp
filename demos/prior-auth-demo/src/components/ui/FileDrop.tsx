import { useRef, useState } from "react";
import { Eye, FileText, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { uid } from "@/lib/format";
import { Button } from "./Button";

export interface DemoFile {
  id: string;
  name: string;
  sizeKb: number;
}

/** A drop zone. Accepts real files (only the name and size are kept) or a one-click sample file for demos. */
export function FileDrop({ onFiles, sampleName, hint = "Drag and drop files here, or click to select files", title, variant = "bar", disabled, className }: { onFiles: (files: DemoFile[]) => void; sampleName?: string; hint?: string; /** The big panel's headline. */ title?: string; /** "panel" is the large zone for dumping a whole pile of files at once. */ variant?: "bar" | "panel"; disabled?: boolean; className?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const take = (list: FileList | null) => {
    if (!list || !list.length) return;
    onFiles(Array.from(list).map((f) => ({ id: uid("f"), name: f.name, sizeKb: Math.max(1, Math.round(f.size / 1024)) })));
  };
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        role="button"
        tabIndex={0}
        aria-label={hint}
        onClick={() => !disabled && input.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !disabled && input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (!disabled) take(e.dataTransfer.files);
        }}
        className={cn("flex cursor-pointer items-center justify-center border border-dashed text-muted transition-colors", variant === "panel" ? "min-h-[168px] flex-col gap-2 rounded-2xl px-6 text-center" : "h-[52px] gap-2.5 rounded-xl text-[13px]", over ? "border-forest bg-[#F3F7F4]" : variant === "panel" ? "border-field bg-tile hover:bg-[#F3EDE4]" : "border-field bg-white hover:bg-tile", disabled && "pointer-events-none opacity-50")}
      >
        {variant === "panel" ? (
          <>
            <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-forest"><UploadCloud size={24} className="ico" /></span>
            {title ? <span className="font-serif text-[20px] font-semibold text-ink">{title}</span> : null}
            <span className="max-w-[560px] text-[13.5px]">{hint}</span>
          </>
        ) : (
          <>
            <UploadCloud size={16} className="ico" />
            {hint}
          </>
        )}
      </div>
      <input ref={input} type="file" multiple hidden onChange={(e) => take(e.target.files)} />
      {sampleName ? (
        <div>
          <Button size="sm" variant="ghost" onClick={() => onFiles([{ id: uid("f"), name: sampleName, sizeKb: 184 }])} disabled={disabled}>
            Use sample file
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function FileRow({ file, onView, onRemove, status }: { file: DemoFile; onView?: () => void; onRemove?: () => void; status?: "ok" | "warn" | "checking" }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-field bg-white px-3.5 py-2.5">
      <span className={cn("grid h-8 w-8 place-items-center rounded-lg", status === "warn" ? "bg-mid-bg text-mid" : "bg-good-bg text-good")}>
        <FileText size={16} className="ico" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium underline decoration-1 underline-offset-[3px]">{file.name}</div>
        <div className="text-xs text-muted">{file.sizeKb} KB</div>
      </div>
      {onView ? (
        <button type="button" aria-label={`View ${file.name}`} onClick={onView} className="grid h-8 w-8 place-items-center rounded-lg text-ink2 hover:bg-tile">
          <Eye size={16} className="ico" />
        </button>
      ) : null}
      {onRemove ? (
        <button type="button" aria-label={`Remove ${file.name}`} onClick={onRemove} className="grid h-8 w-8 place-items-center rounded-lg text-ink2 hover:bg-tile">
          <X size={16} className="ico" />
        </button>
      ) : null}
    </div>
  );
}
