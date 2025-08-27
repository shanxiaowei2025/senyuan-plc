// Next.js 13+ App Router WebSocket处理
import { NextRequest } from 'next/server'
import * as plcState from '../../plc-state'

// WebSocket处理函数
export async function GET(request: NextRequest) {
  // 如果请求不是WebSocket升级请求，返回普通响应
  const upgradeHeader = request.headers.get('upgrade');
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
    return new Response('这个端点只接受WebSocket连接', { 
      status: 426, 
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  try {
    // 在Next.js中处理WebSocket连接需要特殊的头部
    return new Response(null, {
      status: 101,
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade'
      }
    });
  } catch (error) {
    console.error('WebSocket请求处理错误:', error);
    return new Response('WebSocket连接失败', { status: 500 });
  }
} 