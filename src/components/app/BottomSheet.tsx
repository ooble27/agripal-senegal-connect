import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

const BottomSheet = ({ open, onClose, title, children }: BottomSheetProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 backdrop-blur-sm" />

      {/* Sheet */}
      <div
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative z-10 w-full max-w-lg overflow-hidden bg-card shadow-2xl",
          "animate-in slide-in-from-bottom duration-300 ease-out",
          "rounded-t-[20px] sm:mb-0 sm:rounded-[20px]",
          "max-h-[92vh] pb-[env(safe-area-inset-bottom,20px)] sm:max-h-[85vh] sm:pb-0",
          "overflow-y-auto overscroll-contain",
          "mb-16 sm:mb-0",
        )}
      >
        {/* Handle bar (mobile) */}
        <div className="sticky top-0 z-10 bg-card pb-1 pt-3 sm:hidden">
          <div className="mx-auto h-[5px] w-10 rounded-full bg-muted-foreground/25" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 pt-4 sm:pt-5">
          {title && <h2 className="font-display text-[17px] font-semibold tracking-tight">{title}</h2>}
          <button
            type="button"
            onClick={onClose}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-foreground/70 transition-colors hover:bg-secondary/80"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pb-6">{children}</div>
      </div>
    </div>
  );
};

export default BottomSheet;
