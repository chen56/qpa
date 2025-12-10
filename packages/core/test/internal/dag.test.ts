import {expect, test, describe} from 'vitest'

import {topo_sort} from '../../src/internal/_common.ts'; // 导入你的函数和枚举


describe('topologicalSortDFS (with string node types)', () => {

  describe('正常拓扑', () => {

    // --- 正常排序场景 ---

    test('should correctly sort a simple linear dependency of services', () => {
      // LoadBalancer -> VM -> Database
      // 销毁顺序: LoadBalancer -> VM -> Database (拓扑排序结果: Database, VM, LoadBalancer)
      const dependencies = new Map<string, string[]>([
        ['LoadBalancer', ['VM']],
        ['VM', ['Database']],
      ]);
      const sorted = topo_sort(dependencies);
      expect(sorted).toStrictEqual(['LoadBalancer', 'VM', 'Database']);
    });

    test('should not throw for a valid diamond dependency in microservices', () => {
      //         +-----------+
      //         |  WebApp   |
      //         +-----------+
      //           /     \
      //          /       \
      //         V         V
      // +-------------+ +--------------------+
      // | API_Service | | Database_Service |
      // +-------------+ +--------------------+
      //          \         /
      //           \       /
      //           V     V
      //         +---------------+
      //         | Caching_Layer |
      //         +---------------+
      const dependencies = new Map<string, string[]>([
        ['WebApp', ['API_Service', 'Database_Service']],
        ['API_Service', ['Caching_Layer']],
        ['Database_Service', ['Caching_Layer']],
      ]);
      const sorted = topo_sort(dependencies);
      // 预期顺序可以是 ["WebApp", "Database_Service", "API_Service", "Caching_Layer"]
      // 或           ["WebApp", "API_Service", "Database_Service", "Caching_Layer"]
      expect(sorted).toStrictEqual(["WebApp", "Database_Service", "API_Service", "Caching_Layer"]);
    });

  });

  describe("边界", () => {

    // --- 边界情况 ---
    test('should return an empty array for an empty dependency map', () => {
      const dependencies = new Map<string, string[]>();
      const sorted = topo_sort(dependencies);
      expect(sorted).toEqual([]);
    });

    test('should return the node itself for a single resource with no dependencies', () => {
      const dependencies = new Map<string, string[]>([
        ['Standalone_Function', []],
      ]);
      const sorted = topo_sort(dependencies);
      expect(sorted).toEqual(['Standalone_Function']);
    });

    test('should correctly sort with multiple disconnected service components', () => {
      // Frontend -> Backend
      // Analytics -> DataLake
      const dependencies = new Map<string, string[]>([
        ['Backend_Service', ['Frontend_Service']],
        ['DataLake_Storage', ['Analytics_Dashboard']],
      ]);
      const sorted = topo_sort(dependencies);
      expect(sorted).toStrictEqual(["DataLake_Storage", "Analytics_Dashboard", "Backend_Service", "Frontend_Service",]);
    });

    test('should handle resources with no dependencies properly (they should appear first)', () => {
      const dependencies = new Map<string, string[]>([
        ['Application_Server', ['Database_Instance']],
        ['CDN_Distribution', []], // CDN没有依赖
      ]);
      const sorted = topo_sort(dependencies);
      expect(sorted).toStrictEqual(["CDN_Distribution", "Application_Server", "Database_Instance",]);
    });

  })

  describe('异常检测', () => {

    // --- 循环检测场景 (最重要的测试) ---
    test('should throw an error for a direct cyclic dependency between two services', () => {
      // ServiceA -> ServiceB -> ServiceA
      const dependencies = new Map<string, string[]>([
        ['ServiceA', ['ServiceB']],
        ['ServiceB', ['ServiceA']],
      ]);
      expect(() => topo_sort(dependencies)).toThrow('Cyclic dependency detected involving: ServiceB -> ServiceA');
    });

    test('should throw an error for a longer cyclic dependency chain', () => {
      // ComponentX -> ComponentY -> ComponentZ -> ComponentX
      const dependencies = new Map<string, string[]>([
        ['ComponentX', ['ComponentY']],
        ['ComponentY', ['ComponentZ']],
        ['ComponentZ', ['ComponentX']],
      ]);
      expect(() => topo_sort(dependencies)).toThrow(/Cyclic dependency detected/);
    });

    test('should throw an error for a self-loop (resource depending on itself)', () => {
      // Self_Loop_Service -> Self_Loop_Service
      const dependencies = new Map<string, string[]>([
        ['Self_Loop_Service', ['Self_Loop_Service']],
      ]);
      expect(() => topo_sort(dependencies)).toThrow(/Cyclic dependency detected/);
    });

  });
})
