import {Project, ProjectProps} from "@qpa/core";
import {TencentCloud} from "../../src/factory.ts";
import * as dotenv from 'dotenv';
import * as dotenvExpand from 'dotenv-expand';
import * as console from "node:console";
// 首先加载 .env ,存放SECRET_ID等
const myEnv = dotenv.config();
// 然后使用 dotenvExpand.expand() 来处理变量扩展
// 它会修改 process.env，并返回一个包含所有扩展后变量的对象
dotenvExpand.expand(myEnv);


interface MyVars {
  region: string,
  zone: string;
  instanceType: string;
  imageId: string;
}




interface ProjectRuntimeProps<Vars, Setup> {
  project: ProjectProps;

  setup(project: Project): Setup;

  apply(project: Project, vars: Vars, setup: Setup): Promise<void>;
}

class ProjectRuntime<Args, Setup> {
  private readonly _apply: { (project: Project, vars: Args, setup: Setup): Promise<void> };
  private readonly project: Project;
  private readonly _setup: Setup;
  constructor(props: ProjectRuntimeProps<Args, Setup>) {
    this.project = Project.of(props.project);
    this._setup = props.setup(this.project);
    this._apply = props.apply
  }
  async apply(args: Args): Promise<void> {
    await this.project.apply(async (project: Project) => {
      await this._apply(project, args, this._setup);
    })
  }
  async destroy(): Promise<void> {
    await this.project.refresh();
    for (const resourceInstance of this.project.resourceInstances) {
      console.log(`destroy ${resourceInstance.resourceType.name} ${resourceInstance.name}`)
    }
    await this.project.destroy();
  }
  async refresh(): Promise<void> {
    await this.project.refresh();
  }
}


class QPA {
  static declare<Args, Factory>(props: ProjectRuntimeProps<Args, Factory>): ProjectRuntime<Args, Factory> {
    return new ProjectRuntime(props);
  }
}

const runtime=QPA.declare({
  project: {name: "test"},
  setup: (project: Project) => {
    const tc = new TencentCloud(project, {
      credential: {
        secretId: process.env.TENCENTCLOUD_SECRET_ID!,
        secretKey: process.env.TENCENTCLOUD_SECRET_KEY!,
      },
    });
    return {
      tc: tc,
    };
  },
  apply: async (project: Project, vars: MyVars, {tc}: { tc: TencentCloud }) => {
    const vpc = await tc.vpc.vpc({
      name: "test-vpc1",
      spec: {
        Region: vars.region,
        VpcName: "test-vpc",
        CidrBlock: '10.0.0.0/16',
      }
    });
    console.log("created vpc:", vpc.actualInstance.toJson())
    console.log("project:", project.resourceInstances.map(e => e.name))

    const subnet = await tc.vpc.subnet({
      name: "test-subnet1",
      spec: {
        Region: vars.region,
        Zone: vars.zone,
        VpcId: vpc.actualInstance.state.VpcId!,
        SubnetName: "test-subnet",
        CidrBlock: '10.0.1.0/24',
      }
    });
    console.log("created subnet:", subnet.actualInstance.toJson())

    const cvmInstance1 = await tc.cvm.instance({
        name: "cvmInstance1",
        spec: {
          Region: vars.region,
          Placement: {
            Zone: subnet.actualInstance.state.Zone!,
          },
          InstanceChargeType: "SPOTPAID",
          InstanceType: vars.instanceType,
          ImageId: vars.imageId,
          InstanceName: "test-cvm-instance1",
          VirtualPrivateCloud: {
            VpcId: vpc.actualInstance.state.VpcId!,
            SubnetId: subnet.actualInstance.state.SubnetId!,
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
    console.log("project:", project.resourceInstances.map(e => e.name))
  }
});

const myVars: MyVars = {
  region: "ap-guangzhou",
  zone: "ap-guangzhou-7",
  instanceType: "SA2.MEDIUM2",// 选最便宜的机型
  imageId: "img-mmytdhbn",//Ubuntu Server 24.04 LTS 64bit
};
await runtime.apply(myVars);
await runtime.destroy();
