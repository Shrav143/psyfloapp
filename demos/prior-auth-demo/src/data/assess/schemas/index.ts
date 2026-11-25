import type { ModuleId, ModuleSchema } from "../types";
import { COMMUNITY_SCHEMAS } from "./community";
import { MH_SCHEMAS } from "./mh";
import { SUD_SCHEMAS } from "./sud";

/** The authored forms, by module id. The SUD set is written by the SUD instruments engineer, mental health by the mental health one, community and children by the community one. */
export const SCHEMAS: Partial<Record<ModuleId, ModuleSchema>> = { ...SUD_SCHEMAS, ...MH_SCHEMAS, ...COMMUNITY_SCHEMAS };
