import { webcrypto } from 'node:crypto';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getToken, removeToken } from '@/utils/auth';
import { useUserStore } from '@/store/modules/user';
import router from '@/router';

vi.mock('@/utils/auth', () => ({ getToken: vi.fn(), removeToken: vi.fn() }));
vi.mock('@/store/modules/user', () => ({ useUserStore: vi.fn() }));
vi.mock('@/router', () => ({ default: { currentRoute: { value: {} }, replace: vi.fn() } }));
vi.mock('@/lang', () => ({ getLanguage: () => 'zh_CN' }));
vi.mock('@/utils/ruoyi', () => ({ tansParams: vi.fn(), blobValidate: vi.fn() }));
vi.mock('@/plugins/cache', () => ({ default: { session: { getJSON: vi.fn(), setJSON: vi.fn() } } }));
vi.mock('@/utils/crypto', () => ({
  encryptBase64: vi.fn(),
  encryptWithAes: vi.fn(),
  generateAesKey: vi.fn(),
  decryptWithAes: vi.fn(),
  decryptBase64: vi.fn()
}));
vi.mock('@/utils/jsencrypt', () => ({ encrypt: vi.fn(), decrypt: vi.fn() }));
vi.mock('file-saver', () => ({ default: { saveAs: vi.fn() } }));

let token: string;
let storage: Map<string, string>;
let location: { origin: string; pathname: string; search: string; href: string };
const cleanSession = vi.fn();
const message = vi.fn();
const confirm = vi.fn();

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function setRoute(path: string, query: Record<string, string> = {}) {
  router.currentRoute.value = { path, fullPath: path, query } as typeof router.currentRoute.value;
}

function response(config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse {
  return { config, data, status, statusText: String(status), headers: {}, request: { responseType: 'json' } };
}

function unauthorized(config: InternalAxiosRequestConfig, kind: string): Promise<AxiosResponse> {
  if (kind === 'HTTP') {
    return Promise.reject(
      new AxiosError('Request failed with status code 401', AxiosError.ERR_BAD_REQUEST, config, {}, response(config, { msg: 'expired' }, 401))
    );
  }
  return Promise.resolve(response(config, { code: 401, msg: 'expired' }));
}

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  vi.stubEnv('VITE_APP_KEYCLOAK_ENABLED', 'true');
  vi.stubEnv('VITE_APP_KEYCLOAK_ISSUER_URI', 'https://identity.test/realms/aip');
  vi.stubEnv('VITE_APP_KEYCLOAK_CLIENT_ID', 'portal');
  vi.stubEnv('VITE_APP_KEYCLOAK_FRONTEND_CALLBACK_PATH', '/sso/callback');
  vi.stubEnv('VITE_APP_ENCRYPT', 'false');
  vi.stubEnv('VITE_APP_SSE', 'false');
  token = 'existing-token';
  vi.mocked(getToken).mockImplementation(() => token);
  vi.mocked(removeToken).mockImplementation(() => {
    token = '';
  });
  cleanSession.mockImplementation(() => {
    token = '';
  });
  vi.mocked(useUserStore).mockReturnValue({ cleanSession } as unknown as ReturnType<typeof useUserStore>);
  storage = new Map([['sso_state', 'existing-state']]);
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key)
  });
  location = { origin: 'https://portal.test', pathname: '/index', search: '', href: '' };
  vi.stubGlobal('window', { crypto: webcrypto, location });
  vi.stubGlobal('ElMessage', message);
  vi.stubGlobal('ElMessageBox', { confirm });
  vi.stubGlobal('ElNotification', { error: vi.fn() });
  setRoute('/index');
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe.each(['HTTP', '业务'])('%s 401 的 SSO 导航边界', (kind) => {
  it('普通请求仍可发起一次授权，并发与迟到 401 不再次清理或覆盖事务', async () => {
    const { default: request } = await import('../request');
    request.defaults.adapter = (config) => unauthorized(config, kind);
    const results = await Promise.allSettled([request.get('/system/user/getInfo'), request.get('/system/menu/getRouters')]);
    expect(results.every((result) => result.status === 'rejected')).toBe(true);
    expect(removeToken).toHaveBeenCalledTimes(1);
    const authUrl = location.href;
    const state = storage.get('sso_state');
    expect(new URL(authUrl).pathname).toBe('/realms/aip/protocol/openid-connect/auth');
    token = 'new-token';
    await expect(request.get('/system/old-request')).rejects.toBeInstanceOf(Error);
    expect(removeToken).toHaveBeenCalledTimes(1);
    expect(token).toBe('new-token');
    expect(storage.get('sso_state')).toBe(state);
    expect(location.href).toBe(authUrl);
    expect(confirm).not.toHaveBeenCalled();
  });

  it.each(['业务请求', '会话探活'])('A 会话的%s迟到 401 不得清理另一标签建立的 B 会话或发起授权', async (source) => {
    const { default: request } = await import('../request');
    const { checkSsoSessionDebounced, isSsoNavigationPending } = await import('../sso');
    const oldResponse = deferred<void>();
    const adapter = vi.fn((config: InternalAxiosRequestConfig) => {
      expect(config.headers.get('Authorization')).toBe('Bearer token-A');
      expect(config.url).toBe(source === '会话探活' ? '/auth/sso/session' : '/system/menu/getRouters');
      return oldResponse.promise.then(() => unauthorized(config, kind));
    });
    request.defaults.adapter = adapter;
    token = 'token-A';
    const pending = source === '会话探活' ? checkSsoSessionDebounced() : request.get('/system/menu/getRouters').catch((error) => error);
    await vi.waitFor(() => expect(adapter).toHaveBeenCalledTimes(1));
    // 模拟另一标签更新共享 token；本页尚未开始任何认证或退出导航。
    token = 'token-B';
    storage.set('sso_state', 'state-B');
    expect(isSsoNavigationPending()).toBe(false);
    oldResponse.resolve();
    const result = await pending;
    if (source === '会话探活') {
      expect(result).toBe(false);
    } else {
      expect(result).toBeInstanceOf(Error);
    }
    expect(token).toBe('token-B');
    expect(removeToken).not.toHaveBeenCalled();
    expect(cleanSession).not.toHaveBeenCalled();
    expect(storage.get('sso_state')).toBe('state-B');
    expect(location.href).toBe('');
    expect(isSsoNavigationPending()).toBe(false);
    expect(message).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('退出前已发出的请求迟到 401 时保留退出 token，只允许退出响应完成后的导航', async () => {
    const { default: request } = await import('../request');
    const { logoutSso } = await import('../sso');
    const oldResponse = deferred<void>();
    const logoutResponse = deferred<void>();
    const adapter = vi.fn((config: InternalAxiosRequestConfig) => {
      if (config.url === '/auth/sso/logout') {
        expect(config.headers.Authorization).toBe('Bearer existing-token');
        return logoutResponse.promise.then(() => response(config, { code: 200, data: { logoutUrl: 'https://identity.test/logout' } }));
      }
      return oldResponse.promise.then(() => unauthorized(config, kind));
    });
    request.defaults.adapter = adapter;
    const oldRequest = request.get('/system/user/getInfo').catch((error) => error);
    await vi.waitFor(() => expect(adapter).toHaveBeenCalledTimes(1));
    const logout = logoutSso();
    await vi.waitFor(() => expect(adapter).toHaveBeenCalledTimes(2));
    oldResponse.resolve();
    expect(await oldRequest).toBeInstanceOf(Error);
    expect(token).toBe('existing-token');
    expect(removeToken).not.toHaveBeenCalled();
    expect(cleanSession).not.toHaveBeenCalled();
    expect(storage.get('sso_state')).toBe('existing-state');
    expect(location.href).toBe('');
    logoutResponse.resolve();
    await logout;
    expect(cleanSession).toHaveBeenCalledTimes(1);
    expect(token).toBe('');
    expect(location.href).toBe('https://identity.test/logout');
    await expect(request.get('/system/another-old-request')).rejects.toBeInstanceOf(Error);
    expect(location.href).toBe('https://identity.test/logout');
    expect(removeToken).not.toHaveBeenCalled();
    expect(message).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('换票错误原样交给 callback 页面，不自动登录或改写一次性事务', async () => {
    const { default: request } = await import('../request');
    const { exchangeSsoCode } = await import('@/api/login');
    request.defaults.adapter = (config) => {
      expect(config.headers.Authorization).toBeUndefined();
      return unauthorized(config, kind);
    };
    setRoute('/sso/callback');
    await expect(
      exchangeSsoCode({ code: 'code', codeVerifier: 'verifier', redirectUri: 'https://portal.test/sso/callback', nonce: 'nonce' })
    ).rejects.toBeInstanceOf(Error);
    expect(location.href).toBe('');
    expect(storage.get('sso_state')).toBe('existing-state');
    expect(removeToken).not.toHaveBeenCalled();
    expect(message).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it.each(['/auth/sso/logout', '/resource/sse/close', '/auth/sso/callback', '/resource/sse/close?source=logout'])(
    '%s 即使不在回调/退出页面也不发起自动认证',
    async (url) => {
      const { default: request } = await import('../request');
      request.defaults.adapter = (config) => unauthorized(config, kind);
      await expect(request.get(url)).rejects.toBeInstanceOf(Error);
      expect(removeToken).not.toHaveBeenCalled();
      expect(location.href).toBe('');
      expect(confirm).not.toHaveBeenCalled();
    }
  );

  it.each([
    { path: '/sso/callback', query: {} },
    { path: '/login', query: { error: 'logout_unconfirmed' } },
    { path: '/login', query: { error: 'user_info_failed' } }
  ])('已在 $path $query 时，其他请求的 401 也不能覆盖静态错误页', async ({ path, query }) => {
    const { default: request } = await import('../request');
    request.defaults.adapter = (config) => unauthorized(config, kind);
    setRoute(path, query);
    await expect(request.get('/system/late-request')).rejects.toBeInstanceOf(Error);
    expect(location.href).toBe('');
    expect(removeToken).not.toHaveBeenCalled();
    expect(storage.get('sso_state')).toBe('existing-state');
    expect(message).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });
});

it('服务 500 错误保持原有提示与拒绝，不将服务异常转为自动认证', async () => {
  const { default: request } = await import('../request');
  request.defaults.adapter = (config) => Promise.resolve(response(config, { code: 500, msg: 'localized service error' }));
  await expect(request.get('/system/user/getInfo')).rejects.toThrow('localized service error');
  expect(location.href).toBe('');
  expect(removeToken).not.toHaveBeenCalled();
  expect(message).toHaveBeenCalledWith({ message: 'localized service error', type: 'error' });
});
