import { NextResponse } from 'next/server'
import * as plcState from '../plc-state'
import ModbusRTU from 'modbus-serial'

// 存储PLC连接（导出以便其他API路由可以访问）
export let plcClient: ModbusRTU | null = null;

// 处理PLC连接
async function connectToPLC(config: typeof plcState.plcConfig): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // 如果已有连接，先关闭
      if (plcClient) {
        try {
          plcClient.close();
          console.log('已关闭旧PLC连接');
        } catch (e) {
          console.error('关闭旧连接失败:', e);
        }
        plcClient = null;
      }
      
      // 创建新的ModbusRTU客户端
      plcClient = new ModbusRTU();
      
      // 设置超时时间
      plcClient.setTimeout(config.timeout);
      
      // 设置错误处理和关闭监听
      const errorHandler = (error: Error) => {
        console.error('Modbus错误:', error.message);
        reject(new Error(`连接错误: ${error.message}`));
      };
      
      // 连接到PLC
      console.log('开始连接PLC:', config.host, config.port, '单元ID:', config.unitId);
      
      plcClient.connectTCP(config.host, { port: config.port })
        .then(() => {
          console.log('TCP连接建立成功');
          
          // 设置从站ID
          plcClient!.setID(config.unitId);
          console.log('从站ID已设置为:', config.unitId);
          
          console.log('开始验证Modbus通信');
          
          // 尝试读取不同寄存器来验证连接
          return validateConnection(plcClient!);
        })
        .then(() => {
          console.log('ModbusRTU连接验证成功');
          resolve();
        })
        .catch((error) => {
          console.error('ModbusRTU连接或验证失败:', error);
          
          // 关闭连接
          if (plcClient) {
            try {
              plcClient.close();
              console.log('关闭失败的ModbusRTU连接');
            } catch (e) {
              console.error('关闭连接失败:', e);
            }
            plcClient = null;
          }
          
          reject(error);
        });
    } catch (error) {
      console.error('创建ModbusRTU连接时出错:', error);
      reject(error);
    }
  });
}

// 验证连接函数
async function validateConnection(client: ModbusRTU): Promise<void> {
  // 依次尝试不同类型的寄存器，从地址0开始
          try {
    console.log('尝试验证连接: 读取保持寄存器(地址0)')
    // 尝试读取保持寄存器 (从地址0开始，读取1个寄存器)
    await client.readHoldingRegisters(0, 1)
    console.log('Modbus连接验证成功（通过保持寄存器0）')
    return;
  } catch (error) {
    // 获取更详细的错误信息
    console.error('保持寄存器0验证失败:', error)
    console.error('错误详情:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    // 继续尝试其他方法
  }
  
  // 输入寄存器
  for (const address of [0, 1, 2, 3, 4, 5, 10, 100]) {
            try {
      console.log(`尝试验证连接: 读取输入寄存器(地址${address})`);
      await client.readInputRegisters(address, 1);
      console.log(`Modbus连接验证成功（通过输入寄存器${address}）`);
      return;
    } catch (error) {
      console.error(`输入寄存器${address}验证失败:`, error);
      // 继续尝试下一个地址或方法
    }
  }
  
  // 线圈
  for (const address of [0, 1, 2, 3, 4, 5, 10, 100]) {
              try {
      console.log(`尝试验证连接: 读取线圈(地址${address})`);
      await client.readCoils(address, 1);
      console.log(`Modbus连接验证成功（通过线圈${address}）`);
      return;
    } catch (error) {
      console.error(`线圈${address}验证失败:`, error);
      // 继续尝试下一个地址或方法
    }
  }
  
  // 离散输入
  for (const address of [0, 1, 2, 3, 4, 5, 10, 100]) {
                try {
      console.log(`尝试验证连接: 读取离散输入(地址${address})`);
      await client.readDiscreteInputs(address, 1);
      console.log(`Modbus连接验证成功（通过离散输入${address}）`);
      return;
    } catch (error) {
      console.error(`离散输入${address}验证失败:`, error);
      // 继续尝试下一个地址或方法
    }
  }
  
  // 如果所有地址和方法都尝试失败
  throw new Error('Modbus协议验证失败: 所有验证方法都失败，请检查设备通信参数');
}

// 断开PLC连接
function disconnectFromPLC(): void {
  if (plcClient) {
    try {
      plcClient.close();
      console.log('PLC连接已关闭');
    } catch (e) {
      console.error('关闭连接失败:', e);
    }
    plcClient = null;
  }
}

// 检查PLC连接状态
export function checkPLCConnection(): boolean {
  try {
    // 首先检查基本条件
    if (!plcClient || !plcClient.isOpen) {
      // 如果plcClient不存在或未打开，确保状态一致
      if (plcState.isConnected) {
        plcState.updateConnectionStatus({
          isConnected: false,
          connectionError: 'PLC连接已断开'
        });
        // 广播状态更新
        plcState.broadcastStatus();
      }
      return false;
    }
    
    // 如果plcClient存在且已打开，但状态标志显示未连接，则更新状态
    if (!plcState.isConnected) {
      plcState.updateConnectionStatus({
        isConnected: true,
        connectionError: null
      });
      // 广播状态更新
      plcState.broadcastStatus();
    }
    
    return true;
  } catch (error) {
    console.error('检查PLC连接状态出错:', error);
    // 发生错误时，确保连接状态为断开
    plcState.updateConnectionStatus({
      isConnected: false,
      connectionError: error instanceof Error ? error.message : '连接检查失败'
    });
    // 广播状态更新
    plcState.broadcastStatus();
    return false;
}
}

/**
 * @swagger
 * /plc/connect:
 *   post:
 *     summary: 连接到PLC
 *     description: 使用提供的配置连接到PLC Modbus设备
 *     tags:
 *       - PLC连接
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - host
 *             properties:
 *               host:
 *                 type: string
 *                 description: PLC设备的IP地址
 *                 example: "192.168.6.6"
 *               port:
 *                 type: number
 *                 description: Modbus TCP端口
 *                 default: 502
 *                 example: 502
 *               unitId:
 *                 type: number
 *                 description: Modbus单元ID/从站地址
 *                 default: 1
 *                 example: 1
 *               timeout:
 *                 type: number
 *                 description: 通信超时时间(毫秒)
 *                 default: 5000
 *                 example: 5000
 *               reconnectInterval:
 *                 type: number
 *                 description: 重连间隔(毫秒)
 *                 default: 3000
 *                 example: 3000
 *               maxReconnectAttempts:
 *                 type: number
 *                 description: 最大重连次数
 *                 default: 1
 *                 example: 1
 *     responses:
 *       200:
 *         description: 成功连接到PLC
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
 *                   example: "PLC Modbus连接成功"
 *                 data:
 *                   $ref: '#/components/schemas/PLCStatus'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 连接失败
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "连接失败：无法连接到指定的PLC"
 *                 data:
 *                   $ref: '#/components/schemas/PLCStatus'
 */
export async function POST(request: Request) {
  try {
    // 从请求体中获取PLC配置
    const body = await request.json()
    
    // 确保配置包含必要的字段
    if (!body.host) {
      return NextResponse.json({
        success: false,
        error: 'PLC IP地址不能为空'
      }, { status: 400 })
    }
    
    // 更新PLC配置
    plcState.updateConfig(body)
    
    console.log('开始连接PLC:', plcState.plcConfig.host, plcState.plcConfig.port)
    
    // 添加连接日志
    const log = plcState.addLog('INFO', `开始连接PLC (${plcState.plcConfig.host}:${plcState.plcConfig.port})`, 'Connection')
    plcState.broadcastLog(log)
    
    // 更新连接状态
    plcState.updateConnectionStatus({
      isConnecting: true,
      connectionError: null
    })
    
    // 广播状态更新
    plcState.broadcastStatus()
    
    try {
      // 尝试连接PLC
      await connectToPLC(plcState.plcConfig)
      
      // 连接成功
      plcState.updateConnectionStatus({
        isConnected: true,
        isConnecting: false,
        connectionError: null
      })
      
      // 添加成功日志
      const successLog = plcState.addLog('INFO', 'PLC Modbus连接成功', 'Connection')
      plcState.broadcastLog(successLog)
      
      // 广播状态更新
      plcState.broadcastStatus()
      
      return NextResponse.json({
        success: true,
        message: 'PLC Modbus连接成功',
        data: plcState.getConnectionStatus()
      })
    } catch (error) {
      // 连接失败
      const errorMessage = error instanceof Error ? error.message : '连接失败'
      
      plcState.updateConnectionStatus({
        isConnected: false,
        isConnecting: false,
        connectionError: errorMessage
      })
      
      // 添加错误日志
      const errorLog = plcState.addLog('ERROR', `PLC连接失败: ${errorMessage}`, 'Connection')
      plcState.broadcastLog(errorLog)
      
      // 广播状态更新
      plcState.broadcastStatus()
      
      // 如果配置了重试，尝试重新连接一次
      if (plcState.plcConfig.maxReconnectAttempts > 0) {
        // 添加重试日志
        const retryLog = plcState.addLog('INFO', '正在尝试重新连接PLC...', 'Connection')
        plcState.broadcastLog(retryLog)
        
        // 更新连接状态
        plcState.updateConnectionStatus({
          isConnecting: true,
          connectionError: null
        })
        
        // 广播状态更新
        plcState.broadcastStatus()
        
        // 等待重连间隔
        await new Promise(resolve => setTimeout(resolve, plcState.plcConfig.reconnectInterval))
        
        try {
          // 再次尝试连接
          await connectToPLC(plcState.plcConfig)
          
          // 重连成功
          plcState.updateConnectionStatus({
            isConnected: true,
            isConnecting: false,
            connectionError: null
          })
          
          // 添加重连成功日志
          const reconnectSuccessLog = plcState.addLog('INFO', 'PLC Modbus重新连接成功', 'Connection')
          plcState.broadcastLog(reconnectSuccessLog)
          
          // 广播状态更新
          plcState.broadcastStatus()
          
          return NextResponse.json({
            success: true,
            message: 'PLC Modbus重新连接成功',
            data: plcState.getConnectionStatus()
          })
        } catch (retryError) {
          // 重连失败
          const retryErrorMessage = retryError instanceof Error ? retryError.message : '重新连接失败'
          
          plcState.updateConnectionStatus({
            isConnected: false,
            isConnecting: false,
            connectionError: retryErrorMessage
          })
          
          // 添加重连失败日志
          const reconnectFailLog = plcState.addLog('ERROR', `PLC重新连接失败: ${retryErrorMessage}`, 'Connection')
          plcState.broadcastLog(reconnectFailLog)
          
          // 广播状态更新
          plcState.broadcastStatus()
          
          return NextResponse.json({
            success: false,
            error: `连接失败，重试也失败: ${retryErrorMessage}`,
            data: plcState.getConnectionStatus()
          }, { status: 500 })
        }
      }
      
      return NextResponse.json({
        success: false,
        error: errorMessage,
        data: plcState.getConnectionStatus()
      }, { status: 500 })
    }
  } catch (error) {
    console.error('PLC连接错误:', error)
    
    // 获取详细的错误信息
    let errorMessage = '连接PLC失败'
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String((error as any).message)
    }
    
    // 更新连接状态
    plcState.updateConnectionStatus({
      isConnected: false,
      isConnecting: false,
      connectionError: errorMessage
    })
    
    // 添加错误日志
    const errorLog = plcState.addLog('ERROR', `PLC连接错误: ${errorMessage}`, 'Connection')
    plcState.broadcastLog(errorLog)
    
    // 广播状态更新
    plcState.broadcastStatus()
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      data: plcState.getConnectionStatus()
    }, { status: 500 })
  }
}

/**
 * @swagger
 * /plc/connect:
 *   delete:
 *     summary: 断开PLC连接
 *     description: 断开当前的PLC Modbus连接
 *     tags:
 *       - PLC连接
 *     responses:
 *       200:
 *         description: 成功断开PLC连接
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
 *                   example: "PLC连接已断开"
 *                 data:
 *                   $ref: '#/components/schemas/PLCStatus'
 *       500:
 *         description: 断开连接失败
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "断开连接失败"
 *                 data:
 *                   $ref: '#/components/schemas/PLCStatus'
 */
export async function DELETE() {
  try {
    // 断开PLC连接
    disconnectFromPLC()
    
    // 更新连接状态
    plcState.updateConnectionStatus({
      isConnected: false,
      isConnecting: false,
      connectionError: null
    })
    
    // 添加断开连接日志
    const log = plcState.addLog('INFO', 'PLC连接已断开', 'Connection')
    plcState.broadcastLog(log)
    
    // 广播状态更新
    plcState.broadcastStatus()
    
    return NextResponse.json({
      success: true,
      message: 'PLC连接已断开',
      data: plcState.getConnectionStatus()
    })
  } catch (error) {
    console.error('断开PLC连接错误:', error)
    
    const errorMessage = error instanceof Error ? error.message : '断开连接失败'
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      data: plcState.getConnectionStatus()
    }, { status: 500 })
  }
} 