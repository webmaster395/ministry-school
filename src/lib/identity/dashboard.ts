import "server-only";

import { createClient } from "@/lib/supabase/server";

export type IdentityResult = {
  kind: "mapp" | "fruit" | "gifts" | "skills" | "generopoly" | "apest" | "life-line" | "heroes-motors" | "heroes-prototype";
  completedAt: string;
  attemptId?: string;
  resultRevisionId?: string;
  primaryCode?: string | null;
  secondaryCode?: string | null;
  tieBreakRequired?: boolean;
  results?: Record<string, unknown>;
};

export type IdentityDashboard = {
  profile: { firstName: string; memberSince: string | null; certified: boolean; gender?: "homme" | "femme" | null };
  metrics: { studentCount: number; completedTests: number };
  identityResults: IdentityResult[];
  financeResults: IdentityResult[];
  recommendations: Array<{ id: string; title: string; href: string }>;
};

const emptyDashboard: IdentityDashboard = {
  profile: { firstName: "", memberSince: null, certified: false, gender: null },
  metrics: { studentCount: 0, completedTests: 0 },
  identityResults: [],
  financeResults: [],
  recommendations: [],
};

export async function getIdentityDashboard(): Promise<IdentityDashboard> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("student_identity_dashboard");
  if (error) throw new Error(`Chargement de Mon identité impossible : ${error.message}`);
  if (!data || typeof data !== "object") return emptyDashboard;
  return data as unknown as IdentityDashboard;
}
