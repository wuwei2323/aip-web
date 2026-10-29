<template>
  <div class="change-password-container">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span class="title">首次登录请修改初始密码</span>
        </div>
      </template>

      <el-alert
        title="您的账号处于初始状态或已被重置，为保障账号安全，请先设置新密码。"
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom: 20px"
      />

      <el-form ref="pwdFormRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="form.newPassword"
            type="password"
            placeholder="请输入新密码（6-32位字符）"
            show-password
          />
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            placeholder="请再次确认新密码"
            show-password
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSubmit">
            提交并前往登录
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage, FormInstance } from 'element-plus';
import { changePasswordSso } from '@/api/login';
import { startSsoLogin, sanitizeRedirect } from '@/utils/sso';

const route = useRoute();
const pwdFormRef = ref<FormInstance>();
const loading = ref(false);

const form = reactive({
  ticket: (route.query.ticket as string) || '',
  newPassword: '',
  confirmPassword: ''
});

const validateConfirmPassword = (rule: any, value: string, callback: any) => {
  if (value === '') {
    callback(new Error('请再次输入密码'));
  } else if (value !== form.newPassword) {
    callback(new Error('两次输入密码不一致'));
  } else {
    callback();
  }
};

const rules = {
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 32, message: '长度在 6 到 32 个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, validator: validateConfirmPassword, trigger: 'blur' }
  ]
};

const handleSubmit = async () => {
  if (!pwdFormRef.value) return;
  await pwdFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true;
      try {
        await changePasswordSso({
          ticket: form.ticket,
          newPassword: form.newPassword,
          confirmPassword: form.confirmPassword
        });
        ElMessage.success('密码修改成功，正在前往统一认证登录...');
        const redirect = sanitizeRedirect(route.query.redirect as string);
        setTimeout(async () => {
          await startSsoLogin(redirect);
        }, 1200);
      } catch (err: any) {
        ElMessage.error(err?.message || '密码修改失败，请重试');
      } finally {
        loading.value = false;
      }
    }
  });
};
</script>

<style scoped lang="scss">
.change-password-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f0f2f5;

  .box-card {
    width: 480px;

    .card-header {
      .title {
        font-size: 18px;
        font-weight: 600;
        color: #303133;
      }
    }
  }
}
</style>
