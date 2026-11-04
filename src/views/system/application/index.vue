<template>
  <div class="p-2">
    <transition :enter-active-class="proxy?.animate.searchAnimate.enter" :leave-active-class="proxy?.animate.searchAnimate.leave">
      <div v-show="showSearch" class="search">
        <el-form ref="queryFormRef" :model="queryParams" :inline="true" label-width="85px">
          <el-form-item label="应用名称" prop="appName">
            <el-input v-model="queryParams.appName" placeholder="请输入应用名称" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="应用编码" prop="appId">
            <el-input v-model="queryParams.appId" placeholder="请输入应用编码" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="分类" prop="category">
            <el-select v-model="queryParams.category" placeholder="请选择分类" clearable style="width: 140px">
              <el-option v-for="dict in app_category" :key="dict.value" :label="dict.label" :value="dict.value" />
            </el-select>
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
              新增
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
        <el-table-column label="应用名称" align="center" prop="appName" min-width="140" :show-overflow-tooltip="true" />
        <el-table-column label="图标" align="center" width="80">
          <template #default="scope">
            <el-image
              v-if="scope.row.iconUrl || (scope.row.icon && (scope.row.icon.startsWith('http') || scope.row.icon.startsWith('/')))"
              style="width: 36px; height: 36px; border-radius: 50%"
              :src="scope.row.iconUrl || scope.row.icon"
              :preview-src-list="[scope.row.iconUrl || scope.row.icon]"
              preview-teleported
              fit="cover"
            />
            <span v-else style="color: #909399">-</span>
          </template>
        </el-table-column>
        <el-table-column label="编码" align="center" prop="appId" width="130">
          <template #default="scope">
            <el-tag v-if="scope.row.appId === '000000'" type="danger" size="small" style="margin-right: 4px">门户</el-tag>
            <span style="font-weight: 500">{{ scope.row.appId }}</span>
          </template>
        </el-table-column>
        <el-table-column label="分类" align="center" prop="category" width="100">
          <template #default="scope">
            <dict-tag :options="app_category" :value="scope.row.category" />
          </template>
        </el-table-column>
        <el-table-column label="状态" align="center" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.status === '0' ? 'success' : 'info'">
              {{ scope.row.status === '0' ? '已启用' : '未启用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="访问地址" align="center" prop="entryUrl" min-width="180" :show-overflow-tooltip="true">
          <template #default="scope">
            <el-link v-if="scope.row.entryUrl" type="primary" :href="scope.row.entryUrl" target="_blank" :underline="false">
              {{ scope.row.entryUrl }}
            </el-link>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="简介" align="center" prop="description" min-width="200" :show-overflow-tooltip="true" />
        <el-table-column label="接入时间" align="center" prop="createTime" width="160" />
        <el-table-column label="操作" align="center" width="200" class-name="small-padding fixed-width">
          <template #default="scope">
            <el-button v-hasPermi="['system:application:edit']" link type="primary" @click="handleUpdate(scope.row)">
              编辑
            </el-button>
            <el-button v-hasPermi="['system:application:resetSecret']" link type="warning" @click="handleResetSecret(scope.row)">
              重置密钥
            </el-button>
            <el-button
              v-if="scope.row.appId !== '000000'"
              v-hasPermi="['system:application:remove']"
              link
              type="danger"
              @click="handleDelete(scope.row)"
            >
              删除
            </el-button>
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
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="620px" append-to-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <el-form-item v-if="form.id" label="应用编码" prop="appId">
          <el-input v-model="form.appId" disabled placeholder="保存后自动生成的统一编码" />
        </el-form-item>
        <el-form-item label="应用名称" prop="appName">
          <el-input v-model="form.appName" placeholder="请输入应用系统名称" />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select v-model="form.category" placeholder="请选择应用分类" clearable style="width: 100%">
            <el-option v-for="dict in app_category" :key="dict.value" :label="dict.label" :value="dict.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio-button value="0">已启用</el-radio-button>
            <el-radio-button value="1">未启用</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="访问地址" prop="entryUrl">
          <el-input v-model="form.entryUrl" placeholder="如 https://wx.example.com" />
        </el-form-item>
        <el-form-item label="简介" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="用于记录医生 CT 检查操作，统计工作量，支撑医院绩效核算的管理系统"
          />
        </el-form-item>
        <el-form-item label="图标" prop="icon">
          <image-upload v-model="form.icon" :limit="1" />
        </el-form-item>
        <el-form-item label="登录回调地址" prop="redirectUris">
          <el-input
            v-model="form.redirectUris"
            type="textarea"
            :rows="2"
            placeholder="允许的登录回调URI列表，多个以换行分隔，如 https://wx.example.com/oauth/callback"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" :loading="buttonLoading" @click="submitForm">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 密钥展示对话框 (新增/重置密钥后单次展示) -->
    <el-dialog v-model="secretDialog.visible" title="应用凭据凭据 (请妥善保管)" width="520px" append-to-body>
      <el-alert
        title="请妥善保管该应用凭据！出于安全考虑，客户端密钥明文仅展示一次，关闭后将无法再次查看。"
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom: 20px"
      />
      <el-form label-width="100px">
        <el-form-item label="应用编码">
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
import ImageUpload from '@/components/ImageUpload/index.vue';
import {
  listApplication,
  getApplication,
  addApplication,
  updateApplication,
  delApplication,
  resetApplicationSecret
} from '@/api/system/application';
import { ApplicationVO, ApplicationForm, ApplicationQuery } from '@/api/system/application/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const { app_category, sys_normal_disable } = toRefs<any>(proxy?.useDict('app_category', 'sys_normal_disable'));

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
  category: undefined,
  description: '',
  icon: '',
  entryUrl: '',
  redirectUris: '',
  status: '0'
};

const data = reactive<PageData<ApplicationForm, ApplicationQuery>>({
  form: { ...initFormData },
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    appId: undefined,
    appName: undefined,
    category: undefined,
    status: undefined
  },
  rules: {
    appName: [{ required: true, message: '应用名称不能为空', trigger: 'blur' }],
    category: [{ required: true, message: '请选择应用分类', trigger: 'change' }],
    status: [{ required: true, message: '状态不能为空', trigger: 'change' }],
    entryUrl: [{ required: true, message: '访问地址不能为空', trigger: 'blur' }],
    description: [{ required: true, message: '应用简介不能为空', trigger: 'blur' }],
    icon: [{ required: true, message: '应用图标不能为空', trigger: 'change' }],
    redirectUris: [{ required: true, message: '登录回调地址不能为空', trigger: 'blur' }]
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
  dialog.title = '新增';
};

/** 解析编辑时的回调地址为多行文本 */
const formatRedirectUrisForEdit = (uris?: string): string => {
  if (!uris) return '';
  const trimmed = uris.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const arr = JSON.parse(trimmed);
      if (Array.isArray(arr)) {
        return arr.join('\n');
      }
    } catch {
      // ignore
    }
  }
  return trimmed;
};

/** 修改按钮操作 */
const handleUpdate = async (row?: ApplicationVO) => {
  reset();
  const id = row?.id || ids.value[0];
  const res = await getApplication(id);
  form.value = {
    ...res.data,
    redirectUris: formatRedirectUrisForEdit(res.data.redirectUris)
  };
  dialog.visible = true;
  dialog.title = '编辑应用';
};

/** 提交按钮 */
const submitForm = () => {
  formRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      buttonLoading.value = true;
      try {
        if (form.value.id !== undefined) {
          await updateApplication(form.value);
          ElMessage.success('修改应用成功');
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
