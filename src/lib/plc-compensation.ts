export interface CompensationRecord {
  cageNodesD2044: number;
  difference: number | null;
}

export interface CumulativeCompensation {
  totalDifference: number | null;
  missingNodes: number[];
}

/**
 * 累计第1节至当前节之前的各节差值，保留正负号。
 * records 须按更新时间倒序排列；同一节存在重复记录时只使用最新一条。
 * 任一节缺失或差值无效时返回 null，不使用部分累计值进行补偿。
 */
export function calculateCumulativeCompensation(
  currentNode: number,
  records: CompensationRecord[]
): CumulativeCompensation {
  if (!Number.isSafeInteger(currentNode) || currentNode < 1) {
    throw new Error('当前笼子节数必须是正整数');
  }

  const recordsByNode = new Map<number, CompensationRecord>();
  for (const record of records) {
    const node = record.cageNodesD2044;
    if (Number.isInteger(node) && node >= 1 && node < currentNode && !recordsByNode.has(node)) {
      recordsByNode.set(node, record);
    }
  }

  let totalDifference = 0;
  const missingNodes: number[] = [];
  for (let node = 1; node < currentNode; node++) {
    const difference = recordsByNode.get(node)?.difference;
    if (typeof difference !== 'number' || !Number.isFinite(difference)) {
      missingNodes.push(node);
    } else {
      totalDifference += difference;
    }
  }

  if (!Number.isFinite(totalDifference)) {
    throw new Error('累计差值超出有效数值范围');
  }

  return {
    totalDifference: missingNodes.length === 0 ? totalDifference : null,
    missingNodes
  };
}
