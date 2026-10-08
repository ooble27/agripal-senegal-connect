/**
 * Cache en mémoire des données de l'utilisateur connecté (profil,
 * vérifications, limites, ordres). Les pages de l'app s'affichent avec la
 * dernière valeur connue, sans attendre le serveur, puis la relisent en
 * arrière-plan. Vidé à la déconnexion. Les clés incluent l'identifiant de
 * l'utilisateur.
 */
const store = new Map<string, unknown>();

/** Valeur connue pour cette clé (undefined : jamais chargée). */
export function peekCache<T>(key: string | null): T | undefined {
  return key ? (store.get(key) as T | undefined) : undefined;
}

export function putCache<T>(key: string, value: T): T {
  store.set(key, value);
  return value;
}

export function clearCache() {
  store.clear();
}
