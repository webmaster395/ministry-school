export type ProfileCode = "D" | "I" | "S" | "C";
export type RoleId = "direction" | "management" | "contribution" | "transversal";
export type ContextId = "personnes_sous_responsabilite" | "collaborateurs_encadres" | "avec_responsable" | "avec_collegue" | "partenaires_sans_autorite_directe";

export type SituationDefinition = {
  id: string;
  label: string;
};

export type CategoryDefinition = {
  id: string;
  title: string;
  situations: SituationDefinition[];
};

export type SituationContent = {
  category: string;
  title: string;
  context?: string;
  yourLikelyReflex: string;
  potentialFriction: string;
  recommendedApproach: string;
  exampleWords?: string;
  wordsToUse: Array<{ intent: string; text: string }>;
  avoid: string;
  practicalAction: string;
  editorialStatus?: string;
};

export type CounterpartContent = {
  name: string;
  color: string;
  cases: Partial<Record<string, SituationContent>>;
};

export type RoleContent = {
  intro: string;
  contexts: Partial<Record<ContextId, {
    label: string;
    counterparts: Record<ProfileCode, CounterpartContent>;
  }>>;
};

export type OrganisationConfiguration = {
  primary: ProfileCode;
  secondary: ProfileCode | null;
  label: string;
  intro?: string;
  roles: Record<RoleId, RoleContent>;
};

export type OrganisationManifest = {
  status: string;
  profiles: Record<ProfileCode, string>;
  design: { profileColors: Record<ProfileCode, string> };
  roles: Record<RoleId, { label: string; context: string }>;
  page: { number: number; title: string; previous: string; next: string; following: string };
  categories: CategoryDefinition[];
  configurationKeys: string[];
  schemaVersion?: string;
  editorialCaveat?: string;
  sourceSha256?: string;
};
