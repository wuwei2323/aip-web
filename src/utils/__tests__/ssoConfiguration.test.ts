import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/login', () => ({
  getSsoLogoutUrl: vi.fn(),
  checkSsoSession: vi.fn()
}));
vi.mock('@/utils/auth', () => ({
  removeToken: vi.fn(),
  getToken: vi.fn(() => '')
}));
vi.mock('@/store/modules/user', () => ({
  useUserStore: vi.fn()
}));

let storage: Map<string, string>;
let location: { origin: string; pathname: string; search: string; href: string };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function preparePendingLogout() {
  const { getSsoLogoutUrl } = await import('@/api/login');
  const { useUserStore } = await import('@/store/modules/user');
  const pending = deferred<Awaited<ReturnType<typeof getSsoLogoutUrl>>>();
  const cleanSession = vi.fn();
  vi.mocked(useUserStore).mockReturnValue({ cleanSession } as ReturnType<typeof useUserStore>);
  vi.mocked(getSsoLogoutUrl).mockReturnValue(pending.promise);
  const logoutUrl = 'https://identity.test/logout';
  const finish = () => pending.resolve({ data: { logoutUrl } } as Awaited<ReturnType<typeof getSsoLogoutUrl>>);
  return { cleanSession, finish, logoutUrl };
}

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  vi.unstubAllEnvs();
  storage = new Map();
  location = { origin: 'https://portal.test', pathname: '/index', search: '', href: '' };
  vi.stubGlobal('sessionStorage', {
    setItem: (key: string, value: string) => storage.set(key, value),
    getItem: (key: string) => storage.get(key) ?? null,
    removeItem: (key: string) => storage.delete(key)
  });
  vi.stubGlobal('window', { crypto: webcrypto, location });
  vi.stubEnv('VITE_APP_KEYCLOAK_ENABLED', 'true');
  vi.stubEnv('VITE_APP_KEYCLOAK_ISSUER_URI', 'https://identity.test/auth/realms/testing');
  vi.stubEnv('VITE_APP_KEYCLOAK_CLIENT_ID', 'oidc-test-client');
  vi.stubEnv('VITE_APP_KEYCLOAK_FRONTEND_CALLBACK_PATH', '/console/sso/callback');
  vi.stubEnv('VITE_APP_CLIENT_ID', 'local-terminal-client');
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('统一的 Keycloak 前端公开配置', () => {
  it('使用新启用字段，不从旧开关回退', async () => {
    vi.stubEnv('VITE_APP_KEYCLOAK_ENABLED', 'false');
    vi.stubEnv('VITE_APP_SSO_ENABLED', 'true');
    const { isSsoEnabled } = await import('../sso');
    expect(isSsoEnabled()).toBe(false);
    vi.stubEnv('VITE_APP_KEYCLOAK_ENABLED', 'true');
    vi.stubEnv('VITE_APP_SSO_ENABLED', 'false');
    expect(isSsoEnabled()).toBe(true);
  });

  it('从完整 issuer 生成授权地址，并保留授权事务和 PKCE', async () => {
    const { startSsoLogin, calculateCodeChallenge } = await import('../sso');
    await startSsoLogin('/index?from=menu');
    const url = new URL(location.href);
    expect(url.origin).toBe('https://identity.test');
    expect(url.pathname).toBe('/auth/realms/testing/protocol/openid-connect/auth');
    expect(url.searchParams.get('client_id')).toBe('oidc-test-client');
    expect(url.searchParams.get('client_id')).not.toBe('local-terminal-client');
    expect(url.searchParams.get('redirect_uri')).toBe('https://portal.test/console/sso/callback');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe('openid profile email');
    expect(url.searchParams.get('state')).toBe(storage.get('sso_state'));
    expect(url.searchParams.get('nonce')).toBe(storage.get('sso_nonce'));
    expect(url.searchParams.get('state')).toHaveLength(32);
    expect(url.searchParams.get('nonce')).toHaveLength(32);
    expect(storage.get('sso_callback_url')).toBe(url.searchParams.get('redirect_uri'));
    expect(storage.get('sso_target_path')).toBe('/index?from=menu');
    expect(storage.get('sso_code_verifier')).toHaveLength(64);
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toBe(await calculateCodeChallenge(storage.get('sso_code_verifier')!));
    expect(url.searchParams.has('code_verifier')).toBe(false);
    const clientData = JSON.parse(atob(url.searchParams.get('client_data')!.replace(/-/g, '+').replace(/_/g, '/')));
    expect(clientData.ru).toBe(storage.get('sso_callback_url'));
    expect(clientData.st).toBe(storage.get('sso_state'));
  });

  it.each(['https://identity.test/realms/aip', 'https://identity.test/realms/aip/', 'http://identity.test:8080/auth/realms/aip/'])(
    '正确处理完整 issuer：%s',
    async (issuer) => {
      vi.stubEnv('VITE_APP_KEYCLOAK_ISSUER_URI', issuer);
      const { startSsoLogin } = await import('../sso');
      await startSsoLogin();
      const url = new URL(location.href);
      expect(url.origin + url.pathname).toBe(issuer.replace(/\/$/, '') + '/protocol/openid-connect/auth');
    }
  );

  it('旧地址与 Realm 变量不能覆盖新发行者配置', async () => {
    vi.stubEnv('VITE_APP_KEYCLOAK_URL', 'https://legacy.invalid');
    vi.stubEnv('VITE_APP_KEYCLOAK_REALM', 'ignored');
    const { startSsoLogin } = await import('../sso');
    await startSsoLogin();
    const url = new URL(location.href);
    expect(url.origin).toBe('https://identity.test');
    expect(url.pathname).toBe('/auth/realms/testing/protocol/openid-connect/auth');
  });

  it('新发行者缺省时使用既定默认值，不从旧地址配置回退', async () => {
    vi.stubEnv('VITE_APP_KEYCLOAK_ISSUER_URI', '');
    vi.stubEnv('VITE_APP_KEYCLOAK_URL', 'https://legacy.invalid');
    vi.stubEnv('VITE_APP_KEYCLOAK_REALM', 'ignored');
    const { startSsoLogin } = await import('../sso');
    await startSsoLogin();
    const url = new URL(location.href);
    expect(url.origin + url.pathname).toBe('http://192.168.3.82:8082/realms/aip/protocol/openid-connect/auth');
  });

  it('新回调路径缺省时使用默认值，不从旧回调字段回退', async () => {
    vi.stubEnv('VITE_APP_KEYCLOAK_FRONTEND_CALLBACK_PATH', '');
    vi.stubEnv('VITE_APP_SSO_CALLBACK_PATH', '/legacy/callback');
    const { startSsoLogin } = await import('../sso');
    await startSsoLogin();
    expect(new URL(location.href).searchParams.get('redirect_uri')).toBe('https://portal.test/sso/callback');
  });

  it('退出不提交自定义回跳地址，并清理本地状态后进入 Keycloak', async () => {
    const { getSsoLogoutUrl } = await import('@/api/login');
    const { useUserStore } = await import('@/store/modules/user');
    const cleanSession = vi.fn();
    vi.mocked(useUserStore).mockReturnValue({ cleanSession } as ReturnType<typeof useUserStore>);
    const logoutUrl = 'https://identity.test/realms/testing/protocol/openid-connect/logout?id_token_hint=test-token';
    vi.mocked(getSsoLogoutUrl).mockResolvedValue({ data: { logoutUrl } } as Awaited<ReturnType<typeof getSsoLogoutUrl>>);
    const { logoutSso } = await import('../sso');
    await logoutSso();
    expect(getSsoLogoutUrl).toHaveBeenCalledTimes(1);
    expect(getSsoLogoutUrl).toHaveBeenCalledWith();
    expect(cleanSession).toHaveBeenCalledTimes(1);
    expect(location.href).toBe(logoutUrl);
  });

  it.each([null, {}])('退出响应缺少地址时不显示成功或自动登录：%s', async (data) => {
    const { getSsoLogoutUrl } = await import('@/api/login');
    const { useUserStore } = await import('@/store/modules/user');
    const cleanSession = vi.fn();
    vi.mocked(useUserStore).mockReturnValue({ cleanSession } as ReturnType<typeof useUserStore>);
    vi.mocked(getSsoLogoutUrl).mockResolvedValue({ data } as unknown as Awaited<ReturnType<typeof getSsoLogoutUrl>>);
    const { logoutSso } = await import('../sso');
    await logoutSso();
    expect(cleanSession).toHaveBeenCalledTimes(1);
    expect(location.href).toBe('/login?error=logout_unconfirmed');
  });

  it('退出请求失败仍清理本地状态，但保留统一退出未确认的错误', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { getSsoLogoutUrl } = await import('@/api/login');
    const { useUserStore } = await import('@/store/modules/user');
    const cleanSession = vi.fn();
    vi.mocked(useUserStore).mockReturnValue({ cleanSession } as ReturnType<typeof useUserStore>);
    vi.mocked(getSsoLogoutUrl).mockRejectedValue(new Error('Network error'));
    const { logoutSso, startSsoLogin } = await import('../sso');
    await logoutSso();
    await startSsoLogin('/index');
    expect(cleanSession).toHaveBeenCalledTimes(1);
    expect(location.href).toBe('/login?error=logout_unconfirmed');
    expect(storage.size).toBe(0);
  });
});

describe('统一退出与异步认证的并发边界', () => {
  it('先标记退出但保留 token，请求完成后才清理并导航；重复退出与探活不再发请求', async () => {
    const { getToken, removeToken } = await import('@/utils/auth');
    const { getSsoLogoutUrl, checkSsoSession } = await import('@/api/login');
    vi.mocked(getToken).mockReturnValue('logout-token');
    const { cleanSession, finish, logoutUrl } = await preparePendingLogout();
    const { logoutSso, startSsoLogin, checkSsoSessionDebounced, isSsoNavigationPending } = await import('../sso');
    cleanSession.mockImplementation(() => {
      expect(location.href).toBe('');
      vi.mocked(getToken).mockReturnValue('');
    });
    const logout = logoutSso();
    expect(isSsoNavigationPending()).toBe(true);
    await logoutSso();
    await startSsoLogin('/system/user');
    expect(await checkSsoSessionDebounced()).toBe(false);
    expect(getSsoLogoutUrl).toHaveBeenCalledTimes(1);
    expect(checkSsoSession).not.toHaveBeenCalled();
    expect(cleanSession).not.toHaveBeenCalled();
    expect(removeToken).not.toHaveBeenCalled();
    expect(getToken()).toBe('logout-token');
    expect(storage.size).toBe(0);
    expect(location.href).toBe('');
    finish();
    await logout;
    expect(cleanSession).toHaveBeenCalledTimes(1);
    expect(location.href).toBe(logoutUrl);
    // 当前页面一直维持退出状态，防止离开页面之前的迟到回调重新发起认证。
    expect(isSsoNavigationPending()).toBe(true);
  });

  it.each([false, true])('PKCE 在退出%s完成后返回也不写入事务或覆盖退出目标', async (logoutFinished) => {
    const digest = deferred<ArrayBuffer>();
    vi.stubGlobal('window', {
      location,
      crypto: { getRandomValues: webcrypto.getRandomValues.bind(webcrypto), subtle: { digest: () => digest.promise } }
    });
    storage.set('sso_state', 'existing-state');
    const { cleanSession, finish, logoutUrl } = await preparePendingLogout();
    const { logoutSso, startSsoLogin } = await import('../sso');
    const login = startSsoLogin('/system/user');
    const logout = logoutSso();
    if (logoutFinished) {
      finish();
      await logout;
    }
    digest.resolve(new ArrayBuffer(32));
    await login;
    expect(storage).toEqual(new Map([['sso_state', 'existing-state']]));
    expect(location.href).toBe(logoutFinished ? logoutUrl : '');
    if (!logoutFinished) {
      expect(cleanSession).not.toHaveBeenCalled();
      finish();
      await logout;
    }
    expect(location.href).toBe(logoutUrl);
  });

  it.each(['valid', 'invalid', 'rejected'])('退出期间迟到的 %s 探活不清理 token 或跳转', async (result) => {
    const { getToken, removeToken } = await import('@/utils/auth');
    const { checkSsoSession } = await import('@/api/login');
    vi.mocked(getToken).mockReturnValue('logout-token');
    const session = deferred<Awaited<ReturnType<typeof checkSsoSession>>>();
    vi.mocked(checkSsoSession).mockReturnValue(session.promise);
    const { finish, logoutUrl } = await preparePendingLogout();
    const { logoutSso, checkSsoSessionDebounced } = await import('../sso');
    const probe = checkSsoSessionDebounced();
    const logout = logoutSso();
    if (result === 'rejected') {
      session.reject(new Error('late probe failure'));
    } else {
      session.resolve({ data: result === 'valid' } as Awaited<ReturnType<typeof checkSsoSession>>);
    }
    expect(await probe).toBe(false);
    expect(removeToken).not.toHaveBeenCalled();
    expect(getToken()).toBe('logout-token');
    expect(storage.size).toBe(0);
    expect(location.href).toBe('');
    finish();
    await logout;
    expect(location.href).toBe(logoutUrl);
  });

  it.each(['invalid', 'rejected'])('新会话建立后忽略旧会话的 %s 探活', async (result) => {
    const { getToken, removeToken } = await import('@/utils/auth');
    const { checkSsoSession } = await import('@/api/login');
    vi.mocked(getToken).mockReturnValue('old-token');
    const session = deferred<Awaited<ReturnType<typeof checkSsoSession>>>();
    vi.mocked(checkSsoSession).mockReturnValue(session.promise);
    const { checkSsoSessionDebounced } = await import('../sso');
    const probe = checkSsoSessionDebounced();
    vi.mocked(getToken).mockReturnValue('new-token');
    storage.set('sso_state', 'new-state');
    if (result === 'rejected') {
      session.reject(new Error('old probe failure'));
    } else {
      session.resolve({ data: false } as Awaited<ReturnType<typeof checkSsoSession>>);
    }
    expect(await probe).toBe(false);
    expect(removeToken).not.toHaveBeenCalled();
    expect(getToken()).toBe('new-token');
    expect(storage.get('sso_state')).toBe('new-state');
    expect(location.href).toBe('');
  });

  it('完整退出后新页面允许一次普通授权，不持久化退出锁或强制认证参数', async () => {
    const { finish } = await preparePendingLogout();
    const { logoutSso } = await import('../sso');
    const logout = logoutSso();
    finish();
    await logout;
    vi.resetModules();
    location.href = '';
    const { startSsoLogin, isSsoNavigationPending } = await import('../sso');
    expect(isSsoNavigationPending()).toBe(false);
    await Promise.all([startSsoLogin('/index'), startSsoLogin('/system/user')]);
    const url = new URL(location.href);
    expect(url.pathname).toBe('/auth/realms/testing/protocol/openid-connect/auth');
    expect(url.searchParams.has('prompt')).toBe(false);
    expect(url.searchParams.has('max_age')).toBe(false);
    expect(storage.get('sso_target_path')).toBe('/index');
  });
});
