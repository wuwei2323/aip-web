<template>
  <div class="p-2">
    <transition :enter-active-class="proxy?.animate.searchAnimate.enter" :leave-active-class="proxy?.animate.searchAnimate.leave">
      <div v-show="showSearch" class="search">
        <el-form ref="queryFormRef" :model="queryParams" :inline="true" label-width="85px">
          <el-form-item label="客户端ID" prop="appId">
            <el-input v-model="queryParams.appId" placeholder="请输入客户端ID" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="应用名称" prop="appName">
            <el-input v-model="queryParams.appName" placeholder="请输入应用名称" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="应用编号" prop="tenantId">
            <el-input v-model="queryParams.tenantId" placeholder="请输入应用编号" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-select v-model="queryParams.status" placeholder="状态" clearable style="width: 120px">
              <el-option v-for="dict in sys_normal_disable" :key="dict.value" :label="dict.label" :value="dict.value" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
            <el-button icon="Refresh" @click="resetQuery">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
    </transition>

    <el-card shadow="never">
      <template #header>
        <el-row :gutter="10" class="mb8">
          <el-col :span="1.5">
            <el-button v-hasPermi="['system:application:add']" type="primary" plain icon="Plus" @click="handleAdd">
              新增应用
            </el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button v-hasPermi="['system:application:edit']" type="success" plain icon="Edit" :disabled="single" @click="handleUpdate()">
              修改
            </el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button v-hasPermi="['system:application:remove']" type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete()">
              删除
            </el-button>
          </el-col>
          <right-toolbar v-model:show-search="showSearch" @query-table="getList"></right-toolbar>
        </el-row>
      </template>

      <el-table v-loading="loading" :data="applicationList" border @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="客户端ID (client_id)" align="center" prop="appId">
          <template #default="scope">
            <el-tag v-if="scope.row.tenantId === '000000'" type="danger" size="small">门户应用</el-tag>
            <span style="margin-left: 6px; font-weight: 500">{{ scope.row.appId }}</span>
          </template>
        </el-table-column>
        <el-table-column label="应用名称" align="center" prop="appName" />
        <el-table-column label="应用编号 (tenant_id)" align="center" prop="tenantId" width="130" />
        <el-table-column label="认证方式" align="center" prop="clientAuthMethod" width="150" />
        <el-table-column label="入口地址" align="center" prop="entryUrl" :show-overflow-tooltip="true" />
        <el-table-column label="域名" align="center" prop="domain" :show-overflow-tooltip="true" />
        <el-table-column key="status" label="状态" align="center" width="90">
          <template #default="scope">
            <el-switch
              v-model="scope.row.status"
              active-value="0"
              inactive-value="1"
              :disabled="scope.row.tenantId === '000000'"
              @change="handleStatusChange(scope.row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="排序" align="center" prop="orderNum" width="70" />
        <el-table-column label="创建时间" align="center" prop="createTime" width="160" />
        <el-table-column label="操作" align="center" width="220" class-name="small-padding fixed-width">
          <template #default="scope">
            <el-tooltip content="修改应用配置" placement="top">
              <el-button v-hasPermi="['system:application:edit']" link type="primary" icon="Edit" @click="handleUpdate(scope.row)">
                修改
              </el-button>
            </el-tooltip>
            <el-tooltip content="重新生成客户端密钥" placement="top">
              <el-button v-hasPermi="['system:application:resetSecret']" link type="warning" icon="Key" @click="handleResetSecret(scope.row)">
                重置密钥
              </el-button>
            </el-tooltip>
            <el-tooltip v-if="scope.row.tenantId !== '000000'" content="删除应用" placement="top">
              <el-button v-hasPermi="['system:application:remove']" link type="danger" icon="Delete" @click="handleDelete(scope.row)">
                删除
              </el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>

      <pagination
        v-show="total > 0"
        v-model:page="queryParams.pageNum"
        v-model:limit="queryParams.pageSize"
        :total="total"
        @pagination="getList"
      />
    </el-card>

    <!-- 添加或修改应用对话框 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="680px" append-to-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="130px">
        <el-row>
          <el-col :span="12">
            <el-form-item label="应用编号" prop="tenantId">
              <el-input v-model="form.tenantId" placeholder="如 000001" :disabled="form.id !== undefined" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="客户端ID" prop="appId">
              <el-input v-model="form.appId" placeholder="默认与应用编号相同" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="应用名称" prop="appName">
              <el-input v-model="form.appName" placeholder="请输入应用系统名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="认证方式" prop="clientAuthMethod">
              <el-select v-model="form.clientAuthMethod" style="width: 100%">
                <el-option label="client_secret_basic" value="client_secret_basic" />
                <el-option label="client_secret_post" value="client_secret_post" />
                <el-option label="none (公共客户端/纯前端)" value="none" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="强制 PKCE" prop="requirePkce">
              <el-radio-group v-model="form.requirePkce">
                <el-radio value="1">是 (推荐)</el-radio>
                <el-radio value="0">否</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="24" v-if="!form.id && form.clientAuthMethod !== 'none'">
            <el-form-item label="指定客户端密钥" prop="clientSecret">
              <el-input v-model="form.clientSecret" placeholder="留空则由系统自动生成高强度密钥" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="应用入口地址" prop="entryUrl">
              <el-input v-model="form.entryUrl" placeholder="如 https://app.hospital.com 或 /app" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="应用域名" prop="domain">
              <el-input v-model="form.domain" placeholder="如 app.hospital.com" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="重定向URI列表" prop="redirectUris">
              <el-input
                v-model="form.redirectUris"
                type="textarea"
                :rows="2"
                placeholder='允许的登录回调URI列表，如 ["https://app.hospital.com/oauth/callback"]'
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="登出重定向URI" prop="postLogoutRedirectUris">
              <el-input
                v-model="form.postLogoutRedirectUris"
                type="textarea"
                :rows="2"
                placeholder='允许的登出重定向URI列表，如 ["https://app.hospital.com/login"]'
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="显示排序" prop="orderNum">
              <el-input-number v-model="form.orderNum" controls-position="right" :min="0" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-radio-group v-model="form.status">
                <el-radio v-for="dict in sys_normal_disable" :key="dict.value" :value="dict.value">
                  {{ dict.label }}
                </el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" :loading="buttonLoading" @click="submitForm">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 密钥展示对话框 (新增/重置密钥后单次展示) -->
    <el-dialog v-model="secretDialog.visible" title="客户端密钥凭据" width="500px" append-to-body>
      <el-alert
        title="请妥善保管该客户端密钥！出于安全考虑，该密钥明文仅展示一次，关闭后将无法再次查看。"
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom: 20px"
      />
      <el-form label-width="100px">
        <el-form-item label="客户端ID">
          <el-input :model-value="secretDialog.appId" readonly />
        </el-form-item>
        <el-form-item label="客户端密钥">
          <el-input :model-value="secretDialog.secret" readonly>
            <template #append>
              <el-button @click="copySecret">复制</el-button>
            </template>
          </el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="secretDialog.visible = false">我已记录，关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="Application" lang="ts">
import { ref, reactive, toRefs, getCurrentInstance, ComponentInternalInstance, onMounted } from 'vue';
import { ElMessage, ElMessageBox, FormInstance } from 'element-plus';
import {
  listApplication,
  getApplication,
  addApplication,
  updateApplication,
  delApplication,
  changeApplicationStatus,
  resetApplicationSecret
} from '@/api/system/application';
import { ApplicationVO, ApplicationForm, ApplicationQuery } from '@/api/system/application/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const { sys_normal_disable } = toRefs<any>(proxy?.useDict('sys_normal_disable'));

const applicationList = ref<ApplicationVO[]>([]);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref<Array<string | number>>([]);
const single = ref(true);
const multiple = ref(true);
const total = ref(0);
const buttonLoading = ref(false);

const queryFormRef = ref<FormInstance>();
const formRef = ref<FormInstance>();

const dialog = reactive<DialogOption>({
  visible: false,
  title: ''
});

const secretDialog = reactive({
  visible: false,
  appId: '',
  secret: ''
});

const initFormData: ApplicationForm = {
  id: undefined,
  appId: '',
  appName: '',
  tenantId: '',
  clientAuthMethod: 'client_secret_basic',
  clientSecret: '',
  redirectUris: '',
  postLogoutRedirectUris: '',
  scopes: 'openid,profile,email',
  grantTypes: 'authorization_code,refresh_token',
  accessTokenTtlMinutes: 30,
  refreshTokenTtlDays: 7,
  reuseRefreshTokens: '0',
  requirePkce: '1',
  domain: '',
  entryUrl: '',
  wecomConfigKey: '',
  bindPolicy: 'REJECT',
  icon: '',
  orderNum: 0,
  status: '0'
};

const data = reactive<PageData<ApplicationForm, ApplicationQuery>>({
  form: { ...initFormData },
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    appId: undefined,
    appName: undefined,
    tenantId: undefined,
    status: undefined,
    clientAuthMethod: undefined
  },
  rules: {
    tenantId: [{ required: true, message: '应用/租户编号不能为空', trigger: 'blur' }],
    appName: [{ required: true, message: '应用名称不能为空', trigger: 'blur' }]
  }
});

const { queryParams, form, rules } = toRefs(data);

/** 查询应用列表 */
const getList = async () => {
  loading.value = true;
  try {
    const res = await listApplication(queryParams.value);
    applicationList.value = res.rows;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
};

/** 取消按钮 */
const cancel = () => {
  reset();
  dialog.visible = false;
};

/** 表单重置 */
const reset = () => {
  form.value = { ...initFormData };
  formRef.value?.resetFields();
};

/** 搜索按钮操作 */
const handleQuery = () => {
  queryParams.value.pageNum = 1;
  getList();
};

/** 重置按钮操作 */
const resetQuery = () => {
  queryFormRef.value?.resetFields();
  handleQuery();
};

/** 多选框选中数据 */
const handleSelectionChange = (selection: ApplicationVO[]) => {
  ids.value = selection.map((item) => item.id);
  single.value = selection.length !== 1;
  multiple.value = !selection.length;
};

/** 新增按钮操作 */
const handleAdd = () => {
  reset();
  dialog.visible = true;
  dialog.title = '添加应用注册';
};

/** 修改按钮操作 */
const handleUpdate = async (row?: ApplicationVO) => {
  reset();
  const id = row?.id || ids.value[0];
  const res = await getApplication(id);
  form.value = { ...res.data };
  dialog.visible = true;
  dialog.title = '修改应用配置';
};

/** 提交按钮 */
const submitForm = () => {
  formRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      buttonLoading.value = true;
      try {
        if (form.value.id !== undefined) {
          await updateApplication(form.value);
          ElMessage.success('修改应用配置成功');
          dialog.visible = false;
          await getList();
        } else {
          const res = await addApplication(form.value);
          ElMessage.success('新增应用成功');
          dialog.visible = false;
          await getList();
          if (res.data?.clientSecret) {
            secretDialog.appId = res.data.appId;
            secretDialog.secret = res.data.clientSecret;
            secretDialog.visible = true;
          }
        }
      } finally {
        buttonLoading.value = false;
      }
    }
  });
};

/** 状态修改 */
const handleStatusChange = async (row: ApplicationVO) => {
  const text = row.status === '0' ? '启用' : '停用';
  try {
    await ElMessageBox.confirm(`确认要${text}"${row.appName}"应用吗?`, '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });
    await changeApplicationStatus(row.id, row.status);
    ElMessage.success(`${text}成功`);
  } catch {
    row.status = row.status === '0' ? '1' : '0';
  }
};

/** 重置密钥 */
const handleResetSecret = async (row: ApplicationVO) => {
  await ElMessageBox.confirm(`确定要重置应用"${row.appName}"的客户端密钥吗？重置后原密钥将立即失效！`, '警告', {
    confirmButtonText: '确定重置',
    cancelButtonText: '取消',
    type: 'warning'
  });
  const res = await resetApplicationSecret(row.id);
  secretDialog.appId = row.appId;
  secretDialog.secret = res.data;
  secretDialog.visible = true;
};

/** 复制密钥 */
const copySecret = async () => {
  try {
    await navigator.clipboard.writeText(secretDialog.secret);
    ElMessage.success('客户端密钥已复制到剪贴板');
  } catch {
    ElMessage.warning('复制失败，请手动选中文本复制');
  }
};

/** 删除按钮操作 */
const handleDelete = async (row?: ApplicationVO) => {
  const deleteIds = row?.id ? [row.id] : ids.value;
  await ElMessageBox.confirm('是否确认删除选中的应用数据项？', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  });
  await delApplication(deleteIds);
  await getList();
  ElMessage.success('删除成功');
};

onMounted(() => {
  getList();
});
</script>

<style scoped lang="scss">
.mb8 {
  margin-bottom: 8px;
}
</style>
