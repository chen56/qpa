import * as dotenv from 'dotenv';
import * as dotenvExpand from 'dotenv-expand';
import {z} from "zod/v4";
import {Command} from "commander";

import * as apply from './command/apply.ts';
import * as destroy from './command/destroy.ts';

import {Project} from '@qpa/core';

// 首先加载 .env 文件中的原始键值对
// dotenv.config() 返回一个包含 parsed 属性的对象，其中是解析后的键值对
const MY_ENV = dotenv.config();
// 然后使用 dotenvExpand.expand() 来处理变量扩展
// 它会修改 process.env，并返回一个包含所有扩展后变量的对象
dotenvExpand.expand(MY_ENV);

// 定义扁平选项表的元数据结构
export interface OptionTable<Row, Key extends keyof Row> {
  type: '@qpa/cli/OptionTable';
  fetchData: () => Promise<Row[]>; // fetchData 接收整个表单的当前值
  valueKey: Key;
  schema: z.ZodObject<Record<keyof Row, z.ZodTypeAny>>;
}

// 3. Zod Schema 辅助函数：附加 UI 元数据 (使用 z.meta())
// 移除 superRefine 逻辑，因为跨字段和动态校验将放到 object-level superRefine
// 扩展 ZodString 接口
declare module 'zod/v4' {
  interface ZodType {
    qpa$optionTable<Row, Key extends keyof Row>(table: OptionTable<Row, Key>): this;
  }
}

// 实现扩展方法
// 实现 optionTable 方法
z.ZodType.prototype.qpa$optionTable = function <Row, Key extends keyof Row>(
  table: Omit<OptionTable<Row, Key>, 'type'>
) {
  const {fetchData, valueKey} = table;

  return this.meta({
    ...this.meta(),
    qpa$OptionTable: {type: '@qpa/cli/OptionTable', fetchData, valueKey: valueKey},
  });
};

interface ApplyContext<Vars> {
  project: Project;
  vars: Vars;
}

export type ApplyFunc<Vars> = (context: ApplyContext<Vars>) => Promise<void>;
export type VarsSchema<Vars> = (values: Partial<Vars>) => z.ZodObject<Record<keyof Vars, z.ZodTypeAny>>;

type SetupFunc<Vars> = () => {
  project: Project;
  apply: ApplyFunc<Vars>;
  varsSchema: VarsSchema<Vars>;
}

export class Cli {
  private constructor(readonly project: Project, readonly rootCommand: Command) {
  }

  static create<Vars>(setup: SetupFunc<Vars>): Cli {
    const setupResult = setup();
    const project = setupResult.project;

    const cli = new Cli(project, new _RootCommand());

    // --- 注册子命令 ---
    // 调用每个子命令的注册函数，并将主 root 实例传递进去
    apply.default(cli,  cli.rootCommand,setupResult.varsSchema,setupResult.apply);
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