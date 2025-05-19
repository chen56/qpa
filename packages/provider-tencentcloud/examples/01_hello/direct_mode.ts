import 'dotenv/config';
import {Project,Config} from "@qpa/core";
import {allowServices, TencentCloudProvider} from "../../src/index.ts";
import {TencentCloudDirectFactory} from "../../src/index.ts";
// import {TencentCloudProvider} from "../../src/providers/tencent_cloud/index.js";
// import {allowServices} from "../../src/providers/tencent_cloud/default.js";
// import {TencentCloudDirectFactory} from "../../src/providers/tencent_cloud/factory.js";

export default Config.directMode({
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

        const tc = new TencentCloudDirectFactory(tencentCloudProvider);

        const vpc = await tc.vpc.vpc({
            name: "main",
            spec: {
                Region: "ap-guangzhou",
                VpcName: "test-vpc",
                CidrBlock: '10.0.0.0/16',
            }
        });
        console.log("vpc:", vpc.spec, vpc.state)
    }
});