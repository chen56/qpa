// noinspection JSUnusedAssignment,PointlessBooleanExpressionJS

import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {TencentCloud} from "../src/factory.ts";
import {Project} from "@qpa/core";
import * as dotenv from 'dotenv';
import * as dotenvExpand from 'dotenv-expand';
import {VpcState} from "@qpa/provider-tencentcloud";
// 首先加载 .env 文件中的原始键值对
// dotenv.config() 返回一个包含 parsed 属性的对象，其中是解析后的键值对
const myEnv = dotenv.config();
// 然后使用 dotenvExpand.expand() 来处理变量扩展
// 它会修改 process.env，并返回一个包含所有扩展后变量的对象
dotenvExpand.expand(myEnv);

class TextFixture {
  readonly project = Project.of({name: "unit_test"});
  readonly tc = TencentCloud.createFactory(this.project, {
    credential: {
      secretId: process.env.TENCENTCLOUD_SECRET_ID!,
      secretKey: process.env.TENCENTCLOUD_SECRET_KEY!,
    },
  });
  static of(): TextFixture {
    return new TextFixture();
  }

  async before() {
    await this.project.destroy();
    expect(this.project.resourceInstances.length).toBe(0);
    await this.project.refresh();
    expect(this.project.resourceInstances.length).toBe(0);
  }
  async after() {

  }


}

describe('vpc apply', () => {
  const fixture = TextFixture.of();
  const {tc, project} = fixture;

  beforeEach(async () => {
    await fixture.before();
  })
  afterEach(async ()=>{
    await fixture.after();
  })

  it('Eager mode destroy', async () => {
    await project.apply(async _ => {
      const vpc = await tc.vpc.vpc({
        name: "vpc1",
        spec: {
          Region: "ap-guangzhou",
          VpcName: "test-vpc",
          CidrBlock: '10.0.0.0/16',
        }
      });
      await project.refresh();
      expect(project.resourceInstances.length).toBe(1);
      expect(project.resourceInstances[0].name).toBe("vpc1");
      expect((project.resourceInstances[0].state as VpcState).VpcId).toBe(vpc.actualInstance.state.VpcId);

    });
  }, {timeout: 15000});

});
