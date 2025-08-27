import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  FileText, 
  RefreshCw, 
  Download, 
  Filter,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface PLCLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
  source: string;
  details?: string;
}

interface DeviceLogTabProps {
  logs: PLCLog[];
  searchTerm: string;
  logFilter: string;
  isLoading: boolean;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: string) => void;
  onRefreshLogs: () => void;
  onExportLogs: () => void;
}

export const DeviceLogTab = memo(function DeviceLogTab({
  logs,
  searchTerm,
  logFilter,
  isLoading,
  onSearchChange,
  onFilterChange,
  onRefreshLogs,
  onExportLogs
}: DeviceLogTabProps) {
  // 过滤和搜索日志
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesFilter = logFilter === 'all' || log.level === logFilter;
      const matchesSearch = searchTerm === '' || 
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.source.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [logs, logFilter, searchTerm]);

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'ERROR':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'WARNING':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'INFO':
      default:
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getLogLevelStyle = (level: string) => {
    switch (level) {
      case 'ERROR':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'WARNING':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'INFO':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          设备日志
          <span className="text-sm font-normal text-gray-500">
            ({filteredLogs.length} 条)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 工具栏 */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索日志内容..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={logFilter}
              onChange={(e) => onFilterChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">全部级别</option>
              <option value="INFO">信息</option>
              <option value="WARNING">警告</option>
              <option value="ERROR">错误</option>
            </select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onRefreshLogs}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onExportLogs}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 日志列表 */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {isLoading ? '加载中...' : '暂无日志数据'}
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className={`p-3 rounded-lg border ${getLogLevelStyle(log.level)}`}
              >
                <div className="flex items-start gap-3">
                  {getLogIcon(log.level)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{log.level}</span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {log.timestamp}
                      </span>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {log.source}
                      </span>
                    </div>
                    <p className="text-sm break-words">{log.message}</p>
                    {log.details && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                          查看详情
                        </summary>
                        <pre className="text-xs mt-1 p-2 bg-gray-100 rounded overflow-x-auto">
                          {log.details}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}); 