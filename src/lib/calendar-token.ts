import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Jeton d'abonnement au calendrier : encode l'identifiant de la personne, signé avec un secret
 * du serveur. Pas de table à créer — la route qui le lit vérifie juste la signature avant de
 * réutiliser cet identifiant. Le secret doit être défini ; sans lui, personne ne peut s'abonner.
 */
function secret() {
  const s = process.env.CALENDAR_TOKEN_SECRET;
  if (!s) throw new Error("CALENDAR_TOKEN_SECRET manquant");
  return s;
}

function sign(userId: string) {
  return createHmac("sha256", secret()).update(userId).digest("base64url");
}

export function createCalendarToken(userId: string) {
  return `${Buffer.from(userId).toString("base64url")}.${sign(userId)}`;
}

export function verifyCalendarToken(token: string): string | null {
  const [idPart, sig] = token.split(".");
  if (!idPart || !sig) return null;
  const userId = Buffer.from(idPart, "base64url").toString("utf8");
  const expected = sign(userId);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return userId;
}
