import {Project} from "@qpa/core";
import * as console from "node:console";
import {z} from "zod/v4";
import {Cli, VarsSchema} from "../src/index.ts";

/*
 * 模仿一个QPA项目
 */

interface MyVars {
  region: string,
  zone: string;
  instanceType: string;
  imageId: string;
}


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
  // console.log("API Call: Fetching regions...");
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

// ... 已有代码 ...

// 定义新的接口
interface InstanceTypeData {
  InstanceType: string;
}

interface ImageIdData {
  ImageId: string;
}

// 修改后的 getTencentCloudInstanceTypesByRegion 函数
async function fetchInstanceTypesByRegion(region: string): Promise<InstanceTypeData[]> {
  // console.log(`API Call: Fetching instance types for region: ${region}...`);
  return new Promise(resolve => setTimeout(() => {
    if (region === 'ap-guangzhou') {
      resolve([
        {InstanceType: 'SA2.MEDIUM2'},
        {InstanceType: 'S5.LARGE8'}
      ]);
    } else if (region === 'ap-shanghai') {
      resolve([
        {InstanceType: 'S5.MEDIUM4'},
        {InstanceType: 'S5.LARGE16'}
      ]);
    } else {
      resolve([]);
    }
  }, 500));
}

// 修改后的 getTencentCloudImageIdsByRegion 函数
async function fetchImageIdsByRegion(region: string): Promise<ImageIdData[]> {
  // console.log(`API Call: Fetching image IDs for region: ${region}...`);
  return new Promise(resolve => setTimeout(() => {
    if (region === 'ap-guangzhou') {
      resolve([
        {ImageId: 'img-mmytdhbn'},
        {ImageId: 'img-other-guangzhou'}
      ]);
    } else if (region === 'ap-shanghai') {
      resolve([
        {ImageId: 'img-shanghai-ubuntu'},
        {ImageId: 'img-shanghai-centos'}
      ]);
    } else {
      resolve([]);
    }
  }, 500));
}

// ... 已有代码 ...
// 1. 公共类型定义
// 定义最终表单数据结构
interface MyVars {
  region: string;
  zone: string;
  instanceType: string;
  imageId: string;
}

const createVarsSchema: VarsSchema<MyVars> = (values: Partial<MyVars>) => { // 不再接收 currentValues 参数，所有验证数据从 data 参数获取
  return z.object({
    region: z.string()
      .refine((val) => !val, "请选择区域")
      .refine(async (val) => {
        const availableRegions = await fetchRegions(); // 直接调用 API 获取数据
        return availableRegions.some(opt => opt.RegionId === val)
      }, `无效区域`)
      .meta({description: "选择区域"})
      .meta$optionTable({
        fetchData: async (): Promise<RegionApiData[]> => { // fetchData 在这里仍然需要 `values.region`
          // console.log("API Call: Fetching regions...");
          return fetchRegions();
        },
        valueKey: 'RegionId',
        schema: z.object({
          RegionId: z.string().meta({description: "区域"}),
          RegionName: z.string().meta({description: "区域名称"}),
        }),
      }),
    zone: z.string()
      .refine((val) => !val, "请选择可用区")
      .refine(async (val) => {
        if (!values.region) {
          return false;
        }
        const availableZones = await fetchZonesByRegion(values.region); // 依赖 data.region
        return availableZones.some(opt => opt.ZoneId === val)
      }, `无效可用区`)
      .meta({description: "选择可用区"})
      .meta$optionTable({
        fetchData: async () => { // fetchData 在这里仍然需要 `values.region`
          if (values.region) {
            return fetchZonesByRegion(values.region);
          }
          return [];
        },
        valueKey: 'ZoneId',
        schema: z.object({
          ZoneId: z.string().meta({description: "可用区"}),
          ZoneName: z.string().meta({description: "可用区名称"}),
          RegionId: z.string().meta({description: "区域"}),
        }),
      }),
    instanceType: z.string()
      .refine((val) => !val, "请选择实例类型")
      .refine(async (val) => {
        if (!values.region) {
          return false;
        }
        const types = await fetchInstanceTypesByRegion(values.region); // 依赖 data.region
        return types.map(e => e.InstanceType).includes(val)
      }, `无效实例类型`)
      .meta({description: "选择实例类型"})
      .meta$optionTable({
        fetchData: async () => { // fetchData 在这里仍然需要 `values.region`
          if (values.region) {
            return fetchInstanceTypesByRegion(values.region);
          }
          return [];
        },
        valueKey: 'InstanceType',
        schema: z.object({
          InstanceType: z.string().meta({description: "实例类型"}),
        }),
      })
    ,
    imageId: z.string()
      .refine((val) => !val, "请选择镜像")
      .refine(async (val) => {
        if (!values.region) {
          return false;
        }
        const imageIds = await fetchImageIdsByRegion(values.region); // 依赖 data.region
        return imageIds.map(e => e.ImageId).includes(val)
      }, `无效实例类型`)
      .meta({description: "选择镜像"})
      .meta$optionTable({
        fetchData: async () => { // fetchData 在这里仍然需要 `values.region`
          if (values.region) {
            return fetchImageIdsByRegion(values.region);
          }
          return [];
        },
        valueKey: 'ImageId',
        schema: z.object({
          ImageId: z.string().meta({description: "镜像ID"}),
        }),
      })
    ,
  });
};


// zod: bug
// console.log("region:", z.string()
//   .refine((val) => !val, "select region")
//   .meta$description('region desc')
//   // .describe('region desc')
//   .description
// );
// console.log("region2", z.string()
//   .refine((val) => !val, "select region")
//   .meta({
//     description: "region desc",
//   })
//   .meta$optionTable({
//     fetchData: async (): Promise<RegionApiData[]> => { // fetchData 在这里仍然需要 `values.region`
//       console.log("API Call: Fetching regions...");
//       return fetchRegions();
//     },
//     valueKey: 'RegionId',
//     schema: z.object({
//       RegionId: z.string().describe('区域'),
//       RegionName: z.string().describe('区域名称'),
//     }),
//   })
//   .meta()
// );
// output:
// region: region desc
// region2: undefined

const cli = Cli.create(() => {
  const project = Project.of({name: "test"});

  return {
    project: project,
    varsSchema: createVarsSchema,
    apply: async (context) => {
      const project = context.project;
      const vars = context.vars;

      console.log("created vpc")
      console.log("created subnet")
      console.log("created cvmInstance1")
      console.log("project:", project.resourceInstances.map(e => e.name))
    },
  }
})

cli.rootCommand.parse(process.argv);
