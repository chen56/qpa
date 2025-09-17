// 定义扁平选项表的元数据结构

export interface VarUI {
  type: string;
}

export interface OptionTable<Model, Option, Output> extends VarUI {
  type: 'qpa.OptionTable';
  query: (model: Partial<Model>) => Promise<Option[]>; // fetchData 接收整个表单的当前值
  getValue: (row: Option) => Output;
  columns?: ({
    name: string;
    getValue: (row: Option) => any | undefined;
  } | string)[];
}

export interface TextInput extends VarUI {
  type: 'qpa.TextInput';
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