import {Project} from "@qpa/core";
import {z} from "zod/v4";

export interface ApplyContext<Vars> {
  project: Project;
  vars: Vars;
}

export interface CliOptions<Vars> {
  workdir: string;
  project: Project;
  apply: ApplyFunc<Vars>;
  varsSchema: z.ZodObject<Record<keyof Vars, z.ZodTypeAny>>;
}

export type ApplyFunc<Vars> = (context: ApplyContext<Vars>) => Promise<void>;
export type CliBuilder<Vars> = () => CliOptions<Vars>