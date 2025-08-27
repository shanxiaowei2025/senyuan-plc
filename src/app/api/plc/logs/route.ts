import { NextRequest, NextResponse } from 'next/server';
import * as plcState from '../plc-state';

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