"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { AlertCircle, Check, Loader2, ShieldCheck } from "lucide-react";
import {
  updateMember,
  removeMemberAvatar,
  setMemberActive,
  type MemberActionResult,
} from "@/app/gestion/admin/actions";
import type { Member } from "@/lib/data/admin-hub";
import AdminSelect from "@/components/admin/AdminSelect";

export default function MemberAccessEditor({
  member,
  services,
  ministries,
}: {
  member: Member;
  services: { id: string; name: string }[];
  ministries: { id: string; name: string }[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(member.role === "admin");
  const [isProjectsTraining, setIsProjectsTraining] = useState(member.can_create_opportunities);

  const [state, action, isPending] = useActionState<MemberActionResult, FormData>(updateMember, {});
  const [showSuccess, setShowSuccess] = useState(false);

  // Transitions pour les actions secondaires (avatar et activation)
  const [isAvatarPending, startAvatarTransition] = useTransition();
  const [isActivePending, startActiveTransition] = useTransition();
  const [activeMessage, setActiveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (state.success) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- affiche le message de succès pendant 4 secondes
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [state.success, state]);

  return (
    <details
      className="mt-2"
      open={isOpen}
      onToggle={(e) => setIsOpen(e.currentTarget.open)}
    >
      <summary className="cursor-pointer list-none text-xs font-medium text-link hover:underline">
        Modifier les rôles et l&apos;accès
      </summary>

      <div className="mt-3 space-y-4 rounded-lg bg-surface p-4">
        <form
          action={action}
          onChange={() => {
            if (showSuccess) setShowSuccess(false);
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          <input type="hidden" name="user_id" value={member.id} />

          <div className="flex flex-col gap-2.5 text-sm text-foreground">
            <label className="flex items-center gap-2 font-medium cursor-pointer">
              <input
                type="checkbox"
                name="is_admin"
                checked={isAdmin}
                onChange={(e) => {
                  setIsAdmin(e.target.checked);
                  if (showSuccess) setShowSuccess(false);
                }}
              />
              <span>Admin</span>
            </label>

            {isAdmin && (
              <div className="flex items-start gap-2.5 rounded-lg border border-border bg-background/90 p-3 text-xs leading-relaxed text-foreground/80 animate-in fade-in duration-200">
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-accent" />
                <div>
                  <p className="font-semibold text-foreground">Accès complet inclus</p>
                  <p className="mt-0.5 text-muted">
                    L’administration classique reste séparée des responsabilités opérationnelles.
                  </p>
                </div>
              </div>
            )}

            <label
              className="-mx-1 flex cursor-pointer items-center justify-between gap-2 rounded-md p-1 transition hover:bg-foreground/[0.02]"
            >
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_projects_training_member"
                  checked={isProjectsTraining}
                  onChange={(e) => {
                    setIsProjectsTraining(e.target.checked);
                    if (showSuccess) setShowSuccess(false);
                  }}
                />{" "}
                <span className="text-foreground">Peut créer des projets et formations</span>
              </span>
            </label>

          </div>

          <div className="space-y-3">
            <label className="block text-xs font-medium text-foreground">
                Service associé
                <AdminSelect name="service_id" defaultValue={member.service_id ?? ""} className="mt-1.5" options={[{value:"",label:"Aucun service associé"},...services.map((s) => ({value:s.id,label:s.name}))]} searchable />
                <span className="mt-1.5 block font-normal leading-relaxed text-muted">
                  Cette information n’accorde pas à elle seule de droit de gestion.
                </span>
              </label>
            <AdminSelect name="ministry_lead_of" defaultValue={member.ministry_lead_of ?? ""} options={[{value:"",label:"Pilotage ministériel : aucun"},...ministries.map((item) => ({value:item.id,label:`Pilotage · ${item.name}`}))]} searchable />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1 sm:col-span-2">
            <button
              type="submit"
              disabled={isPending}
              className={`label inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-xs tracking-[0.12em] transition ${
                showSuccess
                  ? "bg-emerald-700 text-white"
                  : "bg-accent text-on-accent hover:bg-[#1b2221]"
              } ${isPending ? "cursor-not-allowed opacity-70" : ""}`}
            >
              {isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin shrink-0" />
                  <span>Enregistrement…</span>
                </>
              ) : showSuccess ? (
                <>
                  <Check size={14} className="shrink-0" />
                  <span>Enregistré !</span>
                </>
              ) : (
                <span>Enregistrer</span>
              )}
            </button>

            {showSuccess && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 transition">
                <Check size={14} className="shrink-0 text-emerald-600" />
                Rôles et accès mis à jour avec succès
              </span>
            )}

            {state.error && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700">
                <AlertCircle size={14} className="shrink-0 text-red-600" />
                {state.error}
              </span>
            )}
          </div>
        </form>

        {member.avatar_path && (
          <form
            action={(formData) => {
              startAvatarTransition(async () => {
                await removeMemberAvatar(formData);
              });
            }}
            className="border-t border-border pt-3"
          >
            <input type="hidden" name="user_id" value={member.id} />
            <input type="hidden" name="path" value={member.avatar_path} />
            <button
              type="submit"
              disabled={isAvatarPending}
              className="text-sm font-medium text-link underline underline-offset-2 disabled:opacity-60"
            >
              {isAvatarPending ? "Suppression de la photo…" : "Retirer la photo de profil"}
            </button>
            <p className="mt-1 text-xs text-muted">À utiliser si la photo est inappropriée.</p>
          </form>
        )}

        <form
          action={(formData) => {
            startActiveTransition(async () => {
              await setMemberActive(formData);
              setActiveMessage(member.deactivated ? "Compte réactivé avec succès" : "Compte désactivé");
              setTimeout(() => setActiveMessage(null), 3000);
            });
          }}
          className="border-t border-border pt-3"
        >
          <input type="hidden" name="user_id" value={member.id} />
          <input type="hidden" name="active" value={member.deactivated ? "1" : "0"} />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isActivePending}
              className="text-sm font-medium text-link underline underline-offset-2 disabled:opacity-60"
            >
              {isActivePending
                ? "Mise à jour…"
                : member.deactivated
                  ? "Réactiver ce compte"
                  : "Désactiver ce compte"}
            </button>
            {activeMessage && (
              <span className="text-xs font-medium text-emerald-700">{activeMessage}</span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted">
            {member.deactivated
              ? "La personne pourra de nouveau se connecter."
              : "La personne ne pourra plus se connecter. Ses données sont conservées."}
          </p>
        </form>
      </div>
    </details>
  );
}
