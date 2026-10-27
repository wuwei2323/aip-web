<template>
  <div class="p-2">
    <transition :enter-active-class="proxy?.animate.searchAnimate.enter" :leave-active-class="proxy?.animate.searchAnimate.leave">
      <div v-show="showSearch" class="search">
        <el-form ref="queryFormRef" :model="queryParams" :inline="true" label-width="85px">
          <el-form-item label="用户ID" prop="userId">
            <el-input v-model="queryParams.userId" placeholder="请输入平台用户ID" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="租户编号" prop="tenantId">
            <el-input v-model="queryParams.tenantId" placeholder="请输入租户编号" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="企微corpid" prop="corpId">
            <el-input v-model="queryParams.corpId" placeholder="请输入企微corpid" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="企微userid" prop="wecomUserid">
            <el-input v-model="queryParams.wecomUserid" placeholder="请输入企微userid" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-select v-model="queryParams.status" placeholder="请选择状态" clearable style="width: 120px">
              <el-option v-for="item in STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
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
            <el-button v-hasPermi="['system:wecom:add']" type="primary" plain icon="Plus" @click="handleAdd">新增</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button v-hasPermi="['system:wecom:remove']" type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete()">
              删除
            </el-button>
          </el-col>
          <right-toolbar v-model:show-search="showSearch" @query-table="getList"></right-toolbar>
        </el-row>
      </template>

      <el-table v-loading="loading" :data="bindingList" border @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="用户ID" align="center" prop="userId" width="110" :show-overflow-tooltip="true" />
        <el-table-column label="租户编号" align="center" prop="tenantId" width="110" />
        <el-table-column label="企微渠道实例" align="center" prop="configKey" :show-overflow-tooltip="true" />
        <el-table-column label="corpid" align="center" prop="corpId" :show-overflow-tooltip="true" />
        <el-table-column label="企微userid" align="center" prop="wecomUserid" :show-overflow-tooltip="true" />
        <el-table-column label="手机号" align="center" prop="mobile" width="130" />
        <el-table-column label="来源" align="center" width="100">
          <template #default="scope">
            <el-tag>{{ sourceLabel(scope.row.source) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column key="status" label="状态" align="center" width="80">
          <template #default="scope">
            <el-tag :type="scope.row.status === '1' ? 'success' : 'danger'">{{ statusLabel(scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="最后同步时间" align="center" prop="lastSyncTime" width="160">
          <template #default="scope">
            <span>{{ proxy.parseTime(scope.row.lastSyncTime) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" align="center" prop="createTime" width="160">
          <template #default="scope">
            <span>{{ proxy.parseTime(scope.row.createTime) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center" width="120" class-name="small-padding fixed-width">
          <template #default="scope">
            <el-tooltip content="修改" placement="top">
              <el-button v-hasPermi="['system:wecom:edit']" link type="primary" icon="Edit" @click="handleUpdate(scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip content="删除" placement="top">
              <el-button v-hasPermi="['system:wecom:remove']" link type="primary" icon="Delete" @click="handleDelete(scope.row)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>

      <pagination v-show="total > 0" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
    </el-card>

    <!-- 添加或修改企微绑定对话框 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="640px" append-to-body>
      <el-form ref="bindingFormRef" :model="form" :rules="rules" label-width="110px">
        <el-row :gutter="10">
          <el-col :span="12">
            <el-form-item label="用户ID" prop="userId">
              <el-input-number v-model="form.userId" :controls="false" style="width: 100%" placeholder="平台用户ID（sys_user）" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="租户编号" prop="tenantId">
              <el-input v-model="form.tenantId" placeholder="所属租户编号，如 000000" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="企微渠道实例" prop="configKey">
              <el-input v-model="form.configKey" placeholder="企微渠道配置标识" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="corpid" prop="corpId">
              <el-input v-model="form.corpId" placeholder="企业微信 corpid" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="企微userid" prop="wecomUserid">
              <el-input v-model="form.wecomUserid" placeholder="企业微信成员 userid" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="open_userid" prop="openUserid">
              <el-input v-model="form.openUserid" placeholder="企业微信 open_userid" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手机号" prop="mobile">
              <el-input v-model="form.mobile" placeholder="请输入手机号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="来源" prop="source">
              <el-select v-model="form.source" placeholder="请选择来源" style="width: 100%">
                <el-option v-for="item in SOURCE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-select v-model="form.status" placeholder="请选择状态" style="width: 100%">
                <el-option v-for="item in STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注" prop="remark">
              <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注" />
            </el-form-item>
          </el-col>
        </el-row>
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

<script setup name="WecomBinding" lang="ts">
import { addWecomBinding, delWecomBinding, getWecomBinding, listWecomBinding, updateWecomBinding } from '@/api/system/wecomBinding';
import { SysUserWecomBo, SysUserWecomQuery, SysUserWecomVo } from '@/api/system/wecomBinding/types';

/** 绑定来源选项 */
const SOURCE_OPTIONS = [
  { value: 'IN_APP', label: '静默授权' },
  { value: 'QRCODE', label: '扫码绑定' },
  { value: 'BIND', label: '手动绑定' },
  { value: 'SYNC', label: '通讯录同步' }
];

/** 状态选项 */
const STATUS_OPTIONS = [
  { value: '1', label: '有效' },
  { value: '0', label: '失效' }
];

const { proxy } = getCurrentInstance() as ComponentInternalInstance;

const bindingList = ref<SysUserWecomVo[]>([]);
const buttonLoading = ref(false);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref<Array<string | number>>([]);
const multiple = ref(true);
const total = ref(0);

const queryFormRef = ref<ElFormInstance>();
const bindingFormRef = ref<ElFormInstance>();

const dialog = reactive<DialogOption>({ visible: false, title: '' });

const initFormData: SysUserWecomBo = {
  id: undefined,
  userId: undefined,
  tenantId: undefined,
  configKey: undefined,
  corpId: undefined,
  wecomUserid: undefined,
  openUserid: undefined,
  mobile: undefined,
  source: 'BIND',
  status: '1',
  remark: undefined
};

const data = reactive<PageData<SysUserWecomBo, SysUserWecomQuery>>({
  form: { ...initFormData },
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    userId: undefined,
    tenantId: undefined,
    corpId: undefined,
    wecomUserid: undefined,
    status: undefined
  },
  rules: {
    userId: [{ required: true, message: '用户ID不能为空', trigger: 'blur' }],
    tenantId: [{ required: true, message: '租户编号不能为空', trigger: 'blur' }],
    configKey: [{ required: true, message: '企微渠道实例不能为空', trigger: 'blur' }],
    corpId: [{ required: true, message: '企业微信corpid不能为空', trigger: 'blur' }],
    wecomUserid: [{ required: true, message: '企微userid不能为空', trigger: 'blur' }]
  }
});

const { queryParams, form, rules } = toRefs(data);

/** 来源显示名 */
const sourceLabel = (source?: string) => {
  return SOURCE_OPTIONS.find((item) => item.value === source)?.label || source || '';
};

/** 状态显示名 */
const statusLabel = (status?: string) => {
  return STATUS_OPTIONS.find((item) => item.value === status)?.label || status || '';
};

/** 查询企微绑定管理列表 */
const getList = async () => {
  loading.value = true;
  const res = await listWecomBinding(queryParams.value);
  bindingList.value = res.rows;
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
  bindingFormRef.value?.resetFields();
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
const handleSelectionChange = (selection: SysUserWecomVo[]) => {
  ids.value = selection.map((item) => item.id);
  multiple.value = !selection.length;
};

/** 新增按钮操作 */
const handleAdd = () => {
  reset();
  dialog.visible = true;
  dialog.title = '新增企微绑定';
};

/** 修改按钮操作 */
const handleUpdate = async (row?: SysUserWecomVo) => {
  reset();
  const _id = row?.id || ids.value[0];
  const res = await getWecomBinding(_id);
  Object.assign(form.value, res.data);
  dialog.visible = true;
  dialog.title = '修改企微绑定';
};

/** 提交按钮 */
const submitForm = () => {
  bindingFormRef.value?.validate(async (valid: boolean) => {
    if (!valid) {
      return;
    }
    buttonLoading.value = true;
    try {
      if (form.value.id) {
        await updateWecomBinding(form.value);
        proxy?.$modal.msgSuccess('修改成功');
      } else {
        await addWecomBinding(form.value);
        proxy?.$modal.msgSuccess('新增成功');
      }
      dialog.visible = false;
      await getList();
    } finally {
      buttonLoading.value = false;
    }
  });
};

/** 删除按钮操作 */
const handleDelete = async (row?: SysUserWecomVo) => {
  const _ids = row?.id || ids.value;
  await proxy?.$modal.confirm('是否确认删除企微绑定编号为"' + _ids + '"的数据项？删除后该用户将无法通过企微登录。');
  await delWecomBinding(_ids);
  proxy?.$modal.msgSuccess('删除成功');
  await getList();
};

onMounted(() => {
  getList();
});
</script>
