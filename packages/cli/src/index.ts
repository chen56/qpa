import {_RootCommand, Cli, CliConfig} from "./cli.ts"
import * as apply from "./command/apply.ts";
import * as destroy from "./command/destroy.ts";

export {Cli} from "./cli.ts"
export {OptionTable} from "./zod_ext.ts"
export {ApplyFunc} from "./cli.ts";
export {CliConfig} from "./cli.ts";
export {ApplyContext} from "./cli.ts";


/*
 * Cli 扩展-工厂函数
 *
 * 模块增强，扩展 Cli 类的类型定义
 * 用这种方式增加静态方法的原因是依赖倒置问题：Cli作为其他Command的公共依赖，而此方法是依赖所有命令的工厂
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
