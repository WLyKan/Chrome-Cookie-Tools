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
 * 需要读取的 localStorage 键名（兼容默认值，后续由用户配置覆盖）
 */
export const LOCAL_STORAGE_KEYS = [
  'refreshtoken',
  'token',
  'tenantId'
] as const;

/** 键名配置 */
export interface ReadKeysConfig {
  keys: string[];
  updatedAt: number;
}

/** 默认键名配置（用于首次或缺省） */
export const DEFAULT_READ_KEYS: ReadKeysConfig = {
  keys: ['refreshtoken', 'token', 'tenantId'],
  updatedAt: 0,
};

/**
 * 源网站 URL 配置
 */
export interface SourceUrlConfig {
  /** 当前使用的源网站 URL */
  current: string;
  /** 历史记录（最多保留5个） */
  history: string[];
  updatedAt: number;
}

/** 默认源网站 URL */
export const DEFAULT_SOURCE_URL = 'https://ai-dev.supcon.com/agenthub/home';

/** 默认源网站配置 */
export const DEFAULT_SOURCE_URL_CONFIG: SourceUrlConfig = {
  current: DEFAULT_SOURCE_URL,
  history: [DEFAULT_SOURCE_URL],
  updatedAt: 0,
};

/**
 * 目标网站域名（需要用户配置）
 */
export const TARGET_DOMAIN = ''; // 待配置
