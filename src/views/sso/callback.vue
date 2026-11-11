<template>
  <div class="sso-callback-container">
    <div class="sso-card">
      <el-icon class="is-loading" :size="48" color="#409eff" v-if="loading">
        <Loading />
      </el-icon>
      <el-icon :size="48" color="#f56c6c" v-else-if="errorMsg">
        <CircleClose />
      </el-icon>
      <el-icon :size="48" color="#67c23a" v-else>
        <CircleCheck />
      </el-icon>

      <div class="sso-title">{{ statusTitle }}</div>
      <div class="sso-desc" v-if="errorMsg">{{ errorMsg }}</div>
      <div class="sso-desc" v-else>正在为您建立系统安全会话，请稍候...</div>

      <div class="sso-actions" v-if="errorMsg">
        <el-button type="primary" @click="handleRetry">重新登录</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Loading, CircleClose, CircleCheck } from '@element-plus/icons-vue';
import { useUserStore } from '@/store/modules/user';
import { sanitizeRedirect, startSsoLogin } from '@/utils/sso';
import { consumeSsoCallbackTransaction } from '@/utils/ssoTransaction';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const loading = ref(true);
const statusTitle = ref('正在完成统一身份认证');
const errorMsg = ref('');

const handleCallback = async () => {
  const transaction = consumeSsoCallbackTransaction(route.query, sessionStorage);
  const error = route.query.error;
  const errorDescription = route.query.error_description;

  if (transaction.status === 'oauth-error') {
    loading.value = false;
    statusTitle.value = '认证失败';
    errorMsg.value = (typeof errorDescription === 'string' && errorDescription) || (typeof error === 'string' && error) || '统一身份认证失败';
    return;
  }

  if (transaction.status === 'invalid-transaction') {
    loading.value = false;
    statusTitle.value = '认证失败';
    errorMsg.value = '认证状态已失效或存在跨站风险，请重新登录';
    return;
  }

  // 凭 Keycloak 授权码 code 兑换 Token
  if (transaction.status === 'ready') {
    const { code, codeVerifier, redirectUri, nonce } = transaction.params;

    try {
      statusTitle.value = '正在兑换会话凭证...';
      const res = await userStore.ssoLoginByCode({
        code,
        codeVerifier,
        redirectUri,
        nonce
      });

      // 首次登录强制改密判断
      if (res?.password_reset_required && res?.reset_ticket) {
        const targetPath = sessionStorage.getItem('sso_target_path') || (route.query.redirect as string) || '/index';
        sessionStorage.removeItem('sso_target_path');
        const target = sanitizeRedirect(targetPath);
        await router.replace(`/sso/change-password?ticket=${res.reset_ticket}&redirect=${encodeURIComponent(target)}`);
        return;
      }

      loading.value = false;
      statusTitle.value = '登录成功，正在跳转...';

      const targetPath = sessionStorage.getItem('sso_target_path') || (route.query.redirect as string) || '/index';
      sessionStorage.removeItem('sso_target_path');
      const target = sanitizeRedirect(targetPath);
      await router.replace(target);
      return;
    } catch (err: any) {
      loading.value = false;
      statusTitle.value = '统一认证登录失败';
      errorMsg.value = err?.message || '授权码兑换失败或已失效，请重新登录';
      // 不打印请求异常对象，避免其中的授权码和 PKCE 凭据进入浏览器控制台。
      return;
    }
  }

  loading.value = false;
  statusTitle.value = '认证失败';
  errorMsg.value = '未获取到有效的授权码凭证 (Code 缺失)';
};

const handleRetry = async () => {
  await startSsoLogin('/index');
};

onMounted(() => {
  handleCallback();
});
</script>

<style scoped lang="scss">
.sso-callback-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f0f2f5;

  .sso-card {
    background: #fff;
    padding: 40px 60px;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 380px;

    .sso-title {
      margin-top: 20px;
      font-size: 18px;
      font-weight: 600;
      color: #303133;
    }

    .sso-desc {
      margin-top: 10px;
      font-size: 14px;
      color: #909399;
      text-align: center;
    }

    .sso-actions {
      margin-top: 24px;
    }
  }
}
</style>
