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

beforeEach(() => {
  vi.resetModules();
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

  it.each([
    'https://identity.test/realms/aip',
    'https://identity.test/realms/aip/',
    'http://identity.test:8080/auth/realms/aip/'
  ])('正确处理完整 issuer：%s', async (issuer) => {
    vi.stubEnv('VITE_APP_KEYCLOAK_ISSUER_URI', issuer);
    const { startSsoLogin } = await import('../sso');
    await startSsoLogin();
    const url = new URL(location.href);
    expect(url.origin + url.pathname).toBe(issuer.replace(/\/$/, '') + '/protocol/openid-connect/auth');
  });

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
});
