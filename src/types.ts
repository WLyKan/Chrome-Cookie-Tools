/**
 * LocalStorage 键值对
 */
export interface LocalStorageData {
  [key: string]: string;
}

/**
 * 存储的 localStorage 信息
 */
export interface StoredLocalStorageInfo {
  /** 数据 */
  data: LocalStorageData;
  /** 源域名 */
  sourceDomain: string;
  /** 保存时间戳 */
  timestamp: number;
}

/**
 * 本地存储操作结果
 */
export interface LocalStorageOperationResult {
  success: boolean;
  message: string;
  data?: LocalStorageData | StoredLocalStorageInfo | null;
}

/**
 * 需要读取的 localStorage 键名
 */
export const LOCAL_STORAGE_KEYS = [
  'refreshToken',
  'token',
  'tenantId',
  'ACCESS_TOKEN'
] as const;

/**
 * 源网站 URL
 */
export const SOURCE_URL = 'https://ai-dev.supcon.com/agenthub/home';

/**
 * 目标网站域名（需要用户配置）
 */
export const TARGET_DOMAIN = ''; // 待配置
