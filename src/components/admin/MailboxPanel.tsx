/**
 * Panneau « Messagerie » du back-office.
 *
 * Vocation : permettre au staff d'écrire librement à un client (sujet + corps
 * complets), avec l'aide facultative de « points de départ » réutilisables
 * (les templates deviennent des raccourcis, pas des corsets). Le composer
 * ressemble à un vrai client mail — pas un formulaire à variables.
 *
 * Personnalisation :
 *   - le champ « À » est un picker qui charge l'annuaire clients réel
 *     (fetchClientDirectory) et propose recherche + multi-sélection ;
 *   - dans le corps, les variables `{{prenom}}`, `{{nom}}`, `{{nom_complet}}`
 *     et `{{email}}` sont remplacées automatiquement par les vraies valeurs
 *     de chaque destinataire au moment de l'envoi (un envoi par client) ;
 *   - un envoi à plusieurs clients boucle : chaque destinataire reçoit un
 *     mail nominatif — pas de « Bonjour {{prenom}} » qui traîne.
 *
 * Sous-vues :
 *   1. Composer  — libre. Corps rédigé en markdown minimal (gras, italique,
 *                  listes, liens, titres…) avec toolbar. Aperçu HTML rendu
 *                  en direct avec substitution live des variables.
 *   2. Envoyés   — historique local des envois avec statut.
 *   3. Points de départ — snippets réutilisables (« bienvenue », « suivi »,
 *                  « demande de complément KYC »…). Un clic → chargés dans
 *                  le composer, entièrement modifiables ensuite.
 *   4. Réception — bloc de configuration expliquant les étapes pour activer
 *                  la réception (Resend Inbound + webhook).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Send, Mail, Inbox, Sparkles, Check, AlertTriangle, Eye, Bold, Italic,
  List, ListOrdered, Link as LinkIcon, Heading2, Quote, Minus, Copy,
  X, User, Users, Wand2, Loader2, ArrowLeft, Reply, Archive, MailOpen,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { sendCustomEmail } from "@/lib/email";
import { loadSent, recordSent, type SentMail } from "@/lib/mailHistory";
import {
  fetchClientDirectory, fetchClientProfile,
  type ClientDirectoryEntry,
} from "@/lib/adminClient";
import { draftMail, isAIError, toAIClientContext } from "@/lib/ai";
import { fetchPlatformContext } from "@/lib/aiContext";
import {
  markdownToHtml, wrapSelection, insertAtCursor, prefixLines, defaultSignature,
  substituteVars, extractRemainingVars, CLIENT_VARS,
} from "@/lib/mailComposer";
import {
  fetchThreads, fetchMessages, markThreadRead, archiveThread,
  createThread, insertOutboundMessage, threadReplyTo, countUnread,
  type MailThread, type MailMessage,
} from "@/lib/mailThreads";
import AdminHero from "./AdminHero";
import { SubTabs } from "./AdminBits";
import { C, FONT, card, sH, inputStyle, listRowStyle } from "./adminTheme";

// ──────────────────── Recipient model ────────────────────
//
// Un « recipient » peut être soit un client réel (id + prénom + nom), soit
// une adresse tapée à la main (pas d'id, prénom déduit de la partie locale).
// L'UI affiche l'un et l'autre sous forme de puce.

interface Recipient {
  id?: string;
  email: string;
  firstName: string;
  fullName: string;
}

function manualRecipient(email: string): Recipient {
  const local = email.split("@")[0] ?? "";
  const first = (local.split(/[.\-_]/)[0] || "").replace(/^./, (c) => c.toUpperCase());
  return { email, firstName: first, fullName: first };
}

function recipientFromClient(c: ClientDirectoryEntry): Recipient {
  return { id: c.id, email: c.email, firstName: c.firstName, fullName: c.fullName };
}

function recipientVars(r: Recipient): Record<string, string> {
  return {
    prenom: r.firstName || "",
    nom: r.fullName.split(/\s+/).slice(1).join(" ") || r.firstName || "",
    nom_complet: r.fullName || r.email,
    email: r.email,
  };
}

// ──────────────────── Points de départ (snippets) ────────────────────

interface Snippet {
  id: string;
  name: string;
  description: string;
  subject: string;
  body: string;
}

const SNIPPETS: Snippet[] = [
  {
    id: "kyc-followup",
    name: "Relance KYC",
    description: "Le client n'a pas fini sa vérification d'identité.",
    subject: "Votre vérification d'identité — Ooble",
    body: `Bonjour {{prenom}},

Nous n'avons pas encore reçu tous les documents nécessaires à la validation de votre compte Ooble.

Pour finaliser votre vérification, vous pouvez reprendre depuis votre espace :
[Reprendre la vérification](https://ooble.ca/app/verification)

Un membre de l'équipe reste disponible si vous avez la moindre question — répondez simplement à ce message.

À bientôt,`,
  },
  {
    id: "kyc-complement",
    name: "Demande de complément KYC",
    description: "Un document est illisible ou manque.",
    subject: "Complément d'information pour votre dossier — Ooble",
    body: `Bonjour {{prenom}},

Nous avons bien reçu votre dossier de vérification et il nous manque **{{piece}}** pour finaliser.

Pouvez-vous nous transmettre ce document en réponse à ce message, ou via votre espace ?

Merci,`,
  },
  {
    id: "welcome-manual",
    name: "Bienvenue personnalisée",
    description: "Message de bienvenue rédigé à la main, plus chaleureux que le mail auto.",
    subject: "Bienvenue sur Ooble",
    body: `Bonjour {{prenom}},

Bienvenue chez Ooble. Votre compte est actif : vous pouvez dès maintenant acheter ou vendre des USDT contre des dollars canadiens.

Quelques repères pour bien démarrer :

- Le taux est verrouillé pendant 15 minutes après création d'un ordre.
- Vos paiements Interac utilisent une question de sécurité personnelle — visible dans votre compte.
- Pour toute question, cet e-mail est le bon canal : nous vous répondons dans la journée.

Bienvenue à bord,`,
  },
  {
    id: "compliance-info",
    name: "Demande CANAFE",
    description: "Demande d'information pour une opération importante.",
    subject: "Vérification d'une opération — Ooble",
    body: `Bonjour {{prenom}},

Dans le cadre de nos obligations réglementaires (LRPCFAT / CANAFE), nous avons besoin de quelques précisions sur votre opération **{{ref}}** :

1. Nature exacte des fonds
2. Provenance
3. Usage prévu

Ces informations restent confidentielles et sont conservées dans votre dossier.

Merci d'y répondre dans les 5 jours ouvrables afin que nous puissions procéder au traitement.

Cordialement,`,
  },
  {
    id: "sav-response",
    name: "Réponse SAV",
    description: "Réponse type à une demande d'assistance.",
    subject: "Re: {{sujet}}",
    body: `Bonjour {{prenom}},

Merci pour votre message.

{{reponse}}

Restez à l'écoute et n'hésitez pas si autre chose,`,
  },
  {
    id: "kyc-approved",
    name: "KYC approuvé",
    description: "Notification de vérification d'identité réussie.",
    subject: "Votre identité est vérifiée — Ooble",
    body: `Bonjour {{prenom}},

Bonne nouvelle : votre vérification d'identité est **approuvée**. Vous pouvez désormais acheter et vendre sans limite quotidienne réduite.

[Acheter des USDT](https://ooble.ca/app/acheter)

Bonne journée,`,
  },
  {
    id: "kyc-rejected",
    name: "KYC refusé",
    description: "Rejet KYC avec explication et prochaine étape.",
    subject: "Votre vérification d'identité — action requise",
    body: `Bonjour {{prenom}},

Après examen de votre dossier de vérification, nous ne pouvons pas l'approuver en l'état pour la raison suivante :

> {{raison}}

Vous pouvez recommencer la démarche depuis votre espace, avec les corrections nécessaires. Répondez à ce mail si vous avez besoin d'accompagnement — nous sommes là pour vous aider à finaliser.

[Reprendre la vérification](https://ooble.ca/app/verification)

Cordialement,`,
  },
  {
    id: "payment-confirmed-manual",
    name: "Paiement reçu (manuel)",
    description: "Confirmation manuelle après réception d'un Interac.",
    subject: "Paiement reçu — ordre {{ref}}",
    body: `Bonjour {{prenom}},

Nous confirmons la réception de votre paiement Interac pour l'ordre **{{ref}}**.

Nous procédons à l'envoi de vos USDT à l'adresse indiquée. Vous recevrez un dernier mail avec le hash de transaction dès que c'est envoyé.

[Suivre ma commande](https://ooble.ca/app/activite/{{ref}})

Merci de votre confiance,`,
  },
  {
    id: "order-completed-manual",
    name: "Transaction terminée",
    description: "Confirmation manuelle après envoi USDT.",
    subject: "Transaction terminée — ordre {{ref}}",
    body: `Bonjour {{prenom}},

Votre transaction **{{ref}}** est terminée. Voici le hash de transaction blockchain :

\`{{hash}}\`

Vous pouvez le retrouver dans votre historique à tout moment.

[Voir le reçu](https://ooble.ca/app/activite/{{ref}})

À bientôt sur Ooble,`,
  },
  {
    id: "security-alert",
    name: "Alerte sécurité",
    description: "Signaler une activité inhabituelle sur le compte.",
    subject: "Activité inhabituelle sur votre compte — Ooble",
    body: `Bonjour {{prenom}},

Nous avons détecté une activité inhabituelle sur votre compte Ooble : **{{detail}}**.

Par précaution, nous avons temporairement suspendu les opérations en attendant votre confirmation. Si c'était bien vous, répondez simplement à ce message pour lever la suspension.

Si vous ne reconnaissez pas cette activité, changez immédiatement votre mot de passe et contactez-nous.

Cordialement,
L'équipe sécurité Ooble`,
  },
  {
    id: "delay-apology",
    name: "Excuses délai",
    description: "Message d'excuse pour un traitement plus long que prévu.",
    subject: "Traitement de votre ordre {{ref}} — Ooble",
    body: `Bonjour {{prenom}},

Le traitement de votre ordre **{{ref}}** prend plus de temps qu'habituellement en raison de **{{cause}}**. Nous en sommes désolés.

Estimation d'achèvement : **{{eta}}**.

Nous restons à votre disposition en réponse à ce message si vous avez la moindre question.

Merci pour votre patience,`,
  },
  {
    id: "commercial-outreach",
    name: "Prise de contact commerciale",
    description: "Premier contact avec un client entreprise.",
    subject: "Ooble pour {{entreprise}} — un mot rapide",
    body: `Bonjour {{prenom}},

Je suis {{agent}} chez Ooble. Nous accompagnons plusieurs entreprises comme {{entreprise}} dans leurs opérations USDT/CAD au Canada — règlement par Interac, tarification transparente, aucune garde des fonds.

Auriez-vous 15 minutes cette semaine pour un rapide échange sur vos besoins ? Je peux vous proposer des créneaux ou vous laisser choisir.

Bien à vous,`,
  },
  {
    id: "limit-increase-info",
    name: "Info limite quotidienne",
    description: "Répondre à une question sur les plafonds.",
    subject: "Votre limite quotidienne — Ooble",
    body: `Bonjour {{prenom}},

Votre limite quotidienne actuelle est de **{{limite}} CAD**.

Pour l'augmenter, nous avons besoin des pièces suivantes selon votre profil :

- Justificatif de source des fonds (relevés bancaires 3 mois, contrat, etc.)
- Pour les entreprises : liste des bénéficiaires effectifs à jour

Envoyez-nous ces éléments en réponse à ce message et nous procéderons à l'augmentation dans les 48h ouvrables.

Cordialement,`,
  },
  {
    id: "interac-not-received",
    name: "Interac non reçu",
    description: "Le client dit avoir envoyé un Interac que nous n'avons pas reçu.",
    subject: "Votre virement Interac — ordre {{ref}}",
    body: `Bonjour {{prenom}},

Nous n'avons pas encore reçu votre virement Interac pour l'ordre **{{ref}}**. Les virements Interac prennent généralement quelques minutes mais peuvent parfois durer jusqu'à 30 minutes.

Pour nous aider à vérifier, pouvez-vous nous confirmer :

1. L'e-mail Interac utilisé pour l'envoi
2. La question de sécurité et sa réponse
3. La date/heure de l'envoi
4. Le montant exact envoyé

Nous recherchons de notre côté en parallèle.

Cordialement,`,
  },
  {
    id: "wrong-network",
    name: "Mauvais réseau USDT",
    description: "Le client a envoyé USDT sur le mauvais réseau blockchain.",
    subject: "Réseau blockchain — action requise sur votre vente",
    body: `Bonjour {{prenom}},

Nous détectons que le dépôt USDT associé à votre ordre **{{ref}}** a été effectué sur le réseau **{{reseauRecu}}**, alors que l'ordre était configuré pour **{{reseauAttendu}}**.

Selon le réseau utilisé, la récupération des fonds est parfois possible mais nécessite des frais supplémentaires et un délai de traitement plus long.

Merci de nous confirmer :

1. Le hash de la transaction
2. L'adresse d'expédition

Nous revenons vers vous avec la marche à suivre.

Cordialement,`,
  },
  {
    id: "address-format",
    name: "Adresse wallet invalide",
    description: "L'adresse de réception fournie n'est pas valide pour le réseau choisi.",
    subject: "Vérification de votre adresse USDT — ordre {{ref}}",
    body: `Bonjour {{prenom}},

Avant d'envoyer vos USDT pour l'ordre **{{ref}}**, nous vérifions systématiquement le format de l'adresse de réception. Celle que vous avez fournie ne correspond pas au format attendu pour le réseau **{{reseau}}**.

Pouvez-vous nous confirmer que vous vouliez bien recevoir sur **{{reseau}}** ? Si oui, envoyez-nous en réponse la bonne adresse pour ce réseau.

Cordialement,`,
  },
  {
    id: "canafe-doimv",
    name: "CANAFE — DOIMV (opération importante)",
    description: "Notification de déclaration d'opération importante MV (≥ 10 000 $).",
    subject: "Déclaration réglementaire — votre opération {{ref}}",
    body: `Bonjour {{prenom}},

Nous vous informons qu'en application de la Loi sur le recyclage des produits de la criminalité et le financement des activités terroristes (LRPCFAT), votre opération **{{ref}}** d'un montant de **{{montant}} CAD** a fait l'objet d'une déclaration d'opération importante en monnaie virtuelle (DOIMV) transmise au CANAFE.

Cette déclaration est obligatoire pour toute opération de 10 000 $ CAD ou plus. Elle ne remet pas en cause votre opération et n'entraîne aucune action de votre part.

Vos données restent confidentielles et sont conservées conformément à nos obligations légales (5 ans).

Cordialement,`,
  },
  {
    id: "refund-processed",
    name: "Remboursement traité",
    description: "Notification qu'un remboursement Interac a été émis.",
    subject: "Remboursement traité — ordre {{ref}}",
    body: `Bonjour {{prenom}},

Nous confirmons l'émission d'un remboursement de **{{montant}} CAD** pour votre ordre **{{ref}}**. Vous recevrez le virement Interac à l'adresse **{{email}}** dans un délai de 30 minutes à 24 heures selon votre banque.

Motif du remboursement : {{motif}}.

Si vous ne l'avez pas reçu sous 48h, répondez à ce message et nous procéderons à un suivi immédiat.

Cordialement,`,
  },
  {
    id: "account-frozen",
    name: "Compte gelé — conformité",
    description: "Notification de gel de compte le temps d'une revue.",
    subject: "Suspension temporaire de votre compte — Ooble",
    body: `Bonjour {{prenom}},

Dans le cadre de nos obligations de conformité, votre compte Ooble est temporairement suspendu le temps d'une revue de dossier.

Aucune action n'est requise de votre part pour l'instant. Nous vous recontacterons dans les meilleurs délais avec les éventuelles informations complémentaires nécessaires.

Nous vous remercions de votre compréhension.

Cordialement,`,
  },
  {
    id: "rate-locked-reminder",
    name: "Rappel taux verrouillé",
    description: "Rappeler que le taux expire bientôt sur un ordre.",
    subject: "Votre taux expire bientôt — ordre {{ref}}",
    body: `Bonjour {{prenom}},

Petit rappel : le taux verrouillé pour votre ordre **{{ref}}** expire dans quelques minutes. Passé ce délai, l'ordre sera automatiquement annulé et il faudra en recréer un nouveau au taux du moment.

[Régler maintenant](https://ooble.ca/app/activite/{{ref}})

Cordialement,`,
  },
  {
    id: "welcome-business",
    name: "Bienvenue — compte entreprise",
    description: "Accueil personnalisé d'un nouveau compte entreprise.",
    subject: "Bienvenue chez Ooble, {{prenom}} — compte entreprise",
    body: `Bonjour {{prenom}},

Merci d'avoir créé un compte entreprise chez Ooble pour **{{entreprise}}**. Nous accompagnons vos opérations USDT/CAD avec une tarification adaptée aux volumes professionnels.

Prochaines étapes pour finaliser votre dossier :

1. Vérification de l'identité des bénéficiaires effectifs
2. Justificatif d'existence de la société (extrait Kbis, NEQ, etc.)
3. Justificatif de l'activité économique

Un chargé de compte prendra contact avec vous dans les 24h. En attendant, répondez à ce message si vous avez la moindre question.

Cordialement,`,
  },
  {
    id: "newsletter-update",
    name: "Annonce produit / mise à jour",
    description: "Communiquer une nouvelle fonctionnalité ou évolution.",
    subject: "Nouveauté chez Ooble : {{sujet}}",
    body: `Bonjour {{prenom}},

Nous avons une nouveauté à vous partager.

**{{titre}}**

{{description}}

[En savoir plus](https://ooble.ca/{{lien}})

Merci de votre confiance,`,
  },
  {
    id: "maintenance-notice",
    name: "Maintenance planifiée",
    description: "Prévenir d'une fenêtre de maintenance à venir.",
    subject: "Maintenance planifiée — Ooble",
    body: `Bonjour {{prenom}},

Nous vous informons qu'une opération de maintenance est programmée le **{{date}}** de **{{heureDebut}}** à **{{heureFin}}** (heure de l'Est).

Pendant cette période, l'accès à la plateforme sera temporairement indisponible. Aucune opération en cours ne sera perdue.

Merci pour votre compréhension.

Cordialement,`,
  },
  {
    id: "birthday-message",
    name: "Message anniversaire",
    description: "Petit mot personnel pour l'anniversaire d'un client.",
    subject: "Joyeux anniversaire, {{prenom}}",
    body: `Bonjour {{prenom}},

Toute l'équipe Ooble se joint à moi pour vous souhaiter un très joyeux anniversaire.

Merci pour votre confiance depuis {{depuis}}.

Bonne journée,`,
  },
];

type SubTab = "compose" | "sent" | "snippets" | "inbox";

const dateFmt = new Intl.DateTimeFormat("fr-CA", {
  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
});
const EMAIL_RE = /^\S+@\S+\.\S+$/;

// ────────────────────────────────────────────────────────────
// Composer libre
// ────────────────────────────────────────────────────────────

interface ComposerState {
  recipients: Recipient[];
  cc: string;
  subject: string;
  body: string;
}

interface ComposeViewProps {
  onSent: () => void;
  initial: ComposerState | null;
  onConsumed: () => void;
  clients: ClientDirectoryEntry[];
  clientsLoading: boolean;
  replyThreadId?: string | null;
}

function ComposeView({ onSent, initial, onConsumed, clients, clientsLoading, replyThreadId }: ComposeViewProps) {
  const { session } = useAuth();
  const author = session?.user?.email ?? "staff";
  const signature = useMemo(() => defaultSignature(author), [author]);

  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState(signature);
  const [showCc, setShowCc] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<null | { kind: "ok" | "err"; text: string }>(null);
  const [showPreview, setShowPreview] = useState(true);

  // Assistant IA — état du prompt + du chargement.
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!initial) return;
    setRecipients(initial.recipients);
    setCc(initial.cc);
    setSubject(initial.subject);
    setBody(initial.body || signature);
    setFeedback(null);
    onConsumed();
  }, [initial, signature, onConsumed]);

  // Aperçu : on personnalise avec le premier destinataire réel ; s'il n'y en
  // a aucun, on laisse les variables visibles pour que l'auteur sache où
  // elles s'inséreront.
  const previewRecipient = recipients[0];
  const previewVars = previewRecipient ? recipientVars(previewRecipient) : {};
  const previewBody = previewRecipient
    ? substituteVars(body, previewVars)
    : substituteVars(body, {}, [...CLIENT_VARS]);
  const previewSubject = previewRecipient
    ? substituteVars(subject, previewVars)
    : substituteVars(subject, {}, [...CLIENT_VARS]);
  const renderedHtml = useMemo(() => markdownToHtml(previewBody), [previewBody]);

  // Variables `{{xxx}}` non-client encore dans le texte : on prévient
  // l'agent qu'elles partiront telles quelles s'il n'y touche pas.
  const clientVarSet = new Set<string>(CLIENT_VARS);
  const remainingVars = useMemo(
    () => extractRemainingVars(`${subject}\n${body}`).filter((v) => !clientVarSet.has(v)),
    [subject, body],
  );

  const valid = recipients.length > 0 && subject.trim().length > 0 && body.trim().length > 0;

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setFeedback(null);
    const ccList = cc.split(",").map((s) => s.trim()).filter((s) => EMAIL_RE.test(s));

    // Un envoi par destinataire, avec substitution des variables client.
    // On séquentialise (petits volumes, pas d'urgence) pour bien tracer
    // chaque envoi dans l'historique.
    let ok = 0;
    let failed = 0;
    let lastError: string | undefined;

    for (const r of recipients) {
      const vars = recipientVars(r);
      const subj = substituteVars(subject.trim(), vars);
      const bodyRendered = substituteVars(body, vars);
      const html = markdownToHtml(bodyRendered);

      // Thread tracking : créer ou réutiliser un thread pour
      // rattacher les réponses du client.
      let usedThreadId = replyThreadId ?? null;
      if (!usedThreadId) {
        usedThreadId = await createThread({
          clientId: r.id ?? null,
          clientEmail: r.email,
          clientName: r.fullName || null,
          subject: subj,
        });
      }

      const replyTo = usedThreadId ? threadReplyTo(usedThreadId) : undefined;
      const res = await sendCustomEmail({
        to: r.email,
        subject: subj,
        html,
        text: bodyRendered,
        cc: ccList.length > 0 ? ccList : undefined,
        replyTo,
      });

      // Enregistrer le message sortant dans le thread.
      if (!res.error && usedThreadId) {
        await insertOutboundMessage({
          threadId: usedThreadId,
          fromEmail: author,
          fromName: "Ooble",
          toEmail: r.email,
          subject: subj,
          bodyText: bodyRendered,
          bodyHtml: html,
          staffId: session?.user?.id,
          resendId: res.id,
        });
      }

      recordSent({
        id: crypto.randomUUID(),
        to: r.email,
        subject: subj,
        template: "newsletter",
        vars: { body: bodyRendered, clientName: r.fullName },
        sentAt: new Date().toISOString(),
        sentBy: author,
        outcome: res.error
          ? { ok: false, error: res.error }
          : { ok: true, providerId: res.id },
      });

      if (res.error) { failed += 1; lastError = res.error; }
      else ok += 1;
    }

    setBusy(false);
    onSent();

    if (failed === 0) {
      setFeedback({
        kind: "ok",
        text: recipients.length === 1
          ? `Envoyé à ${recipients[0].fullName || recipients[0].email}.`
          : `Envoyé à ${ok} destinataires.`,
      });
      setRecipients([]);
      setCc("");
      setSubject("");
      setBody(signature);
      setShowCc(false);
    } else if (ok === 0) {
      setFeedback({ kind: "err", text: lastError ?? "Échec des envois." });
    } else {
      setFeedback({
        kind: "err",
        text: `${ok} envoyé(s), ${failed} en échec — ${lastError ?? "cause inconnue"}.`,
      });
    }
  };

  const withRef = (fn: (t: HTMLTextAreaElement) => void) => () => {
    if (textareaRef.current) fn(textareaRef.current);
  };

  const insertLink = withRef((t) => {
    const url = prompt("URL du lien (https://…)");
    if (!url) return;
    const label = t.value.slice(t.selectionStart, t.selectionEnd) || "texte du lien";
    insertAtCursor(t, `[${label}](${url})`);
  });

  // Assistant IA : appelle l'agent draft-mail avec l'intention + contexte
  // du premier destinataire + contexte plateforme en temps réel +
  // historique du fil si on répond à un thread existant.
  const runAiDraft = async () => {
    const intention = aiPrompt.trim();
    if (!intention || aiBusy) return;
    setAiBusy(true);
    setFeedback(null);
    try {
      const [platformCtx, clientProfile, threadMsgs] = await Promise.all([
        fetchPlatformContext(),
        (async () => {
          const target = recipients.find((r) => r.id);
          if (!target?.id) return null;
          return fetchClientProfile(target.id);
        })(),
        (async () => {
          if (!replyThreadId) return null;
          return fetchMessages(replyThreadId);
        })(),
      ]);

      const clientCtx = clientProfile ? toAIClientContext(clientProfile) : null;

      let previousMails: string | undefined;
      if (threadMsgs && threadMsgs.length > 0) {
        previousMails = threadMsgs
          .slice(-10)
          .map((m) => {
            const dir = m.direction === "inbound" ? "Client" : "Staff";
            const preview = (m.bodyText ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
            return `[${dir}] ${preview}`;
          })
          .join("\n\n");
      }

      const res = await draftMail({ intention, client: clientCtx, previousMails, context: platformCtx });
      if (isAIError(res)) {
        setFeedback({ kind: "err", text: res.error });
      } else {
        setSubject(res.subject);
        setBody(`${res.body}\n${signature}`);
        setAiPrompt("");
        setAiOpen(false);
        setFeedback({
          kind: "ok",
          text: `Draft généré (${res.tokens.in} + ${res.tokens.out} tokens). Ajustez à votre goût avant d'envoyer.`,
        });
      }
    } catch (e) {
      setFeedback({ kind: "err", text: e instanceof Error ? e.message : "Erreur inconnue." });
    } finally {
      setAiBusy(false);
    }
  };

  const addRecipient = (r: Recipient) => {
    setRecipients((prev) => prev.some((x) => x.email.toLowerCase() === r.email.toLowerCase()) ? prev : [...prev, r]);
  };
  const removeRecipient = (email: string) => {
    setRecipients((prev) => prev.filter((r) => r.email !== email));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
      {/* Colonne gauche — composer */}
      <div style={{ ...card, padding: 0, fontFamily: FONT }}>
        {/* Destinataires */}
        <div style={{
          padding: "14px 18px", borderBottom: `1px solid ${C.bds}`,
          display: "grid", rowGap: 12,
        }}>
          <RecipientPicker
            selected={recipients}
            clients={clients}
            loading={clientsLoading}
            onAdd={addRecipient}
            onRemove={removeRecipient}
            onSelectAllKyc={() => {
              const approved = clients.filter((c) => c.kycStatus === "approved").map(recipientFromClient);
              setRecipients(approved);
            }}
          />
          {showCc ? (
            <FieldRow label="Cc">
              <input
                type="text"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="conformite@ooble.ca, direction@ooble.ca"
                style={{ ...inputStyle, border: "none", padding: 0, background: "transparent", fontSize: 16 }}
                spellCheck={false}
                autoCapitalize="none"
              />
            </FieldRow>
          ) : (
            <button
              type="button"
              onClick={() => setShowCc(true)}
              style={{
                justifySelf: "start",
                background: "transparent", border: "none", cursor: "pointer",
                color: C.t3, fontSize: 11.5, padding: 0, fontFamily: FONT,
                transition: "color 0.12s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = C.t1; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = C.t3; }}
            >
              + Ajouter Cc
            </button>
          )}
          <FieldRow label="Sujet">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Objet du message"
              style={{ ...inputStyle, border: "none", padding: 0, background: "transparent", fontSize: 16 }}
            />
          </FieldRow>
        </div>

        {/* Toolbar */}
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 2,
          padding: "8px 12px", borderBottom: `1px solid ${C.bds}`,
          background: C.hover1,
        }}>
          <ToolbarButton title="Titre" onClick={withRef((t) => prefixLines(t, "## "))}>
            <Heading2 style={{ width: 14, height: 14 }} strokeWidth={1.7} />
          </ToolbarButton>
          <ToolbarButton title="Gras" onClick={withRef((t) => wrapSelection(t, "**"))}>
            <Bold style={{ width: 14, height: 14 }} strokeWidth={2} />
          </ToolbarButton>
          <ToolbarButton title="Italique" onClick={withRef((t) => wrapSelection(t, "*"))}>
            <Italic style={{ width: 14, height: 14 }} strokeWidth={1.7} />
          </ToolbarButton>
          <ToolbarSeparator />
          <ToolbarButton title="Liste à puces" onClick={withRef((t) => prefixLines(t, "- "))}>
            <List style={{ width: 14, height: 14 }} strokeWidth={1.7} />
          </ToolbarButton>
          <ToolbarButton title="Liste numérotée" onClick={withRef((t) => prefixLines(t, "1. "))}>
            <ListOrdered style={{ width: 14, height: 14 }} strokeWidth={1.7} />
          </ToolbarButton>
          <ToolbarButton title="Citation" onClick={withRef((t) => prefixLines(t, "> "))}>
            <Quote style={{ width: 14, height: 14 }} strokeWidth={1.7} />
          </ToolbarButton>
          <ToolbarSeparator />
          <ToolbarButton title="Lien" onClick={insertLink}>
            <LinkIcon style={{ width: 14, height: 14 }} strokeWidth={1.7} />
          </ToolbarButton>
          <ToolbarButton title="Ligne horizontale" onClick={withRef((t) => insertAtCursor(t, "\n\n---\n\n"))}>
            <Minus style={{ width: 14, height: 14 }} strokeWidth={1.7} />
          </ToolbarButton>
          <ToolbarSeparator />
          <ToolbarButton title="Insérer {{prenom}}" onClick={withRef((t) => insertAtCursor(t, "{{prenom}}"))}>
            <span style={{ fontSize: 10.5, fontFamily: FONT, letterSpacing: "0.02em", padding: "0 3px" }}>
              {"{{prenom}}"}
            </span>
          </ToolbarButton>
          <ToolbarSeparator />
          <button
            type="button"
            onClick={() => setAiOpen((v) => !v)}
            title="Assistant IA — rédiger un draft"
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              height: 30, padding: "0 10px", borderRadius: 7, border: "none",
              background: aiOpen ? C.hover4 : "transparent",
              color: aiOpen ? C.t1 : C.t2,
              cursor: "pointer", fontFamily: FONT, fontSize: 11.5,
              transition: "background 0.12s, color 0.12s",
            }}
            onMouseEnter={(e) => { if (!aiOpen) { e.currentTarget.style.background = C.hover3; e.currentTarget.style.color = C.t1; } }}
            onMouseLeave={(e) => { if (!aiOpen) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.t2; } }}
          >
            <Wand2 style={{ width: 12, height: 12 }} strokeWidth={1.8} />
            Suggérer
          </button>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              background: "transparent", border: "none", cursor: "pointer",
              color: C.t3, fontSize: 11.5, padding: "4px 8px", borderRadius: 6,
              fontFamily: FONT, transition: "color 0.12s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = C.t1; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = C.t3; }}
          >
            <Eye style={{ width: 12, height: 12 }} />
            {showPreview ? "Cacher l'aperçu" : "Voir l'aperçu"}
          </button>
        </div>

        {/* Assistant IA — bandeau plié/déplié pour saisir l'intention. */}
        {aiOpen && (
          <div style={{
            padding: "12px 18px", borderBottom: `1px solid ${C.bds}`,
            background: C.hover2,
            display: "flex", alignItems: "flex-start", gap: 10,
          }}>
            <Wand2 style={{ width: 14, height: 14, color: C.t2, marginTop: 6 }} strokeWidth={1.8} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void runAiDraft(); }
                }}
                placeholder="Décrivez ce que vous voulez dire, en une phrase. Ex : « réponds gentiment qu'on a bien reçu son KYC mais qu'il manque la preuve d'adresse »."
                rows={2}
                style={{
                  display: "block", width: "100%", boxSizing: "border-box",
                  padding: "6px 0", border: "none", outline: "none",
                  background: "transparent", color: C.t1,
                  fontFamily: FONT, fontSize: 16, lineHeight: 1.5,
                  resize: "none",
                }}
              />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: 10.5, color: C.t3 }}>
                  {recipients.find((r) => r.id)
                    ? `Contexte : ${recipients.find((r) => r.id)?.fullName} sera utilisé pour personnaliser.`
                    : "Aucun contexte client — sélectionnez un destinataire pour un draft plus fin."}
                  {" · "}
                  <kbd style={{ fontFamily: FONT, fontSize: 10 }}>⌘</kbd>+<kbd style={{ fontFamily: FONT, fontSize: 10 }}>Entrée</kbd> pour lancer.
                </span>
                <button
                  type="button"
                  onClick={runAiDraft}
                  disabled={!aiPrompt.trim() || aiBusy}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    height: 28, padding: "0 12px", borderRadius: 7, border: "none",
                    background: aiPrompt.trim() && !aiBusy ? C.accent : C.l3,
                    color: aiPrompt.trim() && !aiBusy ? C.btnText : C.t3,
                    fontSize: 11.5, fontFamily: FONT,
                    cursor: aiPrompt.trim() && !aiBusy ? "pointer" : "default",
                    transition: "background 0.15s",
                  }}
                >
                  {aiBusy
                    ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
                    : <Wand2 style={{ width: 12, height: 12 }} strokeWidth={1.8} />}
                  {aiBusy ? "Génération…" : "Générer le draft"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Textarea du corps — hauteur modeste, l'auteur agrandit à la
            volée s'il en a besoin ; on n'inflige pas 320 px vides sur mobile. */}
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Bonjour {{prenom}},&#10;&#10;Écrivez votre message ici. Les variables {{prenom}}, {{nom}}, {{email}} sont remplacées par les vraies valeurs de chaque destinataire au moment de l'envoi."
          rows={10}
          style={{
            display: "block", width: "100%", boxSizing: "border-box",
            padding: "14px 18px 8px", border: "none", outline: "none",
            background: "transparent", color: C.t1,
            fontFamily: FONT, fontSize: 16, lineHeight: 1.55,
            resize: "vertical", minHeight: 180,
          }}
        />

        {/* Avertissement variables non remplies : on ne bloque pas
            l'envoi, on informe. Le staff sait ce qu'il fait. */}
        {remainingVars.length > 0 && (
          <div style={{
            margin: "0 18px 8px",
            padding: "8px 12px", borderRadius: 8,
            background: C.warnBg,
            border: `1px solid ${C.warnBd}`,
            color: C.warnText,
            fontSize: 11.5, lineHeight: 1.5,
          }}>
            Variable{remainingVars.length > 1 ? "s" : ""} non remplie{remainingVars.length > 1 ? "s" : ""} —
            partira{remainingVars.length > 1 ? "ont" : ""} telle{remainingVars.length > 1 ? "s" : ""} quelle{remainingVars.length > 1 ? "s" : ""} :
            {" "}
            {remainingVars.map((v) => (
              <code key={v} style={{
                background: C.codeBg, padding: "1px 5px",
                borderRadius: 4, marginRight: 4, fontSize: 11,
              }}>{`{{${v}}}`}</code>
            ))}
          </div>
        )}

        {/* Feedback + actions */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 12,
          padding: "12px 18px", borderTop: `1px solid ${C.bds}`,
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            {feedback && (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "6px 12px", borderRadius: 8,
                background: feedback.kind === "ok" ? C.hover3 : C.dangerBg,
                border: `1px solid ${feedback.kind === "ok" ? C.accentBd : C.dangerBd}`,
                color: feedback.kind === "ok" ? C.t1 : C.dangerText,
                fontSize: 12,
              }}>
                {feedback.kind === "ok"
                  ? <Check style={{ width: 13, height: 13 }} strokeWidth={2} />
                  : <AlertTriangle style={{ width: 13, height: 13 }} strokeWidth={2} />}
                {feedback.text}
              </div>
            )}
          </div>
          <button
            onClick={submit}
            disabled={!valid || busy}
            style={{
              height: 38, padding: "0 20px", borderRadius: 9, border: "none",
              background: valid && !busy ? C.accent : C.l3,
              color: valid && !busy ? C.btnText : C.t3,
              fontSize: 12.5, fontFamily: FONT,
              display: "inline-flex", alignItems: "center", gap: 7,
              cursor: valid && !busy ? "pointer" : "default",
              transition: "background 0.15s",
            }}
          >
            <Send style={{ width: 14, height: 14 }} strokeWidth={2} />
            {busy
              ? "Envoi…"
              : recipients.length > 1
                ? `Envoyer à ${recipients.length}`
                : "Envoyer"}
          </button>
        </div>
      </div>

      {/* Colonne droite — aperçu rendu */}
      {showPreview && (
        <div style={{ ...card, padding: 0, fontFamily: FONT }}>
          <div style={{
            padding: "12px 18px", borderBottom: `1px solid ${C.bds}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={sH}>Aperçu du message</span>
            <span style={{ fontSize: 10.5, color: C.t3, letterSpacing: "0.06em" }}>
              {previewRecipient
                ? `Aperçu pour ${previewRecipient.fullName || previewRecipient.email}`
                : "Rendu final chez le destinataire"}
            </span>
          </div>
          <PreviewFrame
            from="Ooble <bonjour@ooble.ca>"
            to={previewRecipient?.email ?? (recipients[0]?.email ?? "—")}
            subject={previewSubject || "—"}
            html={renderedHtml}
          />
        </div>
      )}
    </div>
  );
}

// ─── Picker de destinataires ────────────────────────────────

interface PickerProps {
  selected: Recipient[];
  clients: ClientDirectoryEntry[];
  loading: boolean;
  onAdd: (r: Recipient) => void;
  onRemove: (email: string) => void;
  onSelectAllKyc: () => void;
}

function RecipientPicker({ selected, clients, loading, onAdd, onRemove, onSelectAllKyc }: PickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const q = query.trim().toLowerCase();
  const selectedIds = new Set(selected.map((r) => r.email.toLowerCase()));
  const matches = q
    ? clients
        .filter((c) => !selectedIds.has(c.email.toLowerCase()))
        .filter((c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.firstName.toLowerCase().includes(q),
        )
        .slice(0, 8)
    : clients.filter((c) => !selectedIds.has(c.email.toLowerCase())).slice(0, 6);

  const commit = () => {
    const raw = query.trim();
    if (!raw) return;
    if (EMAIL_RE.test(raw)) {
      onAdd(manualRecipient(raw));
      setQuery("");
      setOpen(false);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "40px 1fr", alignItems: "start", gap: 8, position: "relative" }}>
      <span style={{
        fontSize: 11, color: C.t3, textTransform: "uppercase", letterSpacing: "0.08em",
        paddingTop: 8,
      }}>À</span>

      <div style={{
        display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center",
        minHeight: 32,
      }}>
        {selected.map((r) => (
          <span
            key={r.email}
            title={r.email}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "4px 6px 4px 10px", borderRadius: 999,
              background: r.id ? C.hover4 : C.hover2,
              border: `1px solid ${r.id ? C.accentBd : C.bd}`,
              color: C.t1, fontSize: 12, fontFamily: FONT,
              maxWidth: "100%",
            }}
          >
            {r.id
              ? <User style={{ width: 10, height: 10, color: C.t3 }} strokeWidth={2} />
              : <Mail style={{ width: 10, height: 10, color: C.t3 }} strokeWidth={2} />}
            <span style={{
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              maxWidth: 180,
            }}>
              {r.fullName || r.email}
            </span>
            <button
              type="button"
              onClick={() => onRemove(r.email)}
              aria-label={`Retirer ${r.email}`}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 18, height: 18, borderRadius: 999,
                background: "transparent", border: "none", cursor: "pointer",
                color: C.t3, transition: "background 0.12s, color 0.12s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.hover4; e.currentTarget.style.color = C.t1; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.t3; }}
            >
              <X style={{ width: 10, height: 10 }} strokeWidth={2} />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => { setTimeout(() => setOpen(false), 140); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commit(); }
            if (e.key === "Backspace" && !query && selected.length > 0) {
              onRemove(selected[selected.length - 1].email);
            }
          }}
          placeholder={selected.length === 0 ? "Chercher un client ou taper un e-mail…" : ""}
          spellCheck={false}
          autoCapitalize="none"
          style={{
            flex: 1, minWidth: 180,
            border: "none", outline: "none", background: "transparent",
            color: C.t1, fontFamily: FONT, fontSize: 16,
            padding: "6px 0",
          }}
        />
      </div>

      {/* Dropdown */}
      {open && (matches.length > 0 || loading || clients.length > 0) && (
        <div
          onMouseDown={(e) => e.preventDefault()}
          style={{
            position: "absolute", top: "100%", left: 48, right: 0,
            marginTop: 4, zIndex: 20,
            background: C.l1, border: `1px solid ${C.bd}`, borderRadius: 10,
            boxShadow: C.shadowHeavy,
            maxHeight: 320, overflowY: "auto",
            padding: 4,
          }}
        >
          {loading && (
            <div style={{ padding: "10px 12px", fontSize: 12, color: C.t3 }}>
              Chargement de l'annuaire…
            </div>
          )}

          {!loading && clients.length === 0 && (
            <div style={{ padding: "10px 12px", fontSize: 12, color: C.t3 }}>
              Aucun client dans l'annuaire. Vous pouvez taper une adresse manuellement.
            </div>
          )}

          {matches.length === 0 && !loading && clients.length > 0 && (
            <div style={{ padding: "10px 12px", fontSize: 12, color: C.t3 }}>
              {q ? `Aucun résultat pour « ${q} ».` : "Tous les clients sont déjà sélectionnés."}
              {q && EMAIL_RE.test(q) && (
                <> Appuyer sur Entrée pour envoyer à cette adresse.</>
              )}
            </div>
          )}

          {matches.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={() => { onAdd(recipientFromClient(c)); setQuery(""); }}
              style={{
                display: "flex", width: "100%", alignItems: "center", gap: 10,
                padding: "8px 10px", borderRadius: 7,
                background: "transparent", border: "none", cursor: "pointer",
                color: C.t1, textAlign: "left", fontFamily: FONT,
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.hover3; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{
                width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: C.hover3, border: `1px solid ${C.bds}`,
                color: C.t2, fontSize: 11.5,
              }}>
                {(c.firstName || c.email)[0]?.toUpperCase() || "?"}
              </span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{
                  display: "block", fontSize: 13, color: C.t1,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {c.fullName}
                </span>
                <span style={{
                  display: "block", fontSize: 11, color: C.t3,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {c.email}
                </span>
              </span>
              {c.kycStatus === "approved" && (
                <span style={{
                  fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase",
                  color: C.t3, flexShrink: 0,
                }}>
                  KYC
                </span>
              )}
            </button>
          ))}

          {!loading && clients.length > 0 && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 10px", borderTop: `1px solid ${C.bds}`, marginTop: 4,
              fontSize: 11, color: C.t3,
            }}>
              <span>{clients.length} clients dans l'annuaire</span>
              <button
                type="button"
                onMouseDown={onSelectAllKyc}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  background: "transparent", border: "none", cursor: "pointer",
                  color: C.t2, fontSize: 11, padding: 0, fontFamily: FONT,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = C.t1; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = C.t2; }}
              >
                <Users style={{ width: 11, height: 11 }} strokeWidth={2} />
                Sélectionner tous les KYC approuvés
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Petites briques du composer ────────────────────────────

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gridTemplateColumns: "40px 1fr", alignItems: "baseline", gap: 8 }}>
      <span style={{ fontSize: 11, color: C.t3, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function ToolbarButton({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        minWidth: 30, height: 30, borderRadius: 7, padding: "0 6px",
        background: "transparent", border: "none", cursor: "pointer",
        color: C.t2, transition: "background 0.12s, color 0.12s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = C.hover3; e.currentTarget.style.color = C.t1; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.t2; }}
    >
      {children}
    </button>
  );
}

function ToolbarSeparator() {
  return <div style={{ width: 1, height: 20, background: C.bds, margin: "0 4px", alignSelf: "center" }} />;
}

/**
 * Preview du mail rendu — cadre blanc pour se rapprocher du rendu chez le
 * destinataire (les clients mail sont majoritairement en fond clair).
 */
function PreviewFrame({ from, to, subject, html }: { from: string; to: string; subject: string; html: string }) {
  return (
    <div style={{ background: "#f6f6f4", padding: 16 }}>
      <div style={{
        background: "#fff", borderRadius: 12,
        boxShadow: "0 1px 0 rgba(0,0,0,0.02), 0 12px 32px -12px rgba(20,20,20,0.08)",
        overflow: "hidden",
      }}>
        <div style={{
          padding: "18px 22px 12px", color: "#111",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}>
          <div style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase" }}>Ooble</div>
        </div>
        <div style={{
          padding: "4px 22px 8px", fontSize: 12, color: "#6b6b68",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          lineHeight: 1.55,
        }}>
          <div><span style={{ color: "#9c9c98", display: "inline-block", width: 42 }}>De</span> {from}</div>
          <div><span style={{ color: "#9c9c98", display: "inline-block", width: 42 }}>À</span> {to}</div>
          <div><span style={{ color: "#9c9c98", display: "inline-block", width: 42 }}>Sujet</span> <strong style={{ color: "#111", fontWeight: 500 }}>{subject}</strong></div>
        </div>
        <div style={{
          padding: "4px 22px 22px",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontSize: 14.5, color: "#1a1a1a", lineHeight: 1.55,
        }}>
          {html.trim() ? (
            <div dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <em style={{ color: "#8b8b8b" }}>Aucun contenu — commencez à écrire à gauche.</em>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────── Envoyés ───────────────────

function SentView({ sent }: { sent: SentMail[] }) {
  if (sent.length === 0) {
    return (
      <div style={{ ...card, padding: 40, textAlign: "center", fontFamily: FONT }}>
        <Mail style={{ width: 22, height: 22, color: C.t3, opacity: 0.5, margin: "0 auto 8px", display: "block" }} strokeWidth={1.6} />
        <p style={{ fontSize: 12.5, color: C.t3, margin: 0 }}>
          Aucun e-mail envoyé depuis ce poste pour l'instant.
        </p>
      </div>
    );
  }
  return (
    <div style={card}>
      {sent.map((m, i) => {
        const ok = m.outcome.ok;
        return (
          <div key={m.id} style={{ ...listRowStyle(i === sent.length - 1), alignItems: "flex-start", gap: 14 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: C.hover3, border: `1px solid ${C.bds}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: ok ? C.t1 : C.dangerText,
            }}>
              {ok ? <Check style={{ width: 13, height: 13 }} strokeWidth={2} />
                  : <AlertTriangle style={{ width: 13, height: 13 }} strokeWidth={2} />}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13, color: C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {m.subject}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 11.5, color: C.t3, fontVariantNumeric: "tabular-nums" }}>
                à {m.to} · par {m.sentBy} · {dateFmt.format(new Date(m.sentAt))}
                {!ok && <> · <span style={{ color: C.dangerText }}>{m.outcome.error}</span></>}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────── Points de départ ───────────────────

interface SnippetsViewProps { onLoad: (s: Snippet) => void }

function SnippetsView({ onLoad }: SnippetsViewProps) {
  return (
    <div style={card}>
      {SNIPPETS.map((s, i) => (
        <div
          key={s.id}
          style={{ ...listRowStyle(i === SNIPPETS.length - 1), alignItems: "flex-start", gap: 14 }}
        >
          <div style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: C.hover3, border: `1px solid ${C.bds}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: C.t2,
          }}>
            <Sparkles style={{ width: 13, height: 13 }} strokeWidth={1.7} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ margin: 0, fontSize: 13, color: C.t1 }}>{s.name}</p>
            <p style={{ margin: "2px 0 0", fontSize: 11.5, color: C.t3, lineHeight: 1.5 }}>
              {s.description}
            </p>
          </div>
          <button
            onClick={() => onLoad(s)}
            style={{
              flexShrink: 0,
              height: 30, padding: "0 12px", borderRadius: 7,
              background: "transparent", border: `1px solid ${C.bd}`,
              color: C.t2, fontSize: 11.5, fontFamily: FONT,
              display: "inline-flex", alignItems: "center", gap: 5,
              cursor: "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.accentBd; e.currentTarget.style.color = C.accent; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.bd; e.currentTarget.style.color = C.t2; }}
          >
            <Copy style={{ width: 12, height: 12 }} />
            Charger
          </button>
        </div>
      ))}
    </div>
  );
}

// ─────────────────── Boîte de réception ───────────────────

const msgDateFmt = new Intl.DateTimeFormat("fr-CA", {
  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
});

function snippet(text: string | null, max = 100): string {
  if (!text) return "";
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max)}...`;
}

interface InboxViewProps {
  onReply: (thread: MailThread) => void;
}

function InboxView({ onReply }: InboxViewProps) {
  const [threads, setThreads] = useState<MailThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedThread, setSelectedThread] = useState<MailThread | null>(null);
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(false);

  useEffect(() => {
    fetchThreads().then((t) => { setThreads(t); setLoading(false); });
  }, []);

  const openThread = async (t: MailThread) => {
    setSelectedThread(t);
    setMsgsLoading(true);
    const msgs = await fetchMessages(t.id);
    setMessages(msgs);
    setMsgsLoading(false);
    if (t.hasUnread) {
      await markThreadRead(t.id);
      setThreads((prev) => prev.map((x) => x.id === t.id ? { ...x, hasUnread: false } : x));
    }
  };

  const doArchive = async (id: string) => {
    await archiveThread(id);
    setThreads((prev) => prev.filter((x) => x.id !== id));
    setSelectedThread(null);
  };

  // Vue détail d'un thread
  if (selectedThread) {
    return (
      <div style={card}>
        {/* En-tête */}
        <div style={{
          padding: "14px 18px", borderBottom: `1px solid ${C.bds}`,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <button
            onClick={() => setSelectedThread(null)}
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 30, height: 30, borderRadius: 7,
              background: "transparent", border: `1px solid ${C.bds}`,
              color: C.t2, cursor: "pointer", flexShrink: 0,
              transition: "all 0.12s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.accentBd; e.currentTarget.style.color = C.t1; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.bds; e.currentTarget.style.color = C.t2; }}
          >
            <ArrowLeft style={{ width: 14, height: 14 }} strokeWidth={1.7} />
          </button>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ margin: 0, fontSize: 13.5, color: C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selectedThread.subject}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: C.t3 }}>
              {selectedThread.clientName || selectedThread.clientEmail} · {selectedThread.messageCount} message{selectedThread.messageCount > 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => onReply(selectedThread)}
            style={{
              height: 30, padding: "0 14px", borderRadius: 7, border: "none",
              background: C.accent, color: C.btnText,
              fontSize: 11.5, fontFamily: FONT,
              display: "inline-flex", alignItems: "center", gap: 5,
              cursor: "pointer", transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = C.accentHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = C.accent; }}
          >
            <Reply style={{ width: 12, height: 12 }} strokeWidth={2} />
            Répondre
          </button>
          <button
            onClick={() => doArchive(selectedThread.id)}
            title="Archiver"
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 30, height: 30, borderRadius: 7,
              background: "transparent", border: `1px solid ${C.bds}`,
              color: C.t3, cursor: "pointer", transition: "all 0.12s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.accentBd; e.currentTarget.style.color = C.t1; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.bds; e.currentTarget.style.color = C.t3; }}
          >
            <Archive style={{ width: 13, height: 13 }} strokeWidth={1.7} />
          </button>
        </div>

        {/* Messages */}
        {msgsLoading ? (
          <div style={{ padding: 30, textAlign: "center" }}>
            <Loader2 style={{ width: 18, height: 18, color: C.t3, animation: "spin 1s linear infinite" }} />
          </div>
        ) : (
          <div style={{ maxHeight: 520, overflowY: "auto" }}>
            {messages.map((m, i) => {
              const isInbound = m.direction === "inbound";
              return (
                <div
                  key={m.id}
                  style={{
                    padding: "16px 18px",
                    borderBottom: i < messages.length - 1 ? `1px solid ${C.bds}` : "none",
                    background: isInbound ? C.hover1 : "transparent",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                      background: isInbound ? C.hover4 : C.accentSoft,
                      border: `1px solid ${isInbound ? C.bds : C.accentBd}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: isInbound ? C.t2 : C.t1, fontSize: 10,
                    }}>
                      {isInbound
                        ? <MailOpen style={{ width: 11, height: 11 }} strokeWidth={1.7} />
                        : <Send style={{ width: 10, height: 10 }} strokeWidth={2} />}
                    </div>
                    <span style={{ fontSize: 12, color: C.t1, fontWeight: 400 }}>
                      {isInbound ? (m.fromName || m.fromEmail) : "Ooble"}
                    </span>
                    <span style={{ fontSize: 10.5, color: C.t3, marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>
                      {msgDateFmt.format(new Date(m.createdAt))}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 13, color: C.t1, lineHeight: 1.6, paddingLeft: 32,
                    whiteSpace: "pre-wrap", wordBreak: "break-word",
                  }}>
                    {m.bodyText || snippet(m.bodyHtml, 500) || "(vide)"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Vue liste des threads
  if (loading) {
    return (
      <div style={{ ...card, padding: 40, textAlign: "center" }}>
        <Loader2 style={{ width: 18, height: 18, color: C.t3, animation: "spin 1s linear infinite", margin: "0 auto" }} />
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div style={{ ...card, padding: 40, textAlign: "center", fontFamily: FONT }}>
        <Inbox style={{ width: 22, height: 22, color: C.t3, opacity: 0.5, margin: "0 auto 8px", display: "block" }} strokeWidth={1.6} />
        <p style={{ fontSize: 12.5, color: C.t3, margin: "0 0 4px" }}>
          Aucune conversation pour l'instant.
        </p>
        <p style={{ fontSize: 11, color: C.t3, margin: 0, lineHeight: 1.6 }}>
          Les réponses des clients apparaissent ici une fois Resend Inbound activé sur <code style={{ background: C.l3, padding: "1px 5px", borderRadius: 4 }}>support@ooble.ca</code>.
          <br />Les e-mails envoyés depuis le composer créent aussi un fil ici.
        </p>
      </div>
    );
  }

  return (
    <div style={card}>
      {threads.map((t, i) => (
        <button
          key={t.id}
          onClick={() => openThread(t)}
          style={{
            display: "flex", width: "100%", alignItems: "center", gap: 12,
            padding: "14px 18px", textAlign: "left",
            borderBottom: i < threads.length - 1 ? `1px solid ${C.bds}` : "none",
            background: t.hasUnread ? C.hover2 : "transparent",
            border: "none", borderBottomStyle: i < threads.length - 1 ? "solid" : "none",
            borderBottomWidth: 1, borderBottomColor: C.bds,
            cursor: "pointer", fontFamily: FONT,
            transition: "background 0.12s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = C.hover2; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = t.hasUnread ? C.hover2 : "transparent"; }}
        >
          {/* Indicateur non lu */}
          <div style={{
            width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
            background: t.hasUnread ? C.accent : "transparent",
          }} />

          {/* Avatar */}
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: C.hover3, border: `1px solid ${C.bds}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: C.t2, fontSize: 12,
          }}>
            {(t.clientName || t.clientEmail)[0]?.toUpperCase() || "?"}
          </div>

          {/* Contenu */}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{
                fontSize: 13, color: C.t1,
                fontWeight: t.hasUnread ? 500 : 400,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                flex: 1, minWidth: 0,
              }}>
                {t.clientName || t.clientEmail}
              </span>
              <span style={{
                fontSize: 10.5, color: C.t3, flexShrink: 0,
                fontVariantNumeric: "tabular-nums",
              }}>
                {msgDateFmt.format(new Date(t.lastMessageAt))}
              </span>
            </div>
            <p style={{
              margin: "2px 0 0", fontSize: 12,
              color: t.hasUnread ? C.t2 : C.t3,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {t.subject}
            </p>
          </div>

          {/* Badge nombre de messages */}
          {t.messageCount > 1 && (
            <span style={{
              fontSize: 10, color: C.t3, flexShrink: 0,
              background: C.l3, padding: "2px 7px", borderRadius: 999,
            }}>
              {t.messageCount}
            </span>
          )}
          <ChevronRight style={{ width: 14, height: 14, color: C.t3, flexShrink: 0 }} strokeWidth={1.5} />
        </button>
      ))}
    </div>
  );
}

// ─────────────────── Panneau principal ───────────────────

const MailboxPanel = () => {
  const [tab, setTab] = useState<SubTab>("compose");
  const [sent, setSent] = useState<SentMail[]>([]);
  const [initialComposerState, setInitialComposerState] = useState<ComposerState | null>(null);
  const [clients, setClients] = useState<ClientDirectoryEntry[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [replyThreadId, setReplyThreadId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => { setSent(loadSent()); }, []);
  useEffect(() => {
    let active = true;
    fetchClientDirectory().then((rows) => {
      if (!active) return;
      setClients(rows);
      setClientsLoading(false);
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    countUnread().then(setUnreadCount);
  }, [tab]);

  const refreshSent = () => setSent(loadSent());

  const successfulSent = useMemo(() => sent.filter((m) => m.outcome.ok).length, [sent]);
  const failedSent = sent.length - successfulSent;

  const loadSnippet = (s: Snippet) => {
    setInitialComposerState({ recipients: [], cc: "", subject: s.subject, body: s.body });
    setReplyThreadId(null);
    setTab("compose");
  };

  const handleReply = useCallback((thread: MailThread) => {
    const firstName = thread.clientName?.split(/\s+/)[0]
      || thread.clientEmail.split("@")[0];
    setInitialComposerState({
      recipients: [{
        id: thread.clientId ?? undefined,
        email: thread.clientEmail,
        firstName,
        fullName: thread.clientName || thread.clientEmail,
      }],
      cc: "",
      subject: `Re: ${thread.subject}`,
      body: "",
    });
    setReplyThreadId(thread.id);
    setTab("compose");
  }, []);

  const TABS = [
    { id: "compose",  label: "Composer" },
    { id: "sent",     label: "Envoyés",  count: sent.length || undefined },
    { id: "snippets", label: "Points de départ", count: SNIPPETS.length },
    { id: "inbox",    label: "Réception", count: unreadCount || undefined },
  ];

  return (
    <div className="space-y-4">
      <div className="lg:max-w-[620px]">
        <AdminHero
          eyebrow="Messagerie"
          value={sent.length}
          unit={sent.length > 1 ? "envois" : "envoi"}
          stats={[
            { label: "Réussis", value: successfulSent },
            { label: "Échecs",  value: failedSent },
            { label: "Annuaire", value: clientsLoading ? "…" : clients.length },
          ]}
          actions={[
            { label: "Nouveau message", icon: Send, primary: true, onClick: () => setTab("compose") },
          ]}
        />
      </div>

      <SubTabs tabs={TABS} active={tab} onChange={(id) => setTab(id as SubTab)} />

      {tab === "compose"  && (
        <ComposeView
          onSent={refreshSent}
          initial={initialComposerState}
          onConsumed={() => setInitialComposerState(null)}
          clients={clients}
          clientsLoading={clientsLoading}
          replyThreadId={replyThreadId}
        />
      )}
      {tab === "sent"     && <SentView sent={sent} />}
      {tab === "snippets" && <SnippetsView onLoad={loadSnippet} />}
      {tab === "inbox"    && <InboxView onReply={handleReply} />}
    </div>
  );
};

export default MailboxPanel;
