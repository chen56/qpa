import 'dotenv/config';
import {TencentCloudProvider} from "@/providers/tencent_cloud/index.ts";
import {Project,Config} from "@/index.ts";
import {allowServices} from "@/providers/tencent_cloud/default.ts";
import {TencentCloudDirectFactory} from "@/providers/tencent_cloud/factory.ts";

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