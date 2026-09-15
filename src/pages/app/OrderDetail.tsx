import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AppShell from "@/components/app/AppShell";
import { OrderDetailContent } from "@/components/app/ActivityList";
import { useT } from "@/lib/i18n";
import type { OrderRow } from "@/lib/orders";

const OrderDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const t = useT();
  const order = location.state?.order as OrderRow | undefined;

  if (!order) {
    navigate("/app/activite", { replace: true });
    return null;
  }

  const buy = order.side === "buy";

  return (
    <AppShell
      header={
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label={t("misc.back")}
            className="mt-0.5 flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-secondary/70 active:scale-95"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </button>
          <div>
            <h1 className="font-display text-[22px] font-semibold tracking-tight">
              {buy ? t("act.buyDetail") : t("act.sellDetail")}
            </h1>
          </div>
        </div>
      }
    >
      <OrderDetailContent o={order} />
    </AppShell>
  );
};

export default OrderDetail;
