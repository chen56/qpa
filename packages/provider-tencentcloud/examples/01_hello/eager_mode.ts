import {Project} from "@qpa/core";
import { exit } from "process";
import {TencentCloud} from "src/providers/tencent_cloud/factory.ts";
import * as dotenv from 'dotenv';
import * as dotenvExpand from 'dotenv-expand';
// 首先加载 .env 文件中的原始键值对
// dotenv.config() 返回一个包含 parsed 属性的对象，其中是解析后的键值对
const myEnv = dotenv.config();
// 然后使用 dotenvExpand.expand() 来处理变量扩展
// 它会修改 process.env，并返回一个包含所有扩展后变量的对象
dotenvExpand.expand(myEnv);

const project = Project.of({name:"test"});

const tc=TencentCloud.createFactory(project,{
  credential: {
    secretId: process.env.TENCENTCLOUD_SECRET_ID!,
    secretKey: process.env.TENCENTCLOUD_SECRET_KEY!,
  },
});
await project.refresh();
for (const r of project.resourceInstances) {
  console.log('project.resourceInstances[%s]: %O',project.resourceInstances.length,{
    key:r.name,
    state:r.state,
  });
}

await project.destroy();
await project.apply(async project=>{
  const vpc = await tc.vpc.vpc({
    name: "main",
    spec: {
      Region: "ap-guangzhou",
      VpcName: "test-vpc",
      CidrBlock: '10.0.0.0/16',
    }
  });
  console.log("vpc:", vpc.expected,vpc.actualInstance)
  console.log("project:", project.resourceInstances.map(e=>e.state))
});
exit(0);

