import {Project} from "@qpa/core";
import {z} from "zod/v4";

export interface ApplyContext<Vars> {
  project: Project;
  vars: Vars;
}

export type ApplyFunc<Vars> = (context: ApplyContext<Vars>) => Promise<void>;
export type VarsSchema<Vars> = (values: Partial<Vars>) => z.ZodObject<Record<keyof Vars, z.ZodTypeAny>>;
export type SetupFunc<Vars> = () => {
  project: Project;
  apply: ApplyFunc<Vars>;
  varsSchema: VarsSchema<Vars>;
}