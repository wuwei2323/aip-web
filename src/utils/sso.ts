import { getSsoAuthorizeUrl, getSsoLogoutUrl, checkSsoSession } from '@/api/login';
import { removeToken, getToken } from '@/utils/auth';
import { useUserStore } from '@/store/modules/user';

let isRedirecting = false;
let lastCheckTime = 0;
const SESSION_CHECK_INTERVAL = 3000; // 3秒防抖

/**
 * 判断是否开启 SSO
 */
export function isSsoEnabled(): boolean {
  return import.meta.env.VITE_APP_SSO_ENABLED === 'true';
}

/**
 * 过滤重定向地址，防范开放重定向攻击
 */
export function sanitizeRedirect(redirect?: string | null): string {
  if (!redirect || typeof redirect !== 'string') {
    return '/';
  }
  const trimmed = redirect.trim();
  // 必须是站内相对路径，禁止 // 协议相对域名或外部链接
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('/sso/callback')) {
    return '/';
  }
  return trimmed;
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
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * 适配 Keycloak 登录跳转链接，确保携带 redirect_uri 与 client_data
 */
export function adaptSsoAuthorizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    const redirectUri = url.searchParams.get('redirect_uri');
    const state = url.searchParams.get('state') || '';
    const hasClientData = url.searchParams.has('client_data');

    // 若有 redirect_uri 但无 client_data，自动补充构造 client_data (Base64 URL-safe)
    if (redirectUri && !hasClientData) {
      const clientDataObj = {
        ru: redirectUri,
        rt: 'code',
        st: state
      };
      const clientDataStr = toBase64Url(JSON.stringify(clientDataObj));
      url.searchParams.set('client_data', clientDataStr);
    }

    return url.toString();
  } catch (e) {
    console.warn('适配 SSO 授权跳转地址失败，降级使用原地址:', e);
    return rawUrl;
  }
}

/**
 * 发起 SSO 登录重定向 (方案 B：前端直接构造并跳转 Keycloak)
 */
export async function startSsoLogin(redirect?: string): Promise<void> {
  if (isRedirecting) {
    return;
  }
  isRedirecting = true;

  try {
    const safeRedirect = sanitizeRedirect(redirect);
    const keycloakUrl = import.meta.env.VITE_APP_KEYCLOAK_URL || 'http://192.168.43.100:8080';
    const realm = import.meta.env.VITE_APP_KEYCLOAK_REALM || 'aip';
    const clientId = import.meta.env.VITE_APP_KEYCLOAK_CLIENT_ID || '000000';
    const callbackPath = import.meta.env.VITE_APP_SSO_CALLBACK_PATH || '/sso/callback';
    const callbackUrl = window.location.origin + callbackPath;

    // 1. 生成防 CSRF 随机 state，并暂存目标跳转路径
    const state = Math.random().toString(36).substring(2) + Date.now().toString(36);
    sessionStorage.setItem('sso_state', state);
    sessionStorage.setItem('sso_target_path', safeRedirect);

    // 2. 组装 client_data (为 Keycloak 定制主题动态提供回调地址以解析验证码基地址)
    const clientDataObj = {
      ru: callbackUrl,
      rt: 'code',
      st: state
    };
    const clientDataStr = toBase64Url(JSON.stringify(clientDataObj));

    // 3. 构造标准 OIDC 授权地址并直接重定向
    const authUrl = new URL(`${keycloakUrl}/realms/${realm}/protocol/openid-connect/auth`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', callbackUrl);
    authUrl.searchParams.set('client_data', clientDataStr);
    authUrl.searchParams.set('scope', 'openid profile email');
    authUrl.searchParams.set('state', state);

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
  if (!isSsoEnabled() || !getToken()) {
    return false;
  }

  const now = Date.now();
  if (now - lastCheckTime < SESSION_CHECK_INTERVAL) {
    return true;
  }
  lastCheckTime = now;

  try {
    const res = await checkSsoSession();
    if (!res || !res.data) {
      console.warn('SSO 会话探活失败，准备重新发起认证');
      removeToken();
      await startSsoLogin(window.location.pathname + window.location.search);
      return false;
    }
    return true;
  } catch (error) {
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
  try {
    const res = await getSsoLogoutUrl();
    const userStore = useUserStore();
    userStore.cleanSession();
    removeToken();
    if (res && res.data && res.data.logoutUrl) {
      window.location.href = res.data.logoutUrl;
    } else {
      window.location.href = '/login';
    }
  } catch (error) {
    console.error('SSO 登出异常:', error);
    removeToken();
    window.location.href = '/login';
  }
}
