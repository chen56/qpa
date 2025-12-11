// noinspection JSUnusedAssignment,PointlessBooleanExpressionJS

import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {VpcState} from "../src";
import {TextFixture} from "./fixture.ts";
import {ResourceInstance} from "@planc/core";

describe('vpc_vpc', () => {
  const fixture = TextFixture.of();
  const {tc, project} = fixture;

  beforeEach(async () => {
    await fixture.reset();
  })
  afterEach(async () => {
    await fixture.reset();
  })

  it('vpc up', {timeout: 15000}, async () => {
    await project.up(async _ => {
      const vpc = await tc.vpc.vpc({
        name: "vpc1",
        spec: {
          Region: "ap-guangzhou",
          VpcName: "test-vpc",
          CidrBlock: '10.0.0.0/16',
        }
      });
      expect(project.resources.length).toBe(1);
      expect(project.resources[0]).toBe(vpc);

      expect(vpc.actualInstance).toMatchObject({
        name: "vpc1",
        state: {
          Region: "ap-guangzhou",
          VpcName: "test-vpc",
          CidrBlock: '10.0.0.0/16',
          VpcId: vpc.state.VpcId,
        }
      } as ResourceInstance<VpcState>);


    });
  });

});
