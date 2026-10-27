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
          <el-form-item label="发送状态" prop="sendStatus">
            <el-select v-model="queryParams.sendStatus" placeholder="请选择状态" clearable style="width: 120px">
              <el-option v-for="s in SEND_STATUS_OPTIONS" :key="s.value" :label="s.label" :value="s.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="消息主题" prop="theme">
            <el-input v-model="queryParams.theme" placeholder="请输入消息主题" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="模板编码" prop="templateCode">
            <el-input v-model="queryParams.templateCode" placeholder="请输入模板编码" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="调用方" prop="appId">
            <el-input v-model="queryParams.appId" placeholder="请输入调用方应用ID" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="业务类型" prop="bizType">
            <el-input v-model="queryParams.bizType" placeholder="如 ORDER / ALERT" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="目标" prop="receiverTarget">
            <el-input v-model="queryParams.receiverTarget" placeholder="邮箱/手机号/userid" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="时间范围" prop="dateRange">
            <el-date-picker
              v-model="dateRange"
              type="datetimerange"
              value-format="YYYY-MM-DD HH:mm:ss"
              range-separator="至"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
              style="width: 340px"
            />
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
            <el-button v-hasPermi="['notify:sendLog:export']" type="warning" plain icon="Download" @click="handleExport">导出</el-button>
          </el-col>
          <right-toolbar v-model:show-search="showSearch" @query-table="getList"></right-toolbar>
        </el-row>
      </template>

      <el-table v-loading="loading" :data="logList" border>
        <el-table-column label="消息ID" align="center" prop="id" width="180" :show-overflow-tooltip="true" />
        <el-table-column label="消息主题" align="center" prop="theme" width="160" :show-overflow-tooltip="true">
          <template #default="scope">
            <el-tag v-if="scope.row.theme" type="warning">{{ scope.row.theme }}</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="调用方" align="center" prop="appId" width="130" :show-overflow-tooltip="true">
          <template #default="scope">
            <span>{{ scope.row.appId || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="模板编码" align="center" prop="templateCode" width="150" :show-overflow-tooltip="true" />
        <el-table-column label="渠道" align="center" width="130">
          <template #default="scope">
            <el-tag>{{ channelLabel(scope.row.channel) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="目标" align="center" prop="receiverTarget" :show-overflow-tooltip="true" />
        <el-table-column label="状态" align="center" width="90">
          <template #default="scope">
            <el-tag :type="sendStatusType(scope.row.sendStatus) as any">{{ sendStatusLabel(scope.row.sendStatus) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="重试" align="center" width="70">
          <template #default="scope">{{ scope.row.retryCount }}/{{ scope.row.maxRetry }}</template>
        </el-table-column>
        <el-table-column label="耗时(ms)" align="center" prop="costMs" width="90" />
        <el-table-column label="业务类型" align="center" prop="bizType" width="110" />
        <el-table-column label="发送时间" align="center" width="160">
          <template #default="scope">
            <span>{{ proxy.parseTime(scope.row.sendTime || scope.row.createTime) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center" width="140" class-name="small-padding fixed-width">
          <template #default="scope">
            <el-tooltip content="详情" placement="top">
              <el-button v-hasPermi="['notify:sendLog:query']" link type="primary" icon="View" @click="handleDetail(scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip content="重发" placement="top">
              <el-button v-hasPermi="['notify:sendLog:resend']" link type="warning" icon="Refresh" @click="handleResend(scope.row)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>

      <pagination v-show="total > 0" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
    </el-card>

    <!-- 详情抽屉 -->
    <el-drawer v-model="detailVisible" title="发送日志详情" size="45%">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="消息ID">{{ detail.id }}</el-descriptions-item>
        <el-descriptions-item label="消息主题">{{ detail.theme || '-' }}</el-descriptions-item>
        <el-descriptions-item label="调用方应用">{{ detail.appId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="模板编码">{{ detail.templateCode || '-' }}</el-descriptions-item>
        <el-descriptions-item label="渠道">{{ channelLabel(detail.channel) }}</el-descriptions-item>
        <el-descriptions-item label="配置实例">{{ detail.configKey || '-' }}</el-descriptions-item>
        <el-descriptions-item label="消息类型">{{ detail.msgType || '-' }}</el-descriptions-item>
        <el-descriptions-item label="目标">{{ detail.receiverTarget || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="sendStatusType(detail.sendStatus) as any">{{ sendStatusLabel(detail.sendStatus) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="重试次数">{{ detail.retryCount }}/{{ detail.maxRetry }}</el-descriptions-item>
        <el-descriptions-item label="耗时(ms)">{{ detail.costMs }}</el-descriptions-item>
        <el-descriptions-item label="第三方消息ID">{{ detail.providerMsgId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="业务类型">{{ detail.bizType || '-' }} / {{ detail.bizId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="发送时间">{{ proxy.parseTime(detail.sendTime) }}</el-descriptions-item>
        <el-descriptions-item label="标题">{{ detail.title || '-' }}</el-descriptions-item>
        <el-descriptions-item label="内容">{{ detail.content || '-' }}</el-descriptions-item>
        <el-descriptions-item v-if="detail.errorMsg" label="错误信息">
          <span class="text-red-500">{{ detail.errorMsg }}</span>
        </el-descriptions-item>
        <el-descriptions-item v-if="detail.errorStack" label="错误堆栈">
          <pre class="text-xs text-gray-500" style="white-space: pre-wrap; word-break: break-all">{{ detail.errorStack }}</pre>
        </el-descriptions-item>
      </el-descriptions>
    </el-drawer>
  </div>
</template>

<script setup name="NotifySendLog" lang="ts">
import { listSendLog, getSendLog, resendSendLog } from '@/api/notify/sendLog';
import { SendLogVO, SendLogQuery } from '@/api/notify/sendLog/types';
import { CHANNEL_OPTIONS, SEND_STATUS_OPTIONS, channelLabel, sendStatusType, sendStatusLabel } from '@/views/notify/constants';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;

const logList = ref<SendLogVO[]>([]);
const loading = ref(true);
const showSearch = ref(true);
const total = ref(0);
const dateRange = ref<[string, string] | null>(null);
const detailVisible = ref(false);
const detail = ref<SendLogVO>({});

const queryFormRef = ref<ElFormInstance>();

const data = reactive<PageData<object, SendLogQuery>>({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    channel: undefined,
    sendStatus: undefined,
    templateCode: undefined,
    theme: undefined,
    appId: undefined,
    receiverTarget: undefined,
    bizType: undefined,
    bizId: undefined
  },
  rules: {}
});

const { queryParams } = toRefs(data);

const getList = async () => {
  loading.value = true;
  const res = await listSendLog({
    ...queryParams.value,
    beginTime: dateRange.value?.[0],
    endTime: dateRange.value?.[1]
  });
  logList.value = res.rows;
  total.value = res.total;
  loading.value = false;
};

const handleQuery = () => {
  queryParams.value.pageNum = 1;
  getList();
};

const resetQuery = () => {
  queryFormRef.value?.resetFields();
  dateRange.value = null;
  handleQuery();
};

const handleDetail = async (row: SendLogVO) => {
  const res = await getSendLog(row.id);
  detail.value = res.data;
  detailVisible.value = true;
};

const handleResend = async (row: SendLogVO) => {
  await proxy?.$modal.confirm('确认按原内容与目标重发该消息吗？');
  await resendSendLog(row.id);
  proxy?.$modal.msgSuccess('重发已受理，请稍后刷新列表查看新日志');
  await getList();
};

const handleExport = () => {
  proxy?.download(
    'notify/sendLog/export',
    {
      ...queryParams.value,
      beginTime: dateRange.value?.[0],
      endTime: dateRange.value?.[1]
    },
    `notify_sendLog_${new Date().getTime()}.xlsx`
  );
};

onMounted(() => {
  getList();
});
</script>