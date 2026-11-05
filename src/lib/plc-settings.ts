// 单次 Modbus 通信的上限；旧版浏览器保存的 15 秒配置也会被归一化。
export const PLC_TIMEOUT_MS = 2000;

export function normalizePLCTimeout(value: unknown): number {
  const timeout = Number(value);
  return Number.isFinite(timeout) && timeout >= 1
    ? Math.min(Math.floor(timeout), PLC_TIMEOUT_MS)
    : PLC_TIMEOUT_MS;
}
