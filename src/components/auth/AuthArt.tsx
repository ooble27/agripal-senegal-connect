/* Illustration du panneau de connexion et d'inscription, une par page.
   Personnages Humaaans (Pablo Stanley, licence libre) recolorés aux couleurs
   de la marque et composés avec des plantes ; fichiers dans
   public/illustrations/auth. */

export type ArtKind = "login" | "signup" | "individual" | "business" | "reset";

const AuthArt = ({ kind, className }: { kind: ArtKind; className?: string }) => (
  <img src={`/illustrations/auth/${kind}.svg`} alt="" draggable={false} className={className} />
);

export default AuthArt;
