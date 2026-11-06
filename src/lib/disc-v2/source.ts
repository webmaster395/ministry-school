import source from "../../data/disc/reference/profil_mapp_disc_v2_verified.json";
import { discV2Schema } from "./schema";

export const discV2Source = discV2Schema.parse(source);
export const DISC_V2_QUESTIONNAIRE_VERSION = "disc-mapp-v2.0.0" as const;
export const DISC_V2_SCORING_VERSION = "disc-mapp-v2.0.0" as const;

