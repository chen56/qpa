import type {Command} from "commander";
import console from "node:console";
import {Cli} from "../cli.ts";

// 导出一个函数，用于注册 plan 子命令
// 接受父命令 (通常是 program 实例) 作为参数
export default function registerCommand<Vars>(parentCommand: Command,cli: Cli): void {
  // 在父命令上创建 'plan' 子命令
  parentCommand.command('destroy')
  .description('destroy all Configured Resources and Deconfigured Resources')
  // 原代码 action signature 接收了 name 参数，但 command 定义没有 arguments。
  // 如果 plan 不需要 arguments, 只需接收 options。这里修正为只接收 options。
  .action(async () => {
    await cli.project.refresh();
    for (const resourceInstance of cli.project.resourceInstances) {
      console.log(`plan to destroy ${resourceInstance.resourceType.name} ${resourceInstance.name}`)
    }
    await cli.project.destroy();
    console.log(`destroy success`)

  });
}