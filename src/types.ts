/**
 * Cookie 数据类型
 */
export interface CookieData {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: chrome.cookies.SameSiteStatus;
  expirationDate?: number;
}

export type StorageType = 'localStorage' | 'cookie';

/**
 * 存储配置（支持 Cookie 和 LocalStorage）
 */
export interface StorageConfig {
  /** 需要读取的存储键名列表（Cookie 名称或 LocalStorage 键名） */
  storageKeys: string[];
  /** @deprecated 使用 storageKeys 替代 */
  cookieNames?: string[];
  /** 存储类型：localStorage 或 cookie */
  storageType?: StorageType;
  /** 更新时间戳 */
  updatedAt: number;
}

/**
 * @deprecated 使用 StorageConfig 替代
 */
export type CookieConfig = StorageConfig;

/**
 * Cookie 操作结果
 */
export interface CookieOperationResult {
  success: boolean;
  message: string;
  data?: CookieData[];
  error?: string;
}

/**
 * 存储的 Cookie 信息
 */
export interface StoredCookieInfo {
  /** Cookie 数据 */
  cookies: CookieData[];
  /** 源网站 URL */
  sourceUrl: string;
  /** 保存时间戳 */
  timestamp: number;
}

/**
 * LocalStorage 数据类型
 */
export interface LocalStorageData {
  key: string;
  value: string;
}

/**
 * 存储的 LocalStorage 信息
 */
export interface StoredLocalStorageInfo {
  /** LocalStorage 数据 */
  data: LocalStorageData[];
  /** 源网站 URL */
  sourceUrl: string;
  /** 保存时间戳 */
  timestamp: number;
}

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
export const DEFAULT_TYPE = 'localStorage';

/** 默认源网站配置 */
export const DEFAULT_SOURCE_URL_CONFIG: SourceUrlConfig = {
  current: DEFAULT_TYPE,
  history: [DEFAULT_TYPE],
  updatedAt: 0,
};

/** 默认存储配置 */
export const DEFAULT_STORAGE_CONFIG: StorageConfig = {
  storageKeys: ['REFRESH_TOKEN', 'token', 'tenantId'],
  storageType: DEFAULT_TYPE,
  updatedAt: 0,
};

/**
 * @deprecated 使用 DEFAULT_STORAGE_CONFIG 替代
 */
export const DEFAULT_COOKIE_CONFIG = DEFAULT_STORAGE_CONFIG;

/**
 * Popup 标签页类型
 */
export type TabType = 'config' | 'operation';

/**
 * 消息类型定义
 */
export enum MessageType {
  READ_COOKIES = 'READ_COOKIES',
  WRITE_COOKIES = 'WRITE_COOKIES',
  READ_LOCALSTORAGE = 'READ_LOCALSTORAGE',
  WRITE_LOCALSTORAGE = 'WRITE_LOCALSTORAGE',
  GET_CONFIG = 'GET_CONFIG',
  SAVE_CONFIG = 'SAVE_CONFIG',
}

/**
 * 消息请求基础接口
 */
export interface MessageRequest {
  type: MessageType;
  payload?: any;
}

/**
 * 读取 Cookie 请求
 */
export interface ReadCookiesRequest extends MessageRequest {
  type: MessageType.READ_COOKIES;
  payload: {
    sourceUrl: string;
    cookieNames: string[];
  };
}

/**
 * 写入 Cookie 请求
 */
export interface WriteCookiesRequest extends MessageRequest {
  type: MessageType.WRITE_COOKIES;
  payload: {
    targetUrl: string;
    cookies: CookieData[];
  };
}

/**
 * 保存配置请求
 */
export interface SaveConfigRequest extends MessageRequest {
  type: MessageType.SAVE_CONFIG;
  payload: StorageConfig;
}

/**
 * 读取 LocalStorage 请求
 */
export interface ReadLocalStorageRequest extends MessageRequest {
  type: MessageType.READ_LOCALSTORAGE;
  payload: {
    sourceUrl: string;
    keys: string[];
  };
}

/**
 * 写入 LocalStorage 请求
 */
export interface WriteLocalStorageRequest extends MessageRequest {
  type: MessageType.WRITE_LOCALSTORAGE;
  payload: {
    targetUrl: string;
    data: LocalStorageData[];
  };
}

/**
 * 消息响应
 */
export interface MessageResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
