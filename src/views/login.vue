<template>
  <div class="login">
    <!-- SSO 统一身份认证落地/跳转界面 -->
    <div v-if="ssoActive && !showLocalLogin" class="sso-box">
      <div class="title-box">
        <h3 class="title">{{ title }}</h3>
        <lang-select />
      </div>

      <div class="sso-content">
        <div v-if="ssoError" class="sso-error-area">
          <el-alert
            :title="ssoErrorTitle"
            :description="ssoErrorDesc"
            type="error"
            show-icon
            :closable="false"
          />
          <div style="margin-top: 24px; text-align: center">
            <el-button type="primary" size="large" @click="handleSsoLogin">
              重新发起统一认证登录
            </el-button>
          </div>
        </div>

        <div v-else class="sso-loading-area">
          <el-icon class="is-loading" :size="40" color="#409eff">
            <Loading />
          </el-icon>
          <div class="sso-loading-text">正在跳转至统一身份认证平台...</div>
          <div class="sso-loading-tip">如浏览器未自动跳转，请点击下方按钮</div>
          <div style="margin-top: 20px">
            <el-button type="primary" size="default" @click="handleSsoLogin">
              立即前往登录
            </el-button>
          </div>
        </div>

        <!-- 应急本地登录入口 -->
        <div class="sso-fallback-link">
          <el-button link type="info" size="small" @click="showLocalLogin = true">
            账号密码登录 (应急备用)
          </el-button>
        </div>
      </div>
    </div>

    <!-- 本地账号密码登录表单 (应急备用模式) -->
    <el-form v-else ref="loginRef" :model="loginForm" :rules="loginRules" class="login-form">
      <div class="title-box">
        <h3 class="title">{{ title }}</h3>
        <lang-select />
      </div>

      <el-alert
        v-if="ssoActive"
        title="当前处于应急本地登录模式"
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 20px"
      />

      <el-form-item v-if="tenantEnabled" prop="tenantId">
        <el-select v-model="loginForm.tenantId" filterable :placeholder="proxy.$t('login.selectPlaceholder')" style="width: 100%">
          <el-option v-for="item in tenantList" :key="item.tenantId" :label="item.companyName" :value="item.tenantId"></el-option>
          <template #prefix><svg-icon icon-class="company" class="el-input__icon input-icon" /></template>
        </el-select>
      </el-form-item>
      <el-form-item prop="username">
        <el-input v-model="loginForm.username" type="text" size="large" auto-complete="off" :placeholder="proxy.$t('login.username')">
          <template #prefix><svg-icon icon-class="user" class="el-input__icon input-icon" /></template>
        </el-input>
      </el-form-item>
      <el-form-item prop="password">
        <el-input
          v-model="loginForm.password"
          type="password"
          size="large"
          auto-complete="off"
          :placeholder="proxy.$t('login.password')"
          @keyup.enter="handleLogin"
        >
          <template #prefix><svg-icon icon-class="password" class="el-input__icon input-icon" /></template>
        </el-input>
      </el-form-item>
      <el-form-item v-if="captchaEnabled" prop="code">
        <el-input
          v-model="loginForm.code"
          size="large"
          auto-complete="off"
          :placeholder="proxy.$t('login.code')"
          style="width: 63%"
          @keyup.enter="handleLogin"
        >
          <template #prefix><svg-icon icon-class="validCode" class="el-input__icon input-icon" /></template>
        </el-input>
        <div class="login-code">
          <img :src="codeUrl" class="login-code-img" @click="getCode" />
        </div>
      </el-form-item>
      <el-checkbox v-model="loginForm.rememberMe" style="margin: 0 0 25px 0">{{ proxy.$t('login.rememberPassword') }}</el-checkbox>

      <el-form-item style="width: 100%">
        <el-button :loading="loading" size="large" type="primary" style="width: 100%" @click.prevent="handleLogin">
          <span v-if="!loading">{{ proxy.$t('login.login') }}</span>
          <span v-else>{{ proxy.$t('login.logging') }}</span>
        </el-button>
        <div v-if="ssoActive" style="margin-top: 10px; width: 100%; text-align: center">
          <el-button link type="primary" @click="showLocalLogin = false">
            返回统一身份认证
          </el-button>
        </div>
        <div v-else-if="register" style="float: right">
          <router-link class="link-type" :to="'/register'">{{ proxy.$t('login.switchRegisterPage') }}</router-link>
        </div>
      </el-form-item>
    </el-form>

    <!--  底部  -->
    <div class="el-login-footer">
      <span>Copyright © 2018-2026 疯狂的狮子Li All Rights Reserved.</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, getCurrentInstance, watch, ComponentInternalInstance } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Loading } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { getCodeImg, getTenantList } from '@/api/login';
import { useUserStore } from '@/store/modules/user';
import { LoginData, TenantVO } from '@/api/types';
import { to } from 'await-to-js';
import { useI18n } from 'vue-i18n';
import { isSsoEnabled, startSsoLogin, sanitizeRedirect } from '@/utils/sso';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;

const title = import.meta.env.VITE_APP_TITLE;
const userStore = useUserStore();
const router = useRouter();
const route = useRoute();
const { t } = useI18n();

const ssoActive = computed(() => isSsoEnabled());
const showLocalLogin = ref(false);

const ssoError = ref(false);
const ssoErrorTitle = ref('');
const ssoErrorDesc = ref('');

const loginForm = ref<LoginData>({
  tenantId: '000000',
  username: 'admin',
  password: 'admin123',
  rememberMe: false,
  code: '',
  uuid: ''
} as LoginData);

const loginRules: any = {
  tenantId: [{ required: true, trigger: 'blur', message: t('login.rule.tenantId.required') }],
  username: [{ required: true, trigger: 'blur', message: t('login.rule.username.required') }],
  password: [{ required: true, trigger: 'blur', message: t('login.rule.password.required') }],
  code: [{ required: true, trigger: 'change', message: t('login.rule.code.required') }]
};

const codeUrl = ref('');
const loading = ref(false);
const captchaEnabled = ref(true);
const tenantEnabled = ref(true);
const register = ref(false);
const redirect = ref('/');
const loginRef = ref<any>();
const tenantList = ref<TenantVO[]>([]);

watch(
  () => router.currentRoute.value,
  (newRoute: any) => {
    redirect.value = newRoute.query && newRoute.query.redirect && decodeURIComponent(newRoute.query.redirect);
  },
  { immediate: true }
);

const handleSsoLogin = async () => {
  try {
    const target = sanitizeRedirect(redirect.value);
    await startSsoLogin(target);
  } catch (err: any) {
    ssoError.value = true;
    ssoErrorTitle.value = '连接统一认证服务失败';
    ssoErrorDesc.value = err?.message || '无法获取授权登录地址，请联系管理员或使用应急备用登录。';
  }
};

const checkSsoQueryError = () => {
  const err = route.query.error as string;
  if (!err) return false;

  ssoError.value = true;
  switch (err) {
    case 'user_not_found':
      ssoErrorTitle.value = '平台未找到对应用户';
      ssoErrorDesc.value = '您在 Keycloak 的身份在集成平台中未登记，请联系系统管理员分配平台账号。';
      break;
    case 'user_blocked':
      ssoErrorTitle.value = '账号已被停用';
      ssoErrorDesc.value = '该平台账号已被停用，无法登录系统，请联系管理员。';
      break;
    case 'state_expired':
      ssoErrorTitle.value = '登录会话已过期';
      ssoErrorDesc.value = '认证会话已失效，请重新发起登录。';
      break;
    case 'token_exchange_failed':
      ssoErrorTitle.value = '令牌兑换失败';
      ssoErrorDesc.value = '向 Keycloak 换取凭证时失败，请检查认证配置或网络状态。';
      break;
    case 'token_verification_failed':
      ssoErrorTitle.value = '令牌验签失败';
      ssoErrorDesc.value = '无法验证 Keycloak 签发的身份凭证，请重试。';
      break;
    default:
      ssoErrorTitle.value = '认证失败';
      ssoErrorDesc.value = (route.query.error_description as string) || err || '登录过程发生异常，请重试。';
      break;
  }
  return true;
};

const handleLogin = () => {
  loginRef.value?.validate(async (valid: boolean, fields: any) => {
    if (valid) {
      loading.value = true;
      localStorage.removeItem('password');
      if (loginForm.value.rememberMe) {
        localStorage.setItem('tenantId', String(loginForm.value.tenantId));
        localStorage.setItem('username', String(loginForm.value.username));
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('tenantId');
        localStorage.removeItem('username');
        localStorage.removeItem('rememberMe');
      }
      const [err] = await to(userStore.login(loginForm.value));
      if (!err) {
        const redirectUrl = redirect.value || '/';
        await router.push(redirectUrl);
        loading.value = false;
      } else {
        loading.value = false;
        if (captchaEnabled.value) {
          await getCode();
        }
      }
    } else {
      console.log('error submit!', fields);
    }
  });
};

const getCode = async () => {
  const res = await getCodeImg();
  const { data } = res;
  captchaEnabled.value = data.captchaEnabled === undefined ? true : data.captchaEnabled;
  if (captchaEnabled.value) {
    loginForm.value.code = '';
    codeUrl.value = 'data:image/gif;base64,' + data.img;
    loginForm.value.uuid = data.uuid;
  }
};

const getLoginData = () => {
  localStorage.removeItem('password');
  const tenantId = localStorage.getItem('tenantId');
  const username = localStorage.getItem('username');
  const rememberMe = localStorage.getItem('rememberMe');
  loginForm.value = {
    tenantId: tenantId === null ? String(loginForm.value.tenantId) : tenantId,
    username: username === null ? String(loginForm.value.username) : username,
    password: loginForm.value.password,
    rememberMe: rememberMe === 'true'
  } as LoginData;
};

const initTenantList = async () => {
  const { data } = await getTenantList(false);
  tenantEnabled.value = data.tenantEnabled === undefined ? true : data.tenantEnabled;
  if (tenantEnabled.value) {
    tenantList.value = data.voList;
    if (tenantList.value != null && tenantList.value.length !== 0) {
      loginForm.value.tenantId = tenantList.value[0].tenantId;
    }
  }
};

onMounted(() => {
  if (ssoActive.value) {
    const hasError = checkSsoQueryError();
    if (!hasError && !showLocalLogin.value) {
      handleSsoLogin();
    }
  } else {
    getCode();
    initTenantList();
    getLoginData();
  }
});
</script>

<style lang="scss" scoped>
.login {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  background-image: url('../assets/images/login-background.jpg');
  background-size: cover;
  background-position: center;
}

.title-box {
  display: flex;
  align-items: center;
  gap: 8px;

  .title {
    margin: 0px auto 26px auto;
    text-align: center;
    color: var(--el-text-color-primary);
    font-weight: 600;
    letter-spacing: 0.5px;
  }

  :deep(.lang-select--style) {
    line-height: 0;
    color: var(--el-text-color-secondary);
  }
}

.sso-box {
  border-radius: var(--app-radius-lg);
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.5);
  width: min(440px, 90vw);
  padding: 40px 30px 24px 30px;
  z-index: 1;
  box-shadow: var(--app-shadow-lg);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);

  .sso-content {
    .sso-loading-area {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px 0;

      .sso-loading-text {
        margin-top: 16px;
        font-size: 16px;
        font-weight: 500;
        color: #303133;
      }

      .sso-loading-tip {
        margin-top: 8px;
        font-size: 13px;
        color: #909399;
      }
    }

    .sso-fallback-link {
      margin-top: 24px;
      text-align: center;
      border-top: 1px dashed #e4e7ed;
      padding-top: 16px;
    }
  }
}

.login-form {
  border-radius: var(--app-radius-lg);
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.5);
  width: min(420px, 90vw);
  padding: 32px 30px 12px 30px;
  z-index: 1;
  box-shadow: var(--app-shadow-lg);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  .el-input {
    height: 40px;
    input {
      height: 40px;
    }
  }
  .input-icon {
    height: 39px;
    width: 14px;
    margin-left: 0px;
  }
}

.login-tip {
  font-size: 13px;
  text-align: center;
  color: #bfbfbf;
}
.login-code {
  width: 33%;
  height: 40px;
  float: right;
  img {
    cursor: pointer;
    vertical-align: middle;
  }
}
.el-login-footer {
  height: 40px;
  line-height: 40px;
  position: fixed;
  bottom: 0;
  width: 100%;
  text-align: center;
  color: #fff;
  font-family: Arial;
  font-size: 12px;
  letter-spacing: 1px;
}
.login-code-img {
  height: 40px;
  padding-left: 12px;
}
</style>
