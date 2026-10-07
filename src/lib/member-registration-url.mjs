export const MEMBER_REGISTRATION_TIME_ZONE = "Europe/Paris";

export const MEMBER_REGISTRATION_URLS = {
  october: "https://www.billetweb.fr/mlk-ministry-school&ticket=7261552-7274673",
  november: "https://www.billetweb.fr/mlk-ministry-school&ticket=7264929-7274747",
  december: "https://www.billetweb.fr/mlk-ministry-school&ticket=7264929-7274747",
};

// En octobre 2026, Europe/Paris est en heure d'été (UTC+02:00).
// Chaque nouvelle période commence précisément à 12:00:00, heure de Paris.
const NOVEMBER_SWITCH = new Date("2026-10-03T12:00:00+02:00");
const DECEMBER_SWITCH = new Date("2026-10-07T12:00:00+02:00");

/** Retourne le lien Billetweb membre correspondant à l'instant donné. */
export function getMemberRegistrationUrl(now = new Date()) {
  const instant = now instanceof Date ? now : new Date(now);
  if (instant < NOVEMBER_SWITCH) return MEMBER_REGISTRATION_URLS.october;
  if (instant < DECEMBER_SWITCH) return MEMBER_REGISTRATION_URLS.november;
  return MEMBER_REGISTRATION_URLS.december;
}

/** Prochaine bascule, utilisée pour mettre à jour une page laissée ouverte. */
export function getNextMemberRegistrationSwitch(now = new Date()) {
  const instant = now instanceof Date ? now : new Date(now);
  if (instant < NOVEMBER_SWITCH) return new Date(NOVEMBER_SWITCH);
  if (instant < DECEMBER_SWITCH) return new Date(DECEMBER_SWITCH);
  return null;
}
