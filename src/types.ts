/**
 * Cookie 数据接口
 */
export interface CookieData {
  /** 刷新令牌 */
  refreshtoken?: string;
  /** 访问令牌 */
  token?: string;
  /** 租户 ID */
  tenantId?: string;
  /** 其他可能的 token 字段 */
  [key: string]: string | undefined;
}

/**
 * 存储的 Cookie 信息
 */
export interface StoredCookieInfo {
  /** Cookie 数据 */
  data: CookieData;
  /** 源域名 */
  sourceDomain: string;
  /** 保存时间戳 */
  timestamp: number;
}

/**
 * Cookie 操作结果
 */
export interface CookieOperationResult {
  /** 是否成功 */
  success: boolean;
  /** 消息 */
  message: string;
  /** 数据 */
  data?: CookieData | StoredCookieInfo;
}

/**
 * 需要读取的 Cookie 名称列表
 */
export const REQUIRED_COOKIE_NAMES = [
  'refreshtoken',
  'token',
  'tenantId'
] as const;

/**
 * 源网站 URL
 */
export const SOURCE_URL = 'https://ai-dev.supcon.com/agenthub/home';

/**
 * 目标网站域名（需要用户配置）
 */
export const TARGET_DOMAIN = ''; // 待配置
