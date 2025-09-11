// 定义扁平选项表的元数据结构
import {z} from "zod/v4";

export interface VarUI {
  type: string;
}

export interface OptionTable<Model, Option, Output> extends VarUI {
  type: 'qpa.OptionTable';
  query: (model: Partial<Model>) => Promise<Option[]>; // fetchData 接收整个表单的当前值
  getValue: (row: Option) => Output;
  optionSchema: z.ZodObject<Record<keyof Option, z.ZodTypeAny>>;
}

export interface TextInput extends VarUI {
  type: 'qpa.TextInput';
}

export class _OptionTableImpl<Model, FieldOption, Output> implements OptionTable<Model, FieldOption, Output> {
  readonly type = 'qpa.OptionTable';

  public query: (model: Partial<Model>) => Promise<FieldOption[]>;
  public getValue: (row: FieldOption) => Output;
  public optionSchema: z.ZodObject<Record<keyof FieldOption, z.ZodTypeAny>>;

  constructor(props: OptionTable<Model, FieldOption, Output>) {
    this.query = props.query;
    this.getValue = props.getValue;
    this.optionSchema = props.optionSchema;
  }
}

export const VariableFactory = {
  createOptionTable<Model, Option, Output>(props: Omit<OptionTable<Model, Option, Output>, "type">): OptionTable<Model, Option, Output> {
    return {
      type: "qpa.OptionTable",
      ...props,
    };
  },
  createTextInput(props?: Omit<TextInput, "type">): TextInput {
    props = props ?? {};
    return {
      type: "qpa.TextInput",
      ...props,
    };
  }

}