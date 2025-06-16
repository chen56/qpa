import {z} from 'zod/v4';


// 定义扁平选项表的元数据结构
interface OptionTableMetadata<Row, K extends Extract<keyof Row, string>> {
  type: 'qpa$optionTable';
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
    qpa$OptionTable: {type: 'qpa$optionTable', fetchData, valueKey},
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
    region: z.string().describe('选择区域').qpa$optionTable({
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
    zone: z.string().describe('选择可用区').qpa$optionTable({
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
    instanceType: z.string().describe('选择实例类型'),
    imageId: z.string().describe('选择镜像 ID'),
  }).check(async (data) => { // object-level superRefine
    // 1. 校验 Region (即使没有 superRefine，也要确保其值在有效选项内)
    if (!data.value.region) { // 如果选择了zone但没选region
      data.issues.push({
        code: "custom",
        input: data.value.region,
        message: `请先选择区域`,
        path: ['region'],
      });
      return;
    }

    const availableRegions = await fetchRegions(); // 直接调用 API 获取数据
    if (availableRegions.length > 0 && !availableRegions.some(opt => opt.RegionId === data.value.region)) {
      data.issues.push({
        code: "custom",
        input: data.value.zone,
        message: `无效区域: ${data.value.region}, 请选择有效值${availableRegions.map(opt => opt.RegionId).join(', ')}}`,
        path: ['region'],
      });
      return;
    }

    // 2. 校验 Zone (依赖 Region)
    if (data.value.zone) {
      {
        const availableZones = await fetchZonesByRegion(data.value.region); // 依赖 data.region
        if (availableZones.length > 0 && !availableZones.some(opt => opt.ZoneId === data.value.zone)) {
          data.issues.push({
            code: "custom",
            input: data.value.zone,
            message: `无效可用区: ${data.value.zone} (对于区域 ${data.value.region})`,
            path: ['zone'],
          });
        }
      }
    }

    // 3. 校验 Instance Type (依赖 Region)
    if (data.value.instanceType) {
      if (!data.value.region) {
        data.issues.push({
          code: "custom",
          input: data.value.zone,
          message: `请先选择区域再选择实例类型`,
          path: ['instanceType'],
        });
      } else {
        const types = await getTencentCloudInstanceTypesByRegion(data.value.region); // 依赖 data.region
        if (!types.includes(data.value.instanceType)) {
          data.issues.push({
            code: "custom",
            input: data.value.zone,
            message: `实例类型 "${data.value.instanceType}" 在区域 "${data.value.region}" 不可用`,
            path: ['instanceType'],
          });
        }
      }
    }

    // 4. 校验 Image ID (依赖 Region)
    if (data.value.imageId) {
      if (!data.value.region) {
        data.issues.push({
          code: "custom",
          input: data.value.zone,
          message: `请先选择区域再选择镜像 ID`,
          path: ['imageId'],
        });
      } else {
        const imageIds = await getTencentCloudImageIdsByRegion(data.value.region); // 依赖 data.region
        if (!imageIds.includes(data.value.imageId)) {
          data.issues.push({
            code: "custom",
            input: data.value.zone,
            message: `镜像 ID "${data.value.imageId}" 在区域 "${data.value.region}" 不可用`,
            path: ['imageId'],
          });
        }
      }
    }
  });
};
