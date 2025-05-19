// noinspection JSUnusedGlobalSymbols
import {Config, Project} from "@qpa/core";
import {TencentCloudPlannedFactory, TencentCloudProvider} from "../../src/providers/tencent_cloud/index.js";
import {allowServices} from "../../src/providers/tencent_cloud/default.js";


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