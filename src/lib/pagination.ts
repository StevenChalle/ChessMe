/** Rows of `page` (0-based) when showing `pageSize` per page. */
export function pageSlice<T>(rows: T[], page: number, pageSize: number): T[] {
  return rows.slice(page * pageSize, (page + 1) * pageSize)
}
