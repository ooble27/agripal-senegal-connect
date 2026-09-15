import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Network } from "./networks";

interface NetworkChipProps {
  network: Network;
  selected: boolean;
  onSelect: () => void;
}

/** Pastille de réseau sélectionnable (vrai logo de la blockchain). */
const NetworkChip = ({ network, selected, onSelect }: NetworkChipProps) => (
  <button
    type="button"
    onClick={onSelect}
    aria-pressed={selected}
    className={cn(
      "flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all active:scale-[0.98]",
      selected ? "border-foreground bg-secondary/60" : "border-border bg-card hover:bg-secondary/50",
    )}
  >
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full">
      <img src={`/coins/${network.id}.svg`} alt="" className="h-9 w-9" draggable={false} />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate font-semibold leading-tight">{network.name}</span>
      <span className="block text-xs text-muted-foreground">{network.tag}</span>
    </span>
    {selected && (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    )}
  </button>
);

export default NetworkChip;
