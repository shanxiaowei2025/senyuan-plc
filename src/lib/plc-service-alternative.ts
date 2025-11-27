import { EventEmitter } from 'events';
import ModbusRTU from 'modbus-serial';
import { getUTC8Date } from '@/lib/utils';

// PLC配置接口
export interface PLCConfig {
  host: string;
  port: number;
  unitId: number;
  timeout: number;
  reconnectInterval: number;
  maxReconnectAttempts: number;
}

// PLC日志接口
export interface PLCLog {
  id: string;
  timestamp: Date;
  level: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
  source: string;
  details?: string;
}

// PLC连接状态接口
export interface PLCConnectionStatus {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
}

/**
 * 替代版 PLC 服务类 - 使用 modbus-serial 库
 */
export class PLCServiceAlternative extends EventEmitter {
  private client: ModbusRTU;
  private config: PLCConfig;
  private isConnected: boolean = false;
  private isConnecting: boolean = false;
  private connectionError: string | null = null;
  private logs: PLCLog[] = [];
  private maxLogs: number = 100;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;

  constructor(config: PLCConfig) {
    super();
    this.config = {
      ...config,
      maxReconnectAttempts: config.maxReconnectAttempts || 3
    };
    this.client = new ModbusRTU();
  }

  /**
   * 添加日志
   */
  private addLog(level: PLCLog['level'], message: string, source: string, details?: string) {
    const log: PLCLog = {
      id: Date.now().toString(),
      timestamp: getUTC8Date(),
      level,
      message,
      source,
      details
    };
    
    this.logs.unshift(log); // 添加到日志开头
    
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs); // 保持日志数量不超过最大值
    }
    
    this.emit('log', log);
    return log;
  }

  /**
   * 连接到PLC
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return; // 已连接，不需要重新连接
    }
    
    if (this.isConnecting) {
      throw new Error('PLC连接正在进行中');
    }
    
    this.isConnecting = true;
    this.connectionError = null;
    
    try {
      this.addLog('INFO', `开始连接PLC (${this.config.host}:${this.config.port})`, 'Connection');
      
      // 设置超时时间
      this.client.setTimeout(this.config.timeout);
      
      // 连接到TCP设备
      await this.client.connectTCP(this.config.host, { port: this.config.port });
      
      // 设置从站ID
      this.client.setID(this.config.unitId);
      
      // 尝试读取寄存器来验证连接
      try {
        // 尝试读取保持寄存器
        await this.client.readHoldingRegisters(1, 1);
        this.addLog('INFO', '连接验证成功（通过保持寄存器）', 'Connection');
      } catch (error) {
        try {
          // 尝试读取输入寄存器
          await this.client.readInputRegisters(1, 1);
          this.addLog('INFO', '连接验证成功（通过输入寄存器）', 'Connection');
        } catch (error2) {
          try {
            // 尝试读取线圈
            await this.client.readCoils(1, 1);
            this.addLog('INFO', '连接验证成功（通过线圈）', 'Connection');
          } catch (error3) {
            // 所有验证方法失败
            throw new Error('无法验证连接，请检查PLC设备参数');
          }
        }
      }
      
      // 连接成功
      this.isConnected = true;
      this.isConnecting = false;
      this.connectionError = null;
      this.reconnectAttempts = 0;
      this.addLog('INFO', 'PLC连接成功', 'Connection');
      this.emit('connected');
    } catch (error) {
      this.isConnecting = false;
      this.isConnected = false;
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.connectionError = errorMessage;
      
      this.addLog('ERROR', `PLC连接失败: ${errorMessage}`, 'Connection');
      
      // 如果配置允许重连并且未达到最大重试次数，尝试重新连接
      if (this.config.maxReconnectAttempts > 0 && this.reconnectAttempts < this.config.maxReconnectAttempts) {
        this.reconnectAttempts++;
        this.addLog('INFO', `将在 ${this.config.reconnectInterval/1000} 秒后尝试重新连接 (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`, 'Connection');
        
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
        }
        
        this.reconnectTimer = setTimeout(() => {
          this.connect().catch(e => {
            this.emit('error', e);
          });
        }, this.config.reconnectInterval);
      } else {
        this.emit('error', error instanceof Error ? error : new Error(errorMessage));
        throw error; // 重新抛出错误，让调用者处理
      }
    }
  }

  /**
   * 断开PLC连接
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected && !this.isConnecting) {
      return; // 已断开，不需要操作
    }
    
    this.addLog('INFO', '断开PLC连接', 'Connection');
    
    try {
      // 如果有重连定时器，清除它
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      
      // 关闭连接
      await new Promise<void>((resolve) => {
        this.client.close(() => {
          resolve();
        });
      });
      
      this.isConnected = false;
      this.isConnecting = false;
      this.emit('disconnected');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addLog('ERROR', `断开PLC连接失败: ${errorMessage}`, 'Connection');
      throw error;
    }
  }

  /**
   * 读取保持寄存器
   */
  async readHoldingRegisters(address: number, length: number): Promise<number[]> {
    if (!this.isConnected) {
      throw new Error('PLC未连接');
    }
    
    try {
      const result = await this.client.readHoldingRegisters(address, length);
      this.addLog('INFO', `读取保持寄存器: 地址=${address}, 长度=${length}`, 'Read');
      return result.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addLog('ERROR', `读取保持寄存器失败: ${errorMessage}`, 'Read');
      throw error;
    }
  }

  /**
   * 写入保持寄存器
   */
  async writeHoldingRegister(address: number, value: number): Promise<void> {
    if (!this.isConnected) {
      throw new Error('PLC未连接');
    }
    
    try {
      await this.client.writeRegister(address, value);
      this.addLog('INFO', `写入保持寄存器: 地址=${address}, 值=${value}`, 'Write');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addLog('ERROR', `写入保持寄存器失败: ${errorMessage}`, 'Write');
      throw error;
    }
  }

  /**
   * 读取输入寄存器
   */
  async readInputRegisters(address: number, length: number): Promise<number[]> {
    if (!this.isConnected) {
      throw new Error('PLC未连接');
    }
    
    try {
      const result = await this.client.readInputRegisters(address, length);
      this.addLog('INFO', `读取输入寄存器: 地址=${address}, 长度=${length}`, 'Read');
      return result.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addLog('ERROR', `读取输入寄存器失败: ${errorMessage}`, 'Read');
      throw error;
    }
  }

  /**
   * 读取线圈
   */
  async readCoils(address: number, length: number): Promise<boolean[]> {
    if (!this.isConnected) {
      throw new Error('PLC未连接');
    }
    
    try {
      const result = await this.client.readCoils(address, length);
      this.addLog('INFO', `读取线圈: 地址=${address}, 长度=${length}`, 'Read');
      return result.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addLog('ERROR', `读取线圈失败: ${errorMessage}`, 'Read');
      throw error;
    }
  }

  /**
   * 写入线圈
   */
  async writeCoil(address: number, value: boolean): Promise<void> {
    if (!this.isConnected) {
      throw new Error('PLC未连接');
    }
    
    try {
      await this.client.writeCoil(address, value);
      this.addLog('INFO', `写入线圈: 地址=${address}, 值=${value}`, 'Write');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addLog('ERROR', `写入线圈失败: ${errorMessage}`, 'Write');
      throw error;
    }
  }

  /**
   * 读取32位浮点数
   * 注意：modbus-serial没有直接支持浮点数的方法，这里是一个实现
   */
  async readFloat32(address: number): Promise<number> {
    if (!this.isConnected) {
      throw new Error('PLC未连接');
    }
    
    try {
      const registers = await this.client.readHoldingRegisters(address, 2);
      const buffer = Buffer.alloc(4);
      buffer.writeUInt16LE(registers.data[0], 0);  // 改为LE
      buffer.writeUInt16LE(registers.data[1], 2);  // 改为LE
      const value = buffer.readFloatLE(0);         // 改为LE
      
      this.addLog('INFO', `读取32位浮点数: 地址=${address}, 值=${value}`, 'Read');
      return value;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addLog('ERROR', `读取32位浮点数失败: ${errorMessage}`, 'Read');
      throw error;
    }
  }

  /**
   * 写入32位浮点数
   */
  async writeFloat32(address: number, value: number): Promise<void> {
    if (!this.isConnected) {
      throw new Error('PLC未连接');
    }
    
    try {
      const buffer = Buffer.alloc(4);
      buffer.writeFloatLE(value, 0);               // 改为LE
      const lowWord = buffer.readUInt16LE(0);      // 改为LE：低位字
      const highWord = buffer.readUInt16LE(2);     // 改为LE：高位字
      
              await this.client.writeRegisters(address, [lowWord, highWord]);  // 顺序：先低位，后高位
      
      this.addLog('INFO', `写入32位浮点数: 地址=${address}, 值=${value}`, 'Write');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addLog('ERROR', `写入32位浮点数失败: ${errorMessage}`, 'Write');
      throw error;
    }
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): PLCConnectionStatus {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      connectionError: this.connectionError
    };
  }

  /**
   * 获取日志
   */
  getLogs(limit?: number): PLCLog[] {
    return limit ? this.logs.slice(0, limit) : [...this.logs];
  }

  /**
   * 清空日志
   */
  clearLogs(): void {
    this.logs = [];
    this.addLog('INFO', '日志已清空', 'System');
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<PLCConfig>): void {
    // 如果已连接，不允许更新某些配置
    if (this.isConnected) {
      const safeConfig = { ...newConfig };
      
      // 如果已连接，不允许更改这些配置
      delete safeConfig.host;
      delete safeConfig.port;
      delete safeConfig.unitId;
      
      // 更新安全的配置项
      this.config = {
        ...this.config,
        ...safeConfig
      };
      
      this.addLog('INFO', '已更新PLC配置（部分配置在连接状态下无法更改）', 'Config');
    } else {
      // 未连接状态下可以更新所有配置
      this.config = {
        ...this.config,
        ...newConfig
      };
      
      this.addLog('INFO', '已更新PLC配置', 'Config');
    }
  }
}

// 创建替代版单例实例
export const plcServiceAlternative = new PLCServiceAlternative({
        host: '192.168.6.6',
  port: 502,
  unitId: 1,
  timeout: 10000,
  reconnectInterval: 5000,
  maxReconnectAttempts: 3
}); 