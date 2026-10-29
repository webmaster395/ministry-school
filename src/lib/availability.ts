const PARIS_TIME_ZONE = "Europe/Paris";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function parisParts(instant: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PARIS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
  };
}

/** Convertit une date/heure saisie comme heure de Paris en instant UTC, y compris aux changements d'heure. */
export function parisLocalToIso(date: string, time: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const clock = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match || !clock) throw new Error("Choisissez une date et une heure valides.");
  const desired = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(clock[1]),
    minute: Number(clock[2]),
  };
  const desiredUtc = Date.UTC(
    desired.year,
    desired.month - 1,
    desired.day,
    desired.hour,
    desired.minute,
  );
  let candidate = new Date(desiredUtc);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const observed = parisParts(candidate);
    const observedUtc = Date.UTC(
      observed.year,
      observed.month - 1,
      observed.day,
      observed.hour,
      observed.minute,
    );
    candidate = new Date(candidate.getTime() + desiredUtc - observedUtc);
  }
  const verified = parisParts(candidate);
  if (Object.keys(desired).some((key) => verified[key as keyof typeof verified] !== desired[key as keyof typeof desired])) {
    throw new Error("Cette heure n'existe pas à Paris en raison du changement d'heure. Choisissez une autre heure.");
  }
  return candidate.toISOString();
}

export function parseAvailability(formData: FormData, prefix = "availability") {
  const mode = text(formData, `${prefix}_mode`);
  if (mode !== "scheduled") return new Date().toISOString();
  return parisLocalToIso(
    text(formData, `${prefix}_date`),
    text(formData, `${prefix}_time`),
  );
}

export function formatAvailability(value: string | null | undefined) {
  if (!value || new Date(value).getTime() <= Date.now()) return "Disponible maintenant";
  return `Programmé le ${new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS_TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))} (heure de Paris)`;
}

