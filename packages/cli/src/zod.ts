// 定义扁平选项表的元数据结构
import {z} from "zod/v4";


// 3. Zod Schema 辅助函数：附加 UI 元数据 (使用 z.meta())
// 移除 superRefine 逻辑，因为跨字段和动态校验将放到 object-level superRefine
// 扩展 ZodString 接口
declare module 'zod/v4' {
  interface ZodType {
    meta$optionTable<Row, Key extends keyof Row>(table: OptionTable<Row, Key>): this;
  }
}

// 实现扩展方法
// 实现 optionTable 方法
z.ZodType.prototype.meta$optionTable = function <Row, Key extends keyof Row>(
  table:_OptionTableImpl<Row, Key>
) {
  return this.meta({
    ...this.meta(),
    optionTable:new _OptionTableImpl(table),
  });
};

export interface OptionTable<Row, Key extends keyof Row> {
    fetchData: () => Promise<Row[]>; // fetchData 接收整个表单的当前值
    valueKey: Key;
    schema: z.ZodObject<Record<keyof Row, z.ZodTypeAny>>;
}

export class _OptionTableImpl<Row, Key extends keyof Row> implements OptionTable<Row,Key>{
    public fetchData: () => Promise<Row[]>;
    public valueKey: Key;
    public schema: z.ZodObject<Record<keyof Row, z.ZodTypeAny>>;

    constructor({fetchData, valueKey, schema}: OptionTable<Row, Key>) {
        this.fetchData = fetchData;
        this.valueKey = valueKey;
        this.schema = schema;
    }
}
