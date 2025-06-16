// noinspection JSUnusedAssignment,PointlessBooleanExpressionJS

import {describe, expect, it} from "vitest";
import {TencentCloudResourceType} from "../src/provider.ts";

describe('TencentCloudType', () => {
    it('_name', () => {
      expect(TencentCloudResourceType._name("cvm","instance")).toBe("cvm_instance")
      expect(TencentCloudResourceType._name(undefined,undefined)).toBe("_")
    });
});
