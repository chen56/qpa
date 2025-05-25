import {EagerProject} from "@qpa/core";
import {TencentCloud} from "src/providers/tencent_cloud/factory.ts";


const tc = TencentCloud.createEagerFactory({
  scope: TencentCloud.createTagBaseScope({name: "test"}),
  credential: {
    secretId: process.env.TENCENTCLOUD_SECRET_ID!,
    secretKey: process.env.TENCENTCLOUD_SECRET_KEY!,
  },
});

const project = EagerProject.of({

  setup: async (project: EagerProject): Promise<void> => {
    const vpc = await tc.vpc.vpc({
      name: "main",
      spec: {
        Region: "ap-guangzhou",
        VpcName: "test-vpc",
        CidrBlock: '10.0.0.0/16',
      }
    });
    console.log("vpc:", vpc.spec, vpc.state)
    console.log("project:", project)
  }
});
console.log("project:",project);

// const cli = Cli.eager(project);
// --- 解析命令行参数 ---
// parse() 会解析 process.argv
// 如果有子命令匹配，会触发相应子命令的 action handler
// 如果没有子命令匹配，或者有帮助/版本等选项，commander 会处理并可能退出
// cli.rootCommand.parse(process.argv);
// 假设我们有一个对象
