import { useMemo } from 'react';

interface PLCLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
  source: string;
  details?: string;
}

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

// 优化的日志过滤hook
export const useFilteredLogs = (logs: PLCLog[], searchTerm: string, logFilter: string) => {
  return useMemo(() => {
    return logs.filter(log => {
      const matchesFilter = logFilter === 'all' || log.level === logFilter;
      const matchesSearch = searchTerm === '' || 
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.source.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [logs, logFilter, searchTerm]);
};

// 优化的数据库记录过滤hook
export const useFilteredSyPlcRecords = (
  records: SyPlcRecord[], 
  isAdvancedSearchOpen: boolean,
  advancedSearchFields: Record<string, string>
) => {
  return useMemo(() => {
    return records.filter(record => {
      // 高级搜索逻辑
      if (isAdvancedSearchOpen) {
        const hasAdvancedSearch = Object.values(advancedSearchFields).some(value => value.trim() !== '');
        if (!hasAdvancedSearch) return true;
        
        return (
          (!advancedSearchFields.modelD2040 || record.modelD2040.toString().toLowerCase().includes(advancedSearchFields.modelD2040.toLowerCase())) &&
          (!advancedSearchFields.cageNodesD2044 || record.cageNodesD2044.toString().toLowerCase().includes(advancedSearchFields.cageNodesD2044.toLowerCase())) &&
          (!advancedSearchFields.cageNumD2048 || record.cageNumD2048.toString().toLowerCase().includes(advancedSearchFields.cageNumD2048.toLowerCase())) &&
          (!advancedSearchFields.spindleAngleD4012 || record.spindleAngleD4012.toString().toLowerCase().includes(advancedSearchFields.spindleAngleD4012.toLowerCase())) &&
          (!advancedSearchFields.actualRebarLength || (record.actualRebarLength && record.actualRebarLength.toString().toLowerCase().includes(advancedSearchFields.actualRebarLength.toLowerCase()))) &&
          (!advancedSearchFields.theoreticalLength || (record.theoreticalLength && record.theoreticalLength.toString().toLowerCase().includes(advancedSearchFields.theoreticalLength.toLowerCase()))) &&
          (!advancedSearchFields.difference || (record.difference && record.difference.toString().toLowerCase().includes(advancedSearchFields.difference.toLowerCase()))) &&
          (!advancedSearchFields.totalNodesD2052 || (record.totalNodesD2052 && record.totalNodesD2052.toString().toLowerCase().includes(advancedSearchFields.totalNodesD2052.toLowerCase())))
        );
      }
      
      return true;
    });
  }, [records, isAdvancedSearchOpen, advancedSearchFields]);
};

// 优化的分页计算hook
export const usePaginationData = <T>(
  data: T[], 
  currentPage: number, 
  itemsPerPage: number
) => {
  return useMemo(() => {
    const totalPages = Math.ceil(data.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = data.slice(startIndex, endIndex);
    
    return {
      totalPages,
      startIndex,
      endIndex,
      currentItems,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1
    };
  }, [data, currentPage, itemsPerPage]);
};

// 优化的连接状态计算hook
export const useConnectionStatus = (
  isConnected: boolean,
  isConnecting: boolean,
  connectionError: string | null,
  connectionSuccess: string | null
) => {
  return useMemo(() => {
    const statusText = isConnecting ? '连接中...' : isConnected ? '已连接' : '未连接';
    const statusColor = isConnected ? 'text-green-600' : 'text-red-600';
    const showSuccess = isConnected && !connectionError;
    const showError = !isConnected && connectionError;
    
    return {
      statusText,
      statusColor,
      showSuccess,
      showError
    };
  }, [isConnected, isConnecting, connectionError, connectionSuccess]);
}; 