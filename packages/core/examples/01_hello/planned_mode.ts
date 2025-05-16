// noinspection JSUnusedGlobalSymbols
import {Config, Project} from "@/index.ts";
import {TencentCloudPlannedFactory, TencentCloudProvider} from "@/providers/tencent_cloud";
import {allowServices} from "@/providers/tencent_cloud/default.ts";


export default Config.plannedMode({
    project: new Project({
        name: "test",
    }),
    setup: async (project: Project): Promise<void> => {

        const tencentCloudProvider = new TencentCloudProvider(project, {
            credential: {
                secretId: process.env.TENCENTCLOUD_SECRET_ID!,
                secretKey: process.env.TENCENTCLOUD_SECRET_KEY!,
            },
            allowedResourceServices: allowServices
        });

        const tc = new TencentCloudPlannedFactory(tencentCloudProvider);

        tc.vpc.vpc({
            name: "main",
            spec: {
                Region: "ap-guangzhou",
                VpcName: "test-vpc",
                CidrBlock: '10.0.0.0/16',
            }
        });
    }
});