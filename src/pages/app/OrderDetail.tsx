import { useEffect, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AppShell from "@/components/app/AppShell";
import { OrderDetailContent } from "@/components/app/ActivityList";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";
import type { OrderRow } from "@/lib/orders";

/**
 * Fiche d'une commande. Ouverte depuis la liste, l'ordre arrive dans l'état
 * de navigation ; ouverte depuis un lien (courriel « Transaction terminée »),
 * il est relu en base — la RLS ne renvoie que les ordres du client connecté.
 */
const OrderDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const t = useT();
  const [order, setOrder] = useState<OrderRow | null>((location.state?.order as OrderRow | undefined) ?? null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (order || !id) return;
    let on = true;
    (async () => {
      const { data: auth } = await supabase.auth.getSession();
      const uid = auth.session?.user?.id;
      const { data } = await supabase.from("orders").select("*").eq("id", id).eq("user_id", uid ?? "").maybeSingle();
      if (!on) return;
      if (data) setOrder(data as OrderRow); else setMissing(true);
    })();
    return () => { on = false; };
  }, [id, order]);

  useEffect(() => {
    if (missing || (!id && !order)) navigate("/app/activite", { replace: true });
  }, [missing, id, order, navigate]);

  if (!order) return null;
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
