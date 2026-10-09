import { supabase } from "@/integrations/supabase/client";

/*
 * Notifications push, actives pour tout le monde : pas de bouton à activer.
 * À l'ouverture de l'app (connecté), l'appareil est abonné automatiquement.
 * Si la permission n'a jamais été demandée, elle l'est au premier toucher
 * dans l'app : iPhone et la plupart des navigateurs n'autorisent la demande
 * qu'en réponse à un geste de l'utilisateur. Sur iPhone, les notifications
 * web n'existent que dans l'app installée sur l'écran d'accueil (iOS 16.4+).
 */

const VAPID_PUBLIC = "BHycm49O7IY6XRNbKE-noieg9msa3SwDHMT8AMKJ7JVCZZWbNQQLvv-RaDOxV1Pyo70WH0FQEHLH7dIEunBAouw";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(base64.replace(/-/g, "+").replace(/_/g, "/") + padding);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** Enregistre le service worker (au démarrage, pour tout le monde). */
export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").catch(() => { /* navigateur sans service worker */ });
}

/** Abonne l'appareil (permission déjà accordée) et l'enregistre côté serveur. */
async function saveSubscription(lang: string): Promise<boolean> {
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  // Abonnement créé avec une autre clé : on le refait avec la clé d'Ooble.
  const key = sub?.options?.applicationServerKey;
  if (sub && key && new Uint8Array(key).toString() !== urlBase64ToUint8Array(VAPID_PUBLIC).toString()) {
    await sub.unsubscribe().catch(() => {});
    sub = null;
  }
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as BufferSource,
    });
  }
  const json = sub.toJSON();
  const { error } = await supabase.rpc("save_push_subscription" as never, {
    _endpoint: sub.endpoint,
    _p256dh: json.keys?.p256dh ?? "",
    _auth: json.keys?.auth ?? "",
    _lang: lang,
  } as never);
  return !error;
}

let pendingGesture: (() => void) | null = null;

/**
 * À appeler quand l'utilisateur est connecté. Abonne l'appareil tout de
 * suite si la permission est accordée ; sinon demande la permission au
 * premier toucher. Ne fait rien si l'utilisateur a refusé.
 */
export function ensurePush(lang: string) {
  if (!pushSupported()) return;
  const perm = Notification.permission;
  if (perm === "granted") {
    void saveSubscription(lang).catch(() => {});
    return;
  }
  if (perm !== "default" || pendingGesture) return;

  pendingGesture = () => {
    document.removeEventListener("click", pendingGesture!, true);
    pendingGesture = null;
    Notification.requestPermission()
      .then((p) => { if (p === "granted") return saveSubscription(lang); })
      .catch(() => {});
  };
  document.addEventListener("click", pendingGesture, true);
}
