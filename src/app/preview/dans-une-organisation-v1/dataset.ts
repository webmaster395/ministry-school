import type {
  CategoryDefinition,
  ContextId,
  CounterpartContent,
  OrganisationConfiguration,
  OrganisationManifest,
  ProfileCode,
  RoleId,
  SituationContent,
} from "./types";

export const PROFILE_CODES: ProfileCode[] = ["D", "I", "S", "C"];
export const ROLE_IDS: RoleId[] = ["direction", "management", "contribution", "transversal"];
export const CONFIGURATION_KEYS = ["D", "DI", "DS", "DC", "I", "ID", "IS", "IC", "S", "SD", "SI", "SC", "C", "CD", "CI", "CS"] as const;
export const ROLE_CONTEXT_IDS: Record<RoleId, ContextId[]> = {
  direction: ["personnes_sous_responsabilite"],
  management: ["collaborateurs_encadres"],
  contribution: ["avec_responsable", "avec_collegue"],
  transversal: ["partenaires_sans_autorite_directe"],
};
export const CONTEXT_LABELS: Record<ContextId, string> = {
  personnes_sous_responsabilite: "Avec une personne sous ma responsabilité",
  collaborateurs_encadres: "Avec une personne que j’encadre",
  avec_responsable: "Avec mon responsable",
  avec_collegue: "Avec un collègue",
  partenaires_sans_autorite_directe: "Avec un partenaire sans autorité directe",
};
export const SITUATION_IDS = [
  "convaincre", "motiver", "encourager", "reunion", "telephone", "email", "whatsapp",
  "feedback_positif", "feedback_correctif", "objection", "refuser", "conflit",
  "annoncer_difficulte", "gerer_urgence", "mobiliser_crise",
] as const;

export const V9_SITUATION_IDS = [
  "convaincre", "motiver", "encourager", "animer_reunion", "communiquer_distance",
  "ecouter_comprendre", "valoriser_contribution", "retour_constructif", "deleguer_repartir",
  "exprimer_desaccord", "dire_non", "resoudre_conflit", "annoncer_decision_difficile",
  "gerer_urgence", "accompagner_changement",
] as const;

export const CONVAINCRE_V9_SOURCE = "/data/organisation-v9/convaincre-v9-320-restitutions-controlees.json";
export const ORGANISATION_MANUAL_SOURCE = "/apps/profil-mapp/data/organisation-manual/organisation-manual-content.json";
export const CONVAINCRE_V9_SHA256 = "b855d2ada8bf4cd318838851e0c58e1746cf46271af25f6853224d37f7ffc5ba";
export const MOTIVER_V10_M01_SOURCE = "/data/organisation-v10/motiver-v10-M01-16-restitutions.json";
export const MOTIVER_V10_M01_SHA256 = "afb15e69be4db963ab7a025745949d2d1323e9ae9c8c813bfa671d05c85cf4a1";
export const MOTIVER_V10_M02_SOURCE = "/data/organisation-v10/motiver-v10-M02-16-restitutions.json";
export const MOTIVER_V10_M02_SHA256 = "394d14ba42bf70e4820d9d9e5ab54a30dedc264abff7597e8fefc4fb39506af3";
export const MOTIVER_V10_M03_SOURCE = "/data/organisation-v10/motiver-v10-M03-16-restitutions.json";
export const MOTIVER_V10_M03_SHA256 = "e31e30d86df1d3f73e4dacf1e468f68eeb373ff22505660e73f1f4729efe3786";
export const MOTIVER_V10_M04_SOURCE = "/data/organisation-v10/motiver-v10-M04-16-restitutions.json";
export const MOTIVER_V10_M04_SHA256 = "d2b0cff1eb7fe7c486a3d88d6e6c75620934119defc83bec52d475dfb8f067fb";
export const ENCOURAGER_V9_E01_SOURCE = "/data/organisation-v9/encourager-v9-E01-16-restitutions.json";
export const ENCOURAGER_V9_E01_SHA256 = "c2f3afa22dc2a35d12a9d329fd885568f9b72822c1b909f15cf3ccd2d86fd3ad";
export const ENCOURAGER_V9_E02_SOURCE = "/data/organisation-v9/encourager-v9-E02-16-restitutions.json";
export const ENCOURAGER_V9_E02_SHA256 = "d6bd6ce6d9354f97cc0bfebda52328ff63c3565e5a7cfd75e7d7b2f71b40f17d";
export const MOTIVER_V10_M05_SOURCE = "/data/organisation-v10/motiver-v10-M05-16-restitutions.json";
export const MOTIVER_V10_M05_SHA256 = "2f9c0c6e281980455d615763c1ca3de38dbc45cf4719fe2e79dd6e54b4e05262";
export const MOTIVER_V10_M06_SOURCE = "/data/organisation-v10/motiver-v10-M06-16-restitutions.json";
export const MOTIVER_V10_M06_SHA256 = "0c8c4edae425b3a2682d84b8b155ee54376bd70ca4483a39e8d3e019817ce04a";

const CATEGORY_BLUEPRINT = [
  ["convaincre_motiver_encourager", "Convaincre, motiver et encourager", ["convaincre", "motiver", "encourager"]],
  ["communiquer", "Communiquer efficacement", ["reunion", "telephone", "email", "whatsapp"]],
  ["feedback", "Faire un feedback", ["feedback_positif", "feedback_correctif"]],
  ["desaccord", "Exprimer un désaccord", ["objection", "refuser", "conflit"]],
  ["crise", "Agir en temps de crise", ["annoncer_difficulte", "gerer_urgence", "mobiliser_crise"]],
] as const;

const PROFILE_COLORS: Record<ProfileCode, string> = { D: "#D94334", I: "#F2C94C", S: "#57A773", C: "#477CB9" };
const PROFILE_NAMES: Record<ProfileCode, string> = { D: "Conquérant", I: "Communiquant", S: "Facilitateur", C: "Analyste" };
const ROLE_META: OrganisationManifest["roles"] = {
  direction: { label: "Je dirige", context: "tu écoutes, donnes le cap et assumes les arbitrages" },
  management: { label: "J’encadre", context: "tu accompagnes l’équipe et fais remonter les besoins du terrain" },
  contribution: { label: "Je contribue", context: "tu proposes et réalises avec ton responsable ou un collègue" },
  transversal: { label: "Je collabore", context: "tu coordonnes sans autorité hiérarchique directe" },
};

const V9_CATEGORIES: CategoryDefinition[] = [
  { id: "mobiliser", title: "Mobiliser et faire adhérer", situations: [
    { id: "convaincre", label: "Convaincre" }, { id: "motiver", label: "Motiver" }, { id: "encourager", label: "Encourager" },
  ] },
  { id: "communiquer", title: "Communiquer et comprendre", situations: [
    { id: "animer_reunion", label: "Animer une réunion" }, { id: "communiquer_distance", label: "Communiquer à distance" }, { id: "ecouter_comprendre", label: "Écouter et comprendre" },
  ] },
  { id: "progresser", title: "Valoriser et faire progresser", situations: [
    { id: "valoriser_contribution", label: "Valoriser une contribution" }, { id: "retour_constructif", label: "Faire un retour constructif" }, { id: "deleguer_repartir", label: "Déléguer ou répartir les responsabilités" },
  ] },
  { id: "desaccord", title: "Gérer les désaccords", situations: [
    { id: "exprimer_desaccord", label: "Exprimer un désaccord" }, { id: "dire_non", label: "Dire non" }, { id: "resoudre_conflit", label: "Résoudre un conflit" },
  ] },
  { id: "changement", title: "Conduire le changement et les situations difficiles", situations: [
    { id: "annoncer_decision_difficile", label: "Annoncer une décision difficile" }, { id: "gerer_urgence", label: "Gérer une urgence" }, { id: "accompagner_changement", label: "Accompagner le changement" },
  ] },
];

const V9_ROLE_INTROS: Record<RoleId, string> = {
  direction: "Tu écoutes les personnes, définis le cap, mobilises et assumes les arbitrages.",
  management: "Tu accompagnes ton équipe, organises l’action et fais remonter les besoins du terrain.",
  contribution: "Tu réalises tes missions, prends des initiatives et partages tes idées avec ton responsable ou tes collègues.",
  transversal: "Tu partages les informations, construis des solutions et coordonnes les contributions sans lien hiérarchique direct.",
};

const MANUAL_PROFILE_LABELS: Record<string, string> = {
  D: "Paul",
  DI: "Paul · Pierre",
  DS: "Paul · Abraham",
  DC: "Paul · Moïse",
  I: "Pierre",
  ID: "Pierre · Paul",
  IS: "Pierre · Abraham",
  IC: "Pierre · Moïse",
  S: "Abraham",
  SD: "Abraham · Paul",
  SI: "Abraham · Pierre",
  SC: "Abraham · Moïse",
  C: "Moïse",
  CD: "Moïse · Paul",
  CI: "Moïse · Pierre",
  CS: "Moïse · Abraham",
};

export type UiOrganisationDataset = OrganisationManifest & {
  schemaVersion: string;
  configurations: Record<string, OrganisationConfiguration>;
};

type UnknownRecord = Record<string, unknown>;

function hasExactKeys(value: UnknownRecord, expected: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === expected.length && expected.every(key => Object.hasOwn(value, key));
}

function record(value: unknown, path: string): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Organisation : objet attendu à ${path}`);
  return value as UnknownRecord;
}

function text(value: unknown, path: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Organisation : texte manquant à ${path}`);
  return value;
}

function words(value: unknown, path: string): SituationContent["wordsToUse"] {
  if (!Array.isArray(value) || (value.length !== 3 && value.length !== 4)) {
    throw new Error(`Organisation : trois ou quatre formulations requises à ${path}`);
  }
  return value.map((item, index) => {
    const entry = record(item, `${path}[${index}]`);
    const intent = typeof entry.intent === "string" ? entry.intent : "";
    return { intent, text: text(entry.text, `${path}[${index}].text`) };
  });
}

function categoriesFromSituations(situations: unknown): CategoryDefinition[] {
  if (!Array.isArray(situations) || situations.length !== 15) throw new Error("Organisation V9 : 15 situations requises");
  const labels = new Map(situations.map((item, index) => {
    const definition = record(item, `situations[${index}]`);
    return [text(definition.id, `situations[${index}].id`), text(definition.label, `situations[${index}].label`)];
  }));
  const ids = [...labels.keys()];
  if (new Set(ids).size !== 15 || SITUATION_IDS.some(id => !labels.has(id))) throw new Error("Organisation V9 : identifiants de situations incompatibles");
  return CATEGORY_BLUEPRINT.map(([id, title, situationIds]) => ({
    id,
    title,
    situations: situationIds.map(situationId => ({ id: situationId, label: labels.get(situationId)! })),
  }));
}

function mapV9Content(value: unknown, path: string, situationId: string, categories: CategoryDefinition[]): SituationContent {
  const content = record(value, path);
  const category = categories.find(item => item.situations.some(situation => situation.id === situationId));
  const situation = category?.situations.find(item => item.id === situationId);
  if (!category || !situation) throw new Error(`Organisation V9 : situation inconnue ${situationId}`);
  return {
    category: category.id,
    title: situation.label,
    context: typeof content.context === "string" && content.context.trim() ? content.context : undefined,
    yourLikelyReflex: text(content.yourLikelyReflex, `${path}.yourLikelyReflex`),
    potentialFriction: text(content.potentialFriction, `${path}.potentialFriction`),
    recommendedApproach: text(content.recommendedApproach, `${path}.recommendedApproach`),
    wordsToUse: words(content.wordsToUse, `${path}.wordsToUse`),
    avoid: text(content.avoid, `${path}.avoid`),
    practicalAction: text(content.practicalAction, `${path}.practicalAction`),
  };
}

export function normalizeManualOrganisationContent(raw: unknown): UiOrganisationDataset {
  const source = record(raw, "root");
  if (source.schemaVersion !== "manual-1.0.0") {
    throw new Error("Organisation manuelle : schemaVersion manual-1.0.0 requise");
  }
  if (!Array.isArray(source.entries)) throw new Error("Organisation manuelle : liste entries requise");

  const configurations = Object.fromEntries(CONFIGURATION_KEYS.map(configurationKey => {
    const primary = configurationKey[0] as ProfileCode;
    const secondary = configurationKey.length === 2 ? configurationKey[1] as ProfileCode : null;
    const roles = Object.fromEntries(ROLE_IDS.map(roleId => [roleId, {
      intro: V9_ROLE_INTROS[roleId],
      contexts: Object.fromEntries(ROLE_CONTEXT_IDS[roleId].map(contextId => [contextId, {
        label: CONTEXT_LABELS[contextId],
        counterparts: Object.fromEntries(PROFILE_CODES.map(profileCode => [profileCode, {
          name: PROFILE_NAMES[profileCode],
          color: PROFILE_COLORS[profileCode],
          cases: {},
        }])) as Record<ProfileCode, CounterpartContent>,
      }])),
    }])) as OrganisationConfiguration["roles"];
    return [configurationKey, { primary, secondary, label: MANUAL_PROFILE_LABELS[configurationKey], roles }];
  })) as Record<string, OrganisationConfiguration>;

  const identifiers = new Set<string>();
  for (const [index, value] of source.entries.entries()) {
    const entry = record(value, `entries[${index}]`);
    const id = text(entry.id, `entries[${index}].id`);
    if (identifiers.has(id)) throw new Error(`Organisation manuelle : identifiant dupliqué ${id}`);
    identifiers.add(id);
    const parts = id.split("/");
    if (parts.length !== 5) throw new Error(`Organisation manuelle : identifiant invalide ${id}`);
    const [roleValue, contextValue, situationId, counterpartValue, configurationKey] = parts;
    if (!ROLE_IDS.includes(roleValue as RoleId)) throw new Error(`Organisation manuelle : rôle inconnu ${id}`);
    const roleId = roleValue as RoleId;
    if (!ROLE_CONTEXT_IDS[roleId].includes(contextValue as ContextId)) throw new Error(`Organisation manuelle : contexte incompatible ${id}`);
    const contextId = contextValue as ContextId;
    if (!V9_SITUATION_IDS.includes(situationId as (typeof V9_SITUATION_IDS)[number])) throw new Error(`Organisation manuelle : situation inconnue ${id}`);
    if (!PROFILE_CODES.includes(counterpartValue as ProfileCode)) throw new Error(`Organisation manuelle : interlocuteur inconnu ${id}`);
    const counterpart = counterpartValue as ProfileCode;
    if (!CONFIGURATION_KEYS.includes(configurationKey as (typeof CONFIGURATION_KEYS)[number])) throw new Error(`Organisation manuelle : profil participant inconnu ${id}`);
    const content = mapV9Content(entry.content, `entries[${index}].content`, situationId, V9_CATEGORIES);
    configurations[configurationKey].roles[roleId].contexts[contextId]!.counterparts[counterpart].cases[situationId] = content;
  }

  return {
    schemaVersion: "manual-1.0.0",
    status: "integration_manuelle_progressive",
    profiles: PROFILE_NAMES,
    design: { profileColors: PROFILE_COLORS },
    roles: ROLE_META,
    page: { number: 5, title: "Dans une organisation.", previous: "04 / Avec les autres", next: "06 / Grandir", following: "07 / Dans la Bible" },
    categories: V9_CATEGORIES,
    configurationKeys: [...CONFIGURATION_KEYS],
    configurations,
    editorialCaveat: `${identifiers.size} restitution${identifiers.size > 1 ? "s" : ""} intégrée${identifiers.size > 1 ? "s" : ""} manuellement. Aucun ancien texte ni contenu de remplacement n’est utilisé.`,
  };
}

export function normalizeOrganisationV9(raw: unknown): UiOrganisationDataset {
  const source = record(raw, "root");
  if (source.schemaVersion !== "9.0.0") throw new Error("Organisation V9 : schemaVersion 9.0.0 requise");
  const profiles = record(source.profiles, "profiles") as Record<ProfileCode, string>;
  if (!hasExactKeys(profiles, PROFILE_CODES)) throw new Error("Organisation V9 : profils incompatibles");
  for (const code of PROFILE_CODES) text(profiles[code], `profiles.${code}`);
  const categories = categoriesFromSituations(source.situations);
  const rawConfigurations = record(source.configurations, "configurations");
  const configurationKeys = Object.keys(rawConfigurations);
  if (!hasExactKeys(rawConfigurations, CONFIGURATION_KEYS)) throw new Error("Organisation V9 : 16 configurations exactes requises");

  const configurations = Object.fromEntries(configurationKeys.map(configurationKey => {
    const rawConfiguration = record(rawConfigurations[configurationKey], `configurations.${configurationKey}`);
    const expectedPrimary = configurationKey[0] as ProfileCode;
    const expectedSecondary = configurationKey.length === 2 ? configurationKey[1] as ProfileCode : null;
    if (rawConfiguration.primary !== expectedPrimary || rawConfiguration.secondary !== expectedSecondary) {
      throw new Error(`Organisation V9 : profils principal/secondaire mal raccordés à ${configurationKey}`);
    }
    const rawRoles = record(rawConfiguration.roles, `configurations.${configurationKey}.roles`);
    if (!hasExactKeys(rawRoles, ROLE_IDS)) throw new Error(`Organisation V9 : rôles incompatibles à ${configurationKey}`);
    const roles = Object.fromEntries(ROLE_IDS.map(roleId => {
      const rawRole = record(rawRoles[roleId], `configurations.${configurationKey}.roles.${roleId}`);
      const rawContexts = record(rawRole.contexts, `configurations.${configurationKey}.roles.${roleId}.contexts`);
      const expectedContexts = ROLE_CONTEXT_IDS[roleId];
      if (!hasExactKeys(rawContexts, expectedContexts)) {
        throw new Error(`Organisation V9 : contextes incompatibles à ${configurationKey}/${roleId}`);
      }
      const contexts = Object.fromEntries(expectedContexts.map(contextId => {
        const rawContext = record(rawContexts[contextId], `configurations.${configurationKey}.roles.${roleId}.contexts.${contextId}`);
        const rawCounterparts = record(rawContext.counterparts, `${configurationKey}/${roleId}/${contextId}/counterparts`);
        if (!hasExactKeys(rawCounterparts, PROFILE_CODES)) throw new Error(`Organisation V9 : interlocuteurs incompatibles à ${configurationKey}/${roleId}/${contextId}`);
        const counterparts = Object.fromEntries(PROFILE_CODES.map(profileCode => {
          const rawCounterpart = record(rawCounterparts[profileCode], `${configurationKey}/${roleId}/${contextId}/${profileCode}`);
          if (rawCounterpart.profile !== profileCode) throw new Error(`Organisation V9 : profil d’interlocuteur mal raccordé à ${configurationKey}/${roleId}/${contextId}/${profileCode}`);
          const rawCases = record(rawCounterpart.cases, `${configurationKey}/${roleId}/${contextId}/${profileCode}/cases`);
          if (!hasExactKeys(rawCases, SITUATION_IDS)) throw new Error(`Organisation V9 : 15 cas exacts requis à ${configurationKey}/${roleId}/${contextId}/${profileCode}`);
          const cases = Object.fromEntries(SITUATION_IDS.map(situationId => {
            const rawCase = record(rawCases[situationId], `${configurationKey}/${roleId}/${contextId}/${profileCode}/${situationId}`);
            return [situationId, mapV9Content(rawCase.content, `${configurationKey}/${roleId}/${contextId}/${profileCode}/${situationId}.content`, situationId, categories)];
          }));
          return [profileCode, { name: profiles[profileCode], color: PROFILE_COLORS[profileCode], cases }];
        })) as Record<ProfileCode, CounterpartContent>;
        return [contextId, { label: text(rawContext.label, `${configurationKey}/${roleId}/${contextId}.label`), counterparts }];
      }));
      return [roleId, { intro: text(rawRole.intro, `configurations.${configurationKey}.roles.${roleId}.intro`), contexts }];
    })) as OrganisationConfiguration["roles"];
    return [configurationKey, {
      primary: expectedPrimary,
      secondary: expectedSecondary,
      label: text(rawConfiguration.label, `configurations.${configurationKey}.label`),
      roles,
    }];
  })) as Record<string, OrganisationConfiguration>;

  return {
    schemaVersion: "9.0.0",
    status: text(source.status, "status"),
    profiles,
    design: { profileColors: PROFILE_COLORS },
    roles: ROLE_META,
    page: { number: 5, title: "Dans une organisation.", previous: "04 / Avec les autres", next: "06 / Grandir", following: "07 / Dans la Bible" },
    categories,
    configurationKeys,
    configurations,
  };
}

export function normalizeOrganisationV8(raw: unknown): UiOrganisationDataset {
  const source = record(raw, "root") as UnknownRecord & OrganisationManifest & { configurations: Record<string, UnknownRecord>; schemaVersion: string };
  if (source.schemaVersion !== "8.0.0") throw new Error("Organisation V8 : schemaVersion 8.0.0 requise");
  const configurationKeys = Object.keys(source.configurations);
  const contextByRole: Record<RoleId, ContextId> = {
    direction: "personnes_sous_responsabilite",
    management: "collaborateurs_encadres",
    contribution: "avec_responsable",
    transversal: "partenaires_sans_autorite_directe",
  };
  const configurations = Object.fromEntries(configurationKeys.map(key => {
    const configuration = source.configurations[key] as unknown as OrganisationConfiguration & { roles: Record<RoleId, { intro: string; counterparts: Record<ProfileCode, CounterpartContent> }> };
    return [key, {
      ...configuration,
      roles: Object.fromEntries(ROLE_IDS.map(roleId => [roleId, {
        intro: configuration.roles[roleId].intro,
        contexts: { [contextByRole[roleId]]: { label: CONTEXT_LABELS[contextByRole[roleId]], counterparts: configuration.roles[roleId].counterparts } },
      }])) as OrganisationConfiguration["roles"],
    }];
  })) as Record<string, OrganisationConfiguration>;
  return { ...source, configurationKeys, configurations } as UiOrganisationDataset;
}

export function normalizeConvaincreV9Consolidation(raw: unknown): UiOrganisationDataset {
  const source = record(raw, "root");
  if (source.schemaVersion !== "9.0") throw new Error("Convaincre V9 : schemaVersion 9.0 requise");
  if (source.documentType !== "convaincre_v9_consolidation" || source.situation !== "convaincre") {
    throw new Error("Convaincre V9 : fichier de consolidation attendu");
  }
  if (source.totalRestitutions !== 320) throw new Error("Convaincre V9 : 320 restitutions annoncées requises");
  if (!Array.isArray(source.restitutions) || source.restitutions.length !== 320) {
    throw new Error("Convaincre V9 : 320 restitutions présentes requises");
  }

  const configurations = Object.fromEntries(CONFIGURATION_KEYS.map(configurationKey => {
    const primary = configurationKey[0] as ProfileCode;
    const secondary = configurationKey.length === 2 ? configurationKey[1] as ProfileCode : null;
    const roles = Object.fromEntries(ROLE_IDS.map(roleId => [roleId, {
      intro: V9_ROLE_INTROS[roleId],
      contexts: Object.fromEntries(ROLE_CONTEXT_IDS[roleId].map(contextId => [contextId, {
        label: CONTEXT_LABELS[contextId],
        counterparts: Object.fromEntries(PROFILE_CODES.map(profileCode => [profileCode, {
          name: PROFILE_NAMES[profileCode],
          color: PROFILE_COLORS[profileCode],
          cases: {},
        }])) as Record<ProfileCode, CounterpartContent>,
      }])),
    }])) as OrganisationConfiguration["roles"];
    return [configurationKey, { primary, secondary, label: configurationKey, roles }];
  })) as Record<string, OrganisationConfiguration>;

  const identifiers = new Set<string>();
  for (const [index, value] of source.restitutions.entries()) {
    const restitution = record(value, `restitutions[${index}]`);
    const id = text(restitution.id, `restitutions[${index}].id`);
    if (identifiers.has(id)) throw new Error(`Convaincre V9 : identifiant dupliqué ${id}`);
    identifiers.add(id);
    const parts = id.split("/");
    if (parts.length !== 5) throw new Error(`Convaincre V9 : identifiant invalide ${id}`);
    const [roleValue, contextValue, situationId, counterpartValue, configurationKey] = parts;
    if (!ROLE_IDS.includes(roleValue as RoleId)) throw new Error(`Convaincre V9 : rôle inconnu ${id}`);
    const roleId = roleValue as RoleId;
    if (!ROLE_CONTEXT_IDS[roleId].includes(contextValue as ContextId)) throw new Error(`Convaincre V9 : contexte incompatible ${id}`);
    const contextId = contextValue as ContextId;
    if (situationId !== "convaincre") throw new Error(`Convaincre V9 : situation inattendue ${id}`);
    if (!PROFILE_CODES.includes(counterpartValue as ProfileCode)) throw new Error(`Convaincre V9 : interlocuteur inconnu ${id}`);
    const counterpart = counterpartValue as ProfileCode;
    if (!CONFIGURATION_KEYS.includes(configurationKey as (typeof CONFIGURATION_KEYS)[number])) throw new Error(`Convaincre V9 : configuration inconnue ${id}`);

    const participant = record(restitution.participant, `restitutions[${index}].participant`);
    const expectedPrimary = configurationKey[0];
    const expectedSecondary = configurationKey.length === 2 ? configurationKey[1] : null;
    if (participant.code !== configurationKey || participant.primary !== expectedPrimary || participant.secondary !== expectedSecondary) {
      throw new Error(`Convaincre V9 : participant mal raccordé ${id}`);
    }
    const content = mapV9Content(restitution.content, `restitutions[${index}].content`, "convaincre", V9_CATEGORIES);
    const target = configurations[configurationKey].roles[roleId].contexts[contextId];
    if (!target) throw new Error(`Convaincre V9 : contexte absent ${id}`);
    target.counterparts[counterpart].cases.convaincre = content;
  }

  for (const configurationKey of CONFIGURATION_KEYS) {
    for (const roleId of ROLE_IDS) {
      for (const contextId of ROLE_CONTEXT_IDS[roleId]) {
        for (const counterpart of PROFILE_CODES) {
          if (!configurations[configurationKey].roles[roleId].contexts[contextId]?.counterparts[counterpart].cases.convaincre) {
            throw new Error(`Convaincre V9 : restitution absente ${roleId}/${contextId}/convaincre/${counterpart}/${configurationKey}`);
          }
        }
      }
    }
  }

  return {
    schemaVersion: "9.0-convaincre",
    status: "integration_partielle_controlee",
    profiles: PROFILE_NAMES,
    design: { profileColors: PROFILE_COLORS },
    roles: ROLE_META,
    page: { number: 5, title: "Dans une organisation.", previous: "04 / Avec les autres", next: "06 / Grandir", following: "07 / Dans la Bible" },
    categories: V9_CATEGORIES,
    configurationKeys: [...CONFIGURATION_KEYS],
    configurations,
    editorialCaveat: "Seule la situation Convaincre est disponible dans cette intégration V9.",
    sourceSha256: CONVAINCRE_V9_SHA256,
  };
}

function mergeMotiverV10Lot(
  dataset: UiOrganisationDataset,
  raw: unknown,
  expectedLot: "M01" | "M02" | "M03" | "M04" | "M05" | "M06",
  expectedRole: RoleId,
  expectedContext: ContextId,
  expectedCounterpart: ProfileCode,
): UiOrganisationDataset {
  const source = record(raw, `Motiver ${expectedLot}`);
  if (source.schemaVersion !== "10.0.0" || source.lot !== expectedLot) {
    throw new Error(`Motiver V10 : lot canonique ${expectedLot} attendu`);
  }
  const scope = record(source.scope, `Motiver ${expectedLot}.scope`);
  if (
    scope.role !== expectedRole
    || scope.context !== expectedContext
    || scope.situation !== "motiver"
    || scope.counterpart !== expectedCounterpart
    || scope.expectedRestitutions !== 16
  ) {
    throw new Error(`Motiver V10 ${expectedLot} : périmètre canonique incompatible`);
  }
  const scopeConfigurations = scope.configurations;
  if (!Array.isArray(scopeConfigurations) || scopeConfigurations.length !== CONFIGURATION_KEYS.length
    || CONFIGURATION_KEYS.some((key, index) => scopeConfigurations[index] !== key)) {
    throw new Error(`Motiver V10 ${expectedLot} : ordre canonique des 16 configurations requis`);
  }
  const validation = record(source.validation, `Motiver ${expectedLot}.validation`);
  if (validation.userValidation !== "not_started") {
    throw new Error(`Motiver V10 ${expectedLot} : validation utilisateur doit rester not_started`);
  }
  if (!Array.isArray(source.restitutions) || source.restitutions.length !== 16) {
    throw new Error(`Motiver V10 ${expectedLot} : 16 restitutions présentes requises`);
  }

  const merged = structuredClone(dataset);
  const identifiers = new Set<string>();
  for (const [index, value] of source.restitutions.entries()) {
    const restitution = record(value, `Motiver ${expectedLot}.restitutions[${index}]`);
    const configurationKey = CONFIGURATION_KEYS[index];
    const expectedId = `${expectedRole}/${expectedContext}/motiver/${expectedCounterpart}/${configurationKey}`;
    const id = text(restitution.id, `Motiver ${expectedLot}.restitutions[${index}].id`);
    if (id !== expectedId || identifiers.has(id)) {
      throw new Error(`Motiver V10 ${expectedLot} : identifiant canonique invalide ${id}`);
    }
    identifiers.add(id);
    const participant = record(restitution.participant, `Motiver ${expectedLot}.restitutions[${index}].participant`);
    const expectedPrimary = configurationKey[0];
    const expectedSecondary = configurationKey.length === 2 ? configurationKey[1] : null;
    if (participant.code !== configurationKey || participant.primary !== expectedPrimary || participant.secondary !== expectedSecondary) {
      throw new Error(`Motiver V10 ${expectedLot} : participant mal raccordé ${id}`);
    }
    const content = mapV9Content(restitution.content, `Motiver ${expectedLot}.restitutions[${index}].content`, "motiver", V9_CATEGORIES);
    merged.configurations[configurationKey].roles[expectedRole].contexts[expectedContext]!
      .counterparts[expectedCounterpart].cases.motiver = content;
  }

  merged.schemaVersion = `9.0-convaincre+10.0-motiver-${expectedLot}`;
  merged.status = "integration_partielle_controlee";
  merged.editorialCaveat = `Convaincre est disponible dans les cinq contextes. Motiver est disponible uniquement pour les lots intégrés jusqu’à ${expectedLot}, en direction avec une personne sous responsabilité.`;
  return merged;
}

export function mergeMotiverV10M01(dataset: UiOrganisationDataset, raw: unknown): UiOrganisationDataset {
  return mergeMotiverV10Lot(dataset, raw, "M01", "direction", "personnes_sous_responsabilite", "D");
}

export function mergeMotiverV10M02(dataset: UiOrganisationDataset, raw: unknown): UiOrganisationDataset {
  return mergeMotiverV10Lot(dataset, raw, "M02", "direction", "personnes_sous_responsabilite", "I");
}

export function mergeMotiverV10M03(dataset: UiOrganisationDataset, raw: unknown): UiOrganisationDataset {
  return mergeMotiverV10Lot(dataset, raw, "M03", "direction", "personnes_sous_responsabilite", "S");
}

export function mergeMotiverV10M04(dataset: UiOrganisationDataset, raw: unknown): UiOrganisationDataset {
  return mergeMotiverV10Lot(dataset, raw, "M04", "direction", "personnes_sous_responsabilite", "C");
}

export function mergeMotiverV10M05(dataset: UiOrganisationDataset, raw: unknown): UiOrganisationDataset {
  return mergeMotiverV10Lot(dataset, raw, "M05", "management", "collaborateurs_encadres", "D");
}

export function mergeMotiverV10M06(dataset: UiOrganisationDataset, raw: unknown): UiOrganisationDataset {
  return mergeMotiverV10Lot(dataset, raw, "M06", "management", "collaborateurs_encadres", "I");
}

function mergeEncouragerV9Lot(dataset: UiOrganisationDataset, raw: unknown, expectedLot: "E01" | "E02", expectedCounterpart: ProfileCode): UiOrganisationDataset {
  const source = record(raw, `Encourager ${expectedLot}`);
  if (source.schemaVersion !== "9.0.0" || source.lot !== expectedLot) {
    throw new Error(`Encourager V9 : lot canonique ${expectedLot} attendu`);
  }
  const scope = record(source.scope, `Encourager ${expectedLot}.scope`);
  if (
    scope.role !== "direction"
    || scope.context !== "personnes_sous_responsabilite"
    || scope.situation !== "encourager"
    || scope.counterpart !== expectedCounterpart
    || scope.expectedRestitutions !== 16
  ) throw new Error(`Encourager V9 ${expectedLot} : périmètre canonique incompatible`);
  const scopeConfigurations = scope.configurations;
  if (!Array.isArray(scopeConfigurations) || scopeConfigurations.length !== CONFIGURATION_KEYS.length
    || CONFIGURATION_KEYS.some((key, index) => scopeConfigurations[index] !== key)) {
    throw new Error(`Encourager V9 ${expectedLot} : ordre canonique des 16 configurations requis`);
  }
  const validation = record(source.validation, `Encourager ${expectedLot}.validation`);
  if (validation.userValidation !== "not_started") {
    throw new Error(`Encourager V9 ${expectedLot} : validation utilisateur doit rester not_started`);
  }
  if (!Array.isArray(source.restitutions) || source.restitutions.length !== 16) {
    throw new Error(`Encourager V9 ${expectedLot} : 16 restitutions présentes requises`);
  }

  const merged = structuredClone(dataset);
  const identifiers = new Set<string>();
  for (const [index, value] of source.restitutions.entries()) {
    const restitution = record(value, `Encourager ${expectedLot}.restitutions[${index}]`);
    const configurationKey = CONFIGURATION_KEYS[index];
    const expectedId = `direction/personnes_sous_responsabilite/encourager/${expectedCounterpart}/${configurationKey}`;
    const id = text(restitution.id, `Encourager ${expectedLot}.restitutions[${index}].id`);
    if (id !== expectedId || identifiers.has(id)) throw new Error(`Encourager V9 ${expectedLot} : identifiant canonique invalide ${id}`);
    identifiers.add(id);
    const participant = record(restitution.participant, `Encourager ${expectedLot}.restitutions[${index}].participant`);
    const expectedPrimary = configurationKey[0];
    const expectedSecondary = configurationKey.length === 2 ? configurationKey[1] : null;
    if (participant.code !== configurationKey || participant.primary !== expectedPrimary || participant.secondary !== expectedSecondary) {
      throw new Error(`Encourager V9 ${expectedLot} : participant mal raccordé ${id}`);
    }
    merged.configurations[configurationKey].roles.direction.contexts.personnes_sous_responsabilite!
      .counterparts[expectedCounterpart].cases.encourager = mapV9Content(
        restitution.content,
        `Encourager ${expectedLot}.restitutions[${index}].content`,
        "encourager",
        V9_CATEGORIES,
      );
  }
  merged.schemaVersion = "9.0-convaincre+10.0-motiver-M01-M06+9.0-encourager-E01-E02";
  merged.editorialCaveat = "Convaincre est disponible dans les cinq contextes. Motiver M01 à M04 et Encourager E01 à E02 sont disponibles en direction avec une personne sous responsabilité ; Motiver M05 à M06 est disponible en encadrement avec des collaborateurs encadrés.";
  return merged;
}

export function mergeEncouragerV9E01(dataset: UiOrganisationDataset, raw: unknown): UiOrganisationDataset {
  return mergeEncouragerV9Lot(dataset, raw, "E01", "D");
}

export function mergeEncouragerV9E02(dataset: UiOrganisationDataset, raw: unknown): UiOrganisationDataset {
  return mergeEncouragerV9Lot(dataset, raw, "E02", "I");
}

export function normalizeOrganisationDataset(raw: unknown): UiOrganisationDataset {
  const schemaVersion = record(raw, "root").schemaVersion;
  if (schemaVersion === "9.0" && record(raw, "root").documentType === "convaincre_v9_consolidation") {
    return normalizeConvaincreV9Consolidation(raw);
  }
  if (schemaVersion === "9.0.0") return normalizeOrganisationV9(raw);
  if (schemaVersion === "8.0.0") return normalizeOrganisationV8(raw);
  throw new Error(`Organisation : version non prise en charge (${String(schemaVersion)})`);
}

export function defaultContextForRole(configuration: OrganisationConfiguration, role: RoleId): ContextId {
  const expected = ROLE_CONTEXT_IDS[role];
  const context = expected.find(id => configuration.roles[role].contexts[id]);
  if (!context) throw new Error(`Organisation : aucun contexte disponible pour ${role}`);
  return context;
}
