<template>
  <div class="p-2">
    <transition :enter-active-class="proxy?.animate.searchAnimate.enter" :leave-active-class="proxy?.animate.searchAnimate.leave">
      <div v-show="showSearch" class="search">
        <el-form ref="queryFormRef" :model="queryParams" :inline="true" label-width="85px">
          <el-form-item label="应用ID" prop="appId">
            <el-input v-model="queryParams.appId" placeholder="请输入应用ID" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="应用名称" prop="appName">
            <el-input v-model="queryParams.appName" placeholder="请输入应用名称" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="状态" prop="enabled">
            <el-select v-model="queryParams.enabled" placeholder="请选择状态" clearable style="width: 120px">
              <el-option label="启用" value="1" />
              <el-option label="停用" value="0" />
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
            <el-button v-hasPermi="['notify:app:add']" type="primary" plain icon="Plus" @click="handleAdd">新增</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button v-hasPermi="['notify:app:remove']" type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete()">
              删除
            </el-button>
          </el-col>
          <right-toolbar v-model:show-search="showSearch" @query-table="getList"></right-toolbar>
        </el-row>
      </template>

      <el-table v-loading="loading" :data="appList" border @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="应用ID" align="center" prop="appId" width="180" :show-overflow-tooltip="true" />
        <el-table-column label="应用名称" align="center" prop="appName" :show-overflow-tooltip="true" />
        <el-table-column label="授权主题" align="center" min-width="200">
          <template #default="scope">
            <el-tag v-if="!scope.row.allowedThemes?.length" type="info">全部主题</el-tag>
            <el-tag v-for="t in scope.row.allowedThemes || []" :key="t" class="mr1">{{ t }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="IP白名单" align="center" prop="ipWhitelist" :show-overflow-tooltip="true">
          <template #default="scope">
            <span>{{ scope.row.ipWhitelist || '不限制' }}</span>
          </template>
        </el-table-column>
        <el-table-column key="enabled" label="状态" align="center" width="80">
          <template #default="scope">
            <el-switch
              v-model="scope.row.enabled"
              active-value="1"
              inactive-value="0"
              :disabled="!hasEditPermi"
              @change="handleStatusChange(scope.row)"
            ></el-switch>
          </template>
        </el-table-column>
        <el-table-column label="备注" align="center" prop="remark" :show-overflow-tooltip="true" />
        <el-table-column label="操作" align="center" width="160" class-name="small-padding fixed-width">
          <template #default="scope">
            <el-tooltip content="重置密钥" placement="top">
              <el-button v-hasPermi="['notify:app:edit']" link type="warning" icon="Key" @click="handleResetSecret(scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip content="修改" placement="top">
              <el-button v-hasPermi="['notify:app:edit']" link type="primary" icon="Edit" @click="handleUpdate(scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip content="删除" placement="top">
              <el-button v-hasPermi="['notify:app:remove']" link type="primary" icon="Delete" @click="handleDelete(scope.row)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>

      <pagination v-show="total > 0" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
    </el-card>

    <!-- 添加或修改子应用对话框 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="680px" append-to-body>
      <el-form ref="appFormRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="应用ID" prop="appId">
          <el-input v-model="form.appId" :disabled="form.id != null" placeholder="调用方标识，如 jcpt-order" />
        </el-form-item>
        <el-form-item label="应用名称" prop="appName">
          <el-input v-model="form.appName" placeholder="请输入应用名称" />
        </el-form-item>
        <el-form-item label="授权主题" prop="allowedThemes">
          <el-select v-model="form.allowedThemes" multiple clearable placeholder="留空表示授权全部主题" style="width: 100%">
            <el-option v-for="t in themeOptions" :key="t" :label="t" :value="t" />
          </el-select>
          <div class="form-tip">不选表示该应用可发送全部主题；选择后仅允许发送所选主题</div>
        </el-form-item>
        <el-form-item label="IP白名单" prop="ipWhitelist">
          <el-input v-model="form.ipWhitelist" placeholder="多个 IP 用英文逗号分隔；留空表示不限制来源 IP" />
        </el-form-item>
        <el-form-item label="状态" prop="enabled">
          <el-radio-group v-model="form.enabled">
            <el-radio value="1">启用</el-radio>
            <el-radio value="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注" />
        </el-form-item>
        <el-alert
          v-if="!form.id"
          type="info"
          :closable="false"
          title="应用密钥将在保存后生成并显示一次，请立即保存到调用方配置中"
        />
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
        <el-form-item label="应用ID">
          <el-input v-model="secretInfo.appId" readonly />
        </el-form-item>
        <el-form-item label="应用密钥">
          <el-input v-model="secretInfo.secret" readonly>
            <template #append>
              <el-button icon="CopyDocument" @click="copySecret">复制</el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="签名算法">
          <div class="sign-tip">
            <div>请求头：X-Notify-App-Id / X-Notify-Timestamp / X-Notify-Nonce / X-Notify-Sign</div>
            <div>stringToSign = appId + "\n" + timestamp + "\n" + nonce + "\n" + sha256Hex(原始请求体)</div>
            <div>sign = hmacSha256Hex(appSecret, stringToSign)，十六进制小写</div>
          </div>
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

<script setup name="NotifyApp" lang="ts">
import { listApp, getApp, delApp, addApp, updateApp, changeAppStatus, resetAppSecret } from '@/api/notify/app';
import { AppVO, AppForm, AppQuery } from '@/api/notify/app/types';
import { listMessageConfig } from '@/api/notify/messageConfig';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const { hasPermi } = proxy?.usePermission() || { hasPermi: () => true };

const appList = ref<AppVO[]>([]);
const buttonLoading = ref(false);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref<Array<string | number>>([]);
const multiple = ref(true);
const total = ref(0);
const themeOptions = ref<string[]>([]);

const queryFormRef = ref<ElFormInstance>();
const appFormRef = ref<ElFormInstance>();

const dialog = reactive<DialogOption>({ visible: false, title: '' });
const secretDialog = reactive<DialogOption>({ visible: false, title: '' });
const secretInfo = reactive({ appId: '', secret: '' });

const initFormData: AppForm = {
  id: undefined,
  appId: undefined,
  appName: undefined,
  allowedThemes: [],
  ipWhitelist: undefined,
  enabled: '1',
  remark: undefined
};

const data = reactive<PageData<AppForm, AppQuery>>({
  form: { ...initFormData },
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    appId: undefined,
    appName: undefined,
    enabled: undefined
  },
  rules: {
    appId: [
      { required: true, message: '应用ID不能为空', trigger: 'blur' },
      {
        pattern: /^[A-Za-z0-9][A-Za-z0-9_-]{1,63}$/,
        message: '须以字母或数字开头，仅含字母、数字、下划线、中划线，长度 2-64',
        trigger: 'blur'
      }
    ],
    appName: [{ required: true, message: '应用名称不能为空', trigger: 'blur' }]
  }
});

const { queryParams, form, rules } = toRefs(data);

const hasEditPermi = computed(() => hasPermi('notify:app:edit'));

/** 授权主题候选：来自「通知公告 → 消息配置」已配置的主题 */
const getThemeOptions = async () => {
  const res = await listMessageConfig({ pageNum: 1, pageSize: 500 });
  themeOptions.value = (res.rows || []).map((item) => item.theme);
};

const getList = async () => {
  loading.value = true;
  const res = await listApp(queryParams.value);
  appList.value = res.rows;
  total.value = res.total;
  loading.value = false;
};

const cancel = () => {
  reset();
  dialog.visible = false;
};

const reset = () => {
  form.value = { ...initFormData, allowedThemes: [] };
  appFormRef.value?.resetFields();
};

const handleQuery = () => {
  queryParams.value.pageNum = 1;
  getList();
};

const resetQuery = () => {
  queryFormRef.value?.resetFields();
  handleQuery();
};

const handleSelectionChange = (selection: AppVO[]) => {
  ids.value = selection.map((item) => item.id);
  multiple.value = !selection.length;
};

const handleAdd = () => {
  reset();
  dialog.visible = true;
  dialog.title = '新增子应用';
};

const handleUpdate = async (row?: AppVO) => {
  reset();
  const _id = row?.id || ids.value[0];
  const res = await getApp(_id);
  Object.assign(form.value, res.data);
  dialog.visible = true;
  dialog.title = '修改子应用';
};

const submitForm = () => {
  appFormRef.value?.validate(async (valid: boolean) => {
    if (!valid) {
      return;
    }
    buttonLoading.value = true;
    try {
      if (form.value.id) {
        await updateApp(form.value);
        proxy?.$modal.msgSuccess('修改成功');
      } else {
        const res = await addApp(form.value);
        // 新增接口的 data 是明文密钥，仅此一次返回
        secretInfo.appId = form.value.appId || '';
        secretInfo.secret = res.data;
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

const handleDelete = async (row?: AppVO) => {
  const _ids = row?.id || ids.value;
  await proxy?.$modal.confirm('是否确认删除子应用编号为"' + _ids + '"的数据项？删除后该应用将无法再调用发送接口。');
  await delApp(_ids);
  proxy?.$modal.msgSuccess('删除成功');
  await getList();
};

const handleStatusChange = async (row: AppVO) => {
  const text = row.enabled === '1' ? '启用' : '停用';
  try {
    await proxy?.$modal.confirm('确认要"' + text + '"该子应用吗？停用后其所有调用将被拒绝。');
    await changeAppStatus(row.id, row.enabled);
    proxy?.$modal.msgSuccess(text + '成功');
  } catch (err) {
    row.enabled = row.enabled === '1' ? '0' : '1';
  }
};

const handleResetSecret = async (row: AppVO) => {
  await proxy?.$modal.confirm('重置后旧密钥立即失效，调用方必须同步更新配置。是否继续？');
  const res = await resetAppSecret(row.id);
  secretInfo.appId = row.appId;
  secretInfo.secret = res.data;
  secretDialog.title = '新的应用密钥（请立即保存）';
  secretDialog.visible = true;
};

const copySecret = async () => {
  try {
    await navigator.clipboard.writeText(secretInfo.secret);
    proxy?.$modal.msgSuccess('已复制到剪贴板');
  } catch (e) {
    proxy?.$modal.msgError('复制失败，请手动选中复制');
  }
};

onMounted(() => {
  getList();
  getThemeOptions();
});
</script>

<style scoped lang="scss">
.form-tip {
  width: 100%;
  font-size: 12px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
}

.sign-tip {
  font-size: 12px;
  line-height: 20px;
  color: var(--el-text-color-secondary);
  word-break: break-all;
}

.mr1 {
  margin-right: 4px;
}
</style>
