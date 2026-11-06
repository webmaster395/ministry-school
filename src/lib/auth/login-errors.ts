export const LOGIN_RETRY_COOLDOWN_MS = 15_000;

type LoginFailure = {
  code?: string;
  message?: string;
  status?: number;
};

function failureDetails(error: unknown): LoginFailure {
  if (!error || typeof error !== "object") return {};
  const value = error as Record<string, unknown>;
  return {
    code: typeof value.code === "string" ? value.code : undefined,
    message: typeof value.message === "string" ? value.message : undefined,
    status: typeof value.status === "number" ? value.status : undefined,
  };
}

export function normalizeLoginEmail(email: string) {
  return email.trim().toLocaleLowerCase("fr-FR");
}

export function isLoginRateLimited(error: unknown) {
  const { code, message = "", status } = failureDetails(error);
  const normalized = message.toLowerCase();
  return (
    status === 429 ||
    code === "over_request_rate_limit" ||
    code === "over_email_send_rate_limit" ||
    normalized.includes("rate limit") ||
    normalized.includes("too many requests")
  );
}

export function loginErrorMessage(error: unknown) {
  const { code, message = "", status } = failureDetails(error);
  const normalized = message.toLowerCase();

  if (isLoginRateLimited(error)) {
    return "Trop de connexions ont été lancées en même temps. Ta connexion n’a pas été relancée automatiquement : patiente quelques instants avant de réessayer.";
  }
  if (status !== undefined && status >= 500) {
    return "Le service de connexion répond plus lentement que prévu. Ta tentative n’a pas été répétée automatiquement. Patiente quelques instants avant de réessayer.";
  }
  if (normalized.includes("banned")) {
    return "Ce compte est désactivé. Rapprochez-vous de l’équipe Ministry School.";
  }
  if (code === "email_not_confirmed" || normalized.includes("email not confirmed")) {
    return "Validez votre adresse e-mail pour pouvoir vous connecter. Un lien vous a été envoyé par e-mail : pensez à vérifier vos courriers indésirables.";
  }
  if (
    code === "invalid_credentials" ||
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid credentials")
  ) {
    return "Identifiants incorrects. Vérifiez votre e-mail et votre mot de passe.";
  }
  return "La connexion n’a pas pu aboutir. Vérifie ton réseau, puis réessaie dans quelques instants. Aucune nouvelle tentative n’a été lancée automatiquement.";
}
