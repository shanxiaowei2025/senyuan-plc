const searchParameters: Record<string, string> = {
  modelD2040: 'model', cageNodesD2044: 'cageNodes', cageNumD2048: 'cageNum',
  spindleAngleD4012: 'angle', actualRebarLength: 'actualRebarLength',
  theoreticalLength: 'theoreticalLength', difference: 'difference', totalNodesD2052: 'totalNodes',
  createdAtStart: 'createdAtStart', createdAtEnd: 'createdAtEnd',
  updatedAtStart: 'updatedAtStart', updatedAtEnd: 'updatedAtEnd'
};

export function buildSyPlcSearchParams(fields: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [field, parameter] of Object.entries(searchParameters)) {
    const value = fields[field]?.trim();
    if (value) params.set(parameter, value);
  }
  if (params.size) params.set('searchMode', 'contains');
  return params;
}

// 页数再多也只生成当前页附近的按钮。
export function getVisiblePages(currentPage: number, totalPages: number): (number | string)[] {
  const pages = new Set([1, totalPages]);
  for (let page = Math.max(1, currentPage - 2); page <= Math.min(totalPages, currentPage + 2); page++) {
    pages.add(page);
  }
  const result: (number | string)[] = [];
  let previous = 0;
  for (const page of [...pages].sort((a, b) => a - b)) {
    if (page < 1) continue;
    if (previous && page > previous + 1) result.push(`gap-${page}`);
    result.push(page);
    previous = page;
  }
  return result;
}
