<template>
  <div class="p-2">
    <transition :enter-active-class="proxy?.animate.searchAnimate.enter" :leave-active-class="proxy?.animate.searchAnimate.leave">
      <div v-show="showSearch" class="search">
        <el-form ref="queryFormRef" :model="queryParams" :inline="true" label-width="85px">
          <el-form-item label="模板编码" prop="templateCode">
            <el-input v-model="queryParams.templateCode" placeholder="请输入模板编码" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="模板名称" prop="templateName">
            <el-input v-model="queryParams.templateName" placeholder="请输入模板名称" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="渠道" prop="channel">
            <el-select v-model="queryParams.channel" placeholder="请选择渠道" clearable style="width: 180px">
              <el-option v-for="c in CHANNEL_OPTIONS" :key="c.value" :label="c.label" :value="c.value" />
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
            <el-button v-hasPermi="['notify:template:add']" type="primary" plain icon="Plus" @click="handleAdd">新增</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button v-hasPermi="['notify:template:remove']" type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete()">
              删除
            </el-button>
          </el-col>
          <right-toolbar v-model:show-search="showSearch" @query-table="getList"></right-toolbar>
        </el-row>
      </template>

      <el-table v-loading="loading" :data="templateList" border @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="模板编码" align="center" prop="templateCode" width="180" :show-overflow-tooltip="true" />
        <el-table-column label="模板名称" align="center" prop="templateName" :show-overflow-tooltip="true" />
        <el-table-column label="渠道" align="center" width="130">
          <template #default="scope">
            <el-tag>{{ channelLabel(scope.row.channel) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="消息类型" align="center" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.msgType === 'MARKDOWN' ? 'warning' : 'info'">{{ scope.row.msgType }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="标题模板" align="center" prop="titleTemplate" :show-overflow-tooltip="true" />
        <el-table-column label="内容模板" align="center" prop="contentTemplate" :show-overflow-tooltip="true" />
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
        <el-table-column label="操作" align="center" width="200" class-name="small-padding fixed-width">
          <template #default="scope">
            <el-tooltip content="发送测试" placement="top">
              <el-button v-hasPermi="['notify:test:send']" link type="success" icon="Promotion" @click="handleTest(scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip content="修改" placement="top">
              <el-button v-hasPermi="['notify:template:edit']" link type="primary" icon="Edit" @click="handleUpdate(scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip content="删除" placement="top">
              <el-button v-hasPermi="['notify:template:remove']" link type="primary" icon="Delete" @click="handleDelete(scope.row)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>

      <pagination v-show="total > 0" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
    </el-card>

    <!-- 添加或修改模板对话框 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="720px" append-to-body>
      <el-form ref="templateFormRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="模板编码" prop="templateCode">
          <el-input v-model="form.templateCode" :disabled="form.id != null" placeholder="业务调用凭据，如 order_timeout_alert" />
        </el-form-item>
        <el-form-item label="模板名称" prop="templateName">
          <el-input v-model="form.templateName" placeholder="请输入模板名称" />
        </el-form-item>
        <el-form-item label="渠道" prop="channel">
          <el-select v-model="form.channel" placeholder="请选择渠道" style="width: 100%">
            <el-option v-for="c in CHANNEL_OPTIONS" :key="c.value" :label="c.label" :value="c.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="消息类型" prop="msgType">
          <el-select v-model="form.msgType" style="width: 160px">
            <el-option v-for="t in CHANNEL_MSG_TYPES[form.channel] || ['TEXT']" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="配置实例" prop="configKey">
          <el-input v-model="form.configKey" placeholder="留空使用渠道默认实例" />
        </el-form-item>
        <el-form-item label="标题模板" prop="titleTemplate">
          <el-input v-model="form.titleTemplate" placeholder="邮件主题 / Markdown 标题，支持 ${var} 占位" />
        </el-form-item>
        <el-form-item label="内容模板" prop="contentTemplate">
          <el-input v-model="form.contentTemplate" type="textarea" :rows="5" placeholder="内容模板，支持 ${var} 占位" />
        </el-form-item>
        <el-form-item label="参数定义" prop="paramSchema">
          <el-input
            v-model="form.paramSchema"
            type="textarea"
            :rows="3"
            placeholder='JSON 数组，如 [{"name":"orderNo","label":"订单号","required":true}]'
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio value="1">启用</el-radio>
            <el-radio value="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button :loading="buttonLoading" type="primary" @click="submitForm">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 发送测试对话框 -->
    <el-dialog v-model="testDialog.visible" title="发送测试" width="560px" append-to-body>
      <el-form ref="testFormRef" :model="testForm" :rules="testRules" label-width="90px">
        <el-form-item label="模板">
          <el-tag>{{ testForm.templateCode }}</el-tag>
          <el-tag type="info" class="ml2">{{ channelLabel(testForm.channel) }}</el-tag>
        </el-form-item>
        <el-form-item v-if="isRobotChannel(testForm.channel)" label="发送方式">
          <el-alert type="info" :closable="false" title="群机器人渠道直接发送到群，无需接收者" />
        </el-form-item>
        <el-form-item v-else :label="targetLabel(testForm.channel)" prop="target">
          <el-input
            v-model="testForm.target"
            :placeholder="TARGET_PLACEHOLDER[testForm.channel] || '接收目标'"
            clearable
            @blur="normalizeTargetInput"
          />
          <div v-if="isMobileTargetChannel(testForm.channel)" class="test-target-tip">
            填写用户在{{ testForm.channel === 'DING_APP' ? '钉钉' : '企业微信' }}通讯录中的手机号，后端将据此查询 userid 后发送，无需填写 userid
          </div>
        </el-form-item>
        <el-form-item v-for="p in testParams" :key="p.name" :label="p.label || p.name">
          <el-input v-model="testForm.params[p.name]" :placeholder="p.name" />
        </el-form-item>
        <el-form-item v-if="testResults.length" label="结果">
          <div style="width: 100%">
            <el-alert
              v-for="(r, i) in testResults"
              :key="i"
              :type="r.success ? 'success' : 'error'"
              :closable="false"
              :title="`${r.success ? '发送成功' : '发送失败'}（${r.costMs}ms）${r.errorCode ? ' [' + r.errorCode + ']' : ''}${r.errorMsg ? '：' + r.errorMsg : ''}`"
              class="mb2"
            />
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button :loading="testLoading" type="primary" @click="submitTest">发 送</el-button>
          <el-button @click="testDialog.visible = false">关 闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="NotifyTemplate" lang="ts">
import { listTemplate, getTemplate, delTemplate, addTemplate, updateTemplate, changeTemplateStatus } from '@/api/notify/template';
import { TemplateVO, TemplateForm, TemplateQuery } from '@/api/notify/template/types';
import { testSend, TestSendResult } from '@/api/notify/testSend';
import {
  CHANNEL_OPTIONS,
  CHANNEL_MSG_TYPES,
  TARGET_PLACEHOLDER,
  channelLabel,
  ROBOT_CHANNELS,
  isMobileTargetChannel,
  targetLabel,
  validateTarget
} from '@/views/notify/constants';

interface ParamDef {
  name: string;
  label?: string;
  required?: boolean;
}

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const { hasPermi } = proxy?.usePermission() || { hasPermi: () => true };

const templateList = ref<TemplateVO[]>([]);
const buttonLoading = ref(false);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref<Array<string | number>>([]);
const multiple = ref(true);
const total = ref(0);

const queryFormRef = ref<ElFormInstance>();
const templateFormRef = ref<ElFormInstance>();

const dialog = reactive<DialogOption>({ visible: false, title: '' });
const testDialog = reactive<DialogOption>({ visible: false, title: '' });

const initFormData: TemplateForm = {
  id: undefined,
  templateCode: undefined,
  templateName: undefined,
  channel: undefined,
  configKey: undefined,
  msgType: 'TEXT',
  titleTemplate: undefined,
  contentTemplate: undefined,
  paramSchema: undefined,
  status: '1',
  remark: undefined
};

const data = reactive<PageData<TemplateForm, TemplateQuery>>({
  form: { ...initFormData },
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    templateCode: undefined,
    templateName: undefined,
    channel: undefined,
    status: undefined
  },
  rules: {
    templateCode: [
      { required: true, message: '模板编码不能为空', trigger: 'blur' },
      { pattern: /^[A-Za-z0-9_]+$/, message: '仅允许字母、数字、下划线', trigger: 'blur' }
    ],
    templateName: [{ required: true, message: '模板名称不能为空', trigger: 'blur' }],
    channel: [{ required: true, message: '渠道不能为空', trigger: 'change' }],
    contentTemplate: [{ required: true, message: '内容模板不能为空', trigger: 'blur' }]
  }
});

const { queryParams, form, rules } = toRefs(data);

const testForm = reactive({
  templateCode: '',
  channel: '',
  msgType: 'TEXT',
  target: '',
  params: {} as Record<string, any>
});
const testParams = ref<ParamDef[]>([]);
const testLoading = ref(false);
const testResults = ref<TestSendResult[]>([]);
const testFormRef = ref<ElFormInstance>();

const hasEditPermi = computed(() => hasPermi('notify:template:edit'));
const isRobotChannel = (channel?: string) => ROBOT_CHANNELS.includes(channel || '');

/** 发送测试校验规则：接收目标按渠道语义校验（手机号格式/必填） */
const testRules = computed<ElFormRules>(() => ({
  target: isRobotChannel(testForm.channel)
    ? []
    : [
        {
          validator: (_rule: any, value: string, callback: (error?: Error) => void) => {
            const message = validateTarget(testForm.channel, value);
            callback(message ? new Error(message) : undefined);
          },
          trigger: 'blur'
        }
      ]
}));

/** 输入去除首尾空白，避免手机号/邮箱前后空格导致查询失败 */
const normalizeTargetInput = () => {
  testForm.target = (testForm.target || '').trim();
};

const getList = async () => {
  loading.value = true;
  const res = await listTemplate(queryParams.value);
  templateList.value = res.rows;
  total.value = res.total;
  loading.value = false;
};

const cancel = () => {
  reset();
  dialog.visible = false;
};

const reset = () => {
  form.value = { ...initFormData };
  templateFormRef.value?.resetFields();
};

const handleQuery = () => {
  queryParams.value.pageNum = 1;
  getList();
};

const resetQuery = () => {
  queryFormRef.value?.resetFields();
  handleQuery();
};

const handleSelectionChange = (selection: TemplateVO[]) => {
  ids.value = selection.map((item) => item.id);
  multiple.value = !selection.length;
};

const handleAdd = () => {
  reset();
  dialog.visible = true;
  dialog.title = '新增消息模板';
};

const handleUpdate = async (row?: TemplateVO) => {
  reset();
  const _id = row?.id || ids.value[0];
  const res = await getTemplate(_id);
  Object.assign(form.value, res.data);
  dialog.visible = true;
  dialog.title = '修改消息模板';
};

const submitForm = () => {
  templateFormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      if (form.value.paramSchema) {
        try {
          JSON.parse(form.value.paramSchema);
        } catch (e) {
          proxy?.$modal.msgError('参数定义必须是合法的 JSON 数组');
          return;
        }
      }
      buttonLoading.value = true;
      try {
        if (form.value.id) {
          await updateTemplate(form.value);
          proxy?.$modal.msgSuccess('修改成功');
        } else {
          await addTemplate(form.value);
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

const handleDelete = async (row?: TemplateVO) => {
  const _ids = row?.id || ids.value;
  await proxy?.$modal.confirm('是否确认删除消息模板编号为"' + _ids + '"的数据项？');
  await delTemplate(_ids);
  proxy?.$modal.msgSuccess('删除成功');
  await getList();
};

const handleStatusChange = async (row: TemplateVO) => {
  const text = row.status === '1' ? '启用' : '停用';
  try {
    await proxy?.$modal.confirm('确认要"' + text + '"该模板吗？');
    await changeTemplateStatus(row.id, row.status);
    proxy?.$modal.msgSuccess(text + '成功');
  } catch (err) {
    row.status = row.status === '1' ? '0' : '1';
  }
};

const handleTest = (row: TemplateVO) => {
  testForm.templateCode = row.templateCode;
  testForm.channel = row.channel;
  testForm.msgType = row.msgType || 'TEXT';
  testForm.target = '';
  testForm.params = {};
  testResults.value = [];
  try {
    testParams.value = row.paramSchema ? JSON.parse(row.paramSchema) : [];
  } catch (e) {
    testParams.value = [];
  }
  testFormRef.value?.clearValidate();
  testDialog.visible = true;
};

const submitTest = async () => {
  const valid = await testFormRef.value?.validate().catch(() => false);
  if (!valid) {
    return;
  }
  normalizeTargetInput();
  testLoading.value = true;
  try {
    const res = await testSend({
      templateCode: testForm.templateCode,
      target: testForm.target,
      // 接收方按"手机号"语义下发（仅企微/钉钉应用渠道生效，后端据此换取 userid）
      targetMode: isMobileTargetChannel(testForm.channel) ? 'MOBILE' : 'DIRECT',
      params: testForm.params
    });
    testResults.value = res.data;
  } finally {
    testLoading.value = false;
  }
};

onMounted(() => {
  getList();
});
</script>

<style scoped lang="scss">
.test-target-tip {
  width: 100%;
  font-size: 12px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
}
</style>
