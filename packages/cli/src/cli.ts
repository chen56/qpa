import * as dotenv from 'dotenv';
import * as dotenvExpand from 'dotenv-expand';

import {Project} from "@qpa/core";
import {z} from "zod/v4";
import {VarUI} from "./zod_ext.ts";

// 首先加载 .env 文件中的原始键值对
// dotenv.config() 返回一个包含 parsed 属性的对象，其中是解析后的键值对
const MY_ENV = dotenv.config();
// 然后使用 dotenvExpand.expand() 来处理变量扩展
// 它会修改 process.env，并返回一个包含所有扩展后变量的对象
dotenvExpand.expand(MY_ENV);

export class Cli {
  constructor(readonly workdir: string, readonly project: Project,) {
  }
}

export interface ApplyContext<Vars> {
  project: Project;
  vars: Vars;
}

export interface CliConfig<Vars> {
  workdir: string;
  project: Project;
  apply: ApplyFunc<Vars>;
  varsSchema: z.ZodObject<Record<keyof Vars, z.ZodTypeAny>>;
  varsUI?: Map<z.ZodType, VarUI>;
}

export type ApplyFunc<Vars> = (context: ApplyContext<Vars>) => Promise<void>;

export interface _GlobalOptions {
  verbose?: boolean;
}