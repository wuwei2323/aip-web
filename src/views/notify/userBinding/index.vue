<template>
  <div class="p-2">
    <transition :enter-active-class="proxy?.animate.searchAnimate.enter" :leave-active-class="proxy?.animate.searchAnimate.leave">
      <div v-show="showSearch" class="search">
        <el-form ref="queryFormRef" :model="queryParams" :inline="true" label-width="85px">
          <el-form-item label="渠道" prop="channel">
            <el-select v-model="queryParams.channel" placeholder="请选择渠道" clearable style="width: 180px">
              <el-option v-for="c in BIND_CHANNELS" :key="c.value" :label="c.label" :value="c.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="用户ID" prop="userId">
            <el-input v-model="queryParams.userId" placeholder="请输入用户ID" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="绑定值" prop="bindingValue">
            <el-input v-model="queryParams.bindingValue" placeholder="请输入绑定值" clearable @keyup.enter="handleQuery" />
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
            <el-button v-hasPermi="['notify:userBinding:add']" type="primary" plain icon="Plus" @click="handleAdd">新增</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button v-hasPermi="['notify:userBinding:remove']" type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete()">
              删除
            </el-button>
          </el-col>
          <right-toolbar v-model:show-search="showSearch" @query-table="getList"></right-toolbar>
        </el-row>
      </template>

      <el-table v-loading="loading" :data="bindingList" border @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="用户ID" align="center" prop="userId" width="180" :show-overflow-tooltip="true" />
        <el-table-column label="用户昵称" align="center" prop="userName" :show-overflow-tooltip="true" />
        <el-table-column label="渠道" align="center" width="130">
          <template #default="scope">
            <el-tag>{{ channelLabel(scope.row.channel) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="绑定值" align="center" prop="bindingValue" :show-overflow-tooltip="true" />
        <el-table-column key="status" label="启用" align="center" width="80">
          <template #default="scope">
            <el-switch v-model="scope.row.status" active-value="1" inactive-value="0" @change="handleStatusChange(scope.row)"></el-switch>
          </template>
        </el-table-column>
        <el-table-column label="备注" align="center" prop="remark" :show-overflow-tooltip="true" />
        <el-table-column label="操作" align="center" width="140" class-name="small-padding fixed-width">
          <template #default="scope">
            <el-tooltip content="修改" placement="top">
              <el-button v-hasPermi="['notify:userBinding:edit']" link type="primary" icon="Edit" @click="handleUpdate(scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip content="删除" placement="top">
              <el-button v-hasPermi="['notify:userBinding:remove']" link type="primary" icon="Delete" @click="handleDelete(scope.row)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>

      <pagination v-show="total > 0" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
    </el-card>

    <!-- 添加或修改用户绑定对话框 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="560px" append-to-body>
      <el-form ref="bindingFormRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="用户" prop="userId">
          <el-input-number v-model="form.userId" :controls="false" style="width: 100%" placeholder="请输入平台用户ID（sys_user）" />
        </el-form-item>
        <el-form-item label="渠道" prop="channel">
          <el-select v-model="form.channel" placeholder="请选择渠道" style="width: 100%">
            <el-option v-for="c in BIND_CHANNELS" :key="c.value" :label="c.label" :value="c.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="绑定值" prop="bindingValue">
          <el-input v-model="form.bindingValue" :placeholder="bindingPlaceholder" />
        </el-form-item>
        <el-form-item label="启用" prop="status">
          <el-switch v-model="form.status" active-value="1" inactive-value="0" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button :loading="buttonLoading" type="primary" @click="submitForm">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="NotifyUserBinding" lang="ts">
import { listUserBinding, getUserBinding, delUserBinding, addUserBinding, updateUserBinding } from '@/api/notify/userBinding';
import { UserBindingVO, UserBindingForm, UserBindingQuery } from '@/api/notify/userBinding/types';
import { channelLabel } from '@/views/notify/constants';

const BIND_CHANNELS = [
  { value: 'WECOM_APP', label: '企业微信' },
  { value: 'DING_APP', label: '钉钉' },
  { value: 'MAIL', label: '邮件' },
  { value: 'SMS', label: '短信' }
];

const PLACEHOLDER: Record<string, string> = {
  WECOM_APP: '企业微信成员 userid',
  DING_APP: '钉钉成员 userid',
  MAIL: '邮箱地址',
  SMS: '手机号'
};

const { proxy } = getCurrentInstance() as ComponentInternalInstance;

const bindingList = ref<UserBindingVO[]>([]);
const buttonLoading = ref(false);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref<Array<string | number>>([]);
const multiple = ref(true);
const total = ref(0);

const queryFormRef = ref<ElFormInstance>();
const bindingFormRef = ref<ElFormInstance>();

const dialog = reactive<DialogOption>({ visible: false, title: '' });

const initFormData: UserBindingForm = {
  id: undefined,
  userId: undefined,
  channel: undefined,
  bindingValue: undefined,
  status: '1',
  remark: undefined
};

const data = reactive<PageData<UserBindingForm, UserBindingQuery>>({
  form: { ...initFormData },
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    channel: undefined,
    userId: undefined,
    bindingValue: undefined,
    status: undefined
  },
  rules: {
    userId: [{ required: true, message: '用户ID不能为空', trigger: 'blur' }],
    channel: [{ required: true, message: '渠道不能为空', trigger: 'change' }],
    bindingValue: [{ required: true, message: '绑定值不能为空', trigger: 'blur' }]
  }
});

const { queryParams, form, rules } = toRefs(data);

const bindingPlaceholder = computed(() => PLACEHOLDER[form.value.channel || ''] || '绑定值');

const getList = async () => {
  loading.value = true;
  const res = await listUserBinding(queryParams.value);
  bindingList.value = res.rows;
  total.value = res.total;
  loading.value = false;
};

const cancel = () => {
  reset();
  dialog.visible = false;
};

const reset = () => {
  form.value = { ...initFormData };
  bindingFormRef.value?.resetFields();
};

const handleQuery = () => {
  queryParams.value.pageNum = 1;
  getList();
};

const resetQuery = () => {
  queryFormRef.value?.resetFields();
  handleQuery();
};

const handleSelectionChange = (selection: UserBindingVO[]) => {
  ids.value = selection.map((item) => item.id);
  multiple.value = !selection.length;
};

const handleAdd = () => {
  reset();
  dialog.visible = true;
  dialog.title = '新增用户绑定';
};

const handleUpdate = async (row?: UserBindingVO) => {
  reset();
  const _id = row?.id || ids.value[0];
  const res = await getUserBinding(_id);
  Object.assign(form.value, res.data);
  dialog.visible = true;
  dialog.title = '修改用户绑定';
};

const submitForm = () => {
  bindingFormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      buttonLoading.value = true;
      try {
        if (form.value.id) {
          await updateUserBinding(form.value);
          proxy?.$modal.msgSuccess('修改成功');
        } else {
          await addUserBinding(form.value);
          proxy?.$modal.msgSuccess('新增成功');
        }
        dialog.visible = false;
        await getList();
      } finally {
        buttonLoading.value = false;
      }
    }
  });
};

const handleDelete = async (row?: UserBindingVO) => {
  const _ids = row?.id || ids.value;
  await proxy?.$modal.confirm('是否确认删除用户绑定编号为"' + _ids + '"的数据项？');
  await delUserBinding(_ids);
  proxy?.$modal.msgSuccess('删除成功');
  await getList();
};

const handleStatusChange = async (row: UserBindingVO) => {
  const text = row.status === '1' ? '启用' : '停用';
  try {
    await proxy?.$modal.confirm('确认要"' + text + '"该绑定吗？');
    await updateUserBinding({ id: row.id, status: row.status });
    proxy?.$modal.msgSuccess(text + '成功');
  } catch (err) {
    row.status = row.status === '1' ? '0' : '1';
  }
};

onMounted(() => {
  getList();
});
</script>