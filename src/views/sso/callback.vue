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

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const loading = ref(true);
const statusTitle = ref('正在完成统一身份认证');
const errorMsg = ref('');

const handleCallback = async () => {
  const ticket = route.query.ticket as string;
  const redirect = route.query.redirect as string;

  if (!ticket) {
    loading.value = false;
    statusTitle.value = '认证失败';
    errorMsg.value = '未获取到有效的认证凭证 (Ticket 缺失)';
    return;
  }

  try {
    statusTitle.value = '正在兑换会话凭证...';
    await userStore.ssoExchange(ticket);

    loading.value = false;
    statusTitle.value = '登录成功，正在跳转...';

    const target = sanitizeRedirect(redirect);
    await router.replace(target);
  } catch (err: any) {
    loading.value = false;
    statusTitle.value = '统一认证登录失败';
    errorMsg.value = err?.message || '票据兑换失败或已失效，请重新登录';
    console.error('SSO callback exchange failed:', err);
  }
};

const handleRetry = async () => {
  await startSsoLogin('/');
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
