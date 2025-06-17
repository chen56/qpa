import {Project, ProjectProps} from "@qpa/core";
import {TencentCloud} from "../../src/factory.ts";
import * as dotenv from 'dotenv';
import * as dotenvExpand from 'dotenv-expand';
import * as console from "node:console";
import {Cli} from "@qpa/cli";
import {z} from "zod/v4";
// 首先加载 .env ,存放SECRET_ID等
const myEnv = dotenv.config();
// 然后使用 dotenvExpand.expand() 来处理变量扩展
// 它会修改 process.env，并返回一个包含所有扩展后变量的对象
dotenvExpand.expand(myEnv);

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
      .qpa$optionTable({
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
      .qpa$optionTable({
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

const cli=Cli.create(()=>{
  const project=Project.of({name: "test"});
  const tc = new TencentCloud(project, {
    credential: {
      secretId: process.env.TENCENTCLOUD_SECRET_ID!,
      secretKey: process.env.TENCENTCLOUD_SECRET_KEY!,
    },
  });

  return {
    project:project,
    varsSchema:createVarsSchema,
    apply:async (context) => {
      const project=context.project;
      const vars=context.vars;

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
  }
})

cli.rootCommand.parse(process.argv);
