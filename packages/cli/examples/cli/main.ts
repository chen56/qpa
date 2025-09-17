import {Project} from "@qpa/core";
import * as console from "node:console";
import * as z from "zod";
import {Cli} from "../../src";
import {VarUI, VariableFactory} from "../../src/zod_ext.ts";

/*
 * 模仿一个QPA项目
 */

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
  return new Promise(resolve => setTimeout(() => resolve([
    {RegionId: 'ap-guangzhou', RegionName: '华南地区(广州)'},
    {RegionId: 'ap-shanghai', RegionName: '华东地区(上海)'},
  ]), 500));
}

async function fetchZonesByRegion(regionId: string): Promise<ZoneApiData[]> {
  return new Promise(resolve => setTimeout(() => {
    if (regionId === 'ap-guangzhou') {
      resolve([
        {ZoneId: 'ap-guangzhou-7', ZoneName: '广州七区', RegionId: 'ap-guangzhou'},
        {ZoneId: 'ap-guangzhou-6', ZoneName: '广州六区', RegionId: 'ap-guangzhou'},
      ]);
    } else if (regionId === 'ap-shanghai') {
      resolve([
        {ZoneId: 'ap-shanghai-5', ZoneName: '上海五区', RegionId: 'ap-shanghai'},
        {ZoneId: 'ap-shanghai-4', ZoneName: '上海四区', RegionId: 'ap-shanghai'},
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


const VarsSchema = z.object({
    region: z.string()
      .meta({title: "选择区域", description: "如果您在中国附近, 要快就选香港,要用gemini、chatgpt就选硅谷、弗吉尼亚"})
      .refine(async (val) => {
          const availableRegions = await fetchRegions(); // 直接调用 API 获取数据
          return availableRegions.some(opt => opt.RegionId === val)
        }, "无效区域(region)"
      )
    ,
    zone: z.string()
      .meta({title: "可用区"})
    ,
    instanceType: z.string()
      .meta({title: "实例类型"})
    ,
    imageId: z.string()
      .meta({title: "镜像"})
    ,
  })
    .refine(async val => {
        if (!val.region) {
          return false;
        }
        const availableZones = await fetchZonesByRegion(val.region); // 依赖 data.region
        return availableZones.some(opt => opt.ZoneId === val.zone)
      },
      {path: ["zone"], error: "无效可用区(zone)"}
    )
    .refine(async val => {
        if (!val.region) {
          return false;
        }
        const types = await fetchInstanceTypesByRegion(val.region); // 依赖 data.region
        return types.map(e => e.InstanceType).includes(val.instanceType)
      },
      {path: ["instanceType"], error: "无效实例类型(instanceType)"}
    )
    .refine(async (val) => {
        if (!val.region) {
          return false;
        }
        const imageIds = await fetchImageIdsByRegion(val.region); // 依赖 data.region
        return imageIds.map(e => e.ImageId).includes(val.imageId)
      },
      {path: ["imageId"], error: "无效镜像(imageId)"}
    )
;

type MyVars = z.infer<typeof VarsSchema>;
let varsUI: Map<z.ZodType, VarUI> = new Map();
varsUI.set(VarsSchema.shape.region, VariableFactory.createOptionTable({
  query: async (_: Partial<MyVars>): Promise<RegionApiData[]> => fetchRegions(),
  getValue: (data) => data.RegionId,
}))
varsUI.set(VarsSchema.shape.zone, VariableFactory.createOptionTable({
  query: async (vars: Partial<MyVars>) => vars.region ? fetchZonesByRegion(vars.region) : [],
  getValue: (row) => row.ZoneId,
}))
varsUI.set(VarsSchema.shape.instanceType, VariableFactory.createOptionTable({
  query: async (vars: Partial<MyVars>) => vars.region ? fetchInstanceTypesByRegion(vars.region) : [],
  getValue: (row) => row.InstanceType,
}))
varsUI.set(VarsSchema.shape.imageId, VariableFactory.createOptionTable({
  query: async (vars: Partial<MyVars>) => vars.region ? fetchImageIdsByRegion(vars.region) : [],
  getValue: (row) => row.ImageId,
}))

await Cli.run<MyVars>({
  workdir: __dirname,
  project: Project.of({name: "test"}),
  varsSchema: VarsSchema,
  varsUI: varsUI,
  apply: async (context) => {
    const project = context.project;
    const vars = context.vars;
    console.log("load vars:", JSON.stringify(vars))
    console.log("created vpc")
    console.log("created subnet")
    console.log("created cvmInstance1")
    console.log("project:", project.resourceInstances.map(e => e.name))
  },
})