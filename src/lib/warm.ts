import { getMyProfile } from "@/lib/profile";
import { getMyKyc } from "@/lib/kyc";
import { getMyKyb } from "@/lib/kyb";
import { getAllowance, listMyOrders } from "@/lib/orders";

/**
 * Précharge, une fois par session, les données des pages de l'app (profil,
 * vérifications, limites, activité). Chaque page s'affiche ensuite tout de
 * suite, même à la première visite.
 */
let warmedFor: string | null = null;

export function warmAppData(uid: string | null | undefined) {
  if (!uid || warmedFor === uid) return;
  warmedFor = uid;
  void Promise.allSettled([
    getMyProfile(),
    getMyKyc(),
    getMyKyb(),
    getAllowance("buy"),
    getAllowance("sell"),
    listMyOrders(100),
  ]);
}
