import { Command } from 'commander';
// 导入共享类型（如果创建了 types.ts）
import type { GlobalOptions } from '../common';
// import {Project} from "@pa/core";

// 定义 apply 子命令选项的接口 (继承全局选项)
interface ApplyOptions extends GlobalOptions {
  extra?: boolean; // 示例选项
}
// new Project({name:"s"}).name;
// new Project({name:"s"})._configuredResources;
// 导出一个函数，用于注册 apply 子命令
// 接受父命令 (通常是 program 实例) 作为参数
export function registerApplyCommand(parentCommand: Command): void {
  // 在父命令上创建 'apply' 子命令
  parentCommand.command('apply')
    .description('apply config')
    // 注意: option('-x, --', '...') 中的长选项 -- 后面需要名字，这里修正为 --extra
    .option('-x, --extra', 'Add extra processing')
    // .option('-H, --hobbies <hobbies...>', 'List your hobbies (comma-separated or multiple times)') // 如果需要复杂选项，保留此行

    // 定义 action handler
    // options 参数会自动包含所有选项的值 (包括全局选项如果定义在父命令上)
    .action((options: ApplyOptions) => {
      // 在 action 内部可以访问 options 中定义的选项
      console.log(`Apply command executed.`);
      console.log(`Options:`, options);
      if (options.verbose) {
          console.log("Verbose output enabled.");
      }
      console.log(`apply: ${new Date().toISOString()}`);
    });
}