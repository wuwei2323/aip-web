<template>
  <div class="p-2">
    <transition :enter-active-class="proxy?.animate.searchAnimate.enter" :leave-active-class="proxy?.animate.searchAnimate.leave">
      <div v-show="showSearch" class="search">
        <el-form ref="queryFormRef" :model="queryParams" :inline="true" label-width="85px">
          <el-form-item label="渠道" prop="channel">
            <el-select v-model="queryParams.channel" placeholder="请选择渠道" clearable style="width: 180px">
              <el-option v-for="c in CHANNEL_OPTIONS" :key="c.value" :label="c.label" :value="c.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="配置键" prop="configKey">
            <el-input v-model="queryParams.configKey" placeholder="请输入配置键" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="配置名称" prop="configName">
            <el-input v-model="queryParams.configName" placeholder="请输入配置名称" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="状态" prop="enabled">
            <el-select v-model="queryParams.enabled" placeholder="启用状态" clearable style="width: 120px">
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
            <el-button v-hasPermi="['notify:channelConfig:add']" type="primary" plain icon="Plus" @click="handleAdd">新增</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button v-hasPermi="['notify:channelConfig:remove']" type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete()">
              删除
            </el-button>
          </el-col>
          <right-toolbar v-model:show-search="showSearch" @query-table="getList"></right-toolbar>
        </el-row>
      </template>

      <el-table v-loading="loading" :data="configList" border @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" align="center" />
<!--        <el-table-column label="id" align="center" prop="id" width="180" :show-overflow-tooltip="true" />-->
        <el-table-column label="渠道" align="center" width="130">
          <template #default="scope">
            <el-tag>{{ channelLabel(scope.row.channel) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="配置键" align="center" prop="configKey" />
        <el-table-column label="配置名称" align="center" prop="configName" :show-overflow-tooltip="true" />
        <el-table-column label="默认" align="center" width="70">
          <template #default="scope">
            <el-tag v-if="scope.row.isDefault === '1'" type="success">是</el-tag>
            <el-tag v-else type="info">否</el-tag>
          </template>
        </el-table-column>
        <el-table-column key="enabled" label="启用" align="center" width="80">
          <template #default="scope">
            <el-switch v-model="scope.row.enabled" active-value="1" inactive-value="0" @change="handleStatusChange(scope.row)"></el-switch>
          </template>
        </el-table-column>
        <el-table-column label="配置内容(脱敏)" align="center" prop="config" :show-overflow-tooltip="true" />
        <el-table-column label="备注" align="center" prop="remark" :show-overflow-tooltip="true" />
        <el-table-column label="操作" align="center" width="260" class-name="small-padding fixed-width">
          <template #default="scope">
            <el-tooltip content="修改" placement="top">
              <el-button v-hasPermi="['notify:channelConfig:edit']" link type="primary" icon="Edit" @click="handleUpdate(scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip content="发送测试" placement="top">
              <el-button v-hasPermi="['notify:test:send']" link type="success" icon="Promotion" @click="handleTest(scope.row)"></el-button>
            </el-tooltip>
            <!-- 仅手机号寻址渠道（企微应用/钉钉工作通知）依赖通讯录快照 -->
            <template v-if="supportsDirectory(scope.row.channel)">
              <el-tooltip content="刷新通讯录" placement="top">
                <el-button
                  v-hasPermi="['notify:channelConfig:edit']"
                  link
                  type="warning"
                  icon="Refresh"
                  @click="handleRefreshDirectory(scope.row)"
                ></el-button>
              </el-tooltip>
              <el-tooltip content="快照状态" placement="top">
                <el-button
                  v-hasPermi="['notify:channelConfig:list']"
                  link
                  type="info"
                  icon="InfoFilled"
                  @click="handleDirectoryStatus(scope.row)"
                ></el-button>
              </el-tooltip>
            </template>
            <el-tooltip content="删除" placement="top">
              <el-button v-hasPermi="['notify:channelConfig:remove']" link type="primary" icon="Delete" @click="handleDelete(scope.row)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>

      <pagination v-show="total > 0" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
    </el-card>

    <!-- 添加或修改渠道配置对话框 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="640px" append-to-body>
      <el-form ref="configFormRef" :model="form" :rules="rules" label-width="110px">
        <el-form-item label="渠道" prop="channel">
          <el-select v-model="form.channel" placeholder="请选择渠道" style="width: 100%" :disabled="form.id != null">
            <el-option v-for="c in CHANNEL_OPTIONS" :key="c.value" :label="c.label" :value="c.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="配置键" prop="configKey">
          <el-input v-model="form.configKey" :disabled="form.id != null" placeholder="同渠道唯一，如 WECOM_ROBOT_ALARM" />
        </el-form-item>
        <el-form-item label="配置名称" prop="configName">
          <el-input v-model="form.configName" placeholder="如：运维告警群机器人" />
        </el-form-item>
        <el-form-item label="设为渠道默认" prop="isDefault">
          <el-switch v-model="form.isDefault" active-value="1" inactive-value="0" />
          <span class="ml2 text-gray-400 text-xs">未指定配置实例的消息将使用默认实例发送</span>
        </el-form-item>
        <el-form-item label="启用" prop="enabled">
          <el-switch v-model="form.enabled" active-value="1" inactive-value="0" />
        </el-form-item>

        <el-divider content-position="left">渠道配置（{{ channelLabel(form.channel) }}）</el-divider>
        <el-form-item
          v-for="field in currentFields"
          :key="field.prop"
          :label="field.label"
          :prop="'configFields.' + field.prop"
          :rules="field.required ? [{ required: true, message: `${field.label}不能为空`, trigger: 'blur' }] : []"
        >
          <el-switch v-if="field.type === 'switch'" v-model="form.configFields[field.prop]" />
          <el-input-number
            v-else-if="field.type === 'number'"
            v-model="form.configFields[field.prop]"
            :controls="false"
            style="width: 100%"
            :placeholder="field.placeholder"
          />
          <el-select
            v-else-if="field.type === 'select'"
            v-model="form.configFields[field.prop]"
            :placeholder="field.placeholder || '请选择'"
            filterable
            allow-create
            default-first-option
            clearable
            style="width: 100%"
          >
            <el-option v-for="opt in field.options || []" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
          <el-input
            v-else
            v-model="form.configFields[field.prop]"
            :type="field.type === 'password' ? 'password' : 'text'"
            :show-password="field.type === 'password'"
            :placeholder="field.placeholder || (field.type === 'password' ? '留空保持不变' : '')"
            clearable
          />
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

    <!-- 发送测试对话框 -->
    <el-dialog v-model="testDialog.visible" title="发送测试" width="560px" append-to-body>
      <el-form ref="testFormRef" :model="testForm" :rules="testRules" label-width="90px">
        <el-form-item label="渠道实例">
          <el-tag>{{ testForm.configKey }}</el-tag>
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
        <el-form-item label="消息类型">
          <el-select v-model="testForm.msgType" style="width: 160px">
            <el-option v-for="t in CHANNEL_MSG_TYPES[testForm.channel] || ['TEXT']" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="testForm.title" placeholder="邮件主题 / Markdown 标题（可选）" />
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input v-model="testForm.content" type="textarea" :rows="4" placeholder="消息内容" />
        </el-form-item>
        <el-form-item v-if="testForm.channel === 'SMS'" label="模板参数">
          <div style="width: 100%">
            <div v-for="(p, i) in paramRows" :key="i" class="param-row">
              <el-input v-model="p.key" placeholder="参数名，如 code" class="param-key" />
              <el-input v-model="p.value" placeholder="参数值，如 123456" class="param-value" />
              <el-button link type="danger" icon="Delete" @click="removeParamRow(i)" />
            </div>
            <el-button link type="primary" icon="Plus" @click="addParamRow">添加参数</el-button>
            <div class="test-target-tip">
              键名需与厂商短信模板中的变量一致（阿里云 ${code} 填 code，腾讯云 {1} 填 1）；
              渠道配置了「厂商模板ID」时按模板+参数下发，未配置时忽略参数、直接发送内容
            </div>
          </div>
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

<script setup name="NotifyChannelConfig" lang="ts">
import {
  listChannelConfig,
  getChannelConfig,
  delChannelConfig,
  addChannelConfig,
  updateChannelConfig,
  changeChannelStatus
} from '@/api/notify/channelConfig';
import { ChannelConfigVO, ChannelConfigForm, ChannelConfigQuery } from '@/api/notify/channelConfig/types';
import { testSend, TestSendResult } from '@/api/notify/testSend';
import { refreshDirectory, getDirectoryStatus } from '@/api/notify/directory';
import { DirectoryStatusVO } from '@/api/notify/directory/types';
import {
  CHANNEL_OPTIONS,
  CHANNEL_MSG_TYPES,
  TARGET_PLACEHOLDER,
  channelLabel,
  ROBOT_CHANNELS,
  isMobileTargetChannel,
  supportsDirectory,
  targetLabel,
  validateTarget
} from '@/views/notify/constants';

interface ConfigFieldDef {
  prop: string;
  label: string;
  type?: 'text' | 'password' | 'number' | 'switch' | 'select';
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
}

/** 各渠道配置表单字段定义 */
const CHANNEL_FORM_SCHEMAS: Record<string, ConfigFieldDef[]> = {
  MAIL: [
    { prop: 'host', label: 'SMTP服务器', required: true },
    { prop: 'port', label: '端口', type: 'number', required: true },
    { prop: 'ssl', label: 'SSL(465)', type: 'switch' },
    { prop: 'starttls', label: 'STARTTLS(587)', type: 'switch' },
    { prop: 'user', label: '登录账号', required: true },
    { prop: 'password', label: '密码/授权码', type: 'password', required: true },
    { prop: 'from', label: '发件人地址', required: true },
    { prop: 'fromName', label: '发件人名称' }
  ],
  WECOM_ROBOT: [{ prop: 'webhookUrl', label: 'Webhook地址', required: true }],
  WECOM_APP: [
    { prop: 'corpId', label: '企业ID', required: true, placeholder: 'corpid' },
    { prop: 'agentId', label: '应用ID', type: 'number', required: true, placeholder: 'agentid' },
    { prop: 'corpSecret', label: '应用密钥', type: 'password', required: true, placeholder: 'corpsecret' }
  ],
  DING_ROBOT: [
    { prop: 'webhookUrl', label: 'Webhook地址', required: true },
    { prop: 'secret', label: '加签密钥', type: 'password', placeholder: 'SEC 开头；为空则不加签' },
    { prop: 'keyword', label: '自定义关键词', placeholder: '安全模式为关键词时填写' }
  ],
  DING_APP: [
    { prop: 'appKey', label: 'AppKey', required: true },
    { prop: 'appSecret', label: 'AppSecret', type: 'password', required: true },
    { prop: 'agentId', label: 'AgentId', type: 'number', required: true }
  ]
};

/** 短信厂商可选列表（value 对应 SMS4J 厂商包名，后端 SmsSupplierRegistry 据此反射解析配置类） */
const SMS_SUPPLIER_OPTIONS = [
  { value: 'alibaba', label: '阿里云' },
  { value: 'tencent', label: '腾讯云' },
  { value: 'huawei', label: '华为云' },
  { value: 'jdcloud', label: '京东云' },
  { value: 'ctyun', label: '天翼云' },
  { value: 'yunpian', label: '云片' },
  { value: 'cloopen', label: '容联云' },
  { value: 'baidu', label: '百度智能云' },
  { value: 'netease', label: '网易云信' },
  { value: 'qiniu', label: '七牛云' },
  { value: 'submail', label: 'SUBMAIL' },
  { value: 'unisms', label: '一信通 UniSMS' },
  { value: 'emay', label: '亿美软通' },
  { value: 'chuanglan', label: '创蓝' },
  { value: 'luosimao', label: '螺丝帽' }
];

/** 短信渠道基础字段（所有厂商通用；accessKeyId/Secret 在不同厂商对应 SecretId/SecretKey/ApiKey 等） */
const SMS_BASE_FIELDS: ConfigFieldDef[] = [
  { prop: 'supplier', label: '厂商标识', type: 'select', required: true, options: SMS_SUPPLIER_OPTIONS, placeholder: '选择或输入厂商标识' },
  { prop: 'accessKeyId', label: 'AccessKeyId', required: true, placeholder: '腾讯云 SecretId / 华为 ak / 云片 apikey 等' },
  { prop: 'accessKeySecret', label: 'AccessKeySecret', type: 'password', required: true, placeholder: '对应 Secret/密钥' },
  { prop: 'signature', label: '短信签名', required: true, placeholder: '短信签名（需在厂商后台报备）' },
  { prop: 'templateId', label: '厂商模板ID', placeholder: '配置后按模板+变量发送，不配置则直发内容' },
  { prop: 'weight', label: '权重', type: 'number', placeholder: '多实例负载权重，缺省 1' }
];

/** 各厂商专属字段（随 supplier 动态展示；未列出的厂商仅用基础字段即可，后端按 JSON 全字段透传） */
const SMS_EXTRA_FIELDS: Record<string, ConfigFieldDef[]> = {
  tencent: [
    { prop: 'sdkAppId', label: 'SDK AppID', required: true, placeholder: '腾讯云控制台「应用管理」里的 SDKAppID' },
    { prop: 'territory', label: '地域', placeholder: '缺省 ap-guangzhou' }
  ],
  alibaba: [
    { prop: 'regionId', label: '地域', placeholder: '缺省 cn-hangzhou' }
  ],
  huawei: [
    { prop: 'sender', label: '发送通道号', placeholder: '华为云短信签名通道号（sender）' },
    { prop: 'statusCallBack', label: '状态回调地址', placeholder: '可选' }
  ],
  jdcloud: [
    { prop: 'region', label: '地域', required: true, placeholder: '如 cn-north-1' }
  ]
};

const { proxy } = getCurrentInstance() as ComponentInternalInstance;

const configList = ref<ChannelConfigVO[]>([]);
const buttonLoading = ref(false);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref<Array<string | number>>([]);
const multiple = ref(true);
const total = ref(0);

const queryFormRef = ref<ElFormInstance>();
const configFormRef = ref<ElFormInstance>();

const dialog = reactive<DialogOption>({
  visible: false,
  title: ''
});
const testDialog = reactive<DialogOption>({
  visible: false,
  title: ''
});

const initFormData: ChannelConfigForm & { configFields: Record<string, any> } = {
  id: undefined,
  channel: undefined,
  configKey: undefined,
  configName: undefined,
  isDefault: '0',
  enabled: '1',
  config: undefined,
  remark: undefined,
  configFields: {}
};

const data = reactive<PageData<typeof initFormData, ChannelConfigQuery>>({
  form: { ...initFormData, configFields: {} },
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    channel: undefined,
    configKey: undefined,
    configName: undefined,
    enabled: undefined
  },
  rules: {
    channel: [{ required: true, message: '渠道不能为空', trigger: 'change' }],
    configKey: [
      { required: true, message: '配置键不能为空', trigger: 'blur' },
      { pattern: /^[A-Za-z0-9_]+$/, message: '仅允许字母、数字、下划线', trigger: 'blur' }
    ],
    configName: [{ required: true, message: '配置名称不能为空', trigger: 'blur' }]
  }
});

const { queryParams, form, rules } = toRefs(data);

const isRobotChannel = (channel?: string) => ROBOT_CHANNELS.includes(channel || '');

/** 测试发送表单 */
const testForm = reactive({
  channel: '',
  configKey: '',
  msgType: 'TEXT',
  title: '',
  content: '',
  target: ''
});
const testLoading = ref(false);
const testResults = ref<TestSendResult[]>([]);
const testFormRef = ref<ElFormInstance>();

/** 短信模板参数（动态键值对，键名对应厂商模板变量） */
const paramRows = ref<{ key: string; value: string }[]>([]);

const addParamRow = () => {
  paramRows.value.push({ key: '', value: '' });
};

const removeParamRow = (index: number) => {
  paramRows.value.splice(index, 1);
};

/** 收集非空参数为 Map（键名去空白，空键忽略；值允许空串） */
const collectParams = (): Record<string, string> => {
  const params: Record<string, string> = {};
  for (const { key, value } of paramRows.value) {
    const name = (key || '').trim();
    if (name) {
      params[name] = value ?? '';
    }
  }
  return params;
};

/** 发送测试校验规则：内容必填；接收目标按渠道语义校验（手机号格式/必填） */
const testRules = computed<ElFormRules>(() => ({
  content: [{ required: true, message: '请填写消息内容', trigger: 'blur' }],
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

/** 当前渠道的表单字段（短信按 supplier 动态叠加厂商专属字段） */
const currentFields = computed<ConfigFieldDef[]>(() => {
  if (form.value.channel === 'SMS') {
    const supplier = String(form.value.configFields?.supplier || '').trim().toLowerCase();
    return [...SMS_BASE_FIELDS, ...(SMS_EXTRA_FIELDS[supplier] || [])];
  }
  return CHANNEL_FORM_SCHEMAS[form.value.channel || ''] || [];
});

/** 查询列表 */
const getList = async () => {
  loading.value = true;
  const res = await listChannelConfig(queryParams.value);
  configList.value = res.rows;
  total.value = res.total;
  loading.value = false;
};

const cancel = () => {
  reset();
  dialog.visible = false;
};

const reset = () => {
  form.value = { ...initFormData, configFields: {} };
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

const handleSelectionChange = (selection: ChannelConfigVO[]) => {
  ids.value = selection.map((item) => item.id);
  multiple.value = !selection.length;
};

const handleAdd = () => {
  reset();
  dialog.visible = true;
  dialog.title = '新增渠道配置';
};

const handleUpdate = async (row?: ChannelConfigVO) => {
  reset();
  const _id = row?.id || ids.value[0];
  const res = await getChannelConfig(_id);
  const configFields: Record<string, any> = {};
  if (res.data.config) {
    try {
      Object.assign(configFields, JSON.parse(res.data.config));
    } catch (e) {
      /* 配置非JSON则忽略 */
    }
  }
  form.value = { ...res.data, configFields };
  dialog.visible = true;
  dialog.title = '修改渠道配置';
};

/** 提交（敏感字段掩码值剔除，由后端合并保留原密钥） */
const submitForm = () => {
  configFormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      buttonLoading.value = true;
      const configFields: Record<string, any> = {};
      for (const [k, v] of Object.entries(form.value.configFields || {})) {
        if (v === '******' || v === '' || v === null || v === undefined) continue;
        configFields[k] = v;
      }
      const submitData: ChannelConfigForm = {
        ...form.value,
        config: Object.keys(configFields).length > 0 ? JSON.stringify(configFields) : ''
      };
      try {
        if (submitData.id) {
          await updateChannelConfig(submitData);
          proxy?.$modal.msgSuccess('修改成功');
        } else {
          await addChannelConfig(submitData);
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

const handleDelete = async (row?: ChannelConfigVO) => {
  const _ids = row?.id || ids.value;
  await proxy?.$modal.confirm('是否确认删除渠道配置编号为"' + _ids + '"的数据项？');
  await delChannelConfig(_ids);
  proxy?.$modal.msgSuccess('删除成功');
  await getList();
};

const handleStatusChange = async (row: ChannelConfigVO) => {
  const text = row.enabled === '1' ? '启用' : '停用';
  try {
    await proxy?.$modal.confirm('确认要"' + text + '"该渠道配置吗？');
    await changeChannelStatus(row.id, row.enabled);
    proxy?.$modal.msgSuccess(text + '成功');
  } catch (err) {
    row.enabled = row.enabled === '1' ? '0' : '1';
  }
};

/**
 * 刷新通讯录快照（企微应用 / 钉钉工作通知的手机号寻址依赖它）
 * <p>
 * 全量拉取耗时随企业规模增长（万人规模需数秒到数十秒），期间按钮保持 loading，
 * 刷新完成后把索引人数与"手机号被隐藏人数"回报给运维。
 */
const handleRefreshDirectory = async (row: ChannelConfigVO) => {
  proxy?.$modal.loading('正在拉取企业通讯录，请稍候…');
  try {
    const res = await refreshDirectory(row.configKey);
    const status = res.data as DirectoryStatusVO;
    if (status.missingMobileCount > 0) {
      // 有成员拿不到手机号时必须显式告警，否则运维只会看到"人明明在通讯录里却查不到"
      proxy?.$modal.alertWarning(
        `通讯录刷新完成：已索引 ${status.userCount} 人，耗时 ${status.costMs}ms。` +
          `注意：有 ${status.missingMobileCount} 名成员未获取到手机号，无法用手机号寻址——` +
          `可能被平台隐藏（需改用 userid 直接投递），也可能通讯录中未填写（可由 HR 补录后重新刷新）。`
      );
    } else {
      proxy?.$modal.msgSuccess(`通讯录刷新完成：已索引 ${status.userCount} 人，耗时 ${status.costMs}ms`);
    }
  } finally {
    proxy?.$modal.closeLoading();
  }
};

/** 查看通讯录快照状态（尚未加载时不报错，仅提示需要刷新） */
const handleDirectoryStatus = async (row: ChannelConfigVO) => {
  const res = await getDirectoryStatus(row.configKey);
  const status = res.data as DirectoryStatusVO;
  if (!status.loaded) {
    proxy?.$modal.alert('通讯录快照尚未加载，请点击「刷新通讯录」触发拉取。');
    return;
  }
  proxy?.$modal.alert(
    `可寻址成员 ${status.userCount} 人；未获取到手机号 ${status.missingMobileCount} 人；` +
      `一号多账号 ${status.ambiguousCount} 个；加载时间 ${status.loadedAt || '-'}；` +
      `拉取耗时 ${status.costMs}ms`
  );
};

/** 打开发送测试 */
const handleTest = (row: ChannelConfigVO) => {
  testForm.channel = row.channel;
  testForm.configKey = row.configKey;
  testForm.msgType = 'TEXT';
  testForm.title = '消息模块测试';
  testForm.content = '这是一条来自 jcpt-notify 模块的测试消息';
  testForm.target = '';
  paramRows.value = [];
  testResults.value = [];
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
      channel: testForm.channel,
      configKey: testForm.configKey,
      msgType: testForm.msgType,
      title: testForm.title,
      content: testForm.content,
      target: testForm.target,
      // 接收方按"手机号"语义下发（仅企微/钉钉应用渠道生效，后端据此换取 userid）
      targetMode: isMobileTargetChannel(testForm.channel) ? 'MOBILE' : 'DIRECT',
      // 短信模板参数（后端透传到渠道 params，模板发送时作为模板变量）
      params: collectParams()
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

.param-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;

  .param-key {
    width: 38%;
  }

  .param-value {
    flex: 1;
  }
}
</style>
