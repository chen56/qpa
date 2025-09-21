import {Project} from "@qpa/core";
import {Cli} from "@qpa/cli";
import {TencentCloud} from "../../src/factory.ts";
import * as dotenv from 'dotenv';
import * as dotenvExpand from 'dotenv-expand';
import * as console from "node:console";
import * as z from "zod";
import {VariableFactory, VarUI} from "@qpa/cli";
import {
    Image,
    InstanceFamilyConfig,
    InstanceTypeConfig,
    RegionInfo,
    ZoneInfo
} from "tencentcloud-sdk-nodejs/tencentcloud/services/cvm/v20170312/cvm_models";


// 首先加载 .env ,存放SECRET_ID等
const myEnv = dotenv.config();
// 然后使用 dotenvExpand.expand() 来处理变量扩展
// 它会修改 process.env，并返回一个包含所有扩展后变量的对象
dotenvExpand.expand(myEnv);

const project = Project.of({name: "examples1"});
const tc = new TencentCloud(project, {
    credential: {
        secretId: process.env.TENCENTCLOUD_SECRET_ID!,
        secretKey: process.env.TENCENTCLOUD_SECRET_KEY!,
    },
});


async function fetchRegions(): Promise<RegionInfo[]> {
    const response = await tc.cvm.getClient("ap-shanghai").DescribeRegions()
    return (response.RegionSet || [])
        .filter(e => e.RegionState == "AVAILABLE")
        ;
}

async function fetchZones(region: string): Promise<ZoneInfo[]> {
    const response = await tc.cvm.getClient(region).DescribeZones()
    return (response.ZoneSet || [])
        .filter(e => e.ZoneState === "AVAILABLE")
}

async function fetchInstanceFamilies(region: string): Promise<InstanceFamilyConfig[]> {
    const response = await tc.cvm.getClient(region).DescribeInstanceFamilyConfigs()
    return (response.InstanceFamilyConfigSet || [])
}


async function fetchInstanceTypes(region: string): Promise<InstanceTypeConfig[]> {
    const response = await tc.cvm.getClient(region).DescribeInstanceTypeConfigs({})
    return (response.InstanceTypeConfigSet || [])
}

async function fetchImageIds(region: string): Promise<Image[]> {
    const response = await tc.cvm.getClient(region).DescribeImages({})
    return (response.ImageSet || [])
}

const VarsSchema = z.object({
        region: z.string()
            .meta({title: "选择区域", description: "如果您在中国附近, 要快就选香港,要用gemini、chatgpt就选硅谷、弗吉尼亚"})
            .refine(async (val) => {
                    const availableRegions = await fetchRegions(); // 直接调用 API 获取数据
                    return availableRegions.some(opt => opt.Region === val)
                }, "无效区域(region)"
            )
        ,
        zone: z.string()
            .meta({title: "选择可用区(zone)"})
        ,
        instanceFamily: z.string()
            .meta({title: "选择实例族"})
        ,
        instanceType: z.string()
            .meta({title: "选择实例类型(instanceType)"})
        ,
        imageId: z.string()
            .meta({title: "选择镜像(imageId)"})
        ,
    })
        .refine(async val => {
                if (!val.region) {
                    return false;
                }
                const availableZones = await fetchZones(val.region); // 依赖 data.region
                return availableZones.some(opt => opt.Zone === val.zone)
            },
            {path: ["zone"], error: "无效可用区(zone)"}
        )
        .refine(async val => {
                if (!val.region) {
                    return false;
                }
                const availableFamilies = await fetchInstanceFamilies(val.region); // 依赖 data.region
                return availableFamilies.some(opt => opt.InstanceFamily === val.instanceFamily)
            },
            {path: ["instanceFamily"], error: "无效实例簇(InstanceFamily)"}
        )
        .refine(async val => {
                if (!val.region) {
                    return false;
                }
                const types = await fetchInstanceTypes(val.region); // 依赖 data.region
                return types.map(e => e.InstanceType).includes(val.instanceType)
            },
            {path: ["instanceType"], error: "无效实例类型(instanceType)"}
        )
        .refine(async (val) => {
                if (!val.region) {
                    return false;
                }
                const imageIds = await fetchImageIds(val.region); // 依赖 data.region
                return imageIds.map(e => e.ImageId).includes(val.imageId)
            },
            {path: ["imageId"], error: "无效镜像(imageId)"}
        )
;

type Vars = z.infer<typeof VarsSchema>;

const varsUI = new Map<z.ZodType, VarUI>([
    [VarsSchema.shape.region, VariableFactory.createOptionTable({
        query: async (_: Partial<Vars>) => fetchRegions(),
        getValue: (row: RegionInfo) => row.Region,
        columns: ["Region", "RegionName"],
    })],
    [VarsSchema.shape.zone, VariableFactory.createOptionTable({
        query: async (vars: Partial<Vars>) => vars.region ? fetchZones(vars.region) : [],
        getValue: (row) => row.Zone,
        // columns:["Zone","ZoneName"],
    })],
    [VarsSchema.shape.instanceFamily, VariableFactory.createOptionTable({
        query: async (vars: Partial<Vars>) => vars.region ? fetchInstanceFamilies(vars.region) : [],
        getValue: (row) => row.InstanceFamily,
        // columns:["InstanceFamily","InstanceFamilyName"],
    })],
    [VarsSchema.shape.instanceType, VariableFactory.createOptionTable({
        query: async (vars: Partial<Vars>) => vars.region ? fetchInstanceTypes(vars.region) : [],
        getValue: (row) => row.InstanceType,
    })],
    [VarsSchema.shape.imageId, VariableFactory.createOptionTable({
        query: async (vars: Partial<Vars>) => vars.region ? fetchImageIds(vars.region) : [],
        getValue: (row) => row.ImageId,
        columns: [
            {name: "镜像ID", getValue: (row) => row.ImageId},
            {name: "镜像名称", getValue: (row) => row.ImageName},
        ]
    })],
]);

await Cli.run<Vars>({
    workdir: __dirname,
    project: project,
    varsSchema: VarsSchema,
    varsUI: varsUI,

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
        console.log("created vpc:", JSON.stringify(vpc.state))
        console.log("project:", project.resources.map(e => e.name))

        const subnet = await tc.vpc.subnet({
            name: "test-subnet1",
            spec: {
                Region: vars.region,
                Zone: vars.zone,
                VpcId: vpc.state.VpcId!,
                SubnetName: "test-subnet",
                CidrBlock: '10.0.1.0/24',
            }
        });
        console.log("created subnet:", JSON.stringify(subnet.state))

        const cvmInstance1 = await tc.cvm.instance({
                name: "cvmInstance1",
                spec: {
                    Region: vars.region,
                    Placement: {
                        Zone: subnet.state.Zone!,
                    },
                    InstanceChargeType: "SPOTPAID",
                    InstanceType: vars.instanceType,
                    ImageId: vars.imageId,
                    InstanceName: "test-cvm-instance1",
                    VirtualPrivateCloud: {
                        VpcId: vpc.state.VpcId!,
                        SubnetId: subnet.state.SubnetId!,
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
        console.log("project:", project.resources.map(e => e.name))
    },
})

