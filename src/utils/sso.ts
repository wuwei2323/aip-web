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
 * 发起 SSO 登录重定向
 */
export async function startSsoLogin(redirect?: string): Promise<void> {
  if (isRedirecting) {
    return;
  }
  isRedirecting = true;

  try {
    const safeRedirect = sanitizeRedirect(redirect);
    const res = await getSsoAuthorizeUrl(safeRedirect);
    if (res && res.data && res.data.authorizeUrl) {
      window.location.href = res.data.authorizeUrl;
    } else {
      isRedirecting = false;
      throw new Error('未获取到有效授权登录地址');
    }
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
