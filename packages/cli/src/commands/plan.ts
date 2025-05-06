// src/commands/plan.ts

import { Command } from 'commander';
// 导入共享类型（如果创建了 types.ts）
import type { GlobalOptions } from '../common';

// 定义 plan 子命令选项的接口 (继承全局选项)
interface PlanOptions extends GlobalOptions {
  enthusiastic?: boolean; // 示例选项
}

// 导出一个函数，用于注册 plan 子命令
// 接受父命令 (通常是 program 实例) 作为参数
export function registerPlanCommand(parentCommand: Command): void {
  // 在父命令上创建 'plan' 子命令
  parentCommand.command('plan')
    .description('plan')
    .option('-e, --enthusiastic', 'Be enthusiastic') // 示例选项
    // 原代码 action signature 接收了 name 参数，但 command 定义没有 arguments。
    // 如果 plan 不需要 arguments, 只需接收 options。这里修正为只接收 options。
    .action((options: PlanOptions) => {
      console.log(`Plan command executed.`);
      console.log(`Options:`, options);
       if (options.verbose) {
          console.log("Verbose output enabled.");
      }
      console.log(`plan: ${new Date().toISOString()}`);
    });
}