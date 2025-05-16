// noinspection JSUnusedAssignment,PointlessBooleanExpressionJS

import {describe, expect, it} from "vitest";

describe('study undefined', () => {
    it('可选链操作符（Optional Chaining Operator）返回值类型：T|undefined', () => {
        let r: Array<string> | undefined;
        expect(r?.length).toBe(undefined);
    });
});
