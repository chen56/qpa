import {Cli, CliConfig} from "./cli.ts"
import * as apply from "./internal/command/apply.ts";
import * as destroy from "./internal/command/destroy.ts";
import * as list from "./internal/command/list.ts";

import {Command} from "commander";
import {z} from "zod/v4";
import { VarUI } from "./zod_ext.ts";

export {Cli} from "./cli.ts"
export {VarUI} from "./zod_ext.ts"
export {OptionTable} from "./zod_ext.ts"
export {TextInput} from "./zod_ext.ts"
export {VariableFactory} from "./zod_ext.ts"

export {ApplyFunc} from "./cli.ts";
export {CliConfig} from "./cli.ts";
export {ApplyContext} from "./cli.ts";

/*
 * Cli 扩展-Cli.create工厂方法
 *
 * Cli类和Cli.create分避免和ApplyCommand等命令的循环依赖（依赖倒置）
 */
declare module './cli.ts' {
  // 扩展 Cli 类的静态函数
  // 1.使用 namespace 语法来声明对函数/类对象的属性扩展
  namespace Cli {
    function run<Vars>(config: CliConfig<Vars>): Promise<void>;
  }
}
// 扩展 Cli 类的静态函数
// 2.使用 namespace 语法来声明对函数/类对象的属性扩展
Cli.run = async function <Vars>(config: CliConfig<Vars>): Promise<void> {
  const root = new _RootCommand();
  // 注意这里需要使用 BaseCli 来引用原始的 Cli 类构造函数
  const cli = new Cli(config.workdir, config.project);

  // --- 注册子命令 ---
  // 调用每个子命令的注册函数，并将主 root 实例传递进去
  apply.default(root, cli, config.apply, config.varsSchema, config.varsUI ?? new Map<z.ZodType, VarUI>());
  destroy.default(root, cli);
  list.default(root, cli);

  await root.parseAsync(process.argv);
};

export class _RootCommand extends Command {

  // commander的设计，父选项是需要command.parent?.opts()获取的，很不方便
  // 覆盖命令创建的工厂方法，让每个命令都有一些公共父选项
  createCommand(name: string) {
    return new Command(name)
      .option('-v, --verbose', 'use verbose logging');
  }
}
