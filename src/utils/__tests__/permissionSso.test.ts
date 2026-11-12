import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RouteLocationNormalized } from 'vue-router';
import router from '@/router';
import NProgress from 'nprogress';
import { ElMessage } from 'element-plus/es';
import { getToken } from '@/utils/auth';
import { isRelogin } from '@/utils/request';
import { isSsoEnabled, isSsoNavigationPending, startSsoLogin } from '@/utils/sso';
import { useUserStore } from '@/store/modules/user';
import { usePermissionStore } from '@/store/modules/permission';
import { errorCode } from '@/utils/errorCode';

vi.mock('@/router', () => ({ default: { beforeEach: vi.fn(), afterEach: vi.fn(), addRoute: vi.fn() } }));
vi.mock('nprogress', () => ({ default: { configure: vi.fn(), start: vi.fn(), done: vi.fn() } }));
vi.mock('element-plus/es', () => ({ ElMessage: { error: vi.fn() } }));
vi.mock('@/utils/auth', () => ({ getToken: vi.fn() }));
vi.mock('@/utils/request', () => ({ isRelogin: { show: false } }));
vi.mock('@/utils/sso', () => ({
  isSsoEnabled: vi.fn(() => true),
  isSsoNavigationPending: vi.fn(() => false),
  startSsoLogin: vi.fn(),
  checkSsoSessionDebounced: vi.fn()
}));
vi.mock('@/utils/validate', () => ({
  isHttp: (path: string) => path.startsWith('http'),
  isPathMatch: (pattern: string, path: string) => (pattern.endsWith('*') ? path.startsWith(pattern.slice(0, -1)) : path === pattern)
}));
vi.mock('@/store/modules/user', () => ({ useUserStore: vi.fn() }));
vi.mock('@/store/modules/permission', () => ({ usePermissionStore: vi.fn() }));
vi.mock('@/store/modules/settings', () => ({ useSettingsStore: () => ({ setTitle: vi.fn() }) }));

const getInfo = vi.fn();
const logout = vi.fn();
const cleanSession = vi.fn();
const generateRoutes = vi.fn();
let token: string;

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  isRelogin.show = false;
  token = 'existing-token';
  vi.mocked(getToken).mockImplementation(() => token);
  cleanSession.mockImplementation(() => {
    token = '';
  });
  vi.mocked(useUserStore).mockReturnValue({ roles: [], getInfo, logout, cleanSession } as unknown as ReturnType<typeof useUserStore>);
  vi.mocked(usePermissionStore).mockReturnValue({ sidebarRouters: [], generateRoutes } as unknown as ReturnType<typeof usePermissionStore>);
  generateRoutes.mockResolvedValue([]);
  vi.stubGlobal('window', {});
  vi.stubGlobal('document', { addEventListener: vi.fn() });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function route(path: string, query: Record<string, string> = {}) {
  return { path, fullPath: path, query, params: {}, meta: {}, hash: '' } as RouteLocationNormalized;
}

async function loadGuard() {
  await import('@/permission');
  return vi.mocked(router.beforeEach).mock.calls[0][0];
}

describe('路由守卫的 SSO 资料加载失败边界', () => {
  it.each(['localized service unavailable', 'localized forbidden'])('getInfo 失败 %s 只清本地状态，进入有界错误页而非全局退出', async (message) => {
    getInfo.mockRejectedValue(new Error(message));
    const guard = await loadGuard();
    const next = vi.fn();
    await guard(route('/system/user'), route('/sso/callback'), next);
    expect(logout).not.toHaveBeenCalled();
    expect(cleanSession).toHaveBeenCalledTimes(1);
    expect(startSsoLogin).not.toHaveBeenCalled();
    expect(generateRoutes).not.toHaveBeenCalled();
    expect(isRelogin.show).toBe(false);
    expect(NProgress.done).toHaveBeenCalled();
    expect(next).toHaveBeenCalledExactlyOnceWith({
      path: '/login',
      query: { error: 'user_info_failed', error_description: message },
      replace: true
    });
    // 模拟错误落地页再经过一次守卫，确认不会立即开启下一轮授权或 getInfo。
    const errorNext = vi.fn();
    await guard(route('/login', { error: 'user_info_failed', error_description: message }), route('/system/user'), errorNext);
    expect(errorNext).toHaveBeenCalledExactlyOnceWith();
    expect(getInfo).toHaveBeenCalledTimes(1);
    expect(startSsoLogin).not.toHaveBeenCalled();
  });

  it('无错误详情时复用现有错误文案，不显示内部错误码', async () => {
    getInfo.mockRejectedValue(new Error(''));
    const guard = await loadGuard();
    const next = vi.fn();
    await guard(route('/system/user'), route('/'), next);
    expect(next.mock.calls[0][0].query.error_description).toBe(errorCode['default']);
    expect(logout).not.toHaveBeenCalled();
  });

  it('401 拦截器已开始认证时取消当前导航，不追加全局退出、本地清理或第二次认证', async () => {
    getInfo.mockImplementation(async () => {
      vi.mocked(isSsoNavigationPending).mockReturnValue(true);
      throw new Error('unauthorized');
    });
    const guard = await loadGuard();
    const next = vi.fn();
    await guard(route('/system/user'), route('/sso/callback'), next);
    expect(next).toHaveBeenCalledExactlyOnceWith(false);
    expect(logout).not.toHaveBeenCalled();
    expect(cleanSession).not.toHaveBeenCalled();
    expect(startSsoLogin).not.toHaveBeenCalled();
    expect(generateRoutes).not.toHaveBeenCalled();
    expect(ElMessage.error).not.toHaveBeenCalled();
    expect(isRelogin.show).toBe(false);
    expect(NProgress.done).toHaveBeenCalled();
  });

  it('getInfo 在退出期间失败时保留退出所需 token，且不导航到登录页', async () => {
    let rejectInfo!: (error: Error) => void;
    getInfo.mockReturnValue(
      new Promise<void>((_, reject) => {
        rejectInfo = reject;
      })
    );
    const guard = await loadGuard();
    const next = vi.fn();
    const pending = guard(route('/system/user'), route('/index'), next);
    vi.mocked(isSsoNavigationPending).mockReturnValue(true);
    rejectInfo(new Error('late getInfo failure'));
    await pending;
    expect(token).toBe('existing-token');
    expect(next).toHaveBeenCalledExactlyOnceWith(false);
    expect(logout).not.toHaveBeenCalled();
    expect(cleanSession).not.toHaveBeenCalled();
    expect(startSsoLogin).not.toHaveBeenCalled();
  });

  it('非 SSO getInfo 失败维持原有本地退出和根路由行为', async () => {
    vi.mocked(isSsoEnabled).mockReturnValue(false);
    const error = new Error('local login failure');
    getInfo.mockRejectedValue(error);
    const guard = await loadGuard();
    const next = vi.fn();
    await guard(route('/system/user'), route('/'), next);
    expect(logout).toHaveBeenCalledTimes(1);
    expect(cleanSession).not.toHaveBeenCalled();
    expect(ElMessage.error).toHaveBeenCalledWith(error);
    expect(next).toHaveBeenCalledExactlyOnceWith({ path: '/' });
    expect(startSsoLogin).not.toHaveBeenCalled();
  });

  it('无 token 的普通受保护路由仍允许发起授权', async () => {
    token = '';
    const guard = await loadGuard();
    const next = vi.fn();
    await guard(route('/system/user'), route('/'), next);
    expect(startSsoLogin).toHaveBeenCalledExactlyOnceWith('/system/user');
    expect(getInfo).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
