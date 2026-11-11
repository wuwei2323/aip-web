import { to } from 'await-to-js';
import { getToken, removeToken, setToken } from '@/utils/auth';
import { login as loginApi, logout as logoutApi, getInfo as getUserInfo, exchangeSsoCode } from '@/api/login';
import { LoginData, LoginResult, SsoExchangeParams } from '@/api/types';
import defAva from '@/assets/images/profile.jpg';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUserStore = defineStore('user', () => {
  const token = ref(getToken());
  const name = ref('');
  const nickname = ref('');
  const userId = ref<string | number>('');
  const tenantId = ref<string>('');
  const avatar = ref('');
  const roles = ref<Array<string>>([]); // 用户角色编码集合 → 判断路由权限
  const permissions = ref<Array<string>>([]); // 用户权限编码集合 → 判断按钮权限

  const cleanSession = () => {
    token.value = '';
    roles.value = [];
    permissions.value = [];
    name.value = '';
    nickname.value = '';
    userId.value = '';
    tenantId.value = '';
    removeToken();
  };

  /**
   * 登录
   * @param userInfo
   * @returns
   */
  const login = async (userInfo: LoginData): Promise<void> => {
    const [err, res] = await to(loginApi(userInfo));
    if (res) {
      const data = res.data;
      if (data.access_token) {
        setToken(data.access_token);
        token.value = data.access_token;
      }
      return Promise.resolve();
    }
    return Promise.reject(err);
  };

  /**
   * 凭 Keycloak 授权码 code 兑换会话 (支持 PKCE 与 Nonce 校验，支持首次强制改密)
   */
  const ssoLoginByCode = async (params: SsoExchangeParams): Promise<LoginResult> => {
    cleanSession();
    const [err, res] = await to(exchangeSsoCode(params));
    if (res) {
      const data = res.data;
      if (data.password_reset_required) {
        return Promise.resolve(data);
      }
      if (data.access_token) {
        setToken(data.access_token);
        token.value = data.access_token;
      }
      return Promise.resolve(data);
    }
    return Promise.reject(err);
  };

  // 获取用户信息
  const getInfo = async (): Promise<void> => {
    const [err, res] = await to(getUserInfo());
    if (res) {
      const data = res.data;
      const user = data.user;
      const profile = user.avatar == '' || user.avatar == null ? defAva : user.avatar;

      if (data.roles && data.roles.length > 0) {
        // 验证返回的roles是否是一个非空数组
        roles.value = data.roles;
        permissions.value = data.permissions;
      } else {
        roles.value = ['ROLE_DEFAULT'];
      }
      name.value = user.userName;
      nickname.value = user.nickName;
      avatar.value = profile;
      userId.value = user.userId;
      tenantId.value = data.tenantId || '';
      return Promise.resolve();
    }
    return Promise.reject(err);
  };

  // 注销
  const logout = async (): Promise<void> => {
    if (import.meta.env.VITE_APP_KEYCLOAK_ENABLED === 'true') {
      const { logoutSso } = await import('@/utils/sso');
      await logoutSso();
    } else {
      await logoutApi();
      cleanSession();
    }
  };

  const setAvatar = (value: string) => {
    avatar.value = value;
  };

  return {
    userId,
    tenantId,
    token,
    nickname,
    avatar,
    roles,
    permissions,
    login,
    ssoLoginByCode,
    cleanSession,
    getInfo,
    logout,
    setAvatar
  };
});
