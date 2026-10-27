<template>
  <div class="p-2">
    <transition :enter-active-class="proxy?.animate.searchAnimate.enter" :leave-active-class="proxy?.animate.searchAnimate.leave">
      <div v-show="showSearch" class="search">
        <el-form ref="queryFormRef" :model="queryParams" :inline="true" label-width="85px">
          <el-form-item label="消息主题" prop="theme">
            <el-input v-model="queryParams.theme" placeholder="请输入消息主题" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="配置名称" prop="configName">
            <el-input v-model="queryParams.configName" placeholder="请输入配置名称" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="渠道" prop="channel">
            <el-select v-model="queryParams.channel" placeholder="请选择渠道" clearable style="width: 180px">
              <el-option v-for="c in CHANNEL_OPTIONS" :key="c.value" :label="c.label" :value="c.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="发送类型" prop="sendType">
            <el-select v-model="queryParams.sendType" placeholder="请选择发送类型" clearable style="width: 140px">
              <el-option v-for="t in SEND_TYPE_OPTIONS" :key="t.value" :label="t.label" :value="t.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-select v-model="queryParams.status" placeholder="请选择状态" clearable style="width: 120px">
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
            <el-button v-hasPermi="['notify:messageConfig:add']" type="primary" plain icon="Plus" @click="handleAdd">新增</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button
              v-hasPermi="['notify:messageConfig:remove']"
              type="danger"
              plain
              icon="Delete"
              :disabled="multiple"
              @click="handleDelete()"
            >
              删除
            </el-button>
          </el-col>
          <right-toolbar v-model:show-search="showSearch" @query-table="getList"></right-toolbar>
        </el-row>
      </template>

      <el-table v-loading="loading" :data="configList" border @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="消息主题" align="center" prop="theme" width="190" :show-overflow-tooltip="true" />
        <el-table-column label="配置名称" align="center" prop="configName" :show-overflow-tooltip="true" />
        <el-table-column label="渠道" align="center" width="130">
          <template #default="scope">
            <el-tag>{{ channelLabel(scope.row.channel) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="发送类型" align="center" width="100">
          <template #default="scope">
            <el-tag :type="isGroupSendType(scope.row.sendType) ? 'success' : 'warning'">
              {{ sendTypeLabel(scope.row.sendType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="群发范围" align="center" prop="scopeSummary" width="170" :show-overflow-tooltip="true" />
        <el-table-column label="默认标题" align="center" prop="titleTemplate" :show-overflow-tooltip="true" />
        <el-table-column key="status" label="状态" align="center" width="80">
          <template #default="scope">
            <el-switch
              v-model="scope.row.status"
              active-value="1"
              inactive-value="0"
              :disabled="!hasEditPermi"
              @change="handleStatusChange(scope.row)"
            ></el-switch>
          </template>
        </el-table-column>
        <el-table-column label="备注" align="center" prop="remark" :show-overflow-tooltip="true" />
        <el-table-column label="操作" align="center" width="130" class-name="small-padding fixed-width">
          <template #default="scope">
            <el-tooltip content="修改" placement="top">
              <el-button v-hasPermi="['notify:messageConfig:edit']" link type="primary" icon="Edit" @click="handleUpdate(scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip content="删除" placement="top">
              <el-button
                v-hasPermi="['notify:messageConfig:remove']"
                link
                type="primary"
                icon="Delete"
                @click="handleDelete(scope.row)"
              ></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>

      <pagination v-show="total > 0" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
    </el-card>

    <!-- 添加或修改消息配置对话框 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="760px" append-to-body>
      <el-form ref="configFormRef" :model="form" :rules="rules" label-width="110px">
        <el-form-item label="消息主题" prop="theme">
          <el-input v-model="form.theme" :disabled="form.id != null" placeholder="全局唯一，如 GENERAL_ALARM（大写字母/数字/下划线）" />
        </el-form-item>
        <el-form-item label="配置名称" prop="configName">
          <el-input v-model="form.configName" placeholder="请输入配置名称" />
        </el-form-item>
        <el-form-item label="渠道" prop="channel">
          <el-select v-model="form.channel" placeholder="请选择渠道" style="width: 100%">
            <el-option v-for="c in CHANNEL_OPTIONS" :key="c.value" :label="c.label" :value="c.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="配置实例" prop="configKey">
          <el-input v-model="form.configKey" placeholder="留空使用渠道默认实例" />
        </el-form-item>
        <el-form-item label="消息类型" prop="msgType">
          <el-select v-model="form.msgType" style="width: 160px">
            <el-option v-for="t in CHANNEL_MSG_TYPES[form.channel] || ['TEXT']" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="发送类型" prop="sendType">
          <el-radio-group v-model="form.sendType" @change="handleSendTypeChange">
            <el-radio v-for="t in SEND_TYPE_OPTIONS" :key="t.value" :value="t.value">{{ t.label }}</el-radio>
          </el-radio-group>
          <div class="form-tip">
            {{
              isGroupSendType(form.sendType)
                ? '群发：接收人取自下方「群发范围」'
                : '自定义：接收人由子应用调用发送接口时传入 userIds'
            }}
          </div>
        </el-form-item>

        <template v-if="isGroupSendType(form.sendType)">
          <el-form-item label="通知人员" prop="groupUserIds">
            <div class="scope-row">
              <el-button icon="User" @click="userSelectRef?.open()">选择人员</el-button>
              <span class="scope-count">已选 {{ form.groupUserIds?.length || 0 }} 人</span>
              <el-button v-if="form.groupUserIds?.length" link type="danger" @click="form.groupUserIds = []">清空</el-button>
            </div>
          </el-form-item>
          <el-form-item label="通知部门" prop="groupDeptIds">
            <el-tree-select
              v-model="form.groupDeptIds"
              :data="deptOptions"
              :props="{ value: 'id', label: 'label', children: 'children' } as any"
              value-key="id"
              placeholder="请选择通知部门（可多选）"
              multiple
              show-checkbox
              check-strictly
              render-after-expand
              clearable
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="含下级部门" prop="includeSubDept">
            <el-switch v-model="form.includeSubDept" active-value="1" inactive-value="0" />
            <div class="form-tip">开启后，所选部门及其全部下级部门下的用户都会收到消息</div>
          </el-form-item>
        </template>

        <el-form-item label="默认标题" prop="titleTemplate">
          <el-input v-model="form.titleTemplate" placeholder="子应用未传 title 时使用，支持 ${var} 占位" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio value="1">启用</el-radio>
            <el-radio value="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button :loading="buttonLoading" type="primary" @click="submitForm">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 人员选择（复用通用组件：左侧部门树 + 右侧用户表，多选） -->
    <UserSelect ref="userSelectRef" :multiple="true" :data="form.groupUserIds" @confirm-call-back="handleUserSelected" />
  </div>
</template>

<script setup name="NotifyMessageConfig" lang="ts">
import UserSelect from '@/components/UserSelect';
import { listMessageConfig, getMessageConfig, delMessageConfig, addMessageConfig, updateMessageConfig, changeMessageConfigStatus } from '@/api/notify/messageConfig';
import { MessageConfigVO, MessageConfigForm, MessageConfigQuery } from '@/api/notify/messageConfig/types';
import { UserVO } from '@/api/system/user/types';
import { DeptTreeVO } from '@/api/system/dept/types';
import api from '@/api/system/user';
import {
  CHANNEL_OPTIONS,
  CHANNEL_MSG_TYPES,
  SEND_TYPE_OPTIONS,
  channelLabel,
  sendTypeLabel,
  isGroupSendType,
  THEME_PATTERN
} from '@/views/notify/constants';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const { hasPermi } = proxy?.usePermission() || { hasPermi: () => true };

const configList = ref<MessageConfigVO[]>([]);
const buttonLoading = ref(false);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref<Array<string | number>>([]);
const multiple = ref(true);
const total = ref(0);
const deptOptions = ref<DeptTreeVO[]>([]);

const queryFormRef = ref<ElFormInstance>();
const configFormRef = ref<ElFormInstance>();
const userSelectRef = ref<InstanceType<typeof UserSelect>>();

const dialog = reactive<DialogOption>({ visible: false, title: '' });

const initFormData: MessageConfigForm = {
  id: undefined,
  theme: undefined,
  configName: undefined,
  channel: undefined,
  configKey: undefined,
  msgType: 'TEXT',
  sendType: '1',
  groupUserIds: [],
  groupDeptIds: [],
  includeSubDept: '1',
  titleTemplate: undefined,
  status: '1',
  remark: undefined
};

const data = reactive<PageData<MessageConfigForm, MessageConfigQuery>>({
  form: { ...initFormData },
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    theme: undefined,
    configName: undefined,
    channel: undefined,
    sendType: undefined,
    status: undefined
  },
  rules: {
    theme: [
      { required: true, message: '消息主题不能为空', trigger: 'blur' },
      {
        pattern: THEME_PATTERN,
        message: '主题须以大写字母开头，仅含大写字母、数字与下划线，长度 2-64',
        trigger: 'blur'
      }
    ],
    configName: [{ required: true, message: '配置名称不能为空', trigger: 'blur' }],
    channel: [{ required: true, message: '渠道不能为空', trigger: 'change' }],
    sendType: [{ required: true, message: '发送类型不能为空', trigger: 'change' }]
  }
});

const { queryParams, form, rules } = toRefs(data);

const hasEditPermi = computed(() => hasPermi('notify:messageConfig:edit'));

/** 查询部门下拉树结构（与 UserSelect 同源） */
const getDeptTree = async () => {
  const res = await api.deptTreeSelect();
  deptOptions.value = res.data;
};

const getList = async () => {
  loading.value = true;
  const res = await listMessageConfig(queryParams.value);
  configList.value = res.rows;
  total.value = res.total;
  loading.value = false;
};

const cancel = () => {
  reset();
  dialog.visible = false;
};

const reset = () => {
  form.value = { ...initFormData, groupUserIds: [], groupDeptIds: [] };
  configFormRef.value?.resetFields();
};

const handleQuery = () => {
  queryParams.value.pageNum = 1;
  getList();
};

const resetQuery = () => {
  queryFormRef.value?.resetFields();
  handleQuery();
};

const handleSelectionChange = (selection: MessageConfigVO[]) => {
  ids.value = selection.map((item) => item.id);
  multiple.value = !selection.length;
};

/**
 * 切换发送类型时清空群发范围
 * 后端对「自定义 + 已配置群发范围」是直接拒绝的，前端先清掉避免用户提交后才报错
 */
const handleSendTypeChange = () => {
  if (!isGroupSendType(form.value.sendType)) {
    form.value.groupUserIds = [];
    form.value.groupDeptIds = [];
  }
};

const handleUserSelected = (users: UserVO[]) => {
  form.value.groupUserIds = (users || []).map((u) => u.userId);
};

const handleAdd = () => {
  reset();
  dialog.visible = true;
  dialog.title = '新增消息配置';
};

const handleUpdate = async (row?: MessageConfigVO) => {
  reset();
  const _id = row?.id || ids.value[0];
  const res = await getMessageConfig(_id);
  Object.assign(form.value, res.data);
  dialog.visible = true;
  dialog.title = '修改消息配置';
};

const submitForm = () => {
  configFormRef.value?.validate(async (valid: boolean) => {
    if (!valid) {
      return;
    }
    if (isGroupSendType(form.value.sendType) && !form.value.groupUserIds?.length && !form.value.groupDeptIds?.length) {
      proxy?.$modal.msgError('群发类型必须配置群发范围（通知人员与通知部门至少填一项）');
      return;
    }
    buttonLoading.value = true;
    try {
      if (form.value.id) {
        await updateMessageConfig(form.value);
        proxy?.$modal.msgSuccess('修改成功');
      } else {
        await addMessageConfig(form.value);
        proxy?.$modal.msgSuccess('新增成功');
      }
      dialog.visible = false;
      await getList();
    } finally {
      buttonLoading.value = false;
    }
  });
};

const handleDelete = async (row?: MessageConfigVO) => {
  const _ids = row?.id || ids.value;
  await proxy?.$modal.confirm('是否确认删除消息配置编号为"' + _ids + '"的数据项？');
  await delMessageConfig(_ids);
  proxy?.$modal.msgSuccess('删除成功');
  await getList();
};

const handleStatusChange = async (row: MessageConfigVO) => {
  const text = row.status === '1' ? '启用' : '停用';
  try {
    await proxy?.$modal.confirm('确认要"' + text + '"该消息配置吗？停用后子应用调用该主题将直接失败。');
    await changeMessageConfigStatus(row.id, row.status);
    proxy?.$modal.msgSuccess(text + '成功');
  } catch (err) {
    row.status = row.status === '1' ? '0' : '1';
  }
};

onMounted(() => {
  getList();
  getDeptTree();
});
</script>

<style scoped lang="scss">
.form-tip {
  width: 100%;
  font-size: 12px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
}

.scope-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.scope-count {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
</style>
