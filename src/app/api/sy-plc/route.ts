import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUTC8TimeString } from '@/lib/utils';

/**
 * @swagger
 * /sy-plc:
 *   get:
 *     summary: 查询SyPlc数据
 *     description: 获取SyPlc数据记录，支持分页和条件筛选
 *     tags:
 *       - SY-PLC数据管理
 *     parameters:
 *       - in: query
 *         name: model
 *         schema:
 *           type: number
 *         required: false
 *         description: 型号筛选 (modelD2040)
 *       - in: query
 *         name: cageNodes
 *         schema:
 *           type: number
 *         required: false
 *         description: 笼子节数筛选 (cageNodesD2044)
 *       - in: query
 *         name: angle
 *         schema:
 *           type: number
 *         required: false
 *         description: 主轴角度筛选 (spindleAngleD4012)
 *       - in: query
 *         name: cageNum
 *         schema:
 *           type: number
 *         required: false
 *         description: 笼子编号筛选 (cageNumD2048)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         required: false
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 50
 *         required: false
 *         description: 每页数据量
 *     responses:
 *       200:
 *         description: 成功获取SyPlc数据
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: 记录ID
 *                       modelD2040:
 *                         type: number
 *                         description: 型号
 *                         example: 1.0
 *                       cageNodesD2044:
 *                         type: number
 *                         description: 笼子节数
 *                         example: 8.0
 *                       cageNumD2048:
 *                         type: number
 *                         description: 笼子编号
 *                         example: 1.0
 *                       spindleAngleD4012:
 *                         type: number
 *                         description: 主轴角度
 *                         example: 45.0
 *                       actualRebarLength:
 *                         type: number
 *                         description: 钢筋实际长度
 *                         example: 1200.5
 *                       theoreticalLength:
 *                         type: number
 *                         description: 理论长度
 *                         example: 1200.0
 *                       difference:
 *                         type: number
 *                         description: 差值
 *                         example: 0.5
 *                       totalNodesD2052:
 *                         type: number
 *                         description: 总节数
 *                         example: 10.0
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: 创建时间
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         description: 更新时间
 *                 count:
 *                   type: integer
 *                   description: 当前页数据数量
 *                 totalCount:
 *                   type: integer
 *                   description: 总数据数量
 *                 page:
 *                   type: integer
 *                   description: 当前页码
 *                 limit:
 *                   type: integer
 *                   description: 每页数据量
 *                 totalPages:
 *                   type: integer
 *                   description: 总页数
 *                 hasNextPage:
 *                   type: boolean
 *                   description: 是否有下一页
 *                 hasPreviousPage:
 *                   type: boolean
 *                   description: 是否有上一页
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   description: 响应时间戳
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: 创建或更新SyPlc数据记录
 *     description: 根据型号、笼子节数、笼子编号、主轴角度查重，如果重复则更新，否则创建新记录（规则3专用）
 *     tags:
 *       - SY-PLC数据管理
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               modelD2040:
 *                 type: number
 *                 description: 型号
 *                 example: 1.0
 *               cageNodesD2044:
 *                 type: number
 *                 description: 笼子节数
 *                 example: 8.0
 *               cageNumD2048:
 *                 type: number
 *                 description: 笼子编号
 *                 example: 1.0
 *               spindleAngleD4012:
 *                 type: number
 *                 description: 主轴角度
 *                 example: 45.0
 *               actualRebarLength:
 *                 type: number
 *                 description: 钢筋实际长度
 *                 example: 1200.5
 *               theoreticalLength:
 *                 type: number
 *                 description: 理论长度
 *                 example: 1200.0
 *               difference:
 *                 type: number
 *                 description: 差值
 *                 example: 0.5
 *               totalNodesD2052:
 *                 type: number
 *                 description: 总节数
 *                 example: 10.0
 *             required:
 *               - modelD2040
 *               - cageNodesD2044
 *               - cageNumD2048
 *               - spindleAngleD4012
 *               - theoreticalLength
 *               - totalNodesD2052
 *     responses:
 *       200:
 *         description: 成功创建或更新数据记录
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 action:
 *                   type: string
 *                   enum: [created, updated]
 *                   description: 执行的操作类型
 *                   example: "created"
 *                 message:
 *                   type: string
 *                   example: "数据记录创建成功"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: 记录ID
 *                     modelD2040:
 *                       type: number
 *                       description: 型号
 *                     cageNodesD2044:
 *                       type: number
 *                       description: 笼子节数
 *                     cageNumD2048:
 *                       type: number
 *                       description: 笼子编号
 *                     spindleAngleD4012:
 *                       type: number
 *                       description: 主轴角度
 *                     actualRebarLength:
 *                       type: number
 *                       description: 钢筋实际长度
 *                     theoreticalLength:
 *                       type: number
 *                       description: 理论长度
 *                     difference:
 *                       type: number
 *                       description: 差值
 *                     totalNodesD2052:
 *                       type: number
 *                       description: 总节数
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: 创建时间
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: 更新时间
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   description: 响应时间戳
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

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
    const actualRebarLength = searchParams.get('actualRebarLength');
    const theoreticalLength = searchParams.get('theoreticalLength');
    const difference = searchParams.get('difference');
    const totalNodes = searchParams.get('totalNodes');
    const createdAtStart = searchParams.get('createdAtStart');
    const createdAtEnd = searchParams.get('createdAtEnd');
    const updatedAtStart = searchParams.get('updatedAtStart');
    const updatedAtEnd = searchParams.get('updatedAtEnd');
    
    // 分页参数
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 1000); // 最大1000条
    const skip = (page - 1) * limit;

    let whereClause: any = {};

    // 精确匹配的数值字段
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

    // 模糊搜索的数值字段（使用字符串包含匹配）
    if (actualRebarLength) {
      whereClause.actualRebarLength = {
        not: null,
        // 将数值转为字符串进行模糊匹配
        // 注意：这种方法在大数据集上可能性能较差，建议根据实际需求调整
      };
    }
    if (theoreticalLength) {
      whereClause.theoreticalLength = {
        // 对于模糊搜索，我们可以使用范围查询
        gte: parseFloat(theoreticalLength) * 0.9,
        lte: parseFloat(theoreticalLength) * 1.1
      };
    }
    if (difference) {
      whereClause.difference = {
        not: null
      };
    }
    if (totalNodes) {
      whereClause.totalNodesD2052 = {
        not: null
      };
    }

    // 时间范围查询
    if (createdAtStart || createdAtEnd) {
      whereClause.createdAt = {};
      if (createdAtStart) {
        whereClause.createdAt.gte = new Date(createdAtStart);
      }
      if (createdAtEnd) {
        whereClause.createdAt.lte = new Date(createdAtEnd + 'T23:59:59.999Z');
      }
    }
    
    if (updatedAtStart || updatedAtEnd) {
      whereClause.updatedAt = {};
      if (updatedAtStart) {
        whereClause.updatedAt.gte = new Date(updatedAtStart);
      }
      if (updatedAtEnd) {
        whereClause.updatedAt.lte = new Date(updatedAtEnd + 'T23:59:59.999Z');
      }
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
 * DELETE /api/sy-plc?id=xxx - 删除单条记录
 * DELETE /api/sy-plc (body: {ids: [...]}) - 批量删除记录
 * DELETE /api/sy-plc?deleteFiltered=true - 删除所有搜索结果
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const deleteFiltered = searchParams.get('deleteFiltered') === 'true';

    // 批量删除或删除搜索结果
    if (!id) {
      const body = await request.json().catch(() => ({}));
      const { ids } = body;

      if (deleteFiltered) {
        // 删除搜索结果 - 使用与GET相同的查询条件
        const model = searchParams.get('model');
        const cageNodes = searchParams.get('cageNodes');
        const angle = searchParams.get('angle');
        const cageNum = searchParams.get('cageNum');
        const actualRebarLength = searchParams.get('actualRebarLength');
        const theoreticalLength = searchParams.get('theoreticalLength');
        const difference = searchParams.get('difference');
        const totalNodes = searchParams.get('totalNodes');
        const createdAtStart = searchParams.get('createdAtStart');
        const createdAtEnd = searchParams.get('createdAtEnd');
        const updatedAtStart = searchParams.get('updatedAtStart');
        const updatedAtEnd = searchParams.get('updatedAtEnd');

        let whereClause: any = {};

        // 构建与GET相同的查询条件
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

        if (actualRebarLength) {
          whereClause.actualRebarLength = {
            not: null,
          };
        }
        if (theoreticalLength) {
          whereClause.theoreticalLength = {
            gte: parseFloat(theoreticalLength) * 0.9,
            lte: parseFloat(theoreticalLength) * 1.1
          };
        }
        if (difference) {
          whereClause.difference = {
            not: null
          };
        }
        if (totalNodes) {
          whereClause.totalNodesD2052 = {
            not: null
          };
        }

        // 时间范围查询
        if (createdAtStart || createdAtEnd) {
          whereClause.createdAt = {};
          if (createdAtStart) {
            whereClause.createdAt.gte = new Date(createdAtStart);
          }
          if (createdAtEnd) {
            whereClause.createdAt.lte = new Date(createdAtEnd + 'T23:59:59.999Z');
          }
        }
        
        if (updatedAtStart || updatedAtEnd) {
          whereClause.updatedAt = {};
          if (updatedAtStart) {
            whereClause.updatedAt.gte = new Date(updatedAtStart);
          }
          if (updatedAtEnd) {
            whereClause.updatedAt.lte = new Date(updatedAtEnd + 'T23:59:59.999Z');
          }
        }

        const result = await prisma.syPlc.deleteMany({
          where: whereClause
        });

        return NextResponse.json({
          success: true,
          message: `成功删除 ${result.count} 条搜索结果记录`,
          deletedCount: result.count,
          timestamp: getUTC8TimeString()
        });
      } else if (ids && Array.isArray(ids) && ids.length > 0) {
        // 批量删除指定ID的记录
        const result = await prisma.syPlc.deleteMany({
          where: {
            id: {
              in: ids
            }
          }
        });

        return NextResponse.json({
          success: true,
          message: `成功删除 ${result.count} 条记录`,
          deletedCount: result.count,
          timestamp: getUTC8TimeString()
        });
      } else {
        return NextResponse.json({
          success: false,
          error: '缺少必需参数: id 或 ids 数组',
          timestamp: getUTC8TimeString()
        }, { status: 400 });
      }
    }

    // 删除单条记录
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