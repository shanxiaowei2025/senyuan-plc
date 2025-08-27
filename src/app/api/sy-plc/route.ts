import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUTC8TimeString } from '@/lib/utils';

/**
 * 查询SyPlc数据
 * GET /api/sy-plc - 获取所有数据
 * GET /api/sy-plc?model=xxx&cageNodes=1&angle=45 - 按条件查询
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const model = searchParams.get('model');
    const cageNodes = searchParams.get('cageNodes');
    const angle = searchParams.get('angle');
    const cageNum = searchParams.get('cageNum');
    
    // 分页参数
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 1000); // 最大1000条
    const skip = (page - 1) * limit;

    let whereClause: any = {};

    if (model !== null) {
      whereClause.modelD2040 = parseFloat(model);
    }
    if (cageNodes !== null) {
      whereClause.cageNodesD2044 = parseFloat(cageNodes);
    }
    if (angle !== null) {
      whereClause.spindleAngleD4012 = parseFloat(angle);
    }
    if (cageNum !== null) {
      whereClause.cageNumD2048 = parseFloat(cageNum);
    }

    // 并行查询数据和总数
    const [data, totalCount] = await Promise.all([
      prisma.syPlc.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.syPlc.count({
        where: whereClause
      })
    ]);

    return NextResponse.json({
      success: true,
      data,
      count: data.length,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      hasNextPage: skip + limit < totalCount,
      hasPreviousPage: page > 1,
      timestamp: getUTC8TimeString()
    });
  } catch (error) {
    console.error('查询SyPlc数据失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '查询数据失败',
      timestamp: getUTC8TimeString()
    }, { status: 500 });
  }
}

/**
 * 创建或更新SyPlc数据记录（规则3专用）
 * POST /api/sy-plc
 * 
 * 查询型号、笼子节数、笼子编号、主轴角度是否重复：
 * - 如果重复：更新钢筋实际长度字段
 * - 如果不重复：创建新记录
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      modelD2040,
      cageNodesD2044,
      cageNumD2048,
      spindleAngleD4012,
      actualRebarLength,
      theoreticalLength,
      difference,
      totalNodesD2052
    } = body;

    // 验证必需字段
    if (
      modelD2040 === undefined ||
      cageNodesD2044 === undefined ||
      cageNumD2048 === undefined ||
      spindleAngleD4012 === undefined ||
      theoreticalLength === undefined ||
      totalNodesD2052 === undefined
    ) {
      return NextResponse.json({
        success: false,
        error: '缺少必需字段: modelD2040, cageNodesD2044, cageNumD2048, spindleAngleD4012, theoreticalLength, totalNodesD2052',
        timestamp: getUTC8TimeString()
      }, { status: 400 });
    }

    // 转换为数值类型
    const model = parseFloat(modelD2040);
    const cageNodes = parseFloat(cageNodesD2044);
    const cageNum = parseFloat(cageNumD2048);
    const spindleAngle = parseFloat(spindleAngleD4012);
    const theoretical = parseFloat(theoreticalLength);
    const totalNodes = parseFloat(totalNodesD2052);
    
    // 可选字段处理
    const rebarLength = actualRebarLength ? parseFloat(actualRebarLength) : null;
    const diff = difference ? parseFloat(difference) : null;

    // 查询是否存在重复记录（根据型号、笼子节数、笼子编号、主轴角度）
    const existingRecord = await prisma.syPlc.findFirst({
      where: {
        modelD2040: model,
        cageNodesD2044: cageNodes,
        cageNumD2048: cageNum,
        spindleAngleD4012: spindleAngle
      }
    });

    // 获取当前时间（系统已经是CST时区）
    const now = new Date();

    let data;
    let message;
    let isUpdate = false;

    if (existingRecord) {
      // 存在重复记录，更新钢筋实际长度和其他可选字段
      data = await prisma.syPlc.update({
        where: { id: existingRecord.id },
        data: {
          actualRebarLength: rebarLength,
          theoreticalLength: theoretical,
          difference: diff,
          totalNodesD2052: totalNodes,
          updatedAt: now
        }
      });
      message = `更新现有记录成功，ID: ${existingRecord.id}`;
      isUpdate = true;
    } else {
      // 不存在重复记录，创建新记录
      data = await prisma.syPlc.create({
        data: {
          modelD2040: model,
          cageNodesD2044: cageNodes,
          cageNumD2048: cageNum,
          spindleAngleD4012: spindleAngle,
          actualRebarLength: rebarLength,
          theoreticalLength: theoretical,
          difference: diff,
          totalNodesD2052: totalNodes,
          createdAt: now,
          updatedAt: now,
        }
      });
      message = `创建新记录成功，ID: ${data.id}`;
      isUpdate = false;
    }

    return NextResponse.json({
      success: true,
      data,
      message,
      isUpdate, // 标识是更新还是创建
      timestamp: getUTC8TimeString()
    });
  } catch (error) {
    console.error('处理SyPlc数据失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '处理数据失败',
      timestamp: getUTC8TimeString()
    }, { status: 500 });
  }
}

/**
 * 更新SyPlc数据记录
 * PUT /api/sy-plc
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: '缺少必需字段: id',
        timestamp: getUTC8TimeString()
      }, { status: 400 });
    }

    // 获取当前时间（系统已经是CST时区）
    const now = new Date();

    // 转换数值字段  
    const processedData: any = {
      updatedAt: now, // 设置当前时间
    };

    if (updateData.modelD2040 !== undefined) {
      processedData.modelD2040 = parseFloat(updateData.modelD2040);
    }
    if (updateData.cageNodesD2044 !== undefined) {
      processedData.cageNodesD2044 = parseFloat(updateData.cageNodesD2044);
    }
    if (updateData.cageNumD2048 !== undefined) {
      processedData.cageNumD2048 = parseFloat(updateData.cageNumD2048);
    }
    if (updateData.spindleAngleD4012 !== undefined) {
      processedData.spindleAngleD4012 = parseFloat(updateData.spindleAngleD4012);
    }
    if (updateData.actualRebarLength !== undefined) {
      processedData.actualRebarLength = parseFloat(updateData.actualRebarLength);
    }
    if (updateData.theoreticalLength !== undefined) {
      processedData.theoreticalLength = updateData.theoreticalLength ? parseFloat(updateData.theoreticalLength) : null;
    }
    if (updateData.difference !== undefined) {
      processedData.difference = updateData.difference ? parseFloat(updateData.difference) : null;
    }
    if (updateData.totalNodesD2052 !== undefined) {
      processedData.totalNodesD2052 = updateData.totalNodesD2052 ? parseFloat(updateData.totalNodesD2052) : null;
    }

    const data = await prisma.syPlc.update({
      where: { id },
      data: processedData
    });

    return NextResponse.json({
      success: true,
      data,
      message: '更新SyPlc数据记录成功',
      timestamp: getUTC8TimeString()
    });
  } catch (error) {
    console.error('更新SyPlc数据失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '更新数据失败',
      timestamp: getUTC8TimeString()
    }, { status: 500 });
  }
}

/**
 * 删除SyPlc数据记录
 * DELETE /api/sy-plc
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        success: false,
        error: '缺少必需参数: id',
        timestamp: getUTC8TimeString()
      }, { status: 400 });
    }

    await prisma.syPlc.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: '删除SyPlc数据记录成功',
      timestamp: getUTC8TimeString()
    });
  } catch (error) {
    console.error('删除SyPlc数据失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '删除数据失败',
      timestamp: getUTC8TimeString()
    }, { status: 500 });
  }
} 