import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  onDark?: boolean;
  /** Sur un panneau inversé (bg-foreground) : suit le thème, contrairement à `onDark`. */
  inverted?: boolean;
}

const Logo = ({ className, onDark, inverted }: LogoProps) => (
  <Link to="/" className={cn("flex items-center gap-2.5", className)}>
    <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-deep">
      <svg viewBox="0 0 32 32" className="h-8 w-8">
        <circle cx="12.5" cy="16" r="4.6" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.6" />
        <circle cx="20.5" cy="16" r="4.6" fill="none" stroke="#ffffff" strokeWidth="2.6" />
      </svg>
    </span>
    <span
      className={cn(
        "font-display text-xl font-bold tracking-tight",
        onDark && "text-white",
        inverted && "text-background",
      )}
    >
      Ooble
    </span>
  </Link>
);

export default Logo;
