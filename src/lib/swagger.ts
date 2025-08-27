import { createSwaggerSpec } from 'next-swagger-doc';

export const getApiDocs = () => {
  const spec = createSwaggerSpec({
    apiFolder: 'src/app/api', // API文件的路径
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'PLC管理系统API文档',
        version: '1.0.0',
        description: '管理系统API接口文档，包含PLC连接、监控和数据交换功能',
        contact: {
          name: '森源管理系统',
        },
      },
      servers: [
        {
          url: '/api',
          description: '开发环境API',
        },
      ],
      tags: [
        {
          name: 'PLC连接',
          description: 'PLC连接相关接口',
        },
        {
          name: 'PLC监控',
          description: 'PLC监控和状态检查',
        },
        {
          name: 'PLC数据交换',
          description: '数据读写和测量位置',
        },
        {
          name: '用户管理',
          description: '用户管理相关接口',
        },
        {
          name: '系统管理',
          description: '系统健康状态和服务管理',
        },
        {
          name: '设备管理',
          description: '设备管理相关接口',
        },
        {
          name: '数据分析',
          description: '数据分析和统计报表',
        },
        {
          name: '日志管理',
          description: '系统日志和操作记录',
        },
      ],
      components: {
        schemas: {
          Error: {
            type: 'object',
            properties: {
              success: {
                type: 'boolean',
                example: false,
              },
              error: {
                type: 'string',
                example: '操作失败',
              },
            },
          },
          Success: {
            type: 'object',
            properties: {
              success: {
                type: 'boolean',
                example: true,
              },
              message: {
                type: 'string',
                example: '操作成功',
              },
            },
          },
          PLCStatus: {
            type: 'object',
            properties: {
              isConnected: {
                type: 'boolean',
                example: true,
              },
              isConnecting: {
                type: 'boolean',
                example: false,
              },
              connectionError: {
                type: 'string',
                nullable: true,
                example: null,
              },
              config: {
                type: 'object',
                properties: {
                  host: { type: 'string', example: '192.168.55.199' },
                  port: { type: 'number', example: 502 },
                  unitId: { type: 'number', example: 1 },
                  timeout: { type: 'number', example: 5000 },
                  reconnectInterval: { type: 'number', example: 3000 },
                  maxReconnectAttempts: { type: 'number', example: 1 },
                },
              },
            },
          },
          MeasurePosition: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'clh7q8u9z000008l68rqt7v0d' },
              name: { type: 'string', example: '上料过程中测量钢筋长度的位置' },
              value: { type: 'number', format: 'float', example: 2.5 },
              unit: { type: 'string', example: 'mm' },
              description: { type: 'string', example: '初始默认值' },
              plcAddress: { type: 'string', example: 'D2000' },
              isActive: { type: 'boolean', example: true },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          PLCLog: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'log_123456' },
              level: { type: 'string', enum: ['INFO', 'ERROR', 'WARNING', 'DEBUG'], example: 'INFO' },
              message: { type: 'string', example: 'PLC连接成功' },
              category: { type: 'string', example: 'Connection' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          Device: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'device_123456' },
              name: { type: 'string', example: 'PLC设备1' },
              type: { type: 'string', example: 'Modbus TCP' },
              address: { type: 'string', example: '192.168.55.199' },
              status: { type: 'string', enum: ['online', 'offline', 'error'], example: 'online' },
              lastSeen: { type: 'string', format: 'date-time' },
            },
          },
          User: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'user_123456' },
              username: { type: 'string', example: 'admin' },
              role: { type: 'string', enum: ['admin', 'operator', 'viewer'], example: 'admin' },
              email: { type: 'string', example: 'admin@example.com' },
              createdAt: { type: 'string', format: 'date-time' },
              lastLogin: { type: 'string', format: 'date-time' },
            },
          },
        },
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
    },
  });
  return spec;
}; 