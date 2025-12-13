import { http } from "@/utils/http";
import { baseUrlApi } from "./utils";
import { BaseResult } from "./types";

// 插件菜单项
export interface PluginMenu {
  path: string;
  type: number;
}

// 插件导出配置
export interface PluginExport {
  name: string;
  version: string;
  description: string;
  author: string;
  email: string;
  url: string;
  dependencies: Record<string, string>;
  exportDirs: string[];
  menus: PluginMenu[];
  databaseTable: string[];
  folderName: string;
}

// 插件列表响应
export type PluginsExportsResult = BaseResult<{
  list: PluginExport[];
}>;

// 获取所有插件导出配置
export const getPluginsExportAPI = () => {
  return http.request<PluginsExportsResult>("get", baseUrlApi("pluginsmanager/exports"));
};

// 导出插件为压缩包
export const exportPluginAPI = (folderName: string) => {
  return http.request<Blob>("post", baseUrlApi("pluginsmanager/export"), { data: {folderName} } as any, {
    responseType: 'blob'
  } as any);
};

// 插件导入请求参数
export interface PluginImportRequest {
  overwriteDB: boolean;    // 是否导入并覆盖数据库
  overwriteFiles: boolean; // 是否导入并覆盖文件
  importMenu: boolean;     // 是否导入菜单
  checkExist: boolean;     // 是否检查文件及数据库
}

// 导入插件
export const importPluginAPI = (file: File, params: PluginImportRequest) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('overwriteDB', params.overwriteDB ? '1' : '0');
  formData.append('overwriteFiles', params.overwriteFiles ? '1' : '0');
  formData.append('importMenu', params.importMenu ? '1' : '0');
  formData.append('checkExist', params.checkExist ? '1' : '0');
  
  return http.request<any>("post", baseUrlApi("pluginsmanager/import"), { data: formData, headers: { 'Content-Type': 'multipart/form-data' } });
};


export const deletePluginAPI  = (folderName: string) => {
    return http.request<BaseResult>("delete", baseUrlApi(`pluginsmanager/uninstall?folderName=${encodeURIComponent(folderName)}`));
};