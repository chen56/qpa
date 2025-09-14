/**
 * 依赖集合排序：不允许循环依赖
 */
export function topologicalSortDFS<T>(dependenciesTree: Map<T, T[]>): T[] {
  const adjList = new Map<T, Set<T>>();
  const allNodes = new Set<T>();

  // 收集所有节点并初始化邻接表
  for (const [dependent, dependencies] of dependenciesTree.entries()) {
    allNodes.add(dependent);
    if (!adjList.has(dependent)) {
      adjList.set(dependent, new Set<T>());
    }
    for (const dependency of dependencies) {
      allNodes.add(dependency);
      adjList.get(dependent)!.add(dependency);
      if (!adjList.has(dependency)) {
        adjList.set(dependency, new Set<T>());
      }
    }
  }

  const visited = new Set<T>();
  const visiting = new Set<T>();
  const result: T[] = [];

  const dfs = (node: T) => {
    visiting.add(node);
    visited.add(node);

    const neighbors = adjList.get(node) || new Set<T>();
    for (const neighbor of neighbors) {
      if (visiting.has(neighbor)) {
        // 由于 T 可以是任何类型，使用 String(node) 来确保错误消息可读
        throw new Error(`Cyclic dependency detected involving: ${String(node)} -> ${String(neighbor)}`);
      }
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      }
    }

    visiting.delete(node);
    result.unshift(node);
  };

  for (const node of allNodes) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  return result;
}