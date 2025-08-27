import { NextResponse } from 'next/server';
import ModbusRTU from 'modbus-serial';

// 处理连接测试请求
export async function POST(request: Request) {
  let client: ModbusRTU | null = null;
  const results: {step: string; success: boolean; error?: string; data?: any}[] = [];
  
  try {
    // 从请求体中获取PLC配置
    const body = await request.json();
    const host = body.host || '192.168.55.199';
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