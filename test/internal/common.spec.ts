// noinspection JSUnusedAssignment,PointlessBooleanExpressionJS
// noinspection JSUnusedAssignment,PointlessBooleanExpressionJS

import {describe, expect, it} from "vitest";
import {Arrays} from "../../packages/provider-tencentcloud/src/internal/_common.ts";

describe('Arrays.chunk', () => {
  it('should chunk an array into smaller arrays of a given size', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(Arrays.chunk(arr, 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
  it('should handle an empty array', () => {
    const arr: number[] = [];
    expect(Arrays.chunk(arr, 3)).toEqual([]);
  });

  it('should handle a chunk size larger than the array length', () => {
    const arr = [1, 2];
    expect(Arrays.chunk(arr, 5)).toEqual([[1, 2]]);
  });

  it('should handle a chunk size that perfectly divides the array', () => {
    const arr = [1, 2, 3, 4, 5, 6];
    expect(Arrays.chunk(arr, 3)).toEqual([[1, 2, 3], [4, 5, 6]]);
  });

  it('should throw an error for non-positive chunk size', () => {
    const arr = [1, 2, 3];
    expect(() => Arrays.chunk(arr, 0)).toThrow('Chunk size must be a positive number.');
    expect(() => Arrays.chunk(arr, -1)).toThrow('Chunk size must be a positive number.');
  });
});
