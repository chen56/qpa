// 定义扁平选项表的元数据结构
import {z} from "zod/v4";


// 3. Zod Schema 辅助函数：附加 UI 元数据 (使用 z.meta())
// 移除 superRefine 逻辑，因为跨字段和动态校验将放到 object-level superRefine
// 扩展 ZodString 接口
declare module 'zod/v4' {
  interface ZodType {
    meta$optionTable<Model,FieldOption>(table: OptionTable<Model,FieldOption>): this;
  }
}

// 实现扩展方法
// 实现 optionTable 方法
z.ZodType.prototype.meta$optionTable = function <Model,FieldOption>(
  table: _OptionTableImpl<Model,FieldOption>
) {
  return this.meta({
    ...this.meta(),
    optionTable: new _OptionTableImpl(table),
  });
};

export interface OptionTable<Model,FieldOption> {
  fetchData: (model:Partial<Model>) => Promise<FieldOption[]>; // fetchData 接收整个表单的当前值
  valueGetter: (row: FieldOption) => any;
  schema: z.ZodObject<Record<keyof FieldOption, z.ZodTypeAny>>;
}

export class _OptionTableImpl<Model,FieldOption> implements OptionTable<Model,FieldOption> {
  public fetchData: (model:Partial<Model>) => Promise<FieldOption[]>;
  public valueGetter: (row: FieldOption) => any;
  public schema: z.ZodObject<Record<keyof FieldOption, z.ZodTypeAny>>;

  constructor(props: OptionTable<Model,FieldOption>) {
    this.fetchData = props.fetchData;
    this.valueGetter = props.valueGetter;
    this.schema = props.schema;
  }
}