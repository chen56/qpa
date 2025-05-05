#!/usr/bin/env node

import { program } from 'commander';
import type { Command } from 'commander'; // 显式导入 Command 类型

// 定义全局选项的接口
interface GlobalOptions {
  verbose?: boolean;
}

// 定义 greet 子命令选项的接口
interface GreetOptions extends GlobalOptions {
  exclaim?: boolean;
  hobbies?: string[]; // 新增数组参数
}

// 定义 farewell 子命令选项的接口
interface FarewellOptions extends GlobalOptions {
  enthusiastic?: boolean;
}

// // 创建 greet 子命令
const greetCommand: Command = program.command('greet <name>')
  .description('Greets the given name')
  .option('-x, --exclaim', 'Add an exclamation ')
//   .option('-H, --hobbies <hobbies...>', 'List your hobbies (comma-separated or multiple times)')
  .action((name: string, options: GreetOptions) => {
    const greeting = `Hello, ${name}${options.exclaim ? '!' : ''}`;
    console.log(options.verbose ? `[VERBOSE] ${greeting}` : greeting);
    if (options.hobbies && options.hobbies.length > 0) {
      console.log(`Hobbies: ${options.hobbies.join(', ')}`);
    }
  });

// 创建 farewell 子命令
const farewellCommand: Command = program.command('farewell [name]')
  .description('Says goodbye')
  .option('-e, --enthusiastic', 'Say goodbye enthusiastically')
  .action((name: string | undefined, options: FarewellOptions) => {
    const goodbye = `Goodbye, ${name || 'World'}${options.enthusiastic ? '!' : '.'}`;
    console.log(options.verbose ? `[VERBOSE] ${goodbye}` : goodbye);
  });

// 定义全局选项
program
  .version('1.0.0')
  .option('-v, --verbose', 'Enable verbose output')
  .parse(process.argv);

