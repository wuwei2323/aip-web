import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { LoginData, LoginResult, VerifyCodeResult, TenantInfo, SsoLogoutResult, SsoChangePasswordForm, SsoExchangeParams } from './types';
import { UserInfo } from '@/api/system/user/types';

// pc端固定客户端授权id
const clientId = import.meta.env.VITE_APP_CLIENT_ID;

/**
 * @param data {LoginData}
 * @returns
 */
export function login(data: LoginData): AxiosPromise<LoginResult> {
  const params = {
    ...data,
    clientId: data.clientId || clientId,
    grantType: data.grantType || 'password'
  };
  return request({
    url: '/auth/login',
    headers: {
      isToken: false,
      isEncrypt: true,
      repeatSubmit: false
    },
    method: 'post',
    data: params
  });
}

// 注册方法
export function register(data: any) {
  const params = {
    ...data,
    clientId: clientId,
    grantType: 'password'
  };
  return request({
    url: '/auth/register',
    headers: {
      isToken: false,
      isEncrypt: true,
      repeatSubmit: false
    },
    method: 'post',
    data: params
  });
}

/**
 * 注销
 */
export function logout() {
  if (import.meta.env.VITE_APP_SSE === 'true') {
    request({
      url: '/resource/sse/close',
      method: 'get'
    });
  }
  return request({
    url: '/auth/logout',
    method: 'post'
  });
}

/**
 * 获取验证码
 */
export function getCodeImg(): AxiosPromise<VerifyCodeResult> {
  return request({
    url: '/auth/code',
    headers: {
      isToken: false
    },
    method: 'get',
    timeout: 20000
  });
}

/**
 * 第三方登录
 */
export function callback(data: LoginData): AxiosPromise<any> {
  const LoginData = {
    ...data,
    clientId: clientId,
    grantType: 'social'
  };
  return request({
    url: '/auth/social/callback',
    method: 'post',
    data: LoginData
  });
}

// 获取用户详细信息
export function getInfo(): AxiosPromise<UserInfo> {
  return request({
    url: '/system/user/getInfo',
    method: 'get'
  });
}

// 获取租户列表
export function getTenantList(isToken: boolean): AxiosPromise<TenantInfo> {
  return request({
    url: '/auth/tenant/list',
    headers: {
      isToken: isToken
    },
    method: 'get'
  });
}

/**
 * 凭 Keycloak 授权码 code 兑换平台 Token (统一走 /auth/sso/callback，支持 PKCE 与 Nonce 校验)
 */
export function exchangeSsoCode(data: SsoExchangeParams): AxiosPromise<LoginResult> {
  return request({
    url: '/auth/sso/callback',
    headers: {
      isToken: false,
      repeatSubmit: false
    },
    method: 'post',
    data
  });
}

/**
 * SSO 会话探活
 */
export function checkSsoSession(): AxiosPromise<boolean> {
  return request({
    url: '/auth/sso/session',
    headers: {
      repeatSubmit: false
    },
    method: 'get'
  });
}

/**
 * SSO 登出并获取 Keycloak 登出 URL
 */
export function getSsoLogoutUrl(redirectUri?: string): AxiosPromise<SsoLogoutResult> {
  if (import.meta.env.VITE_APP_SSE === 'true') {
    request({
      url: '/resource/sse/close',
      method: 'get'
    });
  }
  return request({
    url: '/auth/sso/logout',
    method: 'post',
    params: { redirectUri }
  });
}

/**
 * SSO 首次改密或平台改密
 */
export function changePasswordSso(data: SsoChangePasswordForm): AxiosPromise<void> {
  return request({
    url: '/auth/sso/change-password',
    headers: {
      isToken: false,
      repeatSubmit: false
    },
    method: 'post',
    data
  });
}
