import { NextResponse } from 'next/server';
import ModbusRTU from 'modbus-serial';

/**
 * @swagger
 * /plc/test-connection:
 *   post:
 *     summary: 测试PLC连接
 *     description: 测试与PLC的连接状态，包括TCP连接、从站设置、读取保持寄存器等完整步骤
 *     tags:
 *       - PLC连接管理
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               host:
 *                 type: string
 *                 description: PLC主机IP地址
 *                 default: "192.168.6.6"
*                 example: "192.168.6.6"
 *               port:
 *                 type: integer
 *                 description: PLC端口号
 *                 default: 502
 *                 example: 502
 *               unitId:
 *                 type: integer
 *                 description: 从站ID
 *                 default: 1
 *                 example: 1
 *               timeout:
 *                 type: integer
 *                 description: 连接超时时间(毫秒)
 *                 default: 10000
 *                 example: 10000
 *     responses:
 *       200:
 *         description: 连接测试完成（包括成功和失败的情况）
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: 整体测试是否成功
 *                   example: true
 *                 message:
 *                   type: string
 *                   description: 测试结果描述
 *                   example: "PLC连接测试完成"
 *                 results:
 *                   type: array
 *                   description: 详细的测试步骤结果
 *                   items:
 *                     type: object
 *                     properties:
 *                       step:
 *                         type: string
 *                         description: 测试步骤名称
 *                         example: "1. 配置解析"
 *                       success:
 *                         type: boolean
 *                         description: 该步骤是否成功
 *                       error:
 *                         type: string
 *                         description: 错误信息（如果失败）
 *                       data:
 *                         type: object
 *                         description: 步骤返回的数据
 *                 config:
 *                   type: object
 *                   description: 测试使用的配置信息
 *                   properties:
 *                     host:
 *                       type: string
 *                       example: "192.168.6.6"
 *                     port:
 *                       type: integer
 *                       example: 502
 *                     unitId:
 *                       type: integer
 *                       example: 1
 *                     timeout:
 *                       type: integer
 *                       example: 10000
 *                 summary:
 *                   type: object
 *                   description: 测试结果汇总
 *                   properties:
 *                     totalSteps:
 *                       type: integer
 *                       description: 总测试步骤数
 *                       example: 6
 *                     successfulSteps:
 *                       type: integer
 *                       description: 成功的步骤数
 *                       example: 6
 *                     failedSteps:
 *                       type: integer
 *                       description: 失败的步骤数
 *                       example: 0
 *                     lastFailedStep:
 *                       type: string
 *                       description: 最后失败的步骤（如果有）
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "连接测试失败"
 *                 error:
 *                   type: string
 *                   description: 错误详情
 *                 results:
 *                   type: array
 *                   description: 已完成的测试步骤结果
 *                   items:
 *                     type: object
 *                     properties:
 *                       step:
 *                         type: string
 *                       success:
 *                         type: boolean
 *                       error:
 *                         type: string
 *                       data:
 *                         type: object
 */
// 处理连接测试请求
export async function POST(request: Request) {
  let client: ModbusRTU | null = null;
  const results: {step: string; success: boolean; error?: string; data?: any}[] = [];
  
  try {
    // 从请求体中获取PLC配置
    const body = await request.json();
    const host = body.host || '192.168.6.6';
    const port = parseInt(body.port || '502');
    const unitId = parseInt(body.unitId || '1');
    const timeout = parseInt(body.timeout || '10000');
    
    // 记录步骤1
    results.push({
      step: '1. 配置解析',
      success: true,
      data: { host, port, unitId, timeout }
    });
    
    // 创建新的ModbusRTU客户端
    client = new ModbusRTU();
    client.setTimeout(timeout);
    
    // 记录步骤2
    results.push({
      step: '2. 客户端创建',
      success: true
    });
    
    // 连接到TCP设备
    try {
      await client.connectTCP(host, { port });
      results.push({
        step: '3. TCP连接',
        success: true
      });
    } catch (error) {
      results.push({
        step: '3. TCP连接',
        success: false,
        error: error instanceof Error ? error.message : '连接失败'
      });
      throw error;
    }
    
    // 设置从站ID
    try {
      client.setID(unitId);
      results.push({
        step: '4. 设置从站ID',
        success: true
      });
    } catch (error) {
      results.push({
        step: '4. 设置从站ID',
        success: false,
        error: error instanceof Error ? error.message : '设置从站ID失败'
      });
      throw error;
    }
    
    // 尝试读取保持寄存器
    const registerTests = [];
    const addresses = [0, 1, 2, 3, 10, 100];
    
    // 测试不同寄存器
    for (const address of addresses) {
      try {
        // 保持寄存器
        const holdingResult = await client.readHoldingRegisters(address, 1);
        registerTests.push({
          type: 'holding',
          address,
          success: true,
          data: holdingResult.data
        });
      } catch (error) {
        registerTests.push({
          type: 'holding',
          address,
          success: false,
          error: error instanceof Error ? error.message : '读取失败'
        });
      }
      
      try {
        // 输入寄存器
        const inputResult = await client.readInputRegisters(address, 1);
        registerTests.push({
          type: 'input',
          address,
          success: true,
          data: inputResult.data
        });
      } catch (error) {
        registerTests.push({
          type: 'input',
          address,
          success: false,
          error: error instanceof Error ? error.message : '读取失败'
        });
      }
      
      try {
        // 线圈
        const coilResult = await client.readCoils(address, 1);
        registerTests.push({
          type: 'coil',
          address,
          success: true,
          data: coilResult.data
        });
      } catch (error) {
        registerTests.push({
          type: 'coil',
          address,
          success: false,
          error: error instanceof Error ? error.message : '读取失败'
        });
      }
    }
    
    results.push({
      step: '5. 寄存器测试',
      success: registerTests.some(test => test.success),
      data: registerTests
    });
    
    // 关闭连接
    if (client && client.isOpen) {
      await new Promise<void>((resolve) => {
        client!.close(() => {
          resolve();
        });
      });
      
      results.push({
        step: '6. 关闭连接',
        success: true
      });
    }
    
    // 检查是否有成功的寄存器读取
    const connectionSuccessful = registerTests.some(test => test.success);
    
    return NextResponse.json({
      success: connectionSuccessful,
      message: connectionSuccessful ? 'PLC连接测试成功' : 'PLC连接测试失败',
      results
    }, { status: connectionSuccessful ? 200 : 500 });
    
  } catch (error) {
    // 记录错误
    results.push({
      step: '错误',
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    });
    
    // 尝试关闭连接
    if (client && client.isOpen) {
      try {
        await new Promise<void>((resolve) => {
          client!.close(() => {
            resolve();
          });
        });
      } catch (e) {
        // 忽略关闭错误
      }
    }
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '连接测试失败',
      results
    }, { status: 500 });
  }
} 