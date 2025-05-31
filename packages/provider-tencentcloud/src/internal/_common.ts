// src/types.d.ts

// 定义全局选项的接口

type PageQuery<T> = (offset: number) => Promise<{
  // 总记录数，可以不提供
  totalCount?: number;
  // 当前页的记录
  rows: Array<T>;
  // 每页最大记录数
  limit: number;
}>;

export class Paging {

  /**
   * 分页查询，结果为一个集合
   */
  static async list<T>(query: PageQuery<T>): Promise<T[]> {
    const gen = Paging.generator(query);

    const result = new Array<T>();
    for await (const record of gen) {
      result.push(record);
    }
    return result;
  }

  /**
   * 分页查询，结果为生成器, 以行为单位
   */
  static async* generator<T>(query: PageQuery<T>) {
    const gen = Paging.pageGenerator(query);
    const result = new Array<T>();
    for await (const page of gen) {
      for (const row of page) {
        yield row;
      }
    }
    return result;
  }
  /**
   * 分页查询，结果为生成器, 以页为单位
   */
  static async* pageGenerator<T>(query: PageQuery<T>) {
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const page = await query(offset);
      const rows: T[] = page.rows ?? [];

      yield rows;
      offset = offset + rows.length;

      if (page.totalCount) {
        hasMore = offset < page.totalCount;
      } else {
        hasMore = rows.length === page.limit;
      }
    }
  }

}

export class Arrays {
  /**
   * 将数组切片为多个固定大小的组。
   * @param array 要切片的数组。
   * @param chunkSize 每个组的大小。
   * @returns 包含多个组的数组。
   */
  static chunk<T>(array: T[], chunkSize: number): T[][] {
    if (chunkSize <= 0) {
      throw new Error("Chunk size must be a positive number.");
    }
    const result: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      result.push(array.slice(i, i + chunkSize));
    }
    return result;
  }
}