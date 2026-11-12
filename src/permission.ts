import { to as tos } from 'await-to-js';
import router from './router';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import { getToken } from '@/utils/auth';
import { isHttp, isPathMatch } from '@/utils/validate';
import { isRelogin } from '@/utils/request';
import { useUserStore } from '@/store/modules/user';
import { useSettingsStore } from '@/store/modules/settings';
import { usePermissionStore } from '@/store/modules/permission';
import { ElMessage } from 'element-plus/es';
import { isSsoEnabled, isSsoNavigationPending, startSsoLogin, checkSsoSessionDebounced } from '@/utils/sso';
import { errorCode } from '@/utils/errorCode';

NProgress.configure({ showSpinner: false });
const whiteList = ['/login', '/register', '/social-callback', '/register*', '/register/*', '/sso/callback', '/sso/change-password', '/sso/*'];

const isWhiteList = (path: string) => {
  return whiteList.some((pattern) => isPathMatch(pattern, path));
};

// 页面可见性探活 (SSO 焦点探活)
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkSsoSessionDebounced();
    }
  });
}

router.beforeEach(async (to, from, next) => {
  NProgress.start();
  if (getToken()) {
    to.meta.title && useSettingsStore().setTitle(to.meta.title as string);
    /* has token*/
    if (to.path === '/login') {
      next({ path: '/' });
      NProgress.done();
    } else if (isWhiteList(to.path)) {
      next();
    } else {
      const hasRoles = useUserStore().roles.length > 0;
      const hasRoutes = usePermissionStore().sidebarRouters.length > 0;
      if (!hasRoles || !hasRoutes) {
        isRelogin.show = true;
        if (!hasRoles) {
          // 判断当前用户是否已拉取完user_info信息
          const [err] = await tos(useUserStore().getInfo());
          if (err) {
            isRelogin.show = false;
            if (isSsoEnabled()) {
              // 401 拦截器已开始认证，或用户正在退出时，不再清理状态或发起第二次导航。
              if (isSsoNavigationPending()) {
                next(false);
              } else {
                // 资料加载失败不等于用户退出；仅清理本地会话，停在可手动重试的错误页，避免守卫循环。
                useUserStore().cleanSession();
                next({
                  path: '/login',
                  query: { error: 'user_info_failed', error_description: err.message || errorCode['default'] },
                  replace: true
                });
              }
              NProgress.done();
              return;
            }
            await useUserStore().logout();
            ElMessage.error(err);
            next({ path: '/' });
            return;
          }
        }
        isRelogin.show = false;
        const accessRoutes = await usePermissionStore().generateRoutes();
        // 根据roles权限生成可访问的路由表
        accessRoutes.forEach((route) => {
          if (!isHttp(route.path)) {
            router.addRoute(route); // 动态添加可访问路由表
          }
        });
        // @ts-expect-error hack方法 确保addRoutes已完成
        next({ path: to.path, replace: true, params: to.params, query: to.query, hash: to.hash, name: to.name as string }); // hack方法 确保addRoutes已完成
      } else {
        next();
      }
    }
  } else {
    // 没有token
    if (isWhiteList(to.path)) {
      // 在免登录白名单，直接进入
      next();
    } else if (isSsoEnabled()) {
      await startSsoLogin(to.fullPath);
      NProgress.done();
      return;
    } else {
      const redirect = encodeURIComponent(to.fullPath || '/');
      next(`/login?redirect=${redirect}`); // 否则全部重定向到登录页
      NProgress.done();
    }
  }
});

router.afterEach(() => {
  NProgress.done();
});
