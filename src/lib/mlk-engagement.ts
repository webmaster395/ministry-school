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
  return {
    completed: data.completed === true,
    none: data.none === true,
    equipier: data.equipier === true,
    manager: data.manager === true,
    collaborator: data.collaborator === true,
    equipierServices: typeof data.equipierServices === "string" ? data.equipierServices : "",
    managerServices: typeof data.managerServices === "string" ? data.managerServices : "",
  };
}
