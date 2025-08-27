import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Database, 
  RefreshCw, 
  Download, 
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';

interface SyPlcRecord {
  id: string;
  modelD2040: number;
  cageNodesD2044: number;
  cageNumD2048: number;
  spindleAngleD4012: number;
  actualRebarLength: number | null;
  theoreticalLength: number;
  difference: number | null;
  totalNodesD2052: number;
  createdAt: string;
  updatedAt: string;
}

interface DatabaseRecordTableProps {
  records: SyPlcRecord[];
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isAdvancedSearchOpen: boolean;
  advancedSearchFields: Record<string, string>;
  onRefresh: () => void;
  onExport: () => void;
  onPageChange: (page: number) => void;
  onToggleAdvancedSearch: () => void;
  onAdvancedSearchFieldChange: (field: string, value: string) => void;
  onClearAdvancedSearch: () => void;
  onAddRecord: () => void;
  onEditRecord: (record: SyPlcRecord) => void;
  onDeleteRecord: (record: SyPlcRecord) => void;
  onViewRecord: (record: SyPlcRecord) => void;
}

export const DatabaseRecordTable = memo(function DatabaseRecordTable({
  records,
  isLoading,
  currentPage,
  totalPages,
  hasNextPage,
  hasPreviousPage,
  isAdvancedSearchOpen,
  advancedSearchFields,
  onRefresh,
  onExport,
  onPageChange,
  onToggleAdvancedSearch,
  onAdvancedSearchFieldChange,
  onClearAdvancedSearch,
  onAddRecord,
  onEditRecord,
  onDeleteRecord,
  onViewRecord
}: DatabaseRecordTableProps) {
  
  // 计算数值的样式类
  const getValueStyle = useMemo(() => (value: number | null) => {
    if (value === null) return 'text-gray-400';
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-900';
  }, []);

  // 格式化数值显示
  const formatValue = useMemo(() => (value: number | null, precision = 2) => {
    if (value === null) return 'N/A';
    return value.toFixed(precision);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          数据库记录
          <span className="text-sm font-normal text-gray-500">
            ({records.length} 条)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 工具栏 */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleAdvancedSearch}
            >
              <Filter className="h-4 w-4 mr-1" />
              高级搜索
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
            >
              <Download className="h-4 w-4" />
            </Button>
            
            <Button
              variant="default"
              size="sm"
              onClick={onAddRecord}
            >
              <Plus className="h-4 w-4 mr-1" />
              新增
            </Button>
          </div>
        </div>

        {/* 高级搜索表单 */}
        {isAdvancedSearchOpen && (
          <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">高级搜索</h4>
              <Button variant="ghost" size="sm" onClick={onClearAdvancedSearch}>
                清空
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">型号 (D2040)</label>
                <Input
                  placeholder="搜索型号..."
                  value={advancedSearchFields.modelD2040}
                  onChange={(e) => onAdvancedSearchFieldChange('modelD2040', e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">笼子节数 (D2044)</label>
                <Input
                  placeholder="搜索笼子节数..."
                  value={advancedSearchFields.cageNodesD2044}
                  onChange={(e) => onAdvancedSearchFieldChange('cageNodesD2044', e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">笼子编号 (D2048)</label>
                <Input
                  placeholder="搜索笼子编号..."
                  value={advancedSearchFields.cageNumD2048}
                  onChange={(e) => onAdvancedSearchFieldChange('cageNumD2048', e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">主轴角度 (D4012)</label>
                <Input
                  placeholder="搜索主轴角度..."
                  value={advancedSearchFields.spindleAngleD4012}
                  onChange={(e) => onAdvancedSearchFieldChange('spindleAngleD4012', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* 数据表格 */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">型号</th>
                <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">节数</th>
                <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">编号</th>
                <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">角度</th>
                <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">实际长度</th>
                <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">理论长度</th>
                <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">差值</th>
                <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">总节数</th>
                <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">创建时间</th>
                <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={10} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                    {isLoading ? '加载中...' : '暂无数据'}
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2 text-sm">{formatValue(record.modelD2040, 0)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">{formatValue(record.cageNodesD2044, 0)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">{formatValue(record.cageNumD2048, 0)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">{formatValue(record.spindleAngleD4012)}</td>
                    <td className={`border border-gray-300 px-4 py-2 text-sm ${getValueStyle(record.actualRebarLength)}`}>
                      {formatValue(record.actualRebarLength)}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">{formatValue(record.theoreticalLength)}</td>
                    <td className={`border border-gray-300 px-4 py-2 text-sm ${getValueStyle(record.difference)}`}>
                      {formatValue(record.difference)}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">{formatValue(record.totalNodesD2052, 0)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">
                      {new Date(record.createdAt).toLocaleString('zh-CN')}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewRecord(record)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditRecord(record)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteRecord(record)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              第 {currentPage} 页，共 {totalPages} 页
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={!hasPreviousPage}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={!hasNextPage}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}); 