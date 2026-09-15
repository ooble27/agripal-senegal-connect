import { useRef, useEffect, useState, useCallback } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { House, Coins, HandCoins } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import type { TKey } from "@/lib/translations";

const items: { to: string; labelKey: TKey; icon: typeof House; end: boolean }[] = [
  { to: "/app", labelKey: "bnav.home", icon: House, end: true },
  { to: "/app/acheter", labelKey: "bnav.buy", icon: Coins, end: false },
  { to: "/app/vendre", labelKey: "bnav.sell", icon: HandCoins, end: false },
];

const BottomNav = () => {
  const t = useT();
  const location = useLocation();
  const navRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false });

  const activeIndex = items.findIndex(({ to, end }) =>
    end ? location.pathname === to : location.pathname.startsWith(to),
  );

  const measure = useCallback(() => {
    const nav = navRef.current;
    const el = itemRefs.current[activeIndex];
    if (!nav || !el) return;
    const navRect = nav.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setPill({ left: elRect.left - navRect.left, width: elRect.width, ready: true });
  }, [activeIndex]);

  useEffect(() => {
    requestAnimationFrame(measure);
  }, [measure]);

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <nav
        ref={navRef}
        className="relative flex w-full max-w-[320px] items-center justify-around gap-1.5 rounded-[22px] border border-border bg-card/95 p-2 backdrop-blur-xl"
      >
        {pill.ready && (
          <div
            className="absolute top-2 h-[calc(100%-16px)] rounded-2xl bg-secondary transition-[left,width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{ left: pill.left, width: pill.width }}
          />
        )}

        {items.map(({ to, labelKey, icon: Icon, end }, i) => {
          const isActive = i === activeIndex;
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              ref={(el) => { itemRefs.current[i] = el; }}
              className={cn(
                "relative z-10 flex items-center justify-center rounded-2xl py-[12px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                isActive ? "gap-2 px-[18px]" : "gap-0 px-[15px]",
              )}
            >
              <Icon
                size={20}
                strokeWidth={isActive ? 2.1 : 1.7}
                className={cn("shrink-0 transition-colors duration-200", isActive ? "text-foreground" : "text-muted-foreground")}
              />
              <span
                className={cn(
                  "overflow-hidden whitespace-nowrap text-[13px] font-semibold tracking-[0.01em] text-foreground transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                  isActive ? "max-w-[80px] opacity-100" : "max-w-0 opacity-0",
                )}
              >
                {t(labelKey)}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNav;
