import {GlobalOptions} from './common.ts';
import type {Command} from "commander";
import {ApplyFunc, Cli, VarsSchema} from 'src/index.ts';
import {Project} from "@qpa/core";

import * as p from '@clack/prompts';

// 定义 apply 子命令选项的接口 (继承全局选项)
interface ApplyOptions extends GlobalOptions {
}

// 导出一个函数，用于注册 apply 子命令
function checkCancel(value: unknown) :void {
  if (p.isCancel(value)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }
}

// 接受父命令 (通常是 program 实例) 作为参数
export default function registerCommand<Vars>(cli: Cli, parentCommand: Command, varsSchema: VarsSchema<Vars>, apply: ApplyFunc<Vars>): void {
  // 在父命令上创建 'apply' 子命令
  parentCommand.command('apply')
    .description('apply config')
    // options 参数会自动包含所有选项的值 (包括全局选项如果定义在父命令上)
    .action(async (options: ApplyOptions) => {
      p.intro(`apply`);


      const log = p.taskLog({
        title: 'Running npm install'
      });

      for await (const line of ["a","b"]) {
        log.message(line);
      }


      if (options.verbose) {
        p.log.info(`sssOptions:${JSON.stringify(options)}`);
      }

      const s = p.spinner();
      s.start('Installing via npm');
// Do installation here
      await new Promise((resolve) => setTimeout(resolve, 1000));
      s.stop('Installed via npm');



      const group = await p.group(
        {
          name: () => p.text({ message: 'What is your name?' }),
          age: () => p.text({ message: 'What is your age?' }),
          color: ({ results }) =>
            p.multiselect({
              message: `What is your favorite color ${results.name}?`,
              options: [
                { value: 'red', label: 'Red' },
                { value: 'green', label: 'Green' },
                { value: 'blue', label: 'Blue' },
              ],
              initialValues:['red','green'],
              // required:false,
            }),
        },
        {
          // On Cancel callback that wraps the group
          // So if the user cancels one of the prompts in the group this function will be called
          onCancel: ({ results }) => {
            p.cancel('Operation cancelled.');
            process.exit(0);
          },
        }
      );

      console.log(group.name, group.age, group.color);


      const value = await p.text({
        message: 'What is the meaning of life?',
      });
      checkCancel(value);

      const projectType = await p.select({
        message: 'Pick a project type.',
        options: [
          { value: 'ts', label: 'TypeScript' },
          { value: 'js', label: 'JavaScript' },
          { value: 'coffee', label: 'CoffeeScript', hint: 'oh no' },
        ],
      });
      checkCancel(projectType);




      p.outro(`You're all set!`);


      await cli.project.apply(async (project: Project) => {
        await apply({
          project: project,
          vars: {
            //todo 获取 vars
          }
        });
      })
    });
}