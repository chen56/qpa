import * as apply from './command/apply.ts';
import * as destroy from './command/destroy.ts';


import * as dotenv from 'dotenv';
import * as dotenvExpand from 'dotenv-expand';
import { EagerProject} from '@qpa/core';
import {Command} from "commander";

// 首先加载 .env 文件中的原始键值对
// dotenv.config() 返回一个包含 parsed 属性的对象，其中是解析后的键值对
const myEnv = dotenv.config();
// 然后使用 dotenvExpand.expand() 来处理变量扩展
// 它会修改 process.env，并返回一个包含所有扩展后变量的对象
dotenvExpand.expand(myEnv);

export class Cli {
    private constructor(readonly project: EagerProject, readonly rootCommand: Command) {
    }

    static eager(config: EagerProject): Cli {
        const cli = new Cli(config, new _RootCommand());

// --- 注册子命令 ---
// 调用每个子命令的注册函数，并将主 root 实例传递进去
        apply.default(cli, cli.rootCommand);
        destroy.default(cli, cli.rootCommand);
        return cli;
    }
}

class _RootCommand extends Command {

    // commander的设计，父选项是需要command.parent?.opts()获取的，很不方便
    // 覆盖命令创建的工厂方法，让每个命令都有一些公共父选项
    createCommand(name: string) {
        return new Command(name)
        .option('-v, --verbose', 'use verbose logging');
    }
}


