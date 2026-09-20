import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";

const ChangerEmail = () => {
  const navigate = useNavigate();
  const { user, updateEmail } = useAuth();
  const t = useT();
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const header = (
    <div className="flex items-start gap-3">
      <button
        type="button"
        onClick={() => navigate("/app/compte")}
        aria-label={t("misc.back")}
        className="mt-0.5 flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-secondary/70 active:scale-95"
      >
        <ArrowLeft className="h-[18px] w-[18px]" />
      </button>
      <div>
        <h1 className="font-display text-[22px] font-semibold tracking-tight">{t("acct.emailChange")}</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">{user?.email}</p>
      </div>
    </div>
  );

  if (sent) {
    return (
      <AppShell header={header}>
        <div className="overflow-hidden rounded-2xl border border-border bg-card p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Check className="h-6 w-6 text-primary" strokeWidth={2.2} />
          </div>
          <p className="text-sm text-muted-foreground">{t("acct.emailSent")}</p>
          <Button
            variant="appSolid"
            shape="rounded"
            className="mt-6"
            onClick={() => navigate("/app/compte")}
          >
            {t("misc.back")}
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell header={header}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!newEmail.trim() || newEmail.trim() === user?.email) return;
          setSaving(true);
          setError("");
          const res = await updateEmail(newEmail);
          setSaving(false);
          if (res.error) {
            setError(res.error);
          } else {
            setSent(true);
          }
        }}
        className="overflow-hidden rounded-2xl border border-border bg-card p-5"
      >
        <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {t("acct.emailNew")}
        </label>
        <input
          type="email"
          required
          autoFocus
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-foreground/30 no-zoom"
          placeholder="nom@exemple.com"
        />
        {error && (
          <p className="mt-2 text-[13px] text-destructive">{error}</p>
        )}
        <Button
          type="submit"
          variant="appSolid"
          shape="rounded"
          className="mt-4 w-full"
          disabled={saving || !newEmail.trim()}
        >
          {saving ? t("acct.emailSaving") : t("acct.emailSave")}
        </Button>
      </form>
    </AppShell>
  );
};

export default ChangerEmail;
