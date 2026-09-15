import { useEffect, useState } from "react";
import { BookmarkPlus, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { T, useLang } from "@/lib/i18n";
import {
  listRecipients,
  removeRecipient,
  saveRecipient,
  touchRecipient,
  type RecipientKind,
  type SavedRecipient,
} from "@/lib/recipients";
import type { NetId } from "@/components/app/networks";
import { cn } from "@/lib/utils";

interface Props {
  kind: RecipientKind;
  /** Requis pour `wallet` : filtre le carnet sur le réseau de l'ordre. */
  network?: NetId | null;
  /** Valeur actuellement saisie, pour surligner l'entrée choisie. */
  value: string;
  onPick: (value: string) => void;
}

const short = (v: string) => (v.length > 22 ? `${v.slice(0, 10)}…${v.slice(-8)}` : v);

/**
 * Carnet de destinataires : liste les entrées enregistrées et permet d'ajouter
 * la valeur saisie. Évite au client de retaper son adresse ou son courriel
 * Interac à chaque ordre.
 */
const RecipientBook = ({ kind, network, value, onPick }: Props) => {
  const [lang] = useLang();
  const [items, setItems] = useState<SavedRecipient[] | null>(null);
  const [label, setLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isWallet = kind === "wallet";
  const trimmed = value.trim();

  const reload = () => {
    void listRecipients(kind, network).then(setItems);
  };

  useEffect(() => {
    let alive = true;
    listRecipients(kind, network).then((rows) => {
      if (alive) setItems(rows);
    });
    return () => { alive = false; };
  }, [kind, network]);

  const alreadySaved = (items ?? []).some((i) => i.value === trimmed);
  const canOfferSave = trimmed.length >= (isWallet ? 12 : 5) && !alreadySaved;

  const pick = (r: SavedRecipient) => {
    onPick(r.value);
    void touchRecipient(r.id);
  };

  const confirmSave = async () => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    const res = await saveRecipient({ kind, label, value: trimmed, network });
    setBusy(false);
    if ("error" in res) {
      setErr(res.error);
      return;
    }
    setLabel("");
    setAdding(false);
    reload();
  };

  const drop = async (id: string) => {
    setBusy(true);
    await removeRecipient(id);
    setBusy(false);
    reload();
  };

  return (
    <div className="mt-3">
      {items && items.length > 0 && (
        <>
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {isWallet
              ? (lang === "en" ? "Saved addresses" : "Adresses enregistrées")
              : (lang === "en" ? "Saved emails" : "Courriels enregistrés")}
          </p>
          <div className="divide-y divide-border overflow-hidden rounded-[14px] border border-border bg-card">
            {items.map((r) => {
              const sel = r.value === trimmed;
              return (
                <div key={r.id} className="flex items-center gap-3 px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => pick(r)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left transition-opacity active:opacity-60"
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                        sel ? "bg-foreground text-background" : "bg-secondary text-muted-foreground",
                      )}
                    >
                      {sel ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : <BookmarkPlus className="h-3.5 w-3.5" strokeWidth={1.8} />}
                    </span>
                    <span className="min-w-0 leading-tight">
                      <span className="block truncate text-[13px]">{r.label}</span>
                      <span className="block truncate font-mono text-[11px] text-muted-foreground">
                        {short(r.value)}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => drop(r.id)}
                    disabled={busy}
                    aria-label={lang === "en" ? `Delete ${r.label}` : `Supprimer ${r.label}`}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {canOfferSave && !adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-3 inline-flex items-center gap-2 px-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <BookmarkPlus className="h-4 w-4" strokeWidth={1.8} />
          {isWallet
            ? (lang === "en" ? "Save this address" : "Enregistrer cette adresse")
            : (lang === "en" ? "Save this email" : "Enregistrer ce courriel")}
        </button>
      )}

      {canOfferSave && adding && (
        <div className="mt-3 rounded-[14px] border border-border bg-card p-3">
          <input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={isWallet
              ? (lang === "en" ? "Name (e.g. My Ledger)" : "Nom (ex. Mon Ledger)")
              : (lang === "en" ? "Name (e.g. Main account)" : "Nom (ex. Compte principal)")}
            maxLength={60}
            /* 16 px minimum : en dessous, iOS zoome automatiquement sur le champ. */
            className="w-full rounded-[10px] border border-border bg-secondary/40 px-3 py-2.5 text-[16px] outline-none placeholder:text-muted-foreground/60"
          />
          {err && <p className="mt-2 text-[12px] text-destructive">{err}</p>}
          <div className="mt-2.5 flex justify-end gap-2">
            <Button
              variant="ghost"
              shape="soft"
              className="h-auto px-3.5 py-2 text-[13px]"
              onClick={() => { setAdding(false); setLabel(""); setErr(null); }}
            >
              <T en="Cancel">Annuler</T>
            </Button>
            <Button
              variant="appPrimary"
              shape="soft"
              className="h-auto px-3.5 py-2 text-[13px]"
              disabled={!label.trim() || busy}
              onClick={confirmSave}
            >
              {busy
                ? <T en="Saving…">Enregistrement…</T>
                : <T en="Save">Enregistrer</T>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipientBook;
