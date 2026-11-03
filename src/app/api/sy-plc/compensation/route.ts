import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateCumulativeCompensation } from '@/lib/plc-compensation';

/**
 * 规则2专用：查询同型号、同笼子编号、同角度的历史节并累计差值。
 * 不使用列表接口的分页，避免超过50/1000条时漏算。
 */
export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const values = ['model', 'cageNum', 'angle', 'currentNode'].map(key => {
    const value = params.get(key);
    return value === null || value.trim() === '' ? NaN : Number(value);
  });
  const [model, cageNum, angle, currentNode] = values;

  if (values.some(value => !Number.isFinite(value)) ||
      !Number.isSafeInteger(currentNode) || currentNode < 1) {
    return NextResponse.json({
      success: false,
      error: 'model、cageNum、angle 必须是有效数值，currentNode 必须是正整数'
    }, { status: 400 });
  }

  try {
    const records = await prisma.syPlc.findMany({
      where: {
        modelD2040: model,
        cageNumD2048: cageNum,
        spindleAngleD4012: angle,
        cageNodesD2044: { gte: 1, lt: currentNode }
      },
      select: { cageNodesD2044: true, difference: true },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }]
    });

    return NextResponse.json({
      success: true,
      data: calculateCumulativeCompensation(currentNode, records)
    });
  } catch (error) {
    console.error('查询累计补偿差值失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '查询累计补偿差值失败'
    }, { status: 500 });
  }
}
