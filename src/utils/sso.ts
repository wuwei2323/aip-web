import { getSsoLogoutUrl, checkSsoSession } from '@/api/login';
import { removeToken, getToken } from '@/utils/auth';
import { useUserStore } from '@/store/modules/user';
import CryptoJS from 'crypto-js';

let isRedirecting = false;
// 仅在当前页面内阻止退出期间重新认证；完整页面跳转后自然重置，不影响用户再次登录。
let isLoggingOut = false;
let lastCheckTime = 0;
const SESSION_CHECK_INTERVAL = 3000; // 3秒防抖

/**
 * 当前页面是否已开始认证跳转或统一退出，供拦截器与路由守卫避免重复导航。
 */
export function isSsoNavigationPending(): boolean {
  return isRedirecting || isLoggingOut;
}

/**
 * 判断是否开启 SSO
 */
export function isSsoEnabled(): boolean {
  return import.meta.env.VITE_APP_KEYCLOAK_ENABLED === 'true';
}

/**
 * 过滤重定向地址，防范开放重定向攻击并排除已废弃的历史路由
 */
export function sanitizeRedirect(redirect?: string | null): string {
  if (!redirect || typeof redirect !== 'string') {
    return '/index';
  }
  const trimmed = redirect.trim();
  // 必须是站内相对路径，禁止 // 协议相对域名或外部链接，过滤掉旧租户路由与回调路由
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.includes('/sso/callback') ||
    trimmed.startsWith('/tenant') ||
    trimmed.includes('/tenant/') ||
    trimmed === '/login' ||
    trimmed === '/'
  ) {
    return '/index';
  }
  return trimmed;
}

/**
 * 生成高强度随机字符串 (支持 Web Crypto API，并在非安全上下文/低版本下无缝兜底)
 */
export function generateRandomString(length: number = 32): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const values = new Uint8Array(length);
    window.crypto.getRandomValues(values);
    for (let i = 0; i < length; i++) {
      result += charset[values[i] % charset.length];
    }
    return result;
  }
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

/**
 * 计算 SHA-256 并生成 URL-Safe Base64 (原生 Web Crypto 优先，在非 HTTPS/内网 IP 等非安全上下文无缝回退到 crypto-js)
 */
export async function calculateCodeChallenge(verifier: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle && window.crypto.subtle.digest) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(verifier);
      const digest = await window.crypto.subtle.digest('SHA-256', data);
      const bytes = new Uint8Array(digest);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch (e) {
      console.warn('Web Crypto digest failed, fallback to crypto-js', e);
    }
  }
  const hash = CryptoJS.SHA256(verifier);
  return hash.toString(CryptoJS.enc.Base64).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * 将字符串编码为 URL-safe Base64
 */
function toBase64Url(str: string): string {
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * 发起 SSO 登录重定向 (SPA 前端直接构造并跳转 Keycloak)
 */
export async function startSsoLogin(redirect?: string): Promise<void> {
  if (isSsoNavigationPending()) {
    return;
  }
  isRedirecting = true;

  try {
    const safeRedirect = sanitizeRedirect(redirect);
    const issuerUri = import.meta.env.VITE_APP_KEYCLOAK_ISSUER_URI || 'http://192.168.3.82:8082/realms/aip';
    const clientId = import.meta.env.VITE_APP_KEYCLOAK_CLIENT_ID || '000000';
    const callbackPath = import.meta.env.VITE_APP_KEYCLOAK_FRONTEND_CALLBACK_PATH || '/sso/callback';
    const callbackUrl = window.location.origin + callbackPath;

    // 1. 生成防 CSRF state、防重放 nonce、PKCE verifier 与 challenge
    const state = generateRandomString(32);
    const nonce = generateRandomString(32);
    const codeVerifier = generateRandomString(64);
    const codeChallenge = await calculateCodeChallenge(codeVerifier);
    // PKCE 计算期间可能已开始退出，不能再写入认证事务或离开退出流程。
    if (isLoggingOut) {
      return;
    }

    sessionStorage.setItem('sso_state', state);
    sessionStorage.setItem('sso_nonce', nonce);
    sessionStorage.setItem('sso_code_verifier', codeVerifier);
    sessionStorage.setItem('sso_callback_url', callbackUrl); // 精确记录本次跳转回调地址
    sessionStorage.setItem('sso_target_path', safeRedirect);

    // 2. 组装 client_data (为 Keycloak 定制主题动态提供回调地址以解析验证码基地址)
    const clientDataObj = {
      ru: callbackUrl,
      rt: 'code',
      st: state
    };
    const clientDataStr = toBase64Url(JSON.stringify(clientDataObj));

    // 3. 构造标准 OIDC 授权地址并直接重定向 (包含强制 PKCE 与 Nonce)
    const authUrl = new URL(`${issuerUri.replace(/\/$/, '')}/protocol/openid-connect/auth`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', callbackUrl);
    authUrl.searchParams.set('client_data', clientDataStr);
    authUrl.searchParams.set('scope', 'openid profile email');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('nonce', nonce);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    window.location.href = authUrl.toString();
  } catch (err) {
    isRedirecting = false;
    console.error('发起 SSO 登录跳转失败:', err);
    throw err;
  }
}

/**
 * 页面可见性探活 (焦点探活 / visibilitychange)
 */
export async function checkSsoSessionDebounced(): Promise<boolean> {
  const token = getToken();
  if (isSsoNavigationPending() || !isSsoEnabled() || !token) {
    return false;
  }

  const now = Date.now();
  if (now - lastCheckTime < SESSION_CHECK_INTERVAL) {
    return true;
  }
  lastCheckTime = now;

  try {
    const res = await checkSsoSession();
    // 探活返回时会话可能已切换，旧结果不能清掉新 token 或覆盖已开始的登录/退出。
    if (isSsoNavigationPending() || getToken() !== token) {
      return false;
    }
    if (!res || !res.data) {
      console.warn('SSO 会话探活失败，准备重新发起认证');
      removeToken();
      await startSsoLogin(window.location.pathname + window.location.search);
      return false;
    }
    return true;
  } catch (error) {
    if (isSsoNavigationPending() || getToken() !== token) {
      return false;
    }
    console.warn('SSO 会话已失效:', error);
    removeToken();
    await startSsoLogin(window.location.pathname + window.location.search);
    return false;
  }
}

/**
 * SSO 全局退出登录
 */
export async function logoutSso(): Promise<void> {
  if (isLoggingOut) {
    return;
  }
  // 必须先标记退出，再发送带现有 token 的请求；完成后才清理本地会话并离开页面。
  isLoggingOut = true;
  let target = '/login?error=logout_unconfirmed';
  try {
    const res = await getSsoLogoutUrl();
    if (res?.data?.logoutUrl) {
      target = res.data.logoutUrl;
    }
  } catch (error) {
    console.error('SSO 登出异常:', error);
  }
  useUserStore().cleanSession();
  window.location.href = target;
}
