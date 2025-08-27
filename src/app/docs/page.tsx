'use client';

import { useEffect, useState } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

// 创建一个包装组件，用于隔离第三方组件产生的React严格模式警告
const SwaggerUIWrapper = ({ spec }: { spec: Record<string, any> }) => {
  // 使用key属性来强制重新渲染组件，避免某些内部状态问题
  return (
    <div className="swagger-wrapper">
      <SwaggerUI spec={spec} />
    </div>
  );
};

export default function ApiDoc() {
  const [spec, setSpec] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    const fetchSpec = async () => {
      try {
        // 使用更具体的API端点，避免被重定向到/docs
        const response = await fetch('/api/docs/spec');
        const data = await response.json();
        setSpec(data);
      } catch (error) {
        console.error('加载API文档失败:', error);
      }
    };

    fetchSpec();
  }, []);

  return (
    <div className="api-doc-page">
      <div className="api-doc-container">
        <div className="api-header bg-gradient-to-r from-gray-800 to-gray-900 text-white p-6 mb-6 rounded-md shadow-md">
          <h1 className="text-3xl font-bold">PLC管理系统API文档</h1>
          <p className="text-sm text-gray-200 mt-1">版本 1.0.0</p>
        </div>
        
        {spec ? (
          // 使用包装组件替代直接使用SwaggerUI
          <SwaggerUIWrapper spec={spec} />
        ) : (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mb-4"></div>
              <p className="text-gray-700 font-medium">正在加载API文档...</p>
            </div>
          </div>
        )}

        <style jsx global>{`
          body {
            background-color: white !important;
          }
          
          .api-doc-page {
            background-color: white;
            min-height: 100vh;
            width: 100%;
            padding: 20px;
          }
          
          .swagger-ui .topbar {
            display: none;
          }
          
          .api-doc-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 1.5rem;
            background-color: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            border-radius: 8px;
          }
          
          /* 隐藏控制台警告提示的样式 */
          .swagger-wrapper .swagger-ui .errors-wrapper {
            display: none !important;
          }
          
          .swagger-ui {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          }
          
          .swagger-ui .info {
            margin: 30px 0;
          }
          
          .swagger-ui .info .title {
            font-size: 36px;
            font-weight: 600;
            color: #333;
          }
          
          .swagger-ui .opblock .opblock-summary-method {
            font-weight: bold;
            text-shadow: none;
          }
          
          .swagger-ui .opblock-tag {
            font-size: 20px;
            font-weight: 600;
            margin: 10px 0 5px 0;
            color: #222;
            background-color: #f5f5f7;
            padding: 10px;
            border-radius: 4px;
          }
          
          .swagger-ui .opblock {
            margin-bottom: 15px;
            border-radius: 6px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          
          .swagger-ui .opblock.opblock-get {
            border-color: #0075ea;
            background-color: rgba(0, 117, 234, 0.05);
          }
          
          .swagger-ui .opblock.opblock-post {
            border-color: #49cc90;
            background-color: rgba(73, 204, 144, 0.05);
          }
          
          .swagger-ui .opblock.opblock-put {
            border-color: #fca130;
            background-color: rgba(252, 161, 48, 0.05);
          }
          
          .swagger-ui .opblock.opblock-delete {
            border-color: #f93e3e;
            background-color: rgba(249, 62, 62, 0.05);
          }
          
          .swagger-ui .opblock-summary-method {
            border-radius: 4px;
          }
          
          .swagger-ui .opblock-summary {
            padding: 10px;
          }
          
          .swagger-ui .opblock-tag-section {
            margin-bottom: 20px;
          }
          
          .swagger-ui table tbody tr td {
            padding: 10px;
          }
          
          .swagger-ui .scheme-container {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 0 0 20px 0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          }
          
          .swagger-ui select {
            font-size: 14px;
            padding: 5px 10px;
            border-radius: 4px;
          }
          
          .swagger-ui button {
            border-radius: 4px;
            box-shadow: none;
          }
          
          .swagger-ui .btn {
            font-weight: 500;
            padding: 6px 12px;
          }
          
          .swagger-ui .btn.authorize {
            background-color: #1a7ce0;
            color: white;
            border: none;
          }
          
          .swagger-ui .btn.authorize svg {
            fill: white;
          }
        `}</style>
      </div>
    </div>
  );
} 