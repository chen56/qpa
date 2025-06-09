// noinspection JSUnusedAssignment,PointlessBooleanExpressionJS

import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {VpcState} from "../src";
import {TextFixture} from "./fixture.ts";

describe('vpc', () => {
  const fixture = TextFixture.of();
  const {tc, project} = fixture;

  beforeEach(async () => {
    await fixture.reset();
  })
  afterEach(async ()=>{
    await fixture.reset();
  })

  it('vpc apply', async () => {
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
