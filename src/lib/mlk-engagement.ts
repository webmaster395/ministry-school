export type MlkEngagement = {
  completed: boolean;
  none: boolean;
  equipier: boolean;
  manager: boolean;
  collaborator: boolean;
  equipierServices: string;
  managerServices: string;
};

export const EMPTY_MLK_ENGAGEMENT: MlkEngagement = {
  completed: false,
  none: false,
  equipier: false,
  manager: false,
  collaborator: false,
  equipierServices: "",
  managerServices: "",
};

export function parseMlkEngagement(value: unknown): MlkEngagement {
  const root = (value ?? {}) as { mlk_engagement?: Partial<MlkEngagement> };
  const data = root.mlk_engagement ?? {};
  // Les anciennes données pouvaient contenir plusieurs choix. On conserve le statut
  // le plus spécifique afin qu'une personne ne soit comptée qu'une seule fois.
  const status = data.manager === true
    ? "manager"
    : data.collaborator === true
      ? "collaborator"
      : data.equipier === true
        ? "equipier"
        : data.none === true
          ? "none"
          : null;
  return {
    completed: data.completed === true,
    none: status === "none",
    equipier: status === "equipier",
    manager: status === "manager",
    collaborator: status === "collaborator",
    equipierServices: typeof data.equipierServices === "string" ? data.equipierServices : "",
    managerServices: typeof data.managerServices === "string" ? data.managerServices : "",
  };
}
