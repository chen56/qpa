// src/types.ts

// 定义全局选项的接口

export async function* queryPage<T>(query: (offset: number) => Promise<{
    // 总记录数，可以不提供
    totalCount?: number;
    // 当前页的记录
    rows: Array<T>;
    // 每页最大记录数
    limit:number;
}>) {
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
        const page = await query(offset);
        const rows:T[] = page.rows??[];

        for (const row of rows) {
            yield row;
        }
        offset = offset+rows.length;

        if (page.totalCount){
            hasMore = offset<page.totalCount;
        }else{
            hasMore = rows.length===page.limit;
        }
    }
}
