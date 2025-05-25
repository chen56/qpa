import 'dotenv/config';
import {PlannedProject, Config} from "@qpa/core";
import {Cli} from "@qpa/cli";
import {TencentCloud} from "src/providers/tencent_cloud/factory.ts";

const cli = Cli.of(Config.directMode({
    project: {
        name: "test",
    },
    setup: async (project: PlannedProject): Promise<void> => {
        const tc = TencentCloud.direct({
            project: project,
            credential: {
                secretId: process.env.TENCENTCLOUD_SECRET_ID!,
                secretKey: process.env.TENCENTCLOUD_SECRET_KEY!,
            },
        });
        const vpc = await tc.vpc.vpc({
            name: "main",
            spec: {
                Region: "ap-guangzhou",
                VpcName: "test-vpc",
                CidrBlock: '10.0.0.0/16',
            }
        });
        console.log("vpc:", vpc.spec, vpc.status)
    }
}));
// --- 解析命令行参数 ---
// parse() 会解析 process.argv
// 如果有子命令匹配，会触发相应子命令的 action handler
// 如果没有子命令匹配，或者有帮助/版本等选项，commander 会处理并可能退出
cli.rootCommand.parse(process.argv);