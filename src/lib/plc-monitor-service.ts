/**
 * PLC监控服务 - 监控特定PLC地址并触发相应操作
 */

// 添加规则执行日志的辅助函数
async function addRuleExecutionLog(message: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO', details?: string): Promise<void> {
  try {
    const response = await fetch('/api/plc/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        level,
        message,
        source: 'Rule Engine',
        details
      })
    });
    
    if (!response.ok) {
      console.error('添加规则执行日志失败:', await response.text());
    }
  } catch (error) {
    console.error('添加规则执行日志时发生错误:', error);
  }
}

/**
 * 写寄存器并验证的通用函数
 * @param address 寄存器地址
 * @param value 要写入的值
 * @param description 操作描述
 * @param isFloat32 是否为32位浮点数寄存器
 * @returns 写入并验证成功返回true，否则抛出错误
 */
async function writeRegisterWithVerification(
  address: number, 
  value: number, 
  description: string, 
  isFloat32: boolean = false
): Promise<boolean> {
  console.log(`✍️ 写入${isFloat32 ? '32位浮点数' : ''}寄存器D${address}: ${value} (${description})`);
  await addRuleExecutionLog(`开始写入D${address}：${value} (${description})`);
  
  // 1. 写入寄存器
  const writeEndpoint = isFloat32 ? '/api/plc/float32' : '/api/plc/registers';
  const writeResponse = await fetch(writeEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'holding',
      address: address,
      value: value
    })
  });
  
  if (!writeResponse.ok) {
    const errorText = await writeResponse.text();
    const errorMsg = `写入D${address}失败: ${errorText}`;
    await addRuleExecutionLog(errorMsg, 'ERROR');
    throw new Error(errorMsg);
  }
  
  console.log(`✅ 写入D${address}完成，开始验证...`);
  await addRuleExecutionLog(`写入D${address}完成，等待0.5秒后验证`);
  
  // 2. 等待0.5秒
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 3. 读取验证
  const readEndpoint = isFloat32 ? `/api/plc/float32?address=${address}` : `/api/plc/registers?type=holding&address=${address}&length=1`;
  const readResponse = await fetch(readEndpoint);
  
  if (!readResponse.ok) {
    const errorText = await readResponse.text();
    const errorMsg = `验证读取D${address}失败: ${errorText}`;
    await addRuleExecutionLog(errorMsg, 'ERROR');
    throw new Error(errorMsg);
  }
  
  const readData = await readResponse.json();
  const readValue = isFloat32 ? readData.data : readData.data.values[0];
  
  // 4. 验证值是否一致（对于32位浮点数使用小的误差范围）
  const isEqual = isFloat32 
    ? Math.abs(readValue - value) < 0.0001  // 32位浮点数误差容忍
    : readValue === value;  // 整数精确匹配
  
  if (!isEqual) {
    const errorMsg = `D${address}写入验证失败：期望值=${value}，实际值=${readValue}`;
    console.error(`❌ ${errorMsg}`);
    await addRuleExecutionLog(errorMsg, 'ERROR');
    throw new Error(errorMsg);
  }
  
  console.log(`✅ D${address}写入验证成功：${readValue}`);
  await addRuleExecutionLog(`D${address}写入验证成功：${readValue} (${description})`);
  
  return true;
}

// 是否已启动监控
let monitoringActive = false;
// 监控间隔（毫秒）
const MONITORING_INTERVAL = 1000; // 正常间隔1秒
const DISCONNECTED_INTERVAL = 5000; // PLC未连接时间隔5秒
// 监控定时器ID
let monitorTimer: NodeJS.Timeout | null = null;
// 静默模式 - 不记录常规检查日志
let silentMode = true;
// PLC连接状态
let isPlcConnected = false;
// 连接状态检查计数器
let connectionCheckCounter = 0;

// 心跳功能相关变量
let heartbeatActive = false;
let heartbeatTimer: NodeJS.Timeout | null = null;
const HEARTBEAT_INTERVAL = 1000; // 心跳间隔1秒
const HEARTBEAT_ADDRESS = 4005; // M4005地址

// 规则状态跟踪
let ruleStates = {
  rule1_M4000_lastState: false, // 跟踪M4000的上一次状态，用于检测上升沿
  rule2_M4001_lastState: false, // 跟踪M4001的上一次状态，用于检测状态变化
  rule2_lastExecutedBranch: '', // 记录上次执行的分支（'M4003' 或 'M4004'），避免重复执行
  rule3_M4002_lastState: false, // 跟踪M4002的上一次状态，用于检测上升沿
};

// 规则2超时时间 - 已取消超时限制，M4001触发后将无限期等待M4003/M4004
// const RULE2_TIMEOUT = 30000; // 已禁用

/**
 * 启动心跳功能
 */
export function startHeartbeat(): void {
  if (heartbeatActive) {
    console.log('心跳功能已经在运行中');
    return;
  }

  console.log('启动PLC心跳功能 (M4005)');
  heartbeatActive = true;
  
  // 立即执行一次心跳
  executeHeartbeat();
  
  // 设置定时器每秒执行心跳
  heartbeatTimer = setInterval(() => {
    if (heartbeatActive && isPlcConnected) {
      executeHeartbeat();
    }
  }, HEARTBEAT_INTERVAL);
}

/**
 * 停止心跳功能
 */
export function stopHeartbeat(): void {
  if (!heartbeatActive) {
    console.log('心跳功能未运行');
    return;
  }

  console.log('停止PLC心跳功能');
  heartbeatActive = false;
  
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

/**
 * 执行心跳 - 向M4005写入ON状态
 */
async function executeHeartbeat(): Promise<void> {
  if (!isPlcConnected) {
    return;
  }

  try {
    const response = await fetch('/api/plc/coils', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: HEARTBEAT_ADDRESS,
        value: true, // 写入ON状态
        silent: true // 静默模式，不记录日志
      })
    });

    if (!response.ok) {
      console.error(`心跳写入M${HEARTBEAT_ADDRESS}失败:`, await response.text());
      return;
    }

    // 不在日志中记录心跳成功，避免日志过多
    // console.log(`✅ 心跳成功写入M${HEARTBEAT_ADDRESS}=ON`);
  } catch (error) {
    console.error('执行心跳时发生错误:', error);
  }
}

/**
 * 启动PLC监控服务
 * @param silent 是否为静默模式（不记录常规检查日志）
 */
export function startMonitoring(silent: boolean = true): boolean {
  if (monitoringActive) {
    console.log('监控服务已经在运行中');
    return false;
  }

  console.log('启动PLC监控服务' + (silent ? '（静默模式）' : ''));
  monitoringActive = true;
  silentMode = silent;
  
  // 重置规则状态
  ruleStates.rule1_M4000_lastState = false;
  ruleStates.rule2_M4001_lastState = false;
  ruleStates.rule2_lastExecutedBranch = '';
  ruleStates.rule3_M4002_lastState = false;
  
  // 先检查一次PLC连接状态
  checkPlcConnectionStatus();
  
  // 定时检查PLC状态
  scheduleNextCheck();
  
  return true;
}

/**
 * 检查PLC连接状态
 */
async function checkPlcConnectionStatus(): Promise<boolean> {
  try {
    // 每10次定时检查才查询一次PLC状态，避免过多请求
    if (connectionCheckCounter % 10 === 0 || !isPlcConnected) {
      const response = await fetch('/api/plc/status', {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (response.ok) {
        const result = await response.json();
        const wasConnected = isPlcConnected;
        isPlcConnected = result.data && result.data.isConnected;
        
        // 如果连接状态发生变化，重新安排检查
        if (wasConnected !== isPlcConnected) {
          console.log(`PLC连接状态变化: ${isPlcConnected ? '已连接' : '未连接'}`);
          if (monitorTimer) {
            clearTimeout(monitorTimer);
          }
          scheduleNextCheck();
        }
      } else {
        isPlcConnected = false;
      }
    }
    
    connectionCheckCounter++;
    return isPlcConnected;
  } catch (error) {
    console.error('检查PLC连接状态失败:', error);
    isPlcConnected = false;
    return false;
  }
}

/**
 * 规则1：M4000触发的钢筋测量位置计算
 * 当M4000为ON时，读取D2012(钢筋圈半径)和D2016(钢筋直径)，
 * 相加后找到最近的测量位置，写入D2000，然后复位M4000
 */
async function executeRule1(): Promise<void> {
  try {
    // 1. 读取M4000状态（静默模式，不记录日志）
    const m4000Response = await fetch('/api/plc/coils?address=4000&length=1&silent=true');
    if (!m4000Response.ok) {
      if (!silentMode) console.error('读取M4000失败:', await m4000Response.text());
      return;
    }
    
    const m4000Data = await m4000Response.json();
    const currentM4000State = m4000Data.data[0]; // 当前M4000状态
    
    // 检测M4000的上升沿（从OFF变为ON）
    const isM4000RisingEdge = !ruleStates.rule1_M4000_lastState && currentM4000State;
    ruleStates.rule1_M4000_lastState = currentM4000State;
    
    // 只有在检测到上升沿时才执行规则
    if (!isM4000RisingEdge) {
      return;
    }
    
    console.log('🔥 规则1触发：检测到M4000上升沿，开始执行钢筋测量位置计算...');
    
    // 添加规则1执行日志
    await addRuleExecutionLog('规则1触发：M4000为ON，开始执行钢筋测量位置计算');
    
    // 2. 读取D2012(钢筋圈半径)和D2016(钢筋直径) - 使用float32读取
    const [d2012Response, d2016Response] = await Promise.all([
      fetch('/api/plc/float32?address=2012'),
      fetch('/api/plc/float32?address=2016')
    ]);
    
    if (!d2012Response.ok || !d2016Response.ok) {
      console.error('读取D2012或D2016失败');
      return;
    }
    
    const d2012Data = await d2012Response.json();
    const d2016Data = await d2016Response.json();
    
    const steelRadius = d2012Data.data; // 钢筋圈半径
    const steelDiameter = d2016Data.data; // 钢筋直径
    const targetValue = steelRadius + steelDiameter; // 相加结果
    
    console.log(`📊 读取到钢筋参数: 圈半径=${steelRadius}, 直径=${steelDiameter}, 目标值=${targetValue}`);
    
    // 记录读取到的参数
    await addRuleExecutionLog(`读取钢筋参数：圈半径=${steelRadius}, 直径=${steelDiameter}, 计算目标值=${targetValue}`);
    
    // 3. 获取所有测量位置
    const measurePositionsResponse = await fetch('/api/measure-positions');
    if (!measurePositionsResponse.ok) {
      const errorText = await measurePositionsResponse.text();
      console.error('获取测量位置失败:', measurePositionsResponse.status, errorText);
      return;
    }
    
    const measurePositionsData = await measurePositionsResponse.json();
    const positions = measurePositionsData.data;
    
    if (!positions || positions.length === 0) {
      console.error('没有找到测量位置数据');
      return;
    }
    
    // 4. 找到比目标值大一点的最近位置
    let closestPosition = null;
    let minDifference = Infinity;
    
    for (const position of positions) {
      const difference = position.value - targetValue;
      // 只考虑比目标值大的位置，并且找到差值最小的
      if (difference > 0 && difference < minDifference) {
        minDifference = difference;
        closestPosition = position;
      }
    }
    
    if (!closestPosition) {
      console.warn(`⚠️ 未找到比目标值${targetValue}大的测量位置`);
      await addRuleExecutionLog(`警告：未找到比目标值${targetValue}大的测量位置`, 'WARN');
      // 如果没有找到比目标值大的位置，使用最大的位置
      closestPosition = positions.reduce((max: any, pos: any) => pos.value > max.value ? pos : max, positions[0]);
      console.log(`📍 使用最大测量位置: ${closestPosition.name} = ${closestPosition.value}`);
      await addRuleExecutionLog(`使用最大测量位置：${closestPosition.name} = ${closestPosition.value}`);
    } else {
      console.log(`📍 找到最佳测量位置: ${closestPosition.name} = ${closestPosition.value} (差值: ${minDifference.toFixed(2)})`);
      await addRuleExecutionLog(`找到最佳测量位置：${closestPosition.name} = ${closestPosition.value} (差值: ${minDifference.toFixed(2)})`);
    }
    
    // 5. 将选定的测量位置值写入D2000并验证 - 使用float32写入
    try {
      await writeRegisterWithVerification(
        2000, 
        closestPosition.value, 
        `规则1：写入最佳测量位置 ${closestPosition.name}`, 
        true
      );
    } catch (error) {
      console.error('写入D2000验证失败，终止规则1执行:', error);
      await addRuleExecutionLog(`规则1终止：写入D2000验证失败 - ${error instanceof Error ? error.message : '未知错误'}`, 'ERROR');
      return;
    }
    
    // 6. 复位M4000为OFF
    const resetM4000Response = await fetch('/api/plc/coils', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: 4000,
        value: false
      })
    });
    
    if (!resetM4000Response.ok) {
      console.error('复位M4000失败:', await resetM4000Response.text());
      return;
    }
    
    console.log('✅ 成功复位M4000为OFF');
    await addRuleExecutionLog('成功复位M4000为OFF');
    
    console.log('🎉 规则1执行完成！');
    await addRuleExecutionLog('规则1执行完成！钢筋测量位置计算成功');
    
  } catch (error) {
    console.error('执行规则1时发生错误:', error);
    await addRuleExecutionLog(`规则1执行失败：${error instanceof Error ? error.message : '未知错误'}`, 'ERROR');
  }
}

/**
 * 规则2：M4001状态检测逻辑
 * 当M4001为ON时，检测M4003和M4004的状态：
 * - 如果M4003为ON，则执行M4003分支逻辑
 * - 如果M4004为ON，则执行M4004分支逻辑
 */
async function executeRule2(): Promise<void> {
  try {
    // 1. 读取所有相关线圈状态
    const [m4001Response, m4003Response, m4004Response] = await Promise.all([
      fetch('/api/plc/coils?address=4001&length=1&silent=true'),
      fetch('/api/plc/coils?address=4003&length=1&silent=true'),
      fetch('/api/plc/coils?address=4004&length=1&silent=true')
    ]);
    
    if (!m4001Response.ok || !m4003Response.ok || !m4004Response.ok) {
      if (!silentMode) console.error('读取M4001/M4003/M4004失败');
      return;
    }
    
    const m4001Data = await m4001Response.json();
    const m4003Data = await m4003Response.json();
    const m4004Data = await m4004Response.json();
    
    const currentM4001State = m4001Data.data[0];
    const currentM4003State = m4003Data.data[0];
    const currentM4004State = m4004Data.data[0];
    
    // 检测M4001状态变化（用于日志记录）
    const m4001StateChanged = ruleStates.rule2_M4001_lastState !== currentM4001State;
    
    // 更新M4001状态
    ruleStates.rule2_M4001_lastState = currentM4001State;
    
    // 如果M4001为OFF，清除上次执行记录并返回
    if (!currentM4001State) {
      if (ruleStates.rule2_lastExecutedBranch !== '') {
        ruleStates.rule2_lastExecutedBranch = '';
        if (m4001StateChanged) {
          console.log('📴 规则2：M4001变为OFF，重置执行状态');
          await addRuleExecutionLog('规则2：M4001变为OFF，重置执行状态');
        }
      }
      return;
    }
    
    // M4001为ON时，检测M4003和M4004状态
    if (m4001StateChanged) {
      console.log('🔥 规则2：M4001变为ON，开始检测M4003和M4004状态...');
      await addRuleExecutionLog('规则2：M4001变为ON，开始检测M4003和M4004状态');
    }
    
    // 确定当前应该执行的分支
    let currentBranch = '';
    if (currentM4003State && currentM4004State) {
      // 如果M4003和M4004都为ON，优先执行M4003分支
      currentBranch = 'M4003';
      console.log('⚠️ 规则2：M4003和M4004都为ON，优先执行M4003分支');
    } else if (currentM4003State) {
      currentBranch = 'M4003';
    } else if (currentM4004State) {
      currentBranch = 'M4004';
    }
    
    // 如果没有有效分支或与上次执行的分支相同，则不执行
    if (!currentBranch || currentBranch === ruleStates.rule2_lastExecutedBranch) {
      return;
    }
    
    // 执行相应分支逻辑
    if (currentBranch === 'M4003') {
      console.log('🔥 规则2：M4003为ON，执行M4003分支逻辑...');
      await addRuleExecutionLog('规则2：M4003为ON，开始执行M4003分支');
      
      // 执行M4003分支逻辑
      await processM4003Logic();
      
      console.log('✅ M4003分支执行完成');
      await addRuleExecutionLog('规则2：M4003分支执行完成');
      
    } else if (currentBranch === 'M4004') {
      console.log('🔥 规则2：M4004为ON，执行M4004分支逻辑...');
      await addRuleExecutionLog('规则2：M4004为ON，开始执行M4004分支');
      
      // 执行M4004分支逻辑
      await processM4004Logic();
      
      console.log('✅ M4004分支执行完成');
      await addRuleExecutionLog('规则2：M4004分支执行完成');
    }
    
    // 复位M4001为OFF
    const resetM4001Response = await fetch('/api/plc/coils', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: 4001,
        value: false
      })
    });
    
    if (!resetM4001Response.ok) {
      console.error('复位M4001失败:', await resetM4001Response.text());
      await addRuleExecutionLog('复位M4001失败', 'ERROR');
    } else {
      console.log('✅ 成功复位M4001为OFF');
      await addRuleExecutionLog('成功复位M4001为OFF');
    }
    
    // 记录已执行的分支，避免重复执行
    ruleStates.rule2_lastExecutedBranch = currentBranch;
    
  } catch (error) {
    console.error('执行规则2时发生错误:', error);
    await addRuleExecutionLog(`规则2执行失败: ${error instanceof Error ? error.message : '未知错误'}`, 'ERROR');
    // 发生错误时重置执行状态
    ruleStates.rule2_lastExecutedBranch = '';
  }
}

/**
 * 处理M4003为ON时的逻辑
 * 读D2020，读笼子节数D2044，当笼子节数D2044为1时，将D2020的值写入D2004
 * 当D2044大于1时，进行复杂计算
 */
async function processM4003Logic(): Promise<void> {
  console.log('🔄 开始处理M4003逻辑...');
  await addRuleExecutionLog('开始处理M4003逻辑');
  
  // 读取D2020和D2044
  const [d2020Response, d2044Response] = await Promise.all([
    fetch('/api/plc/float32?address=2020'),
    fetch('/api/plc/float32?address=2044')
  ]);
  
  if (!d2020Response.ok || !d2044Response.ok) {
    throw new Error('读取D2020或D2044失败');
  }
  
  const d2020Data = await d2020Response.json();
  const d2044Data = await d2044Response.json();
  const d2020Value = d2020Data.data; // D2020值
  const cageNodes = d2044Data.data; // 笼子节数D2044
  
  console.log(`📊 D2020值: ${d2020Value}, 笼子节数D2044: ${cageNodes}`);
  
  if (cageNodes === 1) {
    // 当笼子节数为1时，直接将D2020的值写入D2004
    try {
      await writeToD2004(d2020Value, 'M4003逻辑：笼子节数为1，直接写入D2020值');
    } catch (error) {
      console.error('M4003逻辑：写入D2004验证失败，终止执行:', error);
      await addRuleExecutionLog(`M4003逻辑终止：写入D2004验证失败 - ${error instanceof Error ? error.message : '未知错误'}`, 'ERROR');
      throw error; // 重新抛出错误以终止规则2执行
    }
  } else if (cageNodes > 1) {
    // 当笼子节数大于1时，进行复杂计算
    await processComplexCalculation(d2020Value, cageNodes, 'M4003逻辑');
  } else {
    console.warn('⚠️ 笼子节数D2044小于1，无法处理');
    await addRuleExecutionLog(`M4003逻辑警告：笼子节数D2044(${cageNodes})小于1`, 'WARN');
  }
}

/**
 * 处理M4004为ON时的逻辑
 * 读D2024，读笼子节数D2044，当笼子节数D2044为1时，将D2024的值写入D2004
 * 当D2044大于1时，进行复杂计算
 */
async function processM4004Logic(): Promise<void> {
  console.log('🔄 开始处理M4004逻辑...');
  await addRuleExecutionLog('开始处理M4004逻辑');
  
  // 读取D2024和D2044
  const [d2024Response, d2044Response] = await Promise.all([
    fetch('/api/plc/float32?address=2024'),
    fetch('/api/plc/float32?address=2044')
  ]);
  
  if (!d2024Response.ok || !d2044Response.ok) {
    throw new Error('读取D2024或D2044失败');
  }
  
  const d2024Data = await d2024Response.json();
  const d2044Data = await d2044Response.json();
  const d2024Value = d2024Data.data; // D2024值
  const cageNodes = d2044Data.data; // 笼子节数D2044
  
  console.log(`📊 D2024值: ${d2024Value}, 笼子节数D2044: ${cageNodes}`);
  
  if (cageNodes === 1) {
    // 当笼子节数为1时，直接将D2024的值写入D2004
    try {
      await writeToD2004(d2024Value, 'M4004逻辑：笼子节数为1，直接写入D2024值');
    } catch (error) {
      console.error('M4004逻辑：写入D2004验证失败，终止执行:', error);
      await addRuleExecutionLog(`M4004逻辑终止：写入D2004验证失败 - ${error instanceof Error ? error.message : '未知错误'}`, 'ERROR');
      throw error; // 重新抛出错误以终止规则2执行
    }
  } else if (cageNodes > 1) {
    // 当笼子节数大于1时，进行复杂计算
    await processComplexCalculation(d2024Value, cageNodes, 'M4004逻辑');
  } else {
    console.warn('⚠️ 笼子节数D2044小于1，无法处理');
    await addRuleExecutionLog(`M4004逻辑警告：笼子节数D2044(${cageNodes})小于1`, 'WARN');
  }
}

/**
 * 复杂计算逻辑
 * @param sourceValue 源值（D2020或D2024）
 * @param cageNodes 笼子节数D2044
 * @param logPrefix 日志前缀
 */
async function processComplexCalculation(
  sourceValue: number,
  cageNodes: number,
  logPrefix: string
): Promise<void> {
  console.log(`🔄 ${logPrefix}：开始复杂计算 (笼子节数: ${cageNodes})`);
  
  // 读取其他必需的数据：D4012角度、型号D2040、笼子编号D2048
  const [d4012Response, d2040Response, d2048Response] = await Promise.all([
    fetch('/api/plc/float32?address=4012'),
    fetch('/api/plc/float32?address=2040'),
    fetch('/api/plc/float32?address=2048')
  ]);
  
  if (!d4012Response.ok || !d2040Response.ok || !d2048Response.ok) {
    throw new Error('读取D4012、D2040、D2048失败');
  }
  
  const d4012Data = await d4012Response.json();
  const d2040Data = await d2040Response.json();
  const d2048Data = await d2048Response.json();
  
  const angle = d4012Data.data; // D4012角度
  const model = d2040Data.data; // 型号D2040
  const cageNum = d2048Data.data; // 笼子编号D2048
  
  console.log(`📊 角度D4012: ${angle}, 型号D2040: ${model}, 笼子编号D2048: ${cageNum}`);
  
  // 计算要查询的笼子节数（当前节数-1）
  const queryNodes = cageNodes - 1;
  console.log(`🔍 查询数据库中笼子节数为 ${queryNodes} 对应角度 ${angle} 的记录...`);
  
  // 在数据库中查找对应的差值字段
  const syPlcResponse = await fetch(`/api/sy-plc?model=${model}&cageNodes=${queryNodes}&angle=${angle}&cageNum=${cageNum}`);
  
  if (!syPlcResponse.ok) {
    throw new Error('查询SyPlc数据库失败');
  }
  
  const syPlcData = await syPlcResponse.json();
  
  if (!syPlcData.success || syPlcData.data.length === 0) {
    console.warn(`⚠️ 未找到匹配的数据库记录 (型号:${model}, 笼子节数:${queryNodes}, 角度:${angle}, 笼子编号:${cageNum})`);
    await addRuleExecutionLog(`${logPrefix}警告：未找到匹配的数据库记录`, 'WARN');
    
    // 如果没有找到匹配记录，直接使用源值
    try {
      await writeToD2004(sourceValue, `${logPrefix}：未找到数据库记录，直接使用源值`);
    } catch (error) {
      console.error(`${logPrefix}：写入D2004验证失败，终止执行:`, error);
      await addRuleExecutionLog(`${logPrefix}终止：写入D2004验证失败 - ${error instanceof Error ? error.message : '未知错误'}`, 'ERROR');
      throw error;
    }
    return;
  }
  
  // 获取上一节对应角度的差值字段
  const differenceValue = syPlcData.data[0].difference;
  console.log(`📊 找到上一节笼子对应角度的差值: ${differenceValue}`);
  
  if (differenceValue === null || differenceValue === undefined) {
    console.warn(`⚠️ 数据库记录中差值字段为空`);
    await addRuleExecutionLog(`${logPrefix}警告：数据库记录中差值字段为空，直接使用源值`, 'WARN');
    
    // 如果差值字段为空，直接使用源值
    try {
      await writeToD2004(sourceValue, `${logPrefix}：差值字段为空，直接使用源值`);
    } catch (error) {
      console.error(`${logPrefix}：写入D2004验证失败，终止执行:`, error);
      await addRuleExecutionLog(`${logPrefix}终止：写入D2004验证失败 - ${error instanceof Error ? error.message : '未知错误'}`, 'ERROR');
      throw error;
    }
    return;
  }
  
  // 计算最终结果：源值 - 差值
  const finalResult = sourceValue - differenceValue;
  console.log(`📊 最终结果: ${sourceValue} - ${differenceValue} = ${finalResult}`);
  
  await addRuleExecutionLog(`${logPrefix}计算完成：${sourceValue} - ${differenceValue} = ${finalResult}`);
  
  // 写入D2004
  try {
    await writeToD2004(finalResult, `${logPrefix}：复杂计算结果`);
  } catch (error) {
    console.error(`${logPrefix}：写入D2004验证失败，终止执行:`, error);
    await addRuleExecutionLog(`${logPrefix}终止：写入D2004验证失败 - ${error instanceof Error ? error.message : '未知错误'}`, 'ERROR');
    throw error;
  }
}

/**
 * 写入D2004的通用函数（带验证）
 * @param value 要写入的值
 * @param description 描述信息
 */
async function writeToD2004(value: number, description: string): Promise<void> {
  await writeRegisterWithVerification(2004, value, description, true);
}

/**
 * 安排下一次检查
 */
function scheduleNextCheck(): void {
  if (!monitoringActive) return;
  
  // 根据PLC连接状态决定检查间隔
  const interval = isPlcConnected ? MONITORING_INTERVAL : DISCONNECTED_INTERVAL;
  
  monitorTimer = setTimeout(async () => {
    if (!monitoringActive) return;
    
    try {
      // 先检查PLC是否连接
      const connected = await checkPlcConnectionStatus();
      
      // 只有在PLC已连接的情况下才检查各个触发点状态
      if (connected) {
        // 执行规则1：M4000触发的钢筋测量位置计算
        await executeRule1();
        
        // 执行规则2：M4001触发的钢筋长度计算和写入D2004
        await executeRule2();
        
        // 执行规则3：M4002触发的数据采集和数据库写入
        await executeRule3();
      }
    } catch (error) {
      console.error('监控服务异常:', error);
    } finally {
      // 安排下一次检查，无论本次是否成功
      scheduleNextCheck();
    }
  }, interval);
}

/**
 * 停止PLC监控服务
 */
export function stopMonitoring(): boolean {
  if (!monitoringActive) {
    console.log('监控服务未运行');
    return false;
  }
  
  console.log('停止PLC监控服务');
  monitoringActive = false;
  
  if (monitorTimer) {
    clearTimeout(monitorTimer);
    monitorTimer = null;
  }
  
  // 停止心跳功能
  stopHeartbeat();
  
  return true;
}

/**
 * 获取监控状态
 */
export function isMonitoring(): boolean {
  return monitoringActive;
}

/**
 * 获取心跳状态
 */
export function isHeartbeatActive(): boolean {
  return heartbeatActive;
}

/**
 * 获取规则2的状态信息（用于调试）
 */
export function getRule2Status(): any {
  return {
    isMonitoring: monitoringActive,
    M4001State: ruleStates.rule2_M4001_lastState,
    lastExecutedBranch: ruleStates.rule2_lastExecutedBranch,
    description: ruleStates.rule2_M4001_lastState 
      ? `M4001为ON，上次执行分支：${ruleStates.rule2_lastExecutedBranch || '无'}`
      : 'M4001为OFF'
  };
}

/**
 * 规则3：M4002触发的数据采集和数据库写入
 * 当M4002为ON时，读取M4003和M4004状态，根据状态选择不同的理论长度寄存器，
 * 读取多个寄存器值，计算钢筋实际长度和差值，然后写入数据库
 */
async function executeRule3(): Promise<void> {
  try {
    // 1. 读取M4002状态
    const m4002Response = await fetch('/api/plc/coils?address=4002&length=1&silent=true');
    
    if (!m4002Response.ok) {
      if (!silentMode) console.error('读取M4002失败');
      return;
    }
    
    const m4002Data = await m4002Response.json();
    const currentM4002State = m4002Data.data[0];
    
    // 检测M4002的上升沿
    const isM4002RisingEdge = !ruleStates.rule3_M4002_lastState && currentM4002State;
    
    // 更新状态
    ruleStates.rule3_M4002_lastState = currentM4002State;
    
    // 如果不是上升沿，直接返回
    if (!isM4002RisingEdge) {
      return;
    }
    
    console.log('🚀 规则3触发：M4002上升沿检测到');
    await addRuleExecutionLog('规则3触发：M4002上升沿检测到');
    
    // 2. 读取M4003和M4004状态
    console.log('🔍 读取M4003和M4004状态...');
    await addRuleExecutionLog('开始读取M4003和M4004状态');
    
    const [m4003Response, m4004Response] = await Promise.all([
      fetch('/api/plc/coils?address=4003&length=1&silent=true'),
      fetch('/api/plc/coils?address=4004&length=1&silent=true')
    ]);
    
    if (!m4003Response.ok || !m4004Response.ok) {
      throw new Error('读取M4003或M4004失败');
    }
    
    const m4003Data = await m4003Response.json();
    const m4004Data = await m4004Response.json();
    const currentM4003State = m4003Data.data[0];
    const currentM4004State = m4004Data.data[0];
    
    console.log(`📊 M4003状态: ${currentM4003State ? 'ON' : 'OFF'}, M4004状态: ${currentM4004State ? 'ON' : 'OFF'}`);
    await addRuleExecutionLog(`M4003状态: ${currentM4003State ? 'ON' : 'OFF'}, M4004状态: ${currentM4004State ? 'ON' : 'OFF'}`);
    
    // 3. 根据M4003和M4004状态确定执行分支
    if (currentM4003State) {
      console.log('🔥 M4003为ON，执行M4003分支逻辑');
      await addRuleExecutionLog('M4003为ON，开始执行M4003分支');
      await processRule3M4003Logic();
    } else if (currentM4004State) {
      console.log('🔥 M4004为ON，执行M4004分支逻辑');
      await addRuleExecutionLog('M4004为ON，开始执行M4004分支');
      await processRule3M4004Logic();
    } else {
      console.log('⚠️ M4003和M4004都为OFF，无法执行数据采集');
      await addRuleExecutionLog('M4003和M4004都为OFF，跳过数据采集', 'WARN');
    }
    
    // 4. 复位M4002为OFF
    const resetM4002Response = await fetch('/api/plc/coils', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: 4002,
        value: false
      })
    });
    
    if (!resetM4002Response.ok) {
      console.error('复位M4002失败:', await resetM4002Response.text());
      return;
    }
    
    console.log('✅ 成功复位M4002为OFF');
    await addRuleExecutionLog('成功复位M4002为OFF');
    
    console.log('🎉 规则3执行完成！');
    await addRuleExecutionLog('规则3执行完成！');
    
  } catch (error) {
    console.error('执行规则3时发生错误:', error);
    await addRuleExecutionLog(`规则3执行失败：${error instanceof Error ? error.message : '未知错误'}`, 'ERROR');
  }
}

/**
 * 处理规则3的M4003分支逻辑
 * 读取理论长度D2028，读取其他相关寄存器，计算差值，写入数据库
 */
async function processRule3M4003Logic(): Promise<void> {
  console.log('🔄 开始处理规则3的M4003分支逻辑...');
  await addRuleExecutionLog('开始处理规则3的M4003分支逻辑');
  
  // 读取所有需要的寄存器值
  console.log('📖 开始读取寄存器数据...');
  await addRuleExecutionLog('开始读取寄存器数据');
  
  const [
    d2028Response, // 理论长度 (M4003分支)
    d2040Response, // 型号
    d2044Response, // 笼子节数
    d2048Response, // 笼子编号
    d4012Response, // 主轴角度
    d4028Response, // 北伺服位置
    d4044Response, // 南伺服位置
    d2052Response  // 总节数
  ] = await Promise.all([
    fetch('/api/plc/float32?address=2028&silent=true'),
    fetch('/api/plc/float32?address=2040&silent=true'),
    fetch('/api/plc/float32?address=2044&silent=true'),
    fetch('/api/plc/float32?address=2048&silent=true'),
    fetch('/api/plc/float32?address=4012&silent=true'),
    fetch('/api/plc/float32?address=4028&silent=true'),
    fetch('/api/plc/float32?address=4044&silent=true'),
    fetch('/api/plc/float32?address=2052&silent=true')
  ]);
  
  // 检查所有响应
  if (!d2028Response.ok || !d2040Response.ok || !d2044Response.ok || !d2048Response.ok ||
      !d4012Response.ok || !d4028Response.ok || !d4044Response.ok || !d2052Response.ok) {
    throw new Error('读取寄存器失败');
  }
  
  // 解析数据
  const theoreticalLength = (await d2028Response.json()).data;
  const modelD2040 = (await d2040Response.json()).data;
  const cageNodesD2044 = (await d2044Response.json()).data;
  const cageNumD2048 = (await d2048Response.json()).data;
  const spindleAngleD4012 = (await d4012Response.json()).data;
  const northServoD4028 = (await d4028Response.json()).data;
  const southServoD4044 = (await d4044Response.json()).data;
  const totalNodesD2052 = (await d2052Response.json()).data;
  
  console.log('📊 读取到的寄存器数据:');
  console.log(`  D2028(理论长度): ${theoreticalLength}`);
  console.log(`  D2040(型号): ${modelD2040}`);
  console.log(`  D2044(笼子节数): ${cageNodesD2044}`);
  console.log(`  D2048(笼子编号): ${cageNumD2048}`);
  console.log(`  D4012(主轴角度): ${spindleAngleD4012}`);
  console.log(`  D4028(北伺服位置): ${northServoD4028}`);
  console.log(`  D4044(南伺服位置): ${southServoD4044}`);
  console.log(`  D2052(总节数): ${totalNodesD2052}`);
  
  await addRuleExecutionLog(`M4003分支读取寄存器数据：理论长度=${theoreticalLength}, 型号=${modelD2040}, 笼子节数=${cageNodesD2044}, 笼子编号=${cageNumD2048}, 主轴角度=${spindleAngleD4012}, 北伺服位置=${northServoD4028}, 南伺服位置=${southServoD4044}, 总节数=${totalNodesD2052}`);
  
  // 计算钢筋实际长度：D4044 - D4028
  const actualRebarLength = southServoD4044 - northServoD4028;
  
  console.log(`🧮 计算钢筋实际长度: ${southServoD4044} - ${northServoD4028} = ${actualRebarLength}`);
  await addRuleExecutionLog(`计算钢筋实际长度: ${southServoD4044} - ${northServoD4028} = ${actualRebarLength}`);
  
  // 计算差值：理论长度 - 实际长度
  const difference = theoreticalLength - actualRebarLength;
  
  console.log(`🧮 计算差值: ${theoreticalLength} - ${actualRebarLength} = ${difference}`);
  await addRuleExecutionLog(`计算差值: ${theoreticalLength} - ${actualRebarLength} = ${difference}`);
  
  // 根据笼子节数是否等于总节数决定存储策略
  let finalActualLength: number | null = actualRebarLength;
  let finalDifference: number | null = difference;
  
  if (cageNodesD2044 === totalNodesD2052) {
    finalActualLength = null;
    finalDifference = null;
    console.log('⚠️ 笼子节数等于总节数，实际长度和差值存储为null');
    await addRuleExecutionLog('笼子节数等于总节数，实际长度和差值存储为null');
  }
  
  // 查询并处理数据库记录
  console.log('💾 开始处理数据库记录...');
  await addRuleExecutionLog('开始查询数据库是否存在重复记录');
  
  const dbResponse = await fetch('/api/sy-plc', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      modelD2040: modelD2040,
      cageNodesD2044: cageNodesD2044,
      cageNumD2048: cageNumD2048,
      spindleAngleD4012: spindleAngleD4012,
      actualRebarLength: finalActualLength,
      theoreticalLength: theoreticalLength,
      difference: finalDifference,
      totalNodesD2052: totalNodesD2052
    })
  });
  
  if (!dbResponse.ok) {
    const errorText = await dbResponse.text();
    throw new Error(`处理数据库记录失败: ${errorText}`);
  }
  
  const dbResult = await dbResponse.json();
  
  if (dbResult.isUpdate) {
    console.log('🔄 更新现有记录:', dbResult);
    await addRuleExecutionLog(`M4003分支：发现重复记录，更新数据，记录ID: ${dbResult.data?.id || '未知'}`);
  } else {
    console.log('✅ 创建新记录:', dbResult);
    await addRuleExecutionLog(`M4003分支：未发现重复记录，创建新数据记录，记录ID: ${dbResult.data?.id || '未知'}`);
  }
  
  console.log('✅ M4003分支执行完成');
  await addRuleExecutionLog('规则3的M4003分支执行完成');
}

/**
 * 处理规则3的M4004分支逻辑
 * 读取理论长度D2032，读取其他相关寄存器，计算差值，写入数据库
 */
async function processRule3M4004Logic(): Promise<void> {
  console.log('🔄 开始处理规则3的M4004分支逻辑...');
  await addRuleExecutionLog('开始处理规则3的M4004分支逻辑');
  
  // 读取所有需要的寄存器值
  console.log('📖 开始读取寄存器数据...');
  await addRuleExecutionLog('开始读取寄存器数据');
  
  const [
    d2032Response, // 理论长度 (M4004分支)
    d2040Response, // 型号
    d2044Response, // 笼子节数
    d2048Response, // 笼子编号
    d4012Response, // 主轴角度
    d4028Response, // 北伺服位置
    d4044Response, // 南伺服位置
    d2052Response  // 总节数
  ] = await Promise.all([
    fetch('/api/plc/float32?address=2032&silent=true'),
    fetch('/api/plc/float32?address=2040&silent=true'),
    fetch('/api/plc/float32?address=2044&silent=true'),
    fetch('/api/plc/float32?address=2048&silent=true'),
    fetch('/api/plc/float32?address=4012&silent=true'),
    fetch('/api/plc/float32?address=4028&silent=true'),
    fetch('/api/plc/float32?address=4044&silent=true'),
    fetch('/api/plc/float32?address=2052&silent=true')
  ]);
  
  // 检查所有响应
  if (!d2032Response.ok || !d2040Response.ok || !d2044Response.ok || !d2048Response.ok ||
      !d4012Response.ok || !d4028Response.ok || !d4044Response.ok || !d2052Response.ok) {
    throw new Error('读取寄存器失败');
  }
  
  // 解析数据
  const theoreticalLength = (await d2032Response.json()).data;
  const modelD2040 = (await d2040Response.json()).data;
  const cageNodesD2044 = (await d2044Response.json()).data;
  const cageNumD2048 = (await d2048Response.json()).data;
  const spindleAngleD4012 = (await d4012Response.json()).data;
  const northServoD4028 = (await d4028Response.json()).data;
  const southServoD4044 = (await d4044Response.json()).data;
  const totalNodesD2052 = (await d2052Response.json()).data;
  
  console.log('📊 读取到的寄存器数据:');
  console.log(`  D2032(理论长度): ${theoreticalLength}`);
  console.log(`  D2040(型号): ${modelD2040}`);
  console.log(`  D2044(笼子节数): ${cageNodesD2044}`);
  console.log(`  D2048(笼子编号): ${cageNumD2048}`);
  console.log(`  D4012(主轴角度): ${spindleAngleD4012}`);
  console.log(`  D4028(北伺服位置): ${northServoD4028}`);
  console.log(`  D4044(南伺服位置): ${southServoD4044}`);
  console.log(`  D2052(总节数): ${totalNodesD2052}`);
  
  await addRuleExecutionLog(`M4004分支读取寄存器数据：理论长度=${theoreticalLength}, 型号=${modelD2040}, 笼子节数=${cageNodesD2044}, 笼子编号=${cageNumD2048}, 主轴角度=${spindleAngleD4012}, 北伺服位置=${northServoD4028}, 南伺服位置=${southServoD4044}, 总节数=${totalNodesD2052}`);
  
  // 计算钢筋实际长度：D4044 - D4028
  const actualRebarLength = southServoD4044 - northServoD4028;
  
  console.log(`🧮 计算钢筋实际长度: ${southServoD4044} - ${northServoD4028} = ${actualRebarLength}`);
  await addRuleExecutionLog(`计算钢筋实际长度: ${southServoD4044} - ${northServoD4028} = ${actualRebarLength}`);
  
  // 计算差值：理论长度 - 实际长度
  const difference = theoreticalLength - actualRebarLength;
  
  console.log(`🧮 计算差值: ${theoreticalLength} - ${actualRebarLength} = ${difference}`);
  await addRuleExecutionLog(`计算差值: ${theoreticalLength} - ${actualRebarLength} = ${difference}`);
  
  // 根据笼子节数是否等于总节数决定存储策略
  let finalActualLength: number | null = actualRebarLength;
  let finalDifference: number | null = difference;
  
  if (cageNodesD2044 === totalNodesD2052) {
    finalActualLength = null;
    finalDifference = null;
    console.log('⚠️ 笼子节数等于总节数，实际长度和差值存储为null');
    await addRuleExecutionLog('笼子节数等于总节数，实际长度和差值存储为null');
  }
  
  // 查询并处理数据库记录
  console.log('💾 开始处理数据库记录...');
  await addRuleExecutionLog('开始查询数据库是否存在重复记录');
  
  const dbResponse = await fetch('/api/sy-plc', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      modelD2040: modelD2040,
      cageNodesD2044: cageNodesD2044,
      cageNumD2048: cageNumD2048,
      spindleAngleD4012: spindleAngleD4012,
      actualRebarLength: finalActualLength,
      theoreticalLength: theoreticalLength,
      difference: finalDifference,
      totalNodesD2052: totalNodesD2052
    })
  });
  
  if (!dbResponse.ok) {
    const errorText = await dbResponse.text();
    throw new Error(`处理数据库记录失败: ${errorText}`);
  }
  
  const dbResult = await dbResponse.json();
  
  if (dbResult.isUpdate) {
    console.log('🔄 更新现有记录:', dbResult);
    await addRuleExecutionLog(`M4004分支：发现重复记录，更新数据，记录ID: ${dbResult.data?.id || '未知'}`);
  } else {
    console.log('✅ 创建新记录:', dbResult);
    await addRuleExecutionLog(`M4004分支：未发现重复记录，创建新数据记录，记录ID: ${dbResult.data?.id || '未知'}`);
  }
  
  console.log('✅ M4004分支执行完成');
  await addRuleExecutionLog('规则3的M4004分支执行完成');
}

/**
 * 复位指定的线圈为OFF状态
 * @param addresses 线圈地址数组
 * @param reason 复位原因
 */
async function resetCoils(addresses: number[], reason: string): Promise<void> {
  try {
    console.log(`🔄 开始复位线圈: ${addresses.join(', ')} (原因: ${reason})`);
    
    // 并行复位所有指定的线圈
    const resetPromises = addresses.map(async (address) => {
      try {
        const response = await fetch('/api/plc/coils', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address: address,
            value: false // 设置为OFF
          })
        });
        
        if (!response.ok) {
          throw new Error(`复位M${address}失败: ${response.statusText}`);
        }
        
        console.log(`✅ 成功复位M${address}为OFF`);
        return true;
      } catch (error) {
        console.error(`❌ 复位M${address}失败:`, error);
        await addRuleExecutionLog(`复位M${address}失败: ${error instanceof Error ? error.message : '未知错误'}`, 'ERROR');
        return false;
      }
    });
    
    // 等待所有复位操作完成
    const results = await Promise.all(resetPromises);
    const successCount = results.filter(result => result).length;
    
    if (successCount === addresses.length) {
      console.log(`✅ 所有线圈复位成功 (${successCount}/${addresses.length})`);
      await addRuleExecutionLog(`${reason}：成功复位线圈 ${addresses.map(addr => `M${addr}`).join(', ')} 为OFF`);
    } else {
      console.warn(`⚠️ 部分线圈复位失败 (成功: ${successCount}/${addresses.length})`);
      await addRuleExecutionLog(`${reason}：部分线圈复位失败 (成功: ${successCount}/${addresses.length})`, 'WARN');
    }
    
  } catch (error) {
    console.error('复位线圈时发生错误:', error);
    await addRuleExecutionLog(`复位线圈失败: ${error instanceof Error ? error.message : '未知错误'}`, 'ERROR');
  }
}

/**
 * 设置静默模式
 * @param silent 是否为静默模式
 */
export function setSilentMode(silent: boolean): void {
  silentMode = silent;
  console.log('监控服务' + (silent ? '已设置为静默模式' : '已设置为详细模式'));
}

/**
 * 在连接PLC时自动启动监控
 */
export function handlePLCConnection(isConnected: boolean): void {
  isPlcConnected = isConnected;
  
  if (isConnected) {
    startMonitoring(true); // 默认使用静默模式
    startHeartbeat(); // 连接成功后启动心跳
  } else {
    stopMonitoring();
    stopHeartbeat(); // 断开连接时停止心跳
  }
}

/**
 * 获取心跳服务状态
 */
export function getHeartbeatStatus() {
  return {
    isActive: heartbeatActive,
    isPlcConnected,
    heartbeatInterval: HEARTBEAT_INTERVAL,
    lastHeartbeatTime: heartbeatTimer ? new Date().toISOString() : null
  };
} 