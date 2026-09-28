export type MlkEngagement = {
  completed: boolean;
  none: boolean;
  equipier: boolean;
  manager: boolean;
  collaborator: boolean;
  equipierServiceIds: string[];
  managerServiceIds: string[];
};

export const EMPTY_MLK_ENGAGEMENT: MlkEngagement = {
  completed: false,
  none: false,
  equipier: false,
  manager: false,
  collaborator: false,
  equipierServiceIds: [],
  managerServiceIds: [],
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
    equipierServiceIds: Array.isArray(data.equipierServiceIds) ? data.equipierServiceIds.filter((id): id is string => typeof id === "string") : [],
    managerServiceIds: Array.isArray(data.managerServiceIds) ? data.managerServiceIds.filter((id): id is string => typeof id === "string") : [],
  };
}
