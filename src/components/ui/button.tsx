import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground shadow-teal hover:-translate-y-0.5",
        deep: "bg-deep text-deep-foreground hover:opacity-90",
        secondary: "bg-secondary text-foreground hover:shadow-sm",
        ghost: "text-foreground hover:bg-secondary",
        white: "bg-white text-primary shadow-soft hover:-translate-y-0.5",
        outlineOnDark: "border border-white/25 text-white hover:bg-white/10",
        /* Variantes « app » — plates, sans ombre, style « pastille » (surface + filet fin). */
        appPrimary: "border border-border bg-card text-foreground hover:bg-secondary active:bg-secondary",
        appOnDark: "bg-white text-deep hover:bg-white/90 active:bg-white/80",
        appOutline: "border border-border bg-card text-foreground hover:bg-secondary",
        /* Action pleine (back-office) : contraste fort — blanc sur sombre, sombre sur clair. */
        appSolid: "bg-foreground text-background hover:opacity-90 active:opacity-80 btn-depth",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        default: "h-11 px-5 text-sm",
        lg: "h-12 px-7 text-[15px]",
      },
      shape: {
        pill: "rounded-full",
        rounded: "rounded-xl",
        soft: "rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
      shape: "pill",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, shape, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, shape, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
