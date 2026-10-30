"use client";

import { useActionState, useState } from "react";
import { BellRing, CalendarClock, CheckCircle2, Clock3, ShieldCheck } from "lucide-react";
import AdminSelect from "@/components/admin/AdminSelect";
import {
  saveNotificationDigestSettings,
  type NotificationSettingsActionResult,
} from "@/app/gestion/admin/actions";
import type { NotificationDigestSettings } from "@/lib/data/notification-settings";

const DAYS = [
  { value: "0", label: "Dimanche" },
  { value: "1", label: "Lundi" },
  { value: "2", label: "Mardi" },
  { value: "3", label: "Mercredi" },
  { value: "4", label: "Jeudi" },
  { value: "5", label: "Vendredi" },
  { value: "6", label: "Samedi" },
];

const initialState: NotificationSettingsActionResult = {};

function dateTime(value: string | null) {
  if (!value) return "Aucun traitement pour le moment";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(value));
}

function statusLabel(status: NotificationDigestSettings["lastStatus"]) {
  return {
    ready: "Prêt",
    running: "Traitement en cours",
    success: "Terminé",
    partial: "Terminé avec des reprises à effectuer",
    failed: "Échec",
  }[status];
}

export default function NotificationSettingsForm({
  settings,
}: {
  settings: NotificationDigestSettings;
}) {
  const [state, action, pending] = useActionState(saveNotificationDigestSettings, initialState);
  const [enabled, setEnabled] = useState(settings.enabled);
  const [frequency, setFrequency] = useState<"daily" | "weekly">(settings.frequency);
  const [weekday, setWeekday] = useState(String(settings.weekday));

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label text-[11px] tracking-[.15em] text-muted">MESSAGES ÉTUDIANTS</p>
          <h1 className="font-title mt-2 text-[32px] leading-tight text-foreground sm:text-[40px]">Notifications</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Programmez le récapitulatif unique qui regroupe les contenus réellement devenus accessibles.
          </p>
        </div>
        <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${enabled ? "bg-[#E7F1E8] text-[#315D38]" : "bg-surface text-muted"}`}>
          <span className={`h-2 w-2 rounded-full ${enabled ? "bg-[#4D8A58]" : "bg-muted"}`} />
          {enabled ? "Récapitulatifs actifs" : "Récapitulatifs désactivés"}
        </span>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-border bg-background p-5">
          <CalendarClock size={19} className="text-muted" />
          <p className="mt-4 text-xs font-medium uppercase tracking-[.1em] text-muted">Configuration actuelle</p>
          <p className="mt-1 text-[17px] font-semibold text-foreground">
            {frequency === "weekly" ? `${DAYS[Number(weekday)]?.label ?? "Dimanche"} à ${settings.sendTime}` : `Chaque jour à ${settings.sendTime}`}
          </p>
        </article>
        <article className="rounded-2xl border border-border bg-background p-5">
          <Clock3 size={19} className="text-muted" />
          <p className="mt-4 text-xs font-medium uppercase tracking-[.1em] text-muted">Prochain envoi</p>
          <p className="mt-1 text-[15px] font-semibold leading-snug text-foreground">
            {enabled ? dateTime(settings.nextRunAt) : "Aucun envoi planifié"}
          </p>
        </article>
        <article className="rounded-2xl border border-border bg-background p-5">
          <CheckCircle2 size={19} className="text-muted" />
          <p className="mt-4 text-xs font-medium uppercase tracking-[.1em] text-muted">Dernier traitement</p>
          <p className="mt-1 text-[15px] font-semibold leading-snug text-foreground">{statusLabel(settings.lastStatus)}</p>
          <p className="mt-1 text-xs text-muted">{dateTime(settings.lastProcessedAt)} · {settings.lastSentCount} message{settings.lastSentCount > 1 ? "s" : ""}</p>
        </article>
      </section>

      <form action={action} className="rounded-3xl border border-border bg-background p-5 sm:p-7">
        <div className="flex items-start justify-between gap-5 border-b border-border-soft pb-5">
          <div className="flex gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface text-foreground"><BellRing size={19} /></span>
            <div>
              <h2 className="text-[17px] font-semibold text-foreground">Récapitulatif automatique</h2>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">Aucun message n’est créé lorsqu’il n’existe aucune nouveauté pertinente.</p>
            </div>
          </div>
          <label className="relative inline-flex shrink-0 cursor-pointer items-center">
            <input name="enabled" type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="peer sr-only" />
            <span className="h-7 w-12 rounded-full bg-border transition peer-checked:bg-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-foreground after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-background after:transition peer-checked:after:translate-x-5" />
            <span className="sr-only">Activer les récapitulatifs</span>
          </label>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <p className="text-sm font-semibold text-foreground">Fréquence</p>
            <div className="mt-2 grid grid-cols-2 gap-2 rounded-2xl bg-surface p-1.5">
              {(["daily", "weekly"] as const).map((value) => (
                <label key={value} className={`cursor-pointer rounded-xl px-4 py-3 text-center text-sm font-semibold transition ${frequency === value ? "bg-background text-foreground shadow-sm" : "text-muted hover:text-foreground"}`}>
                  <input className="sr-only" type="radio" name="frequency" value={value} checked={frequency === value} onChange={() => setFrequency(value)} />
                  {value === "daily" ? "Tous les jours" : "Une fois par semaine"}
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">Une personne reçoit au maximum un seul récapitulatif par période configurée.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-foreground">
              Jour
              <AdminSelect name="weekday" value={weekday} onValueChange={setWeekday} options={DAYS} disabled={frequency === "daily"} className="mt-2" ariaLabel="Jour d’envoi" />
            </label>
            <label className="block text-sm font-semibold text-foreground">
              Heure
              <input name="send_time" type="time" step="60" required defaultValue={settings.sendTime} className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition hover:border-foreground focus:border-accent focus:ring-4 focus:ring-accent/10" />
            </label>
            <div className="sm:col-span-2 rounded-xl border border-border-soft bg-surface px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><ShieldCheck size={16} /> Europe/Paris</div>
              <p className="mt-1 text-xs leading-relaxed text-muted">Les changements d’heure d’été et d’hiver sont pris en compte automatiquement.</p>
              <input type="hidden" name="timezone" value="Europe/Paris" />
            </div>
          </div>
        </div>

        {settings.lastError && <p className="mt-5 rounded-xl bg-[#FCE9E6] px-4 py-3 text-sm text-[#8D3029]">{settings.lastError}</p>}
        {state.error && <p aria-live="polite" className="mt-5 rounded-xl bg-[#FCE9E6] px-4 py-3 text-sm text-[#8D3029]">{state.error}</p>}
        {state.success && <p aria-live="polite" className="mt-5 rounded-xl bg-[#E7F1E8] px-4 py-3 text-sm text-[#315D38]">Paramètres enregistrés. Le prochain traitement utilisera cette configuration.</p>}

        <div className="mt-6 flex justify-end">
          <button type="submit" disabled={pending} className="min-h-11 rounded-full bg-foreground px-6 text-sm font-semibold text-background transition hover:opacity-85 disabled:cursor-wait disabled:opacity-55">
            {pending ? "Enregistrement…" : "Enregistrer les paramètres"}
          </button>
        </div>
      </form>
    </div>
  );
}
