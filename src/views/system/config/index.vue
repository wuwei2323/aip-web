<template>
  <div class="p-2">
    <transition :enter-active-class="proxy?.animate.searchAnimate.enter" :leave-active-class="proxy?.animate.searchAnimate.leave">
      <div v-show="showSearch" class="mb-[10px]">
        <el-card shadow="hover">
          <el-form ref="queryFormRef" :model="queryParams" :inline="true">
            <el-form-item label="参数名称" prop="configName">
              <el-input v-model="queryParams.configName" placeholder="请输入" clearable @keyup.enter="handleQuery" />
            </el-form-item>
            <el-form-item label="参数键名" prop="configKey">
              <el-input v-model="queryParams.configKey" placeholder="请输入" clearable @keyup.enter="handleQuery" />
            </el-form-item>
            <el-form-item label="创建时间" style="width: 308px">
              <el-date-picker
                v-model="dateRange"
                value-format="YYYY-MM-DD HH:mm:ss"
                type="daterange"
                range-separator="-"
                start-placeholder="开始时间"
                end-placeholder="结束时间"
                :default-time="[new Date(2000, 1, 1, 0, 0, 0), new Date(2000, 1, 1, 23, 59, 59)]"
              ></el-date-picker>
            </el-form-item>
            <el-form-item>
              <el-button @click="resetQuery">重置</el-button>
              <el-button type="primary" @click="handleQuery">搜索</el-button>
              <el-button link type="primary" @click="toggleSearch">
                {{ showSearch ? '收起' : '展开' }}
                <el-icon class="el-icon--right">
                  <ArrowUp v-if="showSearch" />
                  <ArrowDown v-else />
                </el-icon>
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </div>
    </transition>

    <el-card shadow="hover">
      <template #header>
        <div class="flex items-center justify-between flex-wrap gap-2">
          <!-- 应用Tag选项卡 -->
          <div>
            <el-radio-group v-model="currentAppId" @change="handleAppChange">
              <el-radio-button v-for="app in applicationOptions" :key="app.appId" :value="app.appId">
                {{ app.appName }}
              </el-radio-button>
            </el-radio-group>
          </div>

          <!-- 右侧操作按钮 -->
          <div class="flex items-center gap-[10px]">
            <el-button v-hasPermi="['system:config:remove']" @click="handleRefreshCache">刷新缓存</el-button>
            <el-button v-hasPermi="['system:config:export']" @click="handleExport">导出</el-button>
            <el-button v-hasPermi="['system:config:remove']" :disabled="multiple" @click="handleDelete()"> 删除 </el-button>
            <el-button v-hasPermi="['system:config:add']" type="primary" @click="handleAdd">新增</el-button>
            <right-toolbar v-model:show-search="showSearch" :search="false" @query-table="getList"></right-toolbar>
          </div>
        </div>
      </template>

      <el-table v-loading="loading" border :data="configList" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column v-if="false" label="参数主键" align="center" prop="configId" />
        <el-table-column label="参数名称" align="center" prop="configName" :show-overflow-tooltip="true" />
        <el-table-column label="参数键名" align="center" prop="configKey" :show-overflow-tooltip="true" />
        <el-table-column label="参数键值" align="center" prop="configValue" :show-overflow-tooltip="true" />
        <el-table-column label="备注" align="center" prop="remark" :show-overflow-tooltip="true" />
        <el-table-column label="创建时间" align="center" prop="createTime" width="180" sortable="custom">
          <template #default="scope">
            <span>{{ proxy.parseTime(scope.row.createTime) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center" width="150" class-name="small-padding fixed-width">
          <template #default="scope">
            <el-button v-hasPermi="['system:config:edit']" link type="primary" @click="handleUpdate(scope.row)">编辑</el-button>
            <el-button v-hasPermi="['system:config:remove']" link type="danger" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <pagination v-show="total > 0" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
    </el-card>

    <!-- 添加或修改参数配置对话框 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="520px" append-to-body>
      <el-form ref="configFormRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="参数名称" prop="configName">
          <el-input v-model="form.configName" placeholder="请输入" />
        </el-form-item>
        <el-form-item label="参数键名" prop="configKey">
          <el-input v-model="form.configKey" placeholder="请输入" />
        </el-form-item>
        <el-form-item label="参数键值" prop="configValue">
          <el-input v-model="form.configValue" placeholder="请输入" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="4" placeholder="请输入" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="cancel">取 消</el-button>
          <el-button type="primary" @click="submitForm">确 认</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="Config" lang="ts">
import { listConfig, getConfig, delConfig, addConfig, updateConfig, refreshCache } from '@/api/system/config';
import { ConfigForm, ConfigQuery, ConfigVO } from '@/api/system/config/types';
import { optionselectApplication, listApplication } from '@/api/system/application';
import { ApplicationVO } from '@/api/system/application/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;

const configList = ref<ConfigVO[]>([]);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref<Array<number | string>>([]);
const single = ref(true);
const multiple = ref(true);
const total = ref(0);
const dateRange = ref<[DateModelType, DateModelType]>(['', '']);

const applicationOptions = ref<ApplicationVO[]>([]);
const currentAppId = ref<string>('');

const queryFormRef = ref<ElFormInstance>();
const configFormRef = ref<ElFormInstance>();
const dialog = reactive<DialogOption>({
  visible: false,
  title: ''
});

const initFormData: ConfigForm = {
  configId: undefined,
  configName: '',
  configKey: '',
  configValue: '',
  configType: 'N',
  remark: '',
  appId: ''
};

const data = reactive<PageData<ConfigForm, ConfigQuery>>({
  form: { ...initFormData },
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    configName: '',
    configKey: '',
    configType: '',
    appId: ''
  },
  rules: {
    configName: [{ required: true, message: '参数名称不能为空', trigger: 'blur' }],
    configKey: [{ required: true, message: '参数键名不能为空', trigger: 'blur' }],
    configValue: [{ required: true, message: '参数键值不能为空', trigger: 'blur' }]
  }
});

const { queryParams, form, rules } = toRefs(data);

/** 切换搜索区域显示/隐藏 */
const toggleSearch = () => {
  showSearch.value = !showSearch.value;
};

/** 获取应用列表 */
const getAppList = async () => {
  try {
    const res = await optionselectApplication();
    applicationOptions.value = res.data || [];
  } catch {
    try {
      const res = await listApplication({ pageNum: 1, pageSize: 1000 });
      applicationOptions.value = res.rows || [];
    } catch {
      applicationOptions.value = [];
    }
  }
  if (applicationOptions.value.length > 0) {
    currentAppId.value = applicationOptions.value[0].appId;
    queryParams.value.appId = currentAppId.value;
  }
  getList();
};

/** 查询参数列表 */
const getList = async () => {
  loading.value = true;
  queryParams.value.appId = currentAppId.value;
  const res = await listConfig(proxy?.addDateRange(queryParams.value, dateRange.value));
  configList.value = res.rows;
  total.value = res.total;
  loading.value = false;
};

/** 切换应用 */
const handleAppChange = (val: string | number | boolean | undefined) => {
  const appId = String(val || '');
  currentAppId.value = appId;
  queryParams.value.appId = appId;
  queryParams.value.pageNum = 1;
  getList();
};

/** 取消按钮 */
const cancel = () => {
  reset();
  dialog.visible = false;
};

/** 表单重置 */
const reset = () => {
  form.value = { ...initFormData, appId: currentAppId.value };
  configFormRef.value?.resetFields();
};

/** 搜索按钮操作 */
const handleQuery = () => {
  queryParams.value.pageNum = 1;
  getList();
};

/** 重置按钮操作 */
const resetQuery = () => {
  dateRange.value = ['', ''];
  queryFormRef.value?.resetFields();
  queryParams.value.appId = currentAppId.value;
  handleQuery();
};

/** 多选框选中数据 */
const handleSelectionChange = (selection: ConfigVO[]) => {
  ids.value = selection.map((item) => item.configId);
  single.value = selection.length != 1;
  multiple.value = !selection.length;
};

/** 新增按钮操作 */
const handleAdd = () => {
  reset();
  form.value.appId = currentAppId.value;
  form.value.configType = 'N';
  dialog.visible = true;
  dialog.title = '新增';
};

/** 修改按钮操作 */
const handleUpdate = async (row?: ConfigVO) => {
  reset();
  const configId = row?.configId || ids.value[0];
  const res = await getConfig(configId);
  Object.assign(form.value, res.data);
  dialog.visible = true;
  dialog.title = '修改';
};

/** 提交按钮 */
const submitForm = () => {
  configFormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      if (!form.value.configId) {
        form.value.appId = currentAppId.value;
        form.value.configType = 'N';
      }
      form.value.configId ? await updateConfig(form.value) : await addConfig(form.value);
      proxy?.$modal.msgSuccess('操作成功');
      dialog.visible = false;
      await getList();
    }
  });
};

/** 删除按钮操作 */
const handleDelete = async (row?: ConfigVO) => {
  const configIds = row?.configId || ids.value;
  await proxy?.$modal.confirm('是否确认删除参数编号为"' + configIds + '"的数据项？');
  await delConfig(configIds);
  await getList();
  proxy?.$modal.msgSuccess('删除成功');
};

/** 导出按钮操作 */
const handleExport = () => {
  queryParams.value.appId = currentAppId.value;
  proxy?.download(
    'system/config/export',
    {
      ...queryParams.value
    },
    `config_${new Date().getTime()}.xlsx`
  );
};

/** 刷新缓存按钮操作 */
const handleRefreshCache = async () => {
  await refreshCache();
  proxy?.$modal.msgSuccess('刷新缓存成功');
};

onMounted(() => {
  getAppList();
});
</script>
