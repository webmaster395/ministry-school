export type IdentityTieCode = "D" | "I" | "S" | "C";

export type IdentityTieRun = {
  status: string;
  rank_scope: string;
  candidate_codes: IdentityTieCode[];
  result_profile_choice_answers?: Array<{ sequence: number; selected_code: IdentityTieCode }>;
};

export type IdentityTiePart = { text: string; strong?: boolean };
