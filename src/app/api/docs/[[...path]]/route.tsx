import { NextRequest, NextResponse } from 'next/server';
import { getApiDocs } from '@/lib/swagger';

/**
 * 处理所有/api/docs相关的路由
 * - /api/docs 和 /api/docs/ 返回API文档JSON或重定向到UI页面
 * - /api/docs/spec 专门用于返回API规范JSON
 * - /api/docs/其他子路径 返回404
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  // 获取URL和主机信息
  const url = req.nextUrl;
  const host = req.headers.get('host') || '';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;
  
  // 特别处理/api/docs/spec路径，始终返回API规范JSON
  if (path && path.length === 1 && path[0] === 'spec') {
    return NextResponse.json(getApiDocs());
  }
  
  // 如果是根路径/api/docs或/api/docs/，检查是否需要重定向到UI页面
  if (!path || path.length === 0 || (path.length === 1 && path[0] === '')) {
    // 如果请求URL明确包含/api/docs，重定向到/docs UI页面
    if (url.pathname === '/api/docs' || url.pathname === '/api/docs/') {
      return NextResponse.redirect(new URL('/docs', baseUrl));
    }
    
    // 否则返回API文档的JSON
    return NextResponse.json(getApiDocs());
  }
  
  // 对于其他所有子路径，返回404
  return NextResponse.json(
    { error: 'API文档路径不存在' },
    { status: 404 }
  );
} 