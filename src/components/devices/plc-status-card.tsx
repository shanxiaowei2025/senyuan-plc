import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  AlertTriangle, 
  Activity, 
  Play, 
  Pause, 
  RefreshCw,
  Heart 
} from 'lucide-react';

interface PLCConfig {
  host: string;
  port: number;
  unitId: number;
  timeout: number;
  reconnectInterval: number;
  maxReconnectAttempts: number;
}

interface PLCStatus {
  isConnected: boolean;
  isConnecting: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  config: PLCConfig;
}

interface PLCStatusCardProps {
  plcStatus: PLCStatus | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  connectionSuccess: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefreshStatus: () => void;
}

export const PLCStatusCard = memo(function PLCStatusCard({
  plcStatus,
  isConnected,
  isConnecting,
  connectionError,
  connectionSuccess,
  onConnect,
  onDisconnect,
  onRefreshStatus
}: PLCStatusCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          PLC连接状态
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            )}
            <span className={`font-medium ${
              isConnected ? 'text-green-600' : 'text-red-600'
            }`}>
              {isConnecting ? '连接中...' : isConnected ? '已连接' : '未连接'}
            </span>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefreshStatus}
              disabled={isConnecting}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            
            {isConnected ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={onDisconnect}
                disabled={isConnecting}
              >
                <Pause className="h-4 w-4 mr-1" />
                断开
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={onConnect}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-1" />
                )}
                {isConnecting ? '连接中' : '连接'}
              </Button>
            )}
          </div>
        </div>

        {/* 连接配置信息 */}
        {plcStatus?.config && (
          <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg text-sm">
            <div>
              <span className="text-gray-600">主机:</span>
              <span className="ml-2 font-medium">{plcStatus.config.host || '未配置'}</span>
            </div>
            <div>
              <span className="text-gray-600">端口:</span>
              <span className="ml-2 font-medium">{plcStatus.config.port}</span>
            </div>
            <div>
              <span className="text-gray-600">单元ID:</span>
              <span className="ml-2 font-medium">{plcStatus.config.unitId}</span>
            </div>
            <div>
              <span className="text-gray-600">超时:</span>
              <span className="ml-2 font-medium">{plcStatus.config.timeout}ms</span>
            </div>
          </div>
        )}

        {/* 重连状态 */}
        {plcStatus && !isConnected && plcStatus.reconnectAttempts > 0 && (
          <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded">
            <Heart className="h-4 w-4 text-orange-500" />
            <span className="text-sm text-orange-700">
              重连尝试: {plcStatus.reconnectAttempts}/{plcStatus.maxReconnectAttempts}
            </span>
          </div>
        )}

        {/* 连接错误信息 */}
        {connectionError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">连接错误</span>
            </div>
            <p className="text-sm text-red-600 mt-1">{connectionError}</p>
          </div>
        )}

        {/* 连接成功信息 */}
        {connectionSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">连接成功</span>
            </div>
            <p className="text-sm text-green-600 mt-1">{connectionSuccess}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}); 