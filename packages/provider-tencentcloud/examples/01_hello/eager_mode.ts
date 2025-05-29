import {Project} from "@qpa/core";
import {TencentCloud} from "../../src/factory.ts";
import * as dotenv from 'dotenv';
import * as dotenvExpand from 'dotenv-expand';
// 首先加载 .env ,存放SECRET_ID等
const myEnv = dotenv.config();
// 然后使用 dotenvExpand.expand() 来处理变量扩展
// 它会修改 process.env，并返回一个包含所有扩展后变量的对象
dotenvExpand.expand(myEnv);

const project = Project.of({name: "test"});

const tc = TencentCloud.createFactory(project, {
  credential: {
    secretId: process.env.TENCENTCLOUD_SECRET_ID!,
    secretKey: process.env.TENCENTCLOUD_SECRET_KEY!,
  },
});
await project.refresh();
await project.destroy();
console.log('list all resource');

for (const r of project.resourceInstances) {
  console.log('project.resourceInstances[%s]: %O', project.resourceInstances.length, {
    key: r.name,
    state: r.state,
  });
}
console.log('list all resource end');

await project.apply(async project => {
  const vpc = await tc.vpc.vpc({
    name: "test-vpc1",
    spec: {
      Region: "ap-guangzhou",
      VpcName: "test-vpc",
      CidrBlock: '10.0.0.0/16',
    }
  });
  console.log("created vpc:", vpc.actualInstance.toJson())
  console.log("project:", project.resourceInstances.map(e => e.name))

  const subnet = await tc.vpc.subnet({
    name: "test-subnet1",
    spec: {
      Region: "ap-guangzhou",
      Zone: "ap-guangzhou-1",
      VpcId: vpc.actualInstance.state.VpcId!,
      SubnetName: "test-subnet",
      CidrBlock: '10.0.1.0/24',
    }
  });
  console.log("created subnet:", subnet.actualInstance.toJson())
});
// exit(0);

