<template>
  <div class="p-2">
    <transition :enter-active-class="proxy?.animate.searchAnimate.enter" :leave-active-class="proxy?.animate.searchAnimate.leave">
      <div v-show="showSearch" class="search">
        <el-form ref="queryFormRef" :model="queryParams" :inline="true" label-width="85px">
          <el-form-item label="应用标识" prop="appId">
            <el-input v-model="queryParams.appId" placeholder="请输入应用标识" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="应用名称" prop="appName">
            <el-input v-model="queryParams.appName" placeholder="请输入应用名称" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="租户编号" prop="tenantId">
            <el-input v-model="queryParams.tenantId" placeholder="请输入租户编号" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-select v-model="queryParams.status" placeholder="请选择状态" clearable style="width: 120px">
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
            <el-button v-hasPermi="['system:application:add']" type="primary" plain icon="Plus" @click="handleAdd">新增</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button icon="Refresh" @click="getList">刷新</el-button>
          </el-col>
          <right-toolbar v-model:show-search="showSearch" @query-table="getList"></right-toolbar>
        </el-row>
      </template>

      <el-table v-loading="loading" :data="applicationList" border @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="应用标识" align="center" prop="appId" width="170" :show-overflow-tooltip="true" />
        <el-table-column label="应用名称" align="center" prop="appName" :show-overflow-tooltip="true" />
        <el-table-column label="租户编号" align="center" prop="tenantId" width="110" />
        <el-table-column label="回跳地址白名单" align="center" min-width="220">
          <template #default="scope">
            <el-tag v-if="!scope.row.redirectUris?.length" type="info">未配置</el-tag>
            <template v-else>
              <el-tag v-for="uri in scope.row.redirectUris.slice(0, 2)" :key="uri" class="mr1" :title="uri">{{ uri }}</el-tag>
              <el-tag v-if="scope.row.redirectUris.length > 2" type="warning">+{{ scope.row.redirectUris.length - 2 }}</el-tag>
            </template>
          </template>
        </el-table-column>
        <el-table-column label="企微首登策略" align="center" width="130">
          <template #default="scope">
            <el-tag v-if="scope.row.bindPolicy" :type="bindPolicyTagType(scope.row.bindPolicy)">
              {{ bindPolicyLabel(scope.row.bindPolicy) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column key="status" label="状态" align="center" width="80">
          <template #default="scope">
            <el-switch v-model="scope.row.status" active-value="0" inactive-value="1" @change="handleStatusChange(scope.row)"></el-switch>
          </template>
        </el-table-column>
        <el-table-column label="排序" align="center" prop="orderNum" width="70" />
        <el-table-column label="创建时间" align="center" prop="createTime" width="160">
          <template #default="scope">
            <span>{{ proxy.parseTime(scope.row.createTime) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center" width="160" class-name="small-padding fixed-width">
          <template #default="scope">
            <el-tooltip content="修改" placement="top">
              <el-button v-hasPermi="['system:application:edit']" link type="primary" icon="Edit" @click="handleUpdate(scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip content="重置密钥" placement="top">
              <el-button v-hasPermi="['system:application:edit']" link type="warning" icon="Key" @click="handleResetSecret(scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip content="删除" placement="top">
              <el-button v-hasPermi="['system:application:remove']" link type="primary" icon="Delete" @click="handleDelete(scope.row)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>

      <pagination v-show="total > 0" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
    </el-card>

    <!-- 添加或修改子应用对话框 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="760px" append-to-body>
      <el-form ref="applicationFormRef" :model="form" :rules="rules" label-width="120px">
        <el-row :gutter="10">
          <el-col :span="12">
            <el-form-item label="应用标识" prop="appId">
              <el-input v-model="form.appId" :disabled="form.id != null" placeholder="OIDC client_id，如 jcpt-portal" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="应用名称" prop="appName">
              <el-input v-model="form.appName" placeholder="请输入应用名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="租户编号" prop="tenantId">
              <el-input v-model="form.tenantId" placeholder="所属租户编号，如 000000" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="认证方式" prop="clientAuthMethod">
              <el-select v-model="form.clientAuthMethod" placeholder="请选择客户端认证方式" style="width: 100%">
                <el-option v-for="item in CLIENT_AUTH_METHOD_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="回跳地址" prop="redirectUris">
              <el-input
                v-model="redirectUrisText"
                type="textarea"
                :rows="3"
                placeholder="每行一个地址，如：https://portal.example.com/oidc/callback"
              />
              <div class="form-tip">一行一个地址，需与调用方发起授权请求时携带的 redirect_uri 完全一致</div>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="登出回跳地址" prop="postLogoutRedirectUris">
              <el-input
                v-model="postLogoutRedirectUrisText"
                type="textarea"
                :rows="3"
                placeholder="每行一个地址，如：https://portal.example.com/logout"
              />
              <div class="form-tip">一行一个地址，登出后允许跳转的地址白名单</div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="授权范围" prop="scopes">
              <el-input v-model="form.scopes" placeholder="英文逗号分隔，如 openid,profile,permissions" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="授权类型" prop="grantTypes">
              <el-input v-model="form.grantTypes" placeholder="英文逗号分隔，如 authorization_code,refresh_token" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="访问令牌时长(分)" prop="accessTokenTtlMinutes">
              <el-input-number v-model="form.accessTokenTtlMinutes" controls-position="right" :min="1" :max="1440" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="刷新令牌时长(天)" prop="refreshTokenTtlDays">
              <el-input-number v-model="form.refreshTokenTtlDays" controls-position="right" :min="1" :max="365" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="复用刷新令牌" prop="reuseRefreshTokens">
              <el-select v-model="form.reuseRefreshTokens" placeholder="请选择" style="width: 100%">
                <el-option label="否（每次刷新轮换）" value="0" />
                <el-option label="是" value="1" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="强制 PKCE" prop="requirePkce">
              <el-select v-model="form.requirePkce" placeholder="请选择" style="width: 100%">
                <el-option label="是" value="1" />
                <el-option label="否" value="0" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="应用域名" prop="domain">
              <el-input v-model="form.domain" placeholder="如 portal.example.com" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="应用入口" prop="entryUrl">
              <el-input v-model="form.entryUrl" placeholder="如 https://portal.example.com" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="企微渠道实例" prop="wecomConfigKey">
              <el-input v-model="form.wecomConfigKey" placeholder="企微渠道配置标识，留空表示不启用企微登录" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="企微首登策略" prop="bindPolicy">
              <el-select v-model="form.bindPolicy" placeholder="请选择企微首次登录策略" style="width: 100%">
                <el-option v-for="item in BIND_POLICY_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="应用图标" prop="icon">
              <el-input v-model="form.icon" placeholder="请输入图标名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="显示排序" prop="orderNum">
              <el-input-number v-model="form.orderNum" controls-position="right" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="状态" prop="status">
              <el-radio-group v-model="form.status">
                <el-radio v-for="dict in sys_normal_disable" :key="dict.value" :value="dict.value">{{ dict.label }}</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注" prop="remark">
              <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-alert v-if="!form.id" type="info" :closable="false" title="应用密钥将在保存后生成并显示一次，请立即保存到调用方配置中" />
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button :loading="buttonLoading" type="primary" @click="submitForm">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 密钥展示（明文仅此一次） -->
    <el-dialog v-model="secretDialog.visible" :title="secretDialog.title" width="620px" append-to-body :close-on-click-modal="false">
      <el-alert type="warning" :closable="false" title="密钥明文仅显示这一次，关闭后无法再次查看，请立即复制保存" class="mb2" />
      <el-form label-width="90px">
        <el-form-item label="应用标识">
          <el-input v-model="secretInfo.appId" readonly />
        </el-form-item>
        <el-form-item label="应用密钥">
          <el-input v-model="secretInfo.clientSecret" readonly>
            <template #append>
              <el-button icon="CopyDocument" @click="copySecret">复制</el-button>
            </template>
          </el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="secretDialog.visible = false">我已保存</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="Application" lang="ts">
import {
  addApplication,
  changeApplicationStatus,
  delApplication,
  getApplication,
  listApplication,
  resetApplicationSecret,
  updateApplication
} from '@/api/system/application';
import { SysApplicationBo, SysApplicationQuery, SysApplicationVo } from '@/api/system/application/types';

/** 客户端认证方式选项 */
const CLIENT_AUTH_METHOD_OPTIONS = [
  { value: 'client_secret_basic', label: 'client_secret_basic' },
  { value: 'client_secret_post', label: 'client_secret_post' },
  { value: 'none', label: 'none（公开客户端）' }
];

/** 企微首次登录策略选项 */
const BIND_POLICY_OPTIONS = [
  { value: 'AUTO_CREATE', label: '自动创建账号' },
  { value: 'BIND_EXISTING', label: '绑定已有账号' },
  { value: 'REJECT', label: '拒绝登录' }
];

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const { sys_normal_disable } = toRefs<any>(proxy?.useDict('sys_normal_disable'));

const applicationList = ref<SysApplicationVo[]>([]);
const buttonLoading = ref(false);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref<Array<string | number>>([]);
const multiple = ref(true);
const total = ref(0);

const queryFormRef = ref<ElFormInstance>();
const applicationFormRef = ref<ElFormInstance>();

const dialog = reactive<DialogOption>({ visible: false, title: '' });
const secretDialog = reactive<DialogOption>({ visible: false, title: '' });
const secretInfo = reactive({ appId: '', clientSecret: '' });

/** 回跳地址以「一行一个」的文本编辑，提交时转成 string[] */
const redirectUrisText = ref('');
const postLogoutRedirectUrisText = ref('');

const initFormData: SysApplicationBo = {
  id: undefined,
  appId: undefined,
  appName: undefined,
  tenantId: undefined,
  clientAuthMethod: 'client_secret_basic',
  scopes: 'openid,profile,permissions',
  grantTypes: 'authorization_code,refresh_token',
  accessTokenTtlMinutes: 15,
  refreshTokenTtlDays: 30,
  reuseRefreshTokens: '0',
  requirePkce: '1',
  domain: undefined,
  entryUrl: undefined,
  wecomConfigKey: undefined,
  bindPolicy: 'BIND_EXISTING',
  icon: undefined,
  orderNum: 0,
  status: '0',
  remark: undefined
};

const data = reactive<PageData<SysApplicationBo, SysApplicationQuery>>({
  form: { ...initFormData },
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    appId: undefined,
    appName: undefined,
    tenantId: undefined,
    status: undefined
  },
  rules: {
    appId: [
      { required: true, message: '应用标识不能为空', trigger: 'blur' },
      {
        pattern: /^[A-Za-z0-9_-]{2,64}$/,
        message: '只能包含字母、数字、连字符与下划线，长度 2~64',
        trigger: 'blur'
      }
    ],
    appName: [{ required: true, message: '应用名称不能为空', trigger: 'blur' }],
    tenantId: [{ required: true, message: '租户编号不能为空', trigger: 'blur' }]
  }
});

const { queryParams, form, rules } = toRefs(data);

/** 企微首登策略显示名 */
const bindPolicyLabel = (policy?: string) => {
  return BIND_POLICY_OPTIONS.find((item) => item.value === policy)?.label || policy || '';
};

/** 企微首登策略标签样式 */
const bindPolicyTagType = (policy?: string) => {
  if (policy === 'AUTO_CREATE') return 'success';
  if (policy === 'REJECT') return 'danger';
  return 'primary';
};

/** 地址列表 → 文本 */
const toText = (list?: string[]) => (list || []).join('\n');

/** 文本 → 地址列表 */
const toList = (text: string) =>
  text
    .split('\n')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

/** 查询子应用管理列表 */
const getList = async () => {
  loading.value = true;
  const res = await listApplication(queryParams.value);
  applicationList.value = res.rows;
  total.value = res.total;
  loading.value = false;
};

/** 取消按钮 */
const cancel = () => {
  reset();
  dialog.visible = false;
};

/** 表单重置 */
const reset = () => {
  form.value = { ...initFormData };
  redirectUrisText.value = '';
  postLogoutRedirectUrisText.value = '';
  applicationFormRef.value?.resetFields();
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
const handleSelectionChange = (selection: SysApplicationVo[]) => {
  ids.value = selection.map((item) => item.id);
  multiple.value = !selection.length;
};

/** 新增按钮操作 */
const handleAdd = () => {
  reset();
  dialog.visible = true;
  dialog.title = '新增子应用';
};

/** 修改按钮操作 */
const handleUpdate = async (row?: SysApplicationVo) => {
  reset();
  const _id = row?.id || ids.value[0];
  const res = await getApplication(_id);
  Object.assign(form.value, res.data);
  redirectUrisText.value = toText(res.data.redirectUris);
  postLogoutRedirectUrisText.value = toText(res.data.postLogoutRedirectUris);
  dialog.visible = true;
  dialog.title = '修改子应用';
};

/** 提交按钮 */
const submitForm = () => {
  applicationFormRef.value?.validate(async (valid: boolean) => {
    if (!valid) {
      return;
    }
    buttonLoading.value = true;
    try {
      const payload: SysApplicationBo = {
        ...form.value,
        redirectUris: toList(redirectUrisText.value),
        postLogoutRedirectUris: toList(postLogoutRedirectUrisText.value)
      };
      if (form.value.id) {
        await updateApplication(payload);
        proxy?.$modal.msgSuccess('修改成功');
      } else {
        const res = await addApplication(payload);
        // 新增接口的 data 是明文密钥，仅此一次返回
        secretInfo.appId = form.value.appId || '';
        secretInfo.clientSecret = res.data?.clientSecret || '';
        secretDialog.title = '应用密钥（请立即保存）';
        secretDialog.visible = true;
      }
      dialog.visible = false;
      await getList();
    } finally {
      buttonLoading.value = false;
    }
  });
};

/** 删除按钮操作 */
const handleDelete = async (row?: SysApplicationVo) => {
  const _ids = row?.id || ids.value;
  await proxy?.$modal.confirm('是否确认删除子应用编号为"' + _ids + '"的数据项？删除后该应用将无法再登录。');
  await delApplication(_ids);
  proxy?.$modal.msgSuccess('删除成功');
  await getList();
};

/** 状态修改 */
const handleStatusChange = async (row: SysApplicationVo) => {
  const text = row.status === '0' ? '启用' : '停用';
  try {
    await proxy?.$modal.confirm('确认要"' + text + '"该子应用吗？停用后该应用将无法登录。');
    await changeApplicationStatus(row.id, row.status);
    proxy?.$modal.msgSuccess(text + '成功');
  } catch (err) {
    row.status = row.status === '0' ? '1' : '0';
  }
};

/** 重置密钥 */
const handleResetSecret = async (row: SysApplicationVo) => {
  await proxy?.$modal.confirm('重置后旧密钥立即失效，调用方必须同步更新配置。是否继续？');
  const res = await resetApplicationSecret(row.id);
  secretInfo.appId = row.appId;
  secretInfo.clientSecret = res.data?.clientSecret || '';
  secretDialog.title = '新的应用密钥（请立即保存）';
  secretDialog.visible = true;
};

/** 复制密钥 */
const copySecret = async () => {
  try {
    await navigator.clipboard.writeText(secretInfo.clientSecret);
    proxy?.$modal.msgSuccess('已复制到剪贴板');
  } catch (e) {
    proxy?.$modal.msgError('复制失败，请手动选中复制');
  }
};

onMounted(() => {
  getList();
});
</script>

<style scoped lang="scss">
.form-tip {
  width: 100%;
  font-size: 12px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
}

.mr1 {
  margin-right: 4px;
}
</style>
