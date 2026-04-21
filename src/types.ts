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

/** 统一读取时的数据来源（展示顺序：localStorage → sessionStorage → cookie） */
export type UnifiedStorageSource = "localStorage" | "sessionStorage" | "cookie";

/**
 * 统一存储项：同一个 key 在不同存储来源会分别保存为多条记录
 */
export interface UnifiedStorageItem {
  key: string;
  value: string;
  source: UnifiedStorageSource;
  /** 当 source 为 cookie 时保留完整 Cookie 信息以便写回 */
  cookieData?: CookieData;
}

/**
 * 存储的统一读取结果（用于写回）
 */
export interface StoredUnifiedInfo {
  items: UnifiedStorageItem[];
  sourceUrl: string;
  timestamp: number;
}

/**
 * 读取历史记录（用于在 Popup 中快速切换“写入数据”的来源）
 */
export interface ReadHistoryRecord {
  /** 由「站点 origin + staffCode」派生的稳定 id，用于列表 key 与去重 */
  id: string;
  /** 用户名（staffName） */
  staffName: string;
  /** 用户编号（staffCode） */
  staffCode: string;
  /** 本次读取时的页面完整 URL；是否与同工号上一条合并由 URL 的 origin 决定 */
  sourceUrl: string;
  /** 读取时间戳（ms） */
  timestamp: number;
  /** 本次读取到的存储数据 */
  items: UnifiedStorageItem[];
}

/**
 * 源网站 URL 配置
 */
export interface SourceUrlConfig {
  /** 当前使用的源网站 URL */
  current: string;
  /** 历史记录（最多保留100个） */
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
  /** 按 key 收集 localStorage / sessionStorage / cookie 的所有匹配 */
  READ_STORAGE = 'READ_STORAGE',
  /** 按每条数据的 source 写回对应存储 */
  WRITE_STORAGE = 'WRITE_STORAGE',
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

/** 读取存储（按 key 收集 localStorage/sessionStorage/cookie 所有匹配）请求 */
export interface ReadStorageRequest extends MessageRequest {
  type: MessageType.READ_STORAGE;
  payload: {
    sourceUrl: string;
    keys: string[];
  };
}

/** 写入存储（按 item.source 写回）请求 */
export interface WriteStorageRequest extends MessageRequest {
  type: MessageType.WRITE_STORAGE;
  payload: {
    targetUrl: string;
    items: UnifiedStorageItem[];
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
