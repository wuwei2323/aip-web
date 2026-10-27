/**
 * 子应用（开放接口调用方凭据）
 * 密钥明文只在「新增」与「重置密钥」的响应中返回一次，查询接口不含该字段。
 */

export interface AppVO {
  id: string | number;
  /** 应用 ID（调用方标识） */
  appId: string;
  /** 应用名称 */
  appName: string;
  /** 授权主题（空=全部主题） */
  allowedThemes?: string[];
  /** IP 白名单（逗号分隔；空=不限制） */
  ipWhitelist?: string;
  /** 是否启用（1是 0否） */
  enabled: string;
  /** 备注 */
  remark?: string;
  createTime?: string;
}

export interface AppForm {
  id?: string | number;
  appId?: string;
  appName?: string;
  allowedThemes?: string[];
  ipWhitelist?: string;
  enabled?: string;
  remark?: string;
}

export interface AppQuery extends PageQuery {
  appId?: string;
  appName?: string;
  enabled?: string;
}
