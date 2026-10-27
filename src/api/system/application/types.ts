/**
 * 子应用管理（OIDC 接入应用）
 * 密钥明文只在「新增」与「重置密钥」的响应中返回一次，查询接口不含该字段。
 */

export interface SysApplicationVo {
  /**
   * 主键
   */
  id: string | number;

  /**
   * 应用标识 / OIDC client_id
   */
  appId: string;

  /**
   * 应用名称
   */
  appName: string;

  /**
   * 租户编号
   */
  tenantId: string;

  /**
   * 客户端认证方式（client_secret_basic | client_secret_post | none）
   */
  clientAuthMethod: string;

  /**
   * 回跳地址白名单
   */
  redirectUris: string[];

  /**
   * 登出回跳地址白名单
   */
  postLogoutRedirectUris: string[];

  /**
   * 授权范围（英文逗号分隔）
   */
  scopes: string;

  /**
   * 授权类型（英文逗号分隔）
   */
  grantTypes: string;

  /**
   * 访问令牌有效期（分钟）
   */
  accessTokenTtlMinutes: number;

  /**
   * 刷新令牌有效期（天）
   */
  refreshTokenTtlDays: number;

  /**
   * 是否复用刷新令牌（0是 1否）
   */
  reuseRefreshTokens: string;

  /**
   * 是否强制 PKCE（0是 1否）
   */
  requirePkce: string;

  /**
   * 应用域名
   */
  domain: string;

  /**
   * 应用入口地址
   */
  entryUrl: string;

  /**
   * 企微渠道实例标识
   */
  wecomConfigKey: string;

  /**
   * 企微首次登录策略（AUTO_CREATE | BIND_EXISTING | REJECT）
   */
  bindPolicy: string;

  /**
   * 应用图标
   */
  icon: string;

  /**
   * 显示排序
   */
  orderNum: number;

  /**
   * 状态（0正常 1停用）
   */
  status: string;

  /**
   * 备注
   */
  remark: string;

  /**
   * 创建时间
   */
  createTime?: string;
}

export interface SysApplicationBo {
  /**
   * 主键
   */
  id?: string | number;

  /**
   * 应用标识 / OIDC client_id
   */
  appId?: string;

  /**
   * 应用名称
   */
  appName?: string;

  /**
   * 租户编号
   */
  tenantId?: string;

  /**
   * 客户端认证方式（client_secret_basic | client_secret_post | none）
   */
  clientAuthMethod?: string;

  /**
   * 回跳地址白名单
   */
  redirectUris?: string[];

  /**
   * 登出回跳地址白名单
   */
  postLogoutRedirectUris?: string[];

  /**
   * 授权范围（英文逗号分隔）
   */
  scopes?: string;

  /**
   * 授权类型（英文逗号分隔）
   */
  grantTypes?: string;

  /**
   * 访问令牌有效期（分钟）
   */
  accessTokenTtlMinutes?: number;

  /**
   * 刷新令牌有效期（天）
   */
  refreshTokenTtlDays?: number;

  /**
   * 是否复用刷新令牌（0是 1否）
   */
  reuseRefreshTokens?: string;

  /**
   * 是否强制 PKCE（0是 1否）
   */
  requirePkce?: string;

  /**
   * 应用域名
   */
  domain?: string;

  /**
   * 应用入口地址
   */
  entryUrl?: string;

  /**
   * 企微渠道实例标识
   */
  wecomConfigKey?: string;

  /**
   * 企微首次登录策略（AUTO_CREATE | BIND_EXISTING | REJECT）
   */
  bindPolicy?: string;

  /**
   * 应用图标
   */
  icon?: string;

  /**
   * 显示排序
   */
  orderNum?: number;

  /**
   * 状态（0正常 1停用）
   */
  status?: string;

  /**
   * 备注
   */
  remark?: string;
}

export interface SysApplicationQuery extends PageQuery {
  /**
   * 应用标识 / OIDC client_id
   */
  appId?: string;

  /**
   * 应用名称
   */
  appName?: string;

  /**
   * 租户编号
   */
  tenantId?: string;

  /**
   * 状态（0正常 1停用）
   */
  status?: string;
}

/**
 * 密钥响应体：明文密钥仅在新增与重置密钥时返回一次
 */
export interface ClientSecretVo {
  clientSecret: string;
}
