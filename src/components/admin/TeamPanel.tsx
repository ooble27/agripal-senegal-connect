import { useEffect, useState } from "react";
import { UserPlus, Users, UserRound, ScanFace, Megaphone, Headphones, BadgeCheck, ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TEAM_ROLES, type TeamRole } from "@/lib/adminOrders";
import { fetchTeam, setMemberRole, addRoleByEmail, type LiveTeamMember } from "@/lib/adminTeam";
import { cn } from "@/lib/utils";
import AdminHero from "./AdminHero";

const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const roleDesc = (role: TeamRole) => TEAM_ROLES.find((r) => r.role === role)?.desc ?? "";

const ROLE_ICONS: Record<TeamRole, typeof UserRound> = {
  "Opérateur": UserRound,
  "KYC": ScanFace,
  "Marketing": Megaphone,
  "Support": Headphones,
  "Conformité": ShieldCheck,
  "Admin": BadgeCheck,
};

const TeamPanel = () => {
  const [members, setMembers] = useState<LiveTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("Opérateur");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetchTeam().then((m) => { setMembers(m); setLoading(false); });
  }, []);

  const setRole = (userId: string, role: TeamRole) => {
    setMembers((prev) => prev.map((m) => (m.userId === userId ? { ...m, role } : m)));
    setMemberRole(userId, role).then((res) => { if (res.error) fetchTeam().then(setMembers); });
  };

  const invite = async () => {
    if (inviteBusy || !/^\S+@\S+\.\S+$/.test(inviteEmail)) return;
    setInviteBusy(true);
    setInviteMsg(null);
    const res = await addRoleByEmail(inviteEmail, inviteRole);
    setInviteBusy(false);
    if (res.error) { setInviteMsg({ ok: false, text: res.error }); return; }
    setInviteMsg({ ok: true, text: `${inviteEmail} ajouté·e comme ${inviteRole}.` });
    setInviteEmail("");
    fetchTeam().then(setMembers);
  };

  if (showInvite) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => { setShowInvite(false); setInviteMsg(null); }}
            aria-label="Retour"
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-secondary active:scale-95"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </button>
          <div>
            <h3 className="font-display text-[17px] font-semibold tracking-tight">Ajouter un membre</h3>
            <p className="mt-0.5 text-[12px] text-muted-foreground">Attribuer un rôle à un compte Ooble existant</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2.5 pb-3">
            <UserPlus className="h-4 w-4 text-muted-foreground" strokeWidth={1.9} />
            <p className="text-[13px] font-medium">Ajouter un membre à l'équipe</p>
          </div>
          <p className="pb-4 text-[12.5px] text-muted-foreground">
            La personne crée d'abord son compte Ooble normalement (inscription classique), puis vous lui attribuez son rôle ici avec son email.
          </p>

          {/* Role badges */}
          <div className="flex flex-wrap gap-2">
            {TEAM_ROLES.map((r) => {
              const Icon = ROLE_ICONS[r.role];
              const on = inviteRole === r.role;
              return (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => setInviteRole(r.role)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[13px] font-medium transition-colors",
                    on
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card text-muted-foreground hover:bg-secondary/50",
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={on ? 2 : 1.7} />
                  {r.role}
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-[12px] text-muted-foreground">
            {inviteRole} — {roleDesc(inviteRole)}
          </p>

          <input
            type="email"
            spellCheck={false}
            autoCapitalize="none"
            placeholder="email du compte existant…"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="mt-4 w-full rounded-xl border border-border bg-secondary/40 px-4 py-3 text-base outline-none placeholder:text-muted-foreground/60 focus:border-foreground"
          />

          {inviteMsg && (
            <p className={cn("mt-3 text-[12.5px]", inviteMsg.ok ? "text-foreground" : "text-destructive")}>{inviteMsg.text}</p>
          )}

          <Button
            variant="appSolid"
            shape="rounded"
            className="mt-4 h-auto gap-2 rounded-xl px-5 py-3 text-[13px] font-bold"
            disabled={inviteBusy || !/^\S+@\S+\.\S+$/.test(inviteEmail)}
            onClick={invite}
          >
            <UserPlus className="h-4 w-4" />
            {inviteBusy ? "Attribution…" : "Attribuer le rôle"}
          </Button>
        </div>
      </div>
    );
  }

  const roleCounts = members.reduce<Record<string, number>>((acc, m) => {
    acc[m.role] = (acc[m.role] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Héro — équipe */}
      <div className="lg:max-w-[620px]">
        <AdminHero
          eyebrow="Équipe back-office"
          loading={loading}
          value={members.length}
          unit={members.length > 1 ? "membres" : "membre"}
          stats={Object.entries(roleCounts).slice(0, 4).map(([role, count]) => ({
            label: role,
            value: count,
          }))}
          actions={[
            {
              label: "Inviter un membre",
              icon: UserPlus,
              primary: true,
              onClick: () => { setShowInvite(true); setInviteMsg(null); },
            },
          ]}
        />
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {members.map((m) => {
          const RIcon = ROLE_ICONS[m.role] ?? Users;
          return (
            <div key={m.userId} className="px-4 py-3.5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-[12px] font-semibold text-foreground/70">
                  {initials(m.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{m.name}</p>
                  <p className="truncate text-[12px] text-muted-foreground">{m.email}</p>
                </div>
                <span className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-secondary/50 px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground">
                  <RIcon className="h-3.5 w-3.5" strokeWidth={1.7} />
                  {m.role}
                </span>
              </div>
              <p className="mt-2 pl-12 text-[12px] text-muted-foreground">{roleDesc(m.role)}</p>
            </div>
          );
        })}

        {!loading && members.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
              <Users className="h-5 w-5" strokeWidth={1.6} />
            </span>
            <p className="mt-3 text-[13px] text-muted-foreground">Aucun membre pour le moment.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamPanel;
