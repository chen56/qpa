import {Project} from "@qpa/core";
import {Cli} from "@qpa/cli";
import {TencentCloud} from "../../src/factory.ts";
import * as dotenv from 'dotenv';
import * as dotenvExpand from 'dotenv-expand';
import * as console from "node:console";
import {z} from "zod/v4";
import {VariableFactory, VarUI} from "@qpa/cli";
// 首先加载 .env ,存放SECRET_ID等
const myEnv = dotenv.config();
// 然后使用 dotenvExpand.expand() 来处理变量扩展
// 它会修改 process.env，并返回一个包含所有扩展后变量的对象
dotenvExpand.expand(myEnv);


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


// 1. 公共类型定义
// 定义最终表单数据结构
interface MyVars {
  region: string;
  zone: string;
  instanceType: string;
  imageId: string;
}

const VarsSchema = z.object({
    region: z.string()
      .refine(async (val) => {
          const availableRegions = await fetchRegions(); // 直接调用 API 获取数据
          return availableRegions.some(opt => opt.RegionId === val)
        }, "无效区域(region)"
      )
      .meta({title: "选择区域", description: "如果您在中国附近, 要快就选香港,要用gemini、chatgpt就选硅谷、弗吉尼亚"})
    ,
    zone: z.string()
      .meta({title: "选择可用区"})
    ,
    instanceType: z.string()
      .meta({title: "选择实例类型"})
    ,
    imageId: z.string()
      .meta({title: "选择镜像"})
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
const varsUI = new Map<z.ZodType, VarUI>();
varsUI.set(VarsSchema.shape.region, VariableFactory.createOptionTable({
  query: async (_: Partial<MyVars>) => fetchRegions(),
  getValue: (row: RegionApiData) => row.RegionId,
  optionSchema: z.object({
    RegionId: z.string().meta({title: "区域"}),
    RegionName: z.string().meta({title: "区域名称"}),
  }),
}))
varsUI.set(VarsSchema.shape.zone, VariableFactory.createOptionTable({
  query: async (vars: Partial<MyVars>) => vars.region ? fetchZonesByRegion(vars.region) : [],
  getValue: (row: ZoneApiData) => row.ZoneId,

  optionSchema: z.object({
    ZoneId: z.string().meta({title: "可用区"}),
    ZoneName: z.string().meta({title: "可用区名称"}),
    RegionId: z.string().meta({title: "区域"}),
  }),
}))
varsUI.set(VarsSchema.shape.instanceType, VariableFactory.createOptionTable({
  query: async (vars: Partial<MyVars>) => vars.region ? fetchInstanceTypesByRegion(vars.region) : [],
  getValue: (row: InstanceTypeData) => row.InstanceType,
  optionSchema: z.object({
    InstanceType: z.string().meta({title: "实例类型"}),
  }),
}))
varsUI.set(VarsSchema.shape.imageId, VariableFactory.createOptionTable({
  query: async (vars: Partial<MyVars>) => vars.region ? fetchImageIdsByRegion(vars.region) : [],
  getValue: (row: ImageIdData) => row.ImageId,
  optionSchema: z.object({
    ImageId: z.string().meta({title: "镜像ID"}),
  }),
}))

const project = Project.of({name: "test"});
const tc = new TencentCloud(project, {
  credential: {
    secretId: process.env.TENCENTCLOUD_SECRET_ID!,
    secretKey: process.env.TENCENTCLOUD_SECRET_KEY!,
  },
});

await Cli.run<MyVars>({
  workdir: __dirname,
  project: project,
  varsSchema: VarsSchema,
  varsUI:varsUI,

  apply: async (context) => {
    const project = context.project;
    const vars = context.vars;

    const vpc = await tc.vpc.vpc({
      name: "test-vpc1",
      spec: {
        Region: vars.region,
        VpcName: "test-vpc",
        CidrBlock: '10.0.0.0/16',
      }
    });
    console.log("created vpc:", vpc.actualInstance.toJson())
    console.log("project:", project.resourceInstances.map(e => e.name))

    const subnet = await tc.vpc.subnet({
      name: "test-subnet1",
      spec: {
        Region: vars.region,
        Zone: vars.zone,
        VpcId: vpc.actualInstance.state.VpcId!,
        SubnetName: "test-subnet",
        CidrBlock: '10.0.1.0/24',
      }
    });
    console.log("created subnet:", subnet.actualInstance.toJson())

    const cvmInstance1 = await tc.cvm.instance({
        name: "cvmInstance1",
        spec: {
          Region: vars.region,
          Placement: {
            Zone: subnet.actualInstance.state.Zone!,
          },
          InstanceChargeType: "SPOTPAID",
          InstanceType: vars.instanceType,
          ImageId: vars.imageId,
          InstanceName: "test-cvm-instance1",
          VirtualPrivateCloud: {
            VpcId: vpc.actualInstance.state.VpcId!,
            SubnetId: subnet.actualInstance.state.SubnetId!,
          },
          SystemDisk: {
            DiskType: "CLOUD_PREMIUM",
            DiskSize: 20,
          },
          InternetAccessible: {
            InternetChargeType: "TRAFFIC_POSTPAID_BY_HOUR",
            InternetMaxBandwidthOut: 1,
            PublicIpAssigned: true,
          }
        },
      }
    );
    console.log("created cvmInstance1:", cvmInstance1, cvmInstance1.actualInstance.toJson())
    console.log("project:", project.resourceInstances.map(e => e.name))
  },
})

