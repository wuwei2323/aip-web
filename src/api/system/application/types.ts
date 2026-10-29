/**
 * 应用注册视图对象
 */
export interface ApplicationVO extends BaseEntity {
  id: string | number;
  appId: string;
  appName: string;
  tenantId: string;
  clientAuthMethod: string;
  clientSecret?: string;
  redirectUris?: string;
  postLogoutRedirectUris?: string;
  scopes?: string;
  grantTypes?: string;
  accessTokenTtlMinutes?: number;
  refreshTokenTtlDays?: number;
  reuseRefreshTokens?: string;
  requirePkce?: string;
  domain?: string;
  entryUrl?: string;
  wecomConfigKey?: string;
  bindPolicy?: string;
  icon?: string;
  orderNum?: number;
  status: string;
  createTime?: string;
}

/**
 * 应用注册表单对象
 */
export interface ApplicationForm {
  id?: string | number;
  appId?: string;
  appName: string;
  tenantId: string;
  clientAuthMethod?: string;
  clientSecret?: string;
  redirectUris?: string;
  postLogoutRedirectUris?: string;
  scopes?: string;
  grantTypes?: string;
  accessTokenTtlMinutes?: number;
  refreshTokenTtlDays?: number;
  reuseRefreshTokens?: string;
  requirePkce?: string;
  domain?: string;
  entryUrl?: string;
  wecomConfigKey?: string;
  bindPolicy?: string;
  icon?: string;
  orderNum?: number;
  status?: string;
}

/**
 * 应用注册查询对象
 */
export interface ApplicationQuery extends PageQuery {
  appId?: string;
  appName?: string;
  tenantId?: string;
  status?: string;
  clientAuthMethod?: string;
}
