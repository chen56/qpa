import {Cli, CliConfig} from "./cli.ts"
import * as apply from "./internal/command/apply.ts";
import * as destroy from "./internal/command/destroy.ts";
import {Command} from "commander";

export {Cli} from "./cli.ts"
export {OptionTable} from "./zod_ext.ts"
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
    function create<Vars>(config: CliConfig<Vars>): Cli;
  }
}

// 扩展 Cli 类的静态函数
// 2.使用 namespace 语法来声明对函数/类对象的属性扩展
Cli.create = function <Vars>(config: CliConfig<Vars>): Cli {
  // 注意这里需要使用 BaseCli 来引用原始的 Cli 类构造函数
  const cli = new Cli(config.workdir, config.project, new _RootCommand());

  // --- 注册子命令 ---
  // 调用每个子命令的注册函数，并将主 root 实例传递进去
  apply.default(cli.rootCommand, cli, config.varsSchema, config.apply);
  destroy.default(cli.rootCommand, cli);
  return cli;
};

export class _RootCommand extends Command {

  // commander的设计，父选项是需要command.parent?.opts()获取的，很不方便
  // 覆盖命令创建的工厂方法，让每个命令都有一些公共父选项
  createCommand(name: string) {
    return new Command(name)
      .option('-v, --verbose', 'use verbose logging');
  }
}
