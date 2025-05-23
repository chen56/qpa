import 'dotenv/config';
import {Project,Config} from "@qpa/core";
import {Cli} from "@qpa/cli";
import {allowServices, TencentCloudProvider} from "../../src/index.ts";
import {TencentCloudDirectFactory} from "../../src/index.ts";

const cli=Cli.of(Config.directMode({
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
}));
// --- 解析命令行参数 ---
// parse() 会解析 process.argv
// 如果有子命令匹配，会触发相应子命令的 action handler
// 如果没有子命令匹配，或者有帮助/版本等选项，commander 会处理并可能退出
cli.rootCommand.parse(process.argv);