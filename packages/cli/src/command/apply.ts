import {GlobalOptions, loadDirectConfig} from './common.ts';
// import type {Project} from "@/index";
import type {Command} from "commander";
// import {Config} from "@qpa/core/src/index.js";
import {Config} from "@qpa/core";
import { Cli } from 'src/index.ts';
// 定义 apply 子命令选项的接口 (继承全局选项)
interface ApplyOptions extends GlobalOptions {
}

// 导出一个函数，用于注册 apply 子命令
// 接受父命令 (通常是 program 实例) 作为参数
export default function registerCommand(cli: Cli, parentCommand: Command): void {
    // 在父命令上创建 'apply' 子命令
    parentCommand.command('apply <configPath>')
        .description('apply config')
        // options 参数会自动包含所有选项的值 (包括全局选项如果定义在父命令上)
        .action(async (configPath: string, options: ApplyOptions) => {
            if (options.verbose) {
                console.log(`${new Date().toISOString()} - apply <${configPath}>.`);
                console.log(`Options:`, options);
            }
            const config: Config = await loadDirectConfig(configPath, options);
            await config.setup()
            await config.project.refresh();
            const project = config.project;
            await project.apply();
        });
}