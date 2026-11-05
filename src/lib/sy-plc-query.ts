import { Prisma } from '@prisma/client';

export class SyPlcQueryError extends Error {}

const numericColumns = {
  model: 'modelD2040', cageNodes: 'cageNodesD2044', cageNum: 'cageNumD2048',
  angle: 'spindleAngleD4012', actualRebarLength: 'actualRebarLength',
  theoreticalLength: 'theoreticalLength', difference: 'difference', totalNodes: 'totalNodesD2052'
} as const;

// 查询与批量删除共用条件，确保分页、导出、删除针对同一批记录。
export function buildSyPlcWhere(params: URLSearchParams): Prisma.Sql {
  const mode = params.get('searchMode') ?? 'exact';
  if (mode !== 'exact' && mode !== 'contains') throw new SyPlcQueryError('无效的搜索方式');
  const conditions: Prisma.Sql[] = [];
  for (const [parameter, column] of Object.entries(numericColumns)) {
    const value = params.get(parameter)?.trim();
    if (!value) continue;
    // 列名仅来自固定映射，所有用户输入均通过绑定参数传递。
    const field = Prisma.raw(`"${column}"`);
    if (mode === 'contains') {
      // SQLite 会把整数浮点值转成 "800.0"，去掉这个额外的小数尾部以保持页面原有匹配语义。
      conditions.push(Prisma.sql`INSTR(CASE WHEN ${field} = CAST(${field} AS INTEGER)
        THEN CAST(CAST(${field} AS INTEGER) AS TEXT) ELSE CAST(${field} AS TEXT) END, ${value}) > 0`);
    } else {
      const number = Number(value);
      if (!Number.isFinite(number)) throw new SyPlcQueryError(`${parameter} 必须是有效数值`);
      conditions.push(Prisma.sql`${field} = ${number}`);
    }
  }
  for (const column of ['createdAt', 'updatedAt']) {
    for (const boundary of ['Start', 'End']) {
      const value = params.get(`${column}${boundary}`)?.trim();
      if (!value) continue;
      const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
      const calendarDate = new Date(`${value}T00:00:00Z`);
      if (dateOnly && (!Number.isFinite(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== value)) {
        throw new SyPlcQueryError('请输入有效日期');
      }
      // 页面按北京时间显示，日期筛选也使用北京时间的一整天。
      const date = new Date(dateOnly
        ? `${value}T${boundary === 'Start' ? '00:00:00.000' : '23:59:59.999'}+08:00`
        : value);
      if (!Number.isFinite(date.getTime())) throw new SyPlcQueryError('请输入有效日期');
      const field = Prisma.raw(`"${column}"`);
      conditions.push(boundary === 'Start'
        ? Prisma.sql`${field} >= ${date.getTime()}`
        : Prisma.sql`${field} <= ${date.getTime()}`);
    }
  }
  return conditions.length ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}` : Prisma.empty;
}

export function parseSyPlcPagination(params: URLSearchParams) {
  const page = Number(params.get('page') ?? 1);
  const requestedLimit = Number(params.get('limit') ?? 50);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(requestedLimit) || requestedLimit < 1) {
    throw new SyPlcQueryError('页码和每页数量必须是正整数');
  }
  const limit = Math.min(requestedLimit, 1000);
  const skip = (page - 1) * limit;
  if (!Number.isSafeInteger(skip)) throw new SyPlcQueryError('页码超出范围');
  return { page, limit, skip };
}

export function applySyPlcCursor(where: Prisma.Sql, cursorValue: string | null): Prisma.Sql {
  if (!cursorValue) return where;
  let cursor;
  try { cursor = JSON.parse(cursorValue); }
  catch { throw new SyPlcQueryError('无效的导出游标'); }
  if (!cursor || typeof cursor.id !== 'string' || !cursor.id || cursor.id.length > 500
    || !Number.isSafeInteger(cursor.createdAt) || !Number.isFinite(new Date(cursor.createdAt).getTime())) {
    throw new SyPlcQueryError('无效的导出游标');
  }
  const condition = Prisma.sql`("createdAt", "id") < (${cursor.createdAt}, ${cursor.id})`;
  return where.sql ? Prisma.sql`${where} AND ${condition}` : Prisma.sql`WHERE ${condition}`;
}
