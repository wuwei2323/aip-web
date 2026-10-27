<template>
  <div class="p-2">
    <el-row :gutter="16">
      <!-- 左侧：角色列表（对照图二） -->
      <el-col :xs="24" :lg="9">
        <el-card shadow="hover">
          <template #header>
            <div class="flex items-center justify-between">
              <span class="font-bold">角色列表</span>
              <div>
                <el-button v-hasPermi="['system:role:add']" type="primary" plain icon="Plus" size="small" @click="handleAdd">新增</el-button>
                <el-button v-hasPermi="['system:role:remove']" type="danger" plain icon="Delete" size="small" :disabled="ids.length === 0" @click="handleDelete()">删除</el-button>
              </div>
            </div>
          </template>

          <!-- 搜索：仅角色名称，隐藏权限字符 -->
          <el-form ref="queryFormRef" :model="queryParams" :inline="true" size="small">
            <el-form-item label="角色名称" prop="roleName">
              <el-input v-model="queryParams.roleName" placeholder="请输入角色名称" clearable @keyup.enter="handleQuery" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
              <el-button icon="Refresh" @click="resetQuery">重置</el-button>
            </el-form-item>
          </el-form>

          <!-- 表格：多选、角色名称、数据权限、排序 -->
          <el-table
            ref="roleTableRef"
            v-loading="loading"
            border
            :data="roleList"
            highlight-current-row
            @row-click="handleRoleRowClick"
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="45" align="center" />
            <el-table-column label="角色名称" prop="roleName" align="center" min-width="110" />
            <el-table-column label="数据权限" align="center" min-width="120">
              <template #default="scope">
                <el-tag size="small" :type="getDataScopeTagType(scope.row.dataScope)">
                  {{ getDataScopeLabel(scope.row.dataScope) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="排序" prop="roleSort" align="center" width="60" />
            <el-table-column label="操作" align="center" width="100">
              <template #default="scope">
                <el-tooltip v-if="scope.row.roleId !== 1" content="编辑基本信息" placement="top">
                  <el-button v-hasPermi="['system:role:edit']" link type="primary" icon="Edit" @click.stop="handleUpdate(scope.row)" />
                </el-tooltip>
                <el-tooltip v-if="scope.row.roleId !== 1" content="分配用户" placement="top">
                  <el-button v-hasPermi="['system:role:edit']" link type="primary" icon="User" @click.stop="handleAuthUser(scope.row)" />
                </el-tooltip>
                <el-tooltip v-if="scope.row.roleId !== 1" content="删除" placement="top">
                  <el-button v-hasPermi="['system:role:remove']" link type="primary" icon="Delete" @click.stop="handleDelete(scope.row)" />
                </el-tooltip>
              </template>
            </el-table-column>
          </el-table>

          <pagination
            v-if="total > 0"
            v-model:total="total"
            v-model:page="queryParams.pageNum"
            v-model:limit="queryParams.pageSize"
            @pagination="getList"
          />
        </el-card>
      </el-col>

      <!-- 右侧：选定角色的权限配置面板（对照图二） -->
      <el-col :xs="24" :lg="15">
        <el-card shadow="hover">
          <template #header>
            <div class="flex items-center justify-between">
              <span class="font-bold text-primary">
                {{ currentRole ? `【${currentRole.roleName}】权限配置` : '请在左侧选择要配置的角色' }}
              </span>
              <div v-if="currentRole">
                <el-button @click="resetRightConfig">取 消</el-button>
                <el-button type="primary" :loading="submitLoading" @click="submitRightConfig">确 认</el-button>
              </div>
            </div>
          </template>

          <div v-if="currentRole" v-loading="configLoading" style="max-height: calc(100vh - 210px); overflow-y: auto; padding-right: 8px;">
            <!-- 顶部应用切换（完全还原图一设计稿红框） -->
            <div v-if="appTabs.length" class="mb-4 pb-3 border-b border-gray-200">
              <div class="inline-flex rounded border border-gray-300 p-0.5 bg-gray-50">
                <button
                  v-for="group in appTabs"
                  :key="group.tenantId"
                  type="button"
                  class="px-4 py-1.5 text-xs font-medium rounded transition-colors"
                  :class="activeTenantId === group.tenantId ? 'bg-primary text-white shadow-sm' : 'text-gray-700 hover:text-primary'"
                  @click="handleAppTabChange(group.tenantId)"
                >
                  {{ group.tenantName || group.tenantId }}
                </button>
              </div>
            </div>

            <!-- 1. 菜单权限 -->
            <div class="mb-4">
              <div class="font-bold text-sm text-gray-700 mb-2 flex items-center justify-between">
                <span>菜单权限</span>
                <div class="text-xs">
                  <el-checkbox v-model="menuExpand" @change="handleCheckedTreeExpand($event, 'menu')">展开/折叠</el-checkbox>
                  <el-checkbox v-model="menuNodeAll" @change="handleCheckedTreeNodeAll($event, 'menu')">全选/全不选</el-checkbox>
                  <el-checkbox v-model="form.menuCheckStrictly" @change="handleCheckedTreeConnect($event, 'menu')">父子联动</el-checkbox>
                </div>
              </div>
              <el-tree
                ref="menuRef"
                class="tree-border"
                :data="menuOptions"
                show-checkbox
                node-key="id"
                :check-strictly="!form.menuCheckStrictly"
                empty-text="加载中，请稍候"
                :props="{ label: 'label', children: 'children' } as any"
              />
            </div>

            <el-divider />

            <!-- 2. 数据权限 -->
            <div class="mb-4">
              <div class="font-bold text-sm text-gray-700 mb-2">数据权限</div>
              <el-form-item label="数据范围" label-width="80px">
                <el-select v-model="form.dataScope" style="width: 100%" @change="dataScopeSelectChange">
                  <el-option v-for="item in dataScopeOptions" :key="item.value" :label="item.label" :value="item.value" />
                </el-select>
              </el-form-item>
              <div v-show="form.dataScope === '2'" class="mt-2 pl-2">
                <div class="text-xs mb-1">
                  <el-checkbox v-model="deptExpand" @change="handleCheckedTreeExpand($event, 'dept')">展开/折叠</el-checkbox>
                  <el-checkbox v-model="deptNodeAll" @change="handleCheckedTreeNodeAll($event, 'dept')">全选/全不选</el-checkbox>
                  <el-checkbox v-model="form.deptCheckStrictly" @change="handleCheckedTreeConnect($event, 'dept')">父子联动</el-checkbox>
                </div>
                <el-tree
                  ref="deptRef"
                  class="tree-border"
                  :data="deptOptions"
                  show-checkbox
                  default-expand-all
                  node-key="id"
                  :check-strictly="!form.deptCheckStrictly"
                  empty-text="加载中，请稍候"
                  :props="{ label: 'label', children: 'children' } as any"
                />
              </div>
            </div>

            <el-divider />

            <!-- 3. 自定义权限（完全还原图一设计稿，按选中应用展示） -->
            <div>
              <div class="font-bold text-sm text-gray-700 mb-2">自定义权限</div>
              <div v-if="!currentTenantDicts.length" class="text-xs text-gray-400 py-4 text-center">
                当前应用【{{ currentTenantName }}】暂无角色类字典配置
              </div>
              <div v-else>
                <div
                  v-for="item in currentTenantDicts"
                  :key="item.dictId"
                  class="mb-3 p-3 bg-white border border-gray-200 rounded-md shadow-sm"
                >
                  <div class="text-xs text-gray-600 mb-2 font-medium flex items-center justify-between border-b border-dashed border-gray-200 pb-1">
                    <span class="font-bold text-gray-800 text-sm">{{ item.dictName }}</span>
                    <span class="text-gray-400 text-xs">({{ item.dictType }})</span>
                  </div>
                  <el-form-item
                    :label="item.component?.title || item.dictName"
                    :required="item.component?.required"
                    label-width="100px"
                    style="margin-bottom: 0;"
                  >
                    <!-- 文本框 -->
                    <el-input
                      v-if="item.component?.componentType === 'textarea'"
                      v-model="dictValueMap[activeTenantId + ':' + item.dictId]"
                      type="textarea"
                      :placeholder="item.component?.placeholder || '请输入'"
                    />
                    <!-- 下拉选项 (来自字典数据) -->
                    <el-select
                      v-else-if="item.component?.componentType === 'select'"
                      v-model="dictValueMap[activeTenantId + ':' + item.dictId]"
                      :placeholder="item.component?.placeholder || '请选择'"
                      clearable
                      style="width: 100%"
                    >
                      <el-option
                        v-for="opt in (item.component?.options || [])"
                        :key="opt.value"
                        :label="opt.label"
                        :value="opt.value"
                      />
                    </el-select>
                    <!-- 单选框组 (来自字典数据) -->
                    <el-radio-group
                      v-else-if="item.component?.componentType === 'radio'"
                      v-model="dictValueMap[activeTenantId + ':' + item.dictId]"
                    >
                      <el-radio
                        v-for="opt in (item.component?.options || [])"
                        :key="opt.value"
                        :value="opt.value"
                      >
                        {{ opt.label }}
                      </el-radio>
                    </el-radio-group>
                    <!-- 多选框组 (来自字典数据) -->
                    <el-checkbox-group
                      v-else-if="item.component?.componentType === 'checkbox'"
                      v-model="dictCheckboxMap[activeTenantId + ':' + item.dictId]"
                    >
                      <el-checkbox
                        v-for="opt in (item.component?.options || [])"
                        :key="opt.value"
                        :value="opt.value"
                      >
                        {{ opt.label }}
                      </el-checkbox>
                    </el-checkbox-group>
                    <!-- 日期时间 -->
                    <el-date-picker
                      v-else-if="item.component?.componentType === 'datetime'"
                      v-model="dictValueMap[activeTenantId + ':' + item.dictId]"
                      type="datetime"
                      value-format="YYYY-MM-DD HH:mm:ss"
                      :placeholder="item.component?.placeholder || '请选择日期时间'"
                      style="width: 100%"
                    />
                    <!-- 默认输入框 -->
                    <el-input
                      v-else
                      v-model="dictValueMap[activeTenantId + ':' + item.dictId]"
                      :placeholder="item.component?.placeholder || '请输入'"
                    />
                  </el-form-item>
                </div>
              </div>
            </div>

            <!-- 底部确认/取消按钮 -->
            <div class="mt-4 flex justify-end gap-2">
              <el-button @click="resetRightConfig">取 消</el-button>
              <el-button type="primary" :loading="submitLoading" @click="submitRightConfig">确 认</el-button>
            </div>
          </div>

          <div v-else class="text-center text-gray-400 py-20 text-sm">
            👈 请在左侧列表中点击选择一个角色进行配置
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 新增/修改角色弹窗（隐藏权限字符） -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="480px" append-to-body>
      <el-form ref="baseFormRef" :model="baseForm" :rules="rules" label-width="80px">
        <el-form-item label="角色名称" prop="roleName">
          <el-input v-model="baseForm.roleName" placeholder="请输入角色名称" />
        </el-form-item>
        <el-form-item label="角色顺序" prop="roleSort">
          <el-input-number v-model="baseForm.roleSort" controls-position="right" :min="0" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="baseForm.status">
            <el-radio v-for="dict in sys_normal_disable" :key="dict.value" :value="dict.value">{{ dict.label }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="baseForm.remark" type="textarea" placeholder="请输入内容"></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitBaseForm">确 定</el-button>
          <el-button @click="dialog.visible = false">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="Role" lang="ts">
import { addRole, dataScope, delRole, getRole, listRole, updateRole, deptTreeSelect, getRoleDictConfig, getRoleAppConfigs, saveRoleAppConfigs } from '@/api/system/role';
import { roleMenuTreeselect, treeselect as menuTreeselect } from '@/api/system/menu/index';
import { RoleVO, RoleForm, RoleQuery, DeptTreeOption, RoleDictConfigGroup, RoleDictValueItem, RoleAppConfigVo, RoleAppConfigBo } from '@/api/system/role/types';
import { MenuTreeOption } from '@/api/system/menu/types';

const router = useRouter();
const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const { sys_normal_disable } = toRefs<any>(proxy?.useDict('sys_normal_disable'));

const roleList = ref<RoleVO[]>([]);
const loading = ref(true);
const ids = ref<Array<string | number>>([]);
const total = ref(0);

const currentRole = ref<RoleVO | null>(null);
const configLoading = ref(false);
const submitLoading = ref(false);

const menuOptions = ref<MenuTreeOption[]>([]);
const menuExpand = ref(false);
const menuNodeAll = ref(false);
const deptExpand = ref(true);
const deptNodeAll = ref(false);
const deptOptions = ref<DeptTreeOption[]>([]);

const appConfigs = ref<RoleAppConfigVo[]>([]);
const dictConfigGroups = ref<RoleDictConfigGroup[]>([]);
const dictValueMap = ref<Record<string, string>>({});
const dictCheckboxMap = ref<Record<string, string[]>>({});
const activeTenantId = ref('');

const appTabs = computed(() => {
  if (appConfigs.value.length) {
    return appConfigs.value;
  }
  return dictConfigGroups.value;
});

const currentTenantGroup = computed(() => {
  return dictConfigGroups.value.find((g) => g.tenantId === activeTenantId.value) || dictConfigGroups.value[0];
});
const currentTenantName = computed(() => currentTenantGroup.value?.tenantName || activeTenantId.value);
const currentTenantDicts = computed(() => currentTenantGroup.value?.allDicts || currentTenantGroup.value?.items || []);

/** 数据范围选项 */
const dataScopeOptions = ref([
  { value: '1', label: '全部数据权限' },
  { value: '2', label: '自定数据权限' },
  { value: '3', label: '本部门数据权限' },
  { value: '4', label: '本部门及以下数据权限' },
  { value: '5', label: '仅本人数据权限' },
  { value: '6', label: '部门及以下或本人数据权限' }
]);

const queryParams = ref<RoleQuery>({
  pageNum: 1,
  pageSize: 10,
  roleName: '',
  roleKey: '',
  status: ''
});

const initForm: RoleForm = {
  roleId: undefined,
  roleSort: 1,
  status: '0',
  roleName: '',
  roleKey: '',
  menuCheckStrictly: true,
  deptCheckStrictly: true,
  remark: '',
  dataScope: '1',
  menuIds: [],
  deptIds: []
};

const form = ref<RoleForm>({ ...initForm });
const baseForm = ref<RoleForm>({ ...initForm });

// 规则中移除 roleKey 必填
const rules = {
  roleName: [{ required: true, message: '角色名称不能为空', trigger: 'blur' }],
  roleSort: [{ required: true, message: '角色顺序不能为空', trigger: 'blur' }]
};

const dialog = reactive<DialogOption>({
  visible: false,
  title: ''
});

const queryFormRef = ref<ElFormInstance>();
const roleTableRef = ref<ElTableInstance>();
const baseFormRef = ref<ElFormInstance>();
const menuRef = ref<ElTreeInstance>();
const deptRef = ref<ElTreeInstance>();

const getDataScopeLabel = (dataScopeValue: string) => {
  const item = dataScopeOptions.value.find((opt) => opt.value === dataScopeValue);
  return item ? item.label : '未设置';
};

const getDataScopeTagType = (dataScopeValue: string) => {
  switch (dataScopeValue) {
    case '1':
      return 'success';
    case '2':
      return 'warning';
    case '3':
    case '4':
      return 'primary';
    default:
      return 'info';
  }
};

/** 查询角色列表 */
const getList = () => {
  loading.value = true;
  listRole(queryParams.value).then((res) => {
    roleList.value = res.rows;
    total.value = res.total;
    loading.value = false;
    if (roleList.value.length && !currentRole.value) {
      handleRoleRowClick(roleList.value[0]);
    }
  });
};

/** 搜索 */
const handleQuery = () => {
  queryParams.value.pageNum = 1;
  getList();
};

/** 重置搜索 */
const resetQuery = () => {
  queryFormRef.value?.resetFields();
  handleQuery();
};

/** 多选操作 */
const handleSelectionChange = (selection: RoleVO[]) => {
  ids.value = selection.map((item) => item.roleId);
};

/** 点击某一行选中角色，在右侧加载其完整配置（对照图二） */
const handleRoleRowClick = async (row: RoleVO) => {
  currentRole.value = row;
  configLoading.value = true;
  try {
    const roleRes = await getRole(row.roleId);
    Object.assign(baseForm.value, roleRes.data);

    // 1. 加载全局部门树选项
    const deptRes = await deptTreeSelect(row.roleId);
    deptOptions.value = deptRes.data.depts;

    // 2. 加载各应用下的菜单与数据权限配置
    const appConfigRes = await getRoleAppConfigs(row.roleId);
    appConfigs.value = appConfigRes.data || [];

    // 3. 加载自定义权限（角色字典）
    await loadRoleDictConfig(row.roleId);

    // 4. 激活第一个应用并恢复界面状态
    if (appConfigs.value.length) {
      if (!activeTenantId.value || !appConfigs.value.some((c) => c.tenantId === activeTenantId.value)) {
        activeTenantId.value = appConfigs.value[0].tenantId;
      }
      await restoreAppFromConfig(activeTenantId.value);
    }
  } finally {
    configLoading.value = false;
  }
};

/** 将当前界面上的修改暂存进当前应用的配置对象 */
const syncCurrentAppToConfig = () => {
  if (!activeTenantId.value) return;
  const cfg = appConfigs.value.find((c) => c.tenantId === activeTenantId.value);
  if (cfg) {
    cfg.menuIds = getMenuAllCheckedKeys() || [];
    cfg.deptIds = getDeptAllCheckedKeys() || [];
    cfg.dataScope = form.value.dataScope || '1';
    cfg.menuCheckStrictly = form.value.menuCheckStrictly;
    cfg.deptCheckStrictly = form.value.deptCheckStrictly;
  }
};

/** 从指定应用的配置对象恢复界面展示（菜单树、选中项、数据权限、父子联动等） */
const restoreAppFromConfig = async (tenantId: string) => {
  const cfg = appConfigs.value.find((c) => c.tenantId === tenantId);
  if (cfg) {
    menuOptions.value = cfg.menuTree || [];
    form.value.dataScope = cfg.dataScope || '1';
    form.value.menuCheckStrictly = cfg.menuCheckStrictly ?? true;
    form.value.deptCheckStrictly = cfg.deptCheckStrictly ?? true;
    await nextTick();
    menuRef.value?.setCheckedKeys(cfg.menuIds || []);
    deptRef.value?.setCheckedKeys(cfg.deptIds || []);
  }
};

/** 切换顶部应用Tab */
const handleAppTabChange = async (newTenantId: string) => {
  if (activeTenantId.value === newTenantId) return;
  syncCurrentAppToConfig();
  activeTenantId.value = newTenantId;
  await restoreAppFromConfig(newTenantId);
};

/** 查询菜单树 */
const getRoleMenuTreeselect = async (roleId: string | number) => {
  const res = await roleMenuTreeselect(roleId);
  menuOptions.value = res.data.menus;
  await nextTick(() => {
    menuRef.value?.setCheckedKeys(res.data.checkedKeys);
  });
};

/** 查询角色字典配置 */
const loadRoleDictConfig = async (roleId: string | number) => {
  dictValueMap.value = {};
  dictCheckboxMap.value = {};
  try {
    const res = await getRoleDictConfig(roleId);
    dictConfigGroups.value = res.data || [];
    for (const group of dictConfigGroups.value) {
      const items = group.allDicts || group.items || [];
      for (const item of items) {
        const key = group.tenantId + ':' + item.dictId;
        if (item.component?.componentType === 'checkbox') {
          if (item.fieldValue) {
            try {
              dictCheckboxMap.value[key] = JSON.parse(item.fieldValue);
            } catch {
              dictCheckboxMap.value[key] = item.fieldValue.split(',');
            }
          } else {
            dictCheckboxMap.value[key] = [];
          }
        } else {
          dictValueMap.value[key] = item.fieldValue ?? (item.component?.defaultValue ? String(item.component.defaultValue) : '');
        }
      }
    }
    if (dictConfigGroups.value.length) {
      if (!activeTenantId.value || !dictConfigGroups.value.some((g) => g.tenantId === activeTenantId.value)) {
        activeTenantId.value = dictConfigGroups.value[0].tenantId;
      }
    } else {
      activeTenantId.value = '';
    }
  } catch {
    dictConfigGroups.value = [];
    activeTenantId.value = '';
  }
};

/** 树节点折叠/展开 */
const handleCheckedTreeExpand = (value: any, type: string) => {
  if (type === 'menu') {
    for (let i = 0; i < menuOptions.value.length; i++) {
      menuRef.value!.store.nodesMap[menuOptions.value[i].id].expanded = value;
    }
  } else if (type === 'dept') {
    for (let i = 0; i < deptOptions.value.length; i++) {
      deptRef.value!.store.nodesMap[deptOptions.value[i].id].expanded = value;
    }
  }
};

/** 树节点全选/全不选 */
const handleCheckedTreeNodeAll = (value: any, type: string) => {
  if (type === 'menu') {
    menuRef.value?.setCheckedNodes(value ? (menuOptions.value as any) : []);
  } else if (type === 'dept') {
    deptRef.value?.setCheckedNodes(value ? (deptOptions.value as any) : []);
  }
};

/** 树节点联动 */
const handleCheckedTreeConnect = (value: any, type: string) => {
  if (type === 'menu') {
    form.value.menuCheckStrictly = value;
    const cfg = appConfigs.value.find((c) => c.tenantId === activeTenantId.value);
    if (cfg) cfg.menuCheckStrictly = value;
  } else if (type === 'dept') {
    form.value.deptCheckStrictly = value;
    const cfg = appConfigs.value.find((c) => c.tenantId === activeTenantId.value);
    if (cfg) cfg.deptCheckStrictly = value;
  }
};

const dataScopeSelectChange = (value: string) => {
  if (value !== '2') {
    deptRef.value?.setCheckedKeys([]);
  }
  const cfg = appConfigs.value.find((c) => c.tenantId === activeTenantId.value);
  if (cfg) {
    cfg.dataScope = value;
    if (value !== '2') {
      cfg.deptIds = [];
    }
  }
};

const getMenuAllCheckedKeys = (): any => {
  const checkedKeys = menuRef.value?.getCheckedKeys();
  const halfCheckedKeys = menuRef.value?.getHalfCheckedKeys();
  if (halfCheckedKeys) {
    checkedKeys?.unshift(...halfCheckedKeys);
  }
  return checkedKeys;
};

const getDeptAllCheckedKeys = (): any => {
  return deptRef.value?.getCheckedKeys();
};

/** 提交右侧整体权限配置（按各应用独立的菜单 + 数据权限 + 自定义权限） */
const submitRightConfig = async () => {
  if (!currentRole.value) return;
  submitLoading.value = true;
  try {
    // 1. 同步当前应用的最新勾选与配置
    syncCurrentAppToConfig();

    // 2. 组装各应用独立的配置列表
    const appConfigsBo: RoleAppConfigBo[] = appConfigs.value.map((c) => ({
      tenantId: c.tenantId,
      dataScope: c.dataScope,
      menuCheckStrictly: c.menuCheckStrictly,
      deptCheckStrictly: c.deptCheckStrictly,
      menuIds: c.menuIds || [],
      deptIds: c.deptIds || []
    }));

    // 3. 收集所有应用下的自定义字典值
    const dictValues: RoleDictValueItem[] = [];
    for (const group of dictConfigGroups.value) {
      const items = group.allDicts || group.items || [];
      for (const item of items) {
        const key = group.tenantId + ':' + item.dictId;
        let val = '';
        if (item.component?.componentType === 'checkbox') {
          const arr = dictCheckboxMap.value[key] || [];
          val = arr.length ? JSON.stringify(arr) : '';
        } else {
          val = dictValueMap.value[key] || '';
        }
        dictValues.push({
          tenantId: group.tenantId,
          dictId: item.dictId,
          fieldKey: item.fieldKey || item.component?.fieldKey,
          fieldValue: val
        });
      }
    }

    // 4. 一次性提交保存
    await saveRoleAppConfigs(currentRole.value.roleId, {
      appConfigs: appConfigsBo,
      dictValues
    });

    proxy?.$modal.msgSuccess('权限配置保存成功');
    getList();
  } finally {
    submitLoading.value = false;
  }
};

/** 取消右侧配置，重新加载当前角色的原配置 */
const resetRightConfig = () => {
  if (currentRole.value) {
    handleRoleRowClick(currentRole.value);
  }
};

/** 新增角色基本信息 */
const handleAdd = () => {
  baseForm.value = { ...initForm };
  dialog.title = '新增角色';
  dialog.visible = true;
};

/** 编辑角色基本信息 */
const handleUpdate = async (row?: RoleVO) => {
  const roleId = row?.roleId || currentRole.value?.roleId;
  if (!roleId) return;
  const res = await getRole(roleId);
  baseForm.value = { ...res.data };
  dialog.title = '修改角色';
  dialog.visible = true;
};

/** 提交角色基本信息弹窗 */
const submitBaseForm = () => {
  baseFormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      if (baseForm.value.roleId) {
        await updateRole(baseForm.value);
      } else {
        await addRole(baseForm.value);
      }
      proxy?.$modal.msgSuccess('操作成功');
      dialog.visible = false;
      getList();
    }
  });
};

/** 删除角色 */
const handleDelete = async (row?: RoleVO) => {
  const roleids = row?.roleId || ids.value;
  if (!roleids || (Array.isArray(roleids) && !roleids.length)) {
    proxy?.$modal.msgWarning('请选择要删除的角色');
    return;
  }
  await proxy?.$modal.confirm('是否确认删除选中的角色数据项？');
  await delRole(roleids);
  if (currentRole.value && (currentRole.value.roleId === row?.roleId || (Array.isArray(roleids) && roleids.includes(currentRole.value.roleId)))) {
    currentRole.value = null;
  }
  getList();
  proxy?.$modal.msgSuccess('删除成功');
};

/** 分配用户 */
const handleAuthUser = (row: RoleVO) => {
  router.push('/system/role-auth/user/' + row.roleId);
};

onMounted(() => {
  getList();
});
</script>
