import { NextRequest, NextResponse } from 'next/server';
import * as plcState from '../plc-state';

/**
 * @swagger
 * /plc/logs:
 *   get:
 *     summary: 获取PLC日志
 *     description: 获取PLC操作日志列表，支持限制返回数量
 *     tags:
 *       - PLC日志管理
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 50
 *         required: false
 *         description: 限制返回的日志数量
 *     responses:
 *       200:
 *         description: 成功获取PLC日志
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
 *                         description: 日志ID
 *                       level:
 *                         type: string
 *                         enum: [info, warn, error, debug]
 *                         description: 日志级别
 *                         example: "info"
 *                       message:
 *                         type: string
 *                         description: 日志消息
 *                         example: "PLC连接成功"
 *                       source:
 *                         type: string
 *                         description: 日志来源
 *                         example: "plc-connection"
 *                       details:
 *                         type: object
 *                         description: 额外的日志详情
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                         description: 日志时间戳
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: 添加PLC日志
 *     description: 添加新的PLC操作日志记录
 *     tags:
 *       - PLC日志管理
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               level:
 *                 type: string
 *                 enum: [info, warn, error, debug]
 *                 description: 日志级别
 *                 example: "info"
 *               message:
 *                 type: string
 *                 description: 日志消息
 *                 example: "PLC数据读取成功"
 *               source:
 *                 type: string
 *                 description: 日志来源
 *                 example: "data-reader"
 *               details:
 *                 type: object
 *                 description: 额外的日志详情
 *                 example: {"address": "D2000", "value": 123}
 *             required:
 *               - level
 *               - message
 *               - source
 *     responses:
 *       200:
 *         description: 成功添加日志
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "日志添加成功"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     level:
 *                       type: string
 *                       example: "info"
 *                     message:
 *                       type: string
 *                       example: "PLC数据读取成功"
 *                     source:
 *                       type: string
 *                       example: "data-reader"
 *                     details:
 *                       type: object
 *                     timestamp:
 *                       type: string
 *                       format: date-time
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
 *   delete:
 *     summary: 清空PLC日志
 *     description: 清空所有PLC操作日志记录
 *     tags:
 *       - PLC日志管理
 *     responses:
 *       200:
 *         description: 成功清空日志
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "模拟PLC日志已清空"
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET(request: Request) {
  try {
    // 获取查询参数
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    
    // 获取PLC日志
    const logs = plcState.getLogs(limit);
    
    // 格式化日志以便前端显示
    const formattedLogs = logs.map(log => ({
      ...log,
      // 将Date对象转换为ISO字符串，前端可以根据需要格式化
      timestamp: log.timestamp.toISOString()
    }));
    
    return NextResponse.json({
      success: true,
      data: formattedLogs
    });
  } catch (error) {
    console.error('获取PLC日志失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '获取PLC日志失败' 
      },
      { status: 500 }
    );
  }
}

// POST方法 - 添加日志
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { level, message, source, details } = body;

    // 验证必填字段
    if (!level || !message || !source) {
      return NextResponse.json(
        { 
          success: false, 
          error: '日志级别、消息和来源为必填项' 
        },
        { status: 400 }
      );
    }

    // 添加日志到PLC状态
    const log = plcState.addLog(level, message, source, details);
    
    // 广播日志到WebSocket连接
    plcState.broadcastLog(log);

    return NextResponse.json({
      success: true,
      message: '日志添加成功',
      data: {
        ...log,
        timestamp: log.timestamp.toISOString()
      }
    });
  } catch (error) {
    console.error('添加PLC日志失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '添加PLC日志失败' 
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    // 在实际应用中，这里应该调用后端API来清空PLC日志
    // 创建一个模拟的清空操作
    console.log('模拟清空PLC日志');
    return NextResponse.json({
      success: true,
      message: '模拟PLC日志已清空'
    });
  } catch (error) {
    console.error('清空PLC日志失败:', error);
    return NextResponse.json(
      { success: false, error: '清空PLC日志失败' },
      { status: 500 }
    );
  }
} 