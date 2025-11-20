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

/**
 * Cookie 配置
 */
export interface CookieConfig {
  /** 源网站 URL */
  sourceUrl: string;
  /** 需要读取的 Cookie 名称列表 */
  cookieNames: string[];
  /** 更新时间戳 */
  updatedAt: number;
}

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
 * 历史记录项
 */
export interface HistoryItem {
  /** 源网站 URL */
  url: string;
  /** Cookie 名称列表 */
  cookieNames: string[];
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
export const DEFAULT_SOURCE_URL = 'https://ai-dev.supcon.com/agenthub/home';

/** 默认源网站配置 */
export const DEFAULT_SOURCE_URL_CONFIG: SourceUrlConfig = {
  current: DEFAULT_SOURCE_URL,
  history: [DEFAULT_SOURCE_URL],
  updatedAt: 0,
};

/** 默认 Cookie 配置 */
export const DEFAULT_COOKIE_CONFIG: CookieConfig = {
  sourceUrl: DEFAULT_SOURCE_URL,
  cookieNames: ['refreshtoken', 'token', 'tenantId'],
  updatedAt: 0,
};

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
  payload: CookieConfig;
}

/**
 * 消息响应
 */
export interface MessageResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
