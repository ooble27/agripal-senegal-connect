import { useAuth } from "@/lib/auth";
import { OTC_ENABLED } from "@/lib/config";

/**
 * Le desk OTC est-il visible pour la personne connectée ? Tant que
 * OTC_ENABLED vaut false, seulement pour l'équipe Ooble (staff).
 */
export function useOtcVisible(): boolean {
  const { isStaff } = useAuth();
  return OTC_ENABLED || isStaff;
}
