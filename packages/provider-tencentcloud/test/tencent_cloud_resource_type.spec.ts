// noinspection JSUnusedAssignment,PointlessBooleanExpressionJS

import {describe, expect, it} from "vitest";
import {TencentCloudType} from "../src/provider.ts";

describe('TencentCloudType', () => {
    it('_name', () => {
      expect(TencentCloudType._name("cvm","instance")).toBe("cvm_instance")
      expect(TencentCloudType._name(undefined,undefined)).toBe("_")
    });
});
