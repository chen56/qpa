import {z} from 'zod/v4';


// 定义扁平选项表的元数据结构
interface OptionTableMetadata<Row, K extends Extract<keyof Row, string>> {
  type: '@qpa/cli/OptionTable';
  fetchData: () => Promise<Row[]>; // fetchData 接收整个表单的当前值
  valueKey: K;
  schema: z.ZodObject<Record<keyof Row, z.ZodTypeAny>>;
}

``

// 2. 模拟 API 函数 (返回 Promise)
interface RegionApiData {
  RegionId: string;
  RegionName: string;
}

interface ZoneApiData {
  ZoneId: string;
  ZoneName: string;
  RegionId: string;
}

async function fetchRegions(): Promise<RegionApiData[]> {
  console.log("API Call: Fetching regions...");
  return new Promise(resolve => setTimeout(() => resolve([
    {RegionId: 'ap-guangzhou', RegionName: '华南地区(广州)'},
    {RegionId: 'ap-shanghai', RegionName: '华东地区(上海)'},
  ]), 500));
}

async function fetchZonesByRegion(regionId: string): Promise<ZoneApiData[]> {
  console.log(`API Call: Fetching zones for region: ${regionId}...`);
  return new Promise(resolve => setTimeout(() => {
    if (regionId === 'ap-guangzhou') {
      resolve([
        {ZoneId: 'gz-7', ZoneName: '广州七区', RegionId: 'ap-guangzhou'},
        {ZoneId: 'gz-6', ZoneName: '广州六区', RegionId: 'ap-guangzhou'},
      ]);
    } else if (regionId === 'ap-shanghai') {
      resolve([
        {ZoneId: 'sh-5', ZoneName: '上海五区', RegionId: 'ap-shanghai'},
        {ZoneId: 'sh-4', ZoneName: '上海四区', RegionId: 'ap-shanghai'},
      ]);
    } else {
      resolve([]);
    }
  }, 500));
}

async function getTencentCloudInstanceTypesByRegion(region: string): Promise<string[]> {
  console.log(`API Call: Fetching instance types for region: ${region}...`);
  return new Promise(resolve => setTimeout(() => {
    if (region === 'ap-guangzhou') {
      resolve(['SA2.MEDIUM2', 'S5.LARGE8']);
    } else if (region === 'ap-shanghai') {
      resolve(['S5.MEDIUM4', 'S5.LARGE16']);
    } else {
      resolve([]);
    }
  }, 500));
}

async function getTencentCloudImageIdsByRegion(region: string): Promise<string[]> {
  console.log(`API Call: Fetching image IDs for region: ${region}...`);
  return new Promise(resolve => setTimeout(() => {
    if (region === 'ap-guangzhou') {
      resolve(['img-mmytdhbn', 'img-other-guangzhou']);
    } else if (region === 'ap-shanghai') {
      resolve(['img-shanghai-ubuntu', 'img-shanghai-centos']);
    } else {
      resolve([]);
    }
  }, 500));
}

// 3. Zod Schema 辅助函数：附加 UI 元数据 (使用 z.meta())
// 移除 superRefine 逻辑，因为跨字段和动态校验将放到 object-level superRefine
// 扩展 ZodString 接口
declare module 'zod/v4' {
  interface ZodType {
    qpa$optionTable<Row extends object, ColumnName extends Extract<keyof Row, string>>(table: Omit<OptionTableMetadata<Row, ColumnName>, 'type'>): this;
  }
}

// 实现扩展方法
// 实现 optionTable 方法
z.ZodType.prototype.qpa$optionTable = function <T extends object, K extends Extract<keyof T, string>>(
  table: Omit<OptionTableMetadata<T, K>, 'type'>
) {
  const {fetchData, valueKey} = table;
  return this.meta({
    qpa$OptionTable: {type: '@qpa/cli/OptionTable', fetchData, valueKey},
  });
};


// 1. 公共类型定义
// 定义最终表单数据结构
interface MyVars {
  region: string;
  zone: string;
  instanceType: string;
  imageId: string;
}



const createVarsSchema = (values: Partial<MyVars>) => { // 不再接收 currentValues 参数，所有验证数据从 data 参数获取
  return z.object({
    region: z.string()
      .describe('选择区域')
      .refine((val) => !val, "请选择区域")
      .refine(async (val) => {
        const availableRegions = await fetchRegions(); // 直接调用 API 获取数据
        return availableRegions.some(opt => opt.RegionId === val)
      }, `无效区域`)
      .meta$optionTable({
        fetchData: async (): Promise<RegionApiData[]> => { // fetchData 在这里仍然需要 `values.region`
          console.log("API Call: Fetching regions...");
          return fetchRegions();
        },
        valueKey: 'RegionId',
        schema: z.object({
          RegionId: z.string().describe('区域'),
          RegionName: z.string().describe('区域名称'),
        }),
      }),
    zone: z.string()
      .describe('选择可用区')
      .refine((val) => !val, "请选择可用区")
      .refine(async (val) => {
        if (!values.region) {
          return false;
        }
        const availableZones = await fetchZonesByRegion(values.region); // 依赖 data.region
        return availableZones.some(opt => opt.ZoneId === val)
      }, `无效可用区`)
      .meta$optionTable({
        fetchData: async () => { // fetchData 在这里仍然需要 `values.region`
          if (values.region) {
            return fetchZonesByRegion(values.region);
          }
          return [];
        },
        valueKey: 'ZoneId',
        schema: z.object({
          ZoneId: z.string().describe('可用区'),
          ZoneName: z.string().describe('可用区名称'),
          RegionId: z.string().describe('区域'),
        }),
      }),
    instanceType: z.string()
      .describe('选择实例类型')
      .refine((val) => !val, "请选择实例类型")
      .refine(async (val) => {
        if (!values.region) {
          return false;
        }
        const types = await getTencentCloudInstanceTypesByRegion(values.region); // 依赖 data.region
        return types.includes(val)
      }, `无效实例类型`),
    imageId: z.string()
      .describe('选择镜像 ID')
      .refine((val) => !val, "请选择镜像 ID")
      .refine(async (val) => {
        if (!values.region) {
          return false;
        }
        const imageIds = await getTencentCloudImageIdsByRegion(values.region); // 依赖 data.region
        return imageIds.includes(val)
      }, `无效实例类型`),
  });
};
type SchemaFunc=( values: Partial<MyVars>)=> z.ZodObject<{imageId: z.ZodString, instanceType: z.ZodString, region: z.ZodString, zone: z.ZodString}>
type SchemaFunc2<Vars>=( values: Partial<Vars>)=> z.ZodObject<Record<keyof Vars, z.ZodTypeAny>>
