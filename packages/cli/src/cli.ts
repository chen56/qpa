import * as dotenv from 'dotenv';
import * as dotenvExpand from 'dotenv-expand';
import {Command} from "commander";

import {Project} from "@qpa/core";
import {z} from "zod/v4";

// 首先加载 .env 文件中的原始键值对
// dotenv.config() 返回一个包含 parsed 属性的对象，其中是解析后的键值对
const MY_ENV = dotenv.config();
// 然后使用 dotenvExpand.expand() 来处理变量扩展
// 它会修改 process.env，并返回一个包含所有扩展后变量的对象
dotenvExpand.expand(MY_ENV);

export class Cli {
  constructor(readonly workdir: string, readonly project: Project, readonly rootCommand: Command) {
  }
}

export class _RootCommand extends Command {

  // commander的设计，父选项是需要command.parent?.opts()获取的，很不方便
  // 覆盖命令创建的工厂方法，让每个命令都有一些公共父选项
  createCommand(name: string) {
    return new Command(name)
      .option('-v, --verbose', 'use verbose logging');
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
}

export type ApplyFunc<Vars> = (context: ApplyContext<Vars>) => Promise<void>;

export interface _GlobalOptions {
  verbose?: boolean;
}