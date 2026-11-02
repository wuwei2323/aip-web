/**
 * 注册
 */
export type RegisterForm = {
  tenantId: string;
  username: string;
  password: string;
  confirmPassword?: string;
  code?: string;
  uuid?: string;
  userType?: string;
};

/**
 * 登录请求
 */
export interface LoginData {
  tenantId?: string;
  username?: string;
  password?: string;
  rememberMe?: boolean;
  socialCode?: string;
  socialState?: string;
  source?: string;
  code?: string;
  uuid?: string;
  clientId: string;
  grantType: string;
}

/**
 * 登录响应
 */
export interface LoginResult {
  access_token?: string;
  expire_in?: number;
  client_id?: string;
  password_reset_required?: boolean;
  reset_ticket?: string;
}

/**
 * SSO 授权码换票请求参数
 */
export interface SsoExchangeParams {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  nonce: string;
}

/**
 * 验证码返回
 */
export interface VerifyCodeResult {
  captchaEnabled: boolean;
  uuid?: string;
  img?: string;
}

/**
 * 租户
 */
export interface TenantVO {
  companyName: string;
  domain: any;
  tenantId: string;
}

export interface TenantInfo {
  tenantEnabled: boolean;
  voList: TenantVO[];
}

export interface SsoAuthorizeResult {
  authorizeUrl: string;
}

export interface SsoLogoutResult {
  logoutUrl: string;
}

export interface SsoChangePasswordForm {
  ticket?: string;
  oldPassword?: string;
  newPassword: string;
  confirmPassword: string;
}
