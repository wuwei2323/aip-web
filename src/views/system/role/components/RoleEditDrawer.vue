<template>
  <el-drawer v-model="visible" :title="isEdit ? '编辑角色' : '新增角色'" size="75%" append-to-body destroy-on-close :close-on-click-modal="false">
    <div v-loading="loading" class="px-2 pb-4" style="max-height: calc(100vh - 150px); overflow-y: auto">
      <!-- 基本信息 -->
      <el-form ref="baseFormRef" :model="baseForm" :rules="rules" label-width="90px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="角色名称" prop="roleName">
              <el-input v-model="baseForm.roleName" placeholder="请输入角色名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="角色排序" prop="roleSort">
              <el-input-number v-model="baseForm.roleSort" controls-position="right" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="角色状态" prop="status">
              <el-radio-group v-model="baseForm.status">
                <el-radio v-for="dict in sys_normal_disable" :key="dict.value" :value="dict.value">{{ dict.label }}</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="baseForm.remark" type="textarea" :rows="2" placeholder="请输入内容" />
        </el-form-item>
      </el-form>

      <el-divider content-position="left">权限配置</el-divider>

      <div>
        <!-- 菜单权限 -->
        <div class="mb-4">
          <div class="font-bold text-sm text-gray-700 mb-2">菜单权限</div>
          <div class="mb-3 flex items-center justify-between">
            <el-radio-group v-model="activeMenuGroup" @change="handleMenuGroupChange">
              <el-radio-button v-for="g in menuGroups" :key="g.value" :value="g.value">
                {{ g.label }}
              </el-radio-button>
            </el-radio-group>
            <div class="text-xs flex items-center gap-2">
              <el-checkbox v-model="currentMenuExpand" @change="handleCheckedTreeExpand($event, 'menu')">展开/折叠</el-checkbox>
              <el-checkbox v-model="currentMenuNodeAll" @change="handleCheckedTreeNodeAll($event, 'menu')">全选/全不选</el-checkbox>
              <el-checkbox v-model="baseForm.menuCheckStrictly" @change="handleCheckedTreeConnect($event, 'menu')">父子联动</el-checkbox>
              <el-tag size="small" type="info" :title="`全部菜单已选 ${totalMenuCheckedCount} 项`"> 已选中 {{ currentGroupCheckedCount }} 项 </el-tag>
            </div>
          </div>
          <div v-show="activeMenuGroup === 2">
            <el-tree
              ref="menuRefGroup2"
              class="tree-border"
              :data="group2MenuOptions"
              show-checkbox
              node-key="id"
              :check-strictly="!baseForm.menuCheckStrictly"
              empty-text="暂无数据"
              :props="{ label: 'label', children: 'children' } as any"
              @check="refreshMenuCount"
            />
          </div>
          <div v-show="activeMenuGroup === 1">
            <el-tree
              ref="menuRefGroup1"
              class="tree-border"
              :data="group1MenuOptions"
              show-checkbox
              node-key="id"
              :check-strictly="!baseForm.menuCheckStrictly"
              empty-text="暂无数据"
              :props="{ label: 'label', children: 'children' } as any"
              @check="refreshMenuCount"
            />
          </div>
        </div>

        <el-divider />

        <!-- 数据权限 -->
        <div class="mb-4">
          <div class="font-bold text-sm text-gray-700 mb-2 flex items-center justify-between">
            <span>数据权限</span>
            <el-tag v-if="form.dataScope === '2'" size="small" type="info">已选中 {{ deptCheckedCount }} 项</el-tag>
          </div>
          <!-- 应用切换 -->
          <div v-if="appTabs.length" class="mb-4 pb-3 border-b border-gray-200">
            <div class="inline-flex flex-wrap gap-1 rounded border border-gray-300 p-0.5 bg-gray-50">
              <button
                v-for="tab in appTabs"
                :key="tab.appId"
                type="button"
                class="px-4 py-1.5 text-xs font-medium rounded transition-colors"
                :class="activeTenantId === tab.appId ? 'bg-primary text-white shadow-sm' : 'text-gray-700 hover:text-primary'"
                @click="handleAppTabChange(tab.appId)"
              >
                {{ tab.appName }}
              </button>
            </div>
          </div>
          <template v-if="activeConfig">
            <el-form-item label="数据范围" label-width="90px">
              <el-select v-model="form.dataScope" style="width: 100%" @change="dataScopeSelectChange">
                <el-option v-for="item in dataScopeOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
            <div v-show="form.dataScope === '2'" class="mt-2 pl-2">
              <div class="text-xs mb-1 flex items-center gap-2">
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
                @check="refreshDeptCount"
              />
            </div>
          </template>
          <el-empty v-else-if="!loading" description="暂无可配置的应用数据权限" />
        </div>

        <el-divider />

        <!-- 自定义权限 -->
        <div v-if="activeConfig">
          <div class="font-bold text-sm text-gray-700 mb-2">自定义权限</div>
          <div v-if="!currentTenantDicts.length" class="text-xs text-gray-400 py-4 text-center">
            当前应用【{{ currentTenantName }}】暂无角色类字典配置
          </div>
          <div v-else>
            <div v-for="item in currentTenantDicts" :key="item.dictId" class="mb-3 p-3 bg-white border border-gray-200 rounded-md shadow-sm">
              <div class="text-xs text-gray-600 mb-2 font-medium flex items-center justify-between border-b border-dashed border-gray-200 pb-1">
                <span class="font-bold text-gray-800 text-sm">{{ item.dictName }}</span>
                <span class="text-gray-400 text-xs">({{ item.dictType }})</span>
              </div>
              <el-form-item
                :label="item.component?.title || item.dictName"
                :required="item.component?.required"
                label-width="100px"
                style="margin-bottom: 0"
              >
                <el-input
                  v-if="item.component?.componentType === 'textarea'"
                  v-model="dictValueMap[activeTenantId + ':' + item.dictId]"
                  type="textarea"
                  :placeholder="item.component?.placeholder || '请输入'"
                />
                <el-select
                  v-else-if="item.component?.componentType === 'select'"
                  v-model="dictValueMap[activeTenantId + ':' + item.dictId]"
                  :placeholder="item.component?.placeholder || '请选择'"
                  clearable
                  style="width: 100%"
                >
                  <el-option v-for="opt in item.component?.options || []" :key="opt.value" :label="opt.label" :value="opt.value" />
                </el-select>
                <el-radio-group v-else-if="item.component?.componentType === 'radio'" v-model="dictValueMap[activeTenantId + ':' + item.dictId]">
                  <el-radio v-for="opt in item.component?.options || []" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </el-radio>
                </el-radio-group>
                <el-checkbox-group
                  v-else-if="item.component?.componentType === 'checkbox'"
                  v-model="dictCheckboxMap[activeTenantId + ':' + item.dictId]"
                >
                  <el-checkbox v-for="opt in item.component?.options || []" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </el-checkbox>
                </el-checkbox-group>
                <el-date-picker
                  v-else-if="item.component?.componentType === 'datetime'"
                  v-model="dictValueMap[activeTenantId + ':' + item.dictId]"
                  type="datetime"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  :placeholder="item.component?.placeholder || '请选择日期时间'"
                  style="width: 100%"
                />
                <el-input v-else v-model="dictValueMap[activeTenantId + ':' + item.dictId]" :placeholder="item.component?.placeholder || '请输入'" />
              </el-form-item>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <el-button @click="handleCancel">取 消</el-button>
        <el-button type="primary" :loading="saveLoading" :disabled="!loaded" @click="handleSubmit">确 认</el-button>
      </div>
    </template>
  </el-drawer>
</template>

<script setup name="RoleEditDrawer" lang="ts">
import { roleMenuTreeselect, treeselect } from '@/api/system/menu';
import { MenuTreeOption } from '@/api/system/menu/types';
import { addRole, deptTreeSelect, getRole, getRoleAppConfigs, getRoleAppConfigTemplate, getRoleDictConfig, updateRole } from '@/api/system/role';
import {
  DeptTreeOption,
  RoleAppConfigBo,
  RoleAppConfigVo,
  RoleDictConfigGroup,
  RoleDictValueItem,
  RoleEditTemplate,
  RoleForm
} from '@/api/system/role/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const { sys_normal_disable } = toRefs<any>(proxy?.useDict('sys_normal_disable'));
const emit = defineEmits<{ (e: 'success'): void }>();

interface AppTab {
  appId: string;
  appName: string;
}

const visible = ref(false);
const loading = ref(false);
const saveLoading = ref(false);
const loaded = ref(false);
const isEdit = ref(false);

const baseForm = ref<RoleForm>(createEmptyForm());
const appConfigs = ref<RoleAppConfigVo[]>([]);
const dictConfigGroups = ref<RoleDictConfigGroup[]>([]);
const activeTenantId = ref('');
const allMenuOptions = ref<MenuTreeOption[]>([]);
const deptOptions = ref<DeptTreeOption[]>([]);
const dictValueMap = ref<Record<string, any>>({});
const dictCheckboxMap = ref<Record<string, any[]>>({});

/** 菜单分组选项：2=集成平台 1=管理后台，参考菜单管理列表 */
const menuGroups = [
  { value: 2, label: '集成平台' },
  { value: 1, label: '管理后台' }
];
const activeMenuGroup = ref<number>(1);
const menuExpandMap = ref<Record<number, boolean>>({ 1: false, 2: false });
const menuNodeAllMap = ref<Record<number, boolean>>({ 1: false, 2: false });
const menuCheckedCountMap = ref<Record<number, number>>({ 1: 0, 2: 0 });

const deptExpand = ref(true);
const deptNodeAll = ref(false);
const deptCheckedCount = ref(0);

const form = ref({
  dataScope: '1',
  deptCheckStrictly: true
});

const baseFormRef = ref<ElFormInstance>();
const menuRefGroup1 = ref<ElTreeInstance>();
const menuRefGroup2 = ref<ElTreeInstance>();
const deptRef = ref<ElTreeInstance>();

const currentMenuExpand = computed({
  get: () => !!menuExpandMap.value[activeMenuGroup.value],
  set: (val: boolean) => {
    menuExpandMap.value[activeMenuGroup.value] = val;
  }
});

const currentMenuNodeAll = computed({
  get: () => !!menuNodeAllMap.value[activeMenuGroup.value],
  set: (val: boolean) => {
    menuNodeAllMap.value[activeMenuGroup.value] = val;
  }
});

const currentGroupCheckedCount = computed(() => menuCheckedCountMap.value[activeMenuGroup.value] || 0);
const totalMenuCheckedCount = computed(() => (menuCheckedCountMap.value[1] || 0) + (menuCheckedCountMap.value[2] || 0));

function isGroup2Node(node: MenuTreeOption): boolean {
  if (node.groupId !== undefined && node.groupId !== null) {
    return Number(node.groupId) === 2;
  }
  if (node.children && node.children.length > 0) {
    return node.children.some(isGroup2Node);
  }
  return false;
}

const group2MenuOptions = computed<MenuTreeOption[]>(() => {
  return allMenuOptions.value.filter((node) => isGroup2Node(node));
});

const group1MenuOptions = computed<MenuTreeOption[]>(() => {
  return allMenuOptions.value.filter((node) => !isGroup2Node(node));
});

function getCurrentMenuTree(): ElTreeInstance | undefined {
  return activeMenuGroup.value === 2 ? menuRefGroup2.value : menuRefGroup1.value;
}

function getCurrentMenuRoots(): MenuTreeOption[] {
  return activeMenuGroup.value === 2 ? group2MenuOptions.value : group1MenuOptions.value;
}

/** 数据范围选项 */
const dataScopeOptions = [
  { value: '1', label: '全部数据权限' },
  { value: '2', label: '自定数据权限' },
  { value: '3', label: '本部门数据权限' },
  { value: '4', label: '本部门及以下数据权限' },
  { value: '5', label: '仅本人数据权限' },
  { value: '6', label: '部门及以下或本人数据权限' }
];

const rules = {
  roleName: [{ required: true, message: '角色名称不能为空', trigger: 'blur' }],
  roleSort: [{ required: true, message: '角色顺序不能为空', trigger: 'blur' }]
};

const activeConfig = computed(() => appConfigs.value.find((cfg) => getAppId(cfg) === activeTenantId.value));

const appTabs = computed<AppTab[]>(() => {
  if (appConfigs.value.length) {
    return appConfigs.value.map((cfg) => ({
      appId: getAppId(cfg),
      appName: cfg.appName || cfg.tenantName || getAppId(cfg)
    }));
  }
  return dictConfigGroups.value.map((group) => ({
    appId: getAppId(group),
    appName: group.appName || group.tenantName || getAppId(group)
  }));
});

const currentDictGroup = computed(() => dictConfigGroups.value.find((group) => getAppId(group) === activeTenantId.value));
const currentTenantName = computed(() => currentDictGroup.value?.appName || currentDictGroup.value?.tenantName || activeTenantId.value);
const currentTenantDicts = computed(() => currentDictGroup.value?.allDicts || currentDictGroup.value?.items || []);

function getAppId(cfg: { appId?: string; tenantId?: string }): string {
  return cfg.appId || cfg.tenantId || '';
}

function createEmptyForm(): RoleForm {
  return {
    roleId: undefined,
    roleKey: '',
    roleName: '',
    roleSort: 1,
    status: '0',
    menuCheckStrictly: true,
    deptCheckStrictly: true,
    remark: '',
    dataScope: '1',
    menuIds: [],
    deptIds: []
  };
}

function normalizeAppConfig(cfg: RoleAppConfigVo): RoleAppConfigVo {
  const appId = getAppId(cfg);
  return {
    ...cfg,
    appId,
    tenantId: appId,
    dataScope: cfg.dataScope || '1',
    deptCheckStrictly: cfg.deptCheckStrictly ?? true,
    deptIds: cfg.deptIds || []
  };
}

function resetState() {
  baseForm.value = createEmptyForm();
  appConfigs.value = [];
  dictConfigGroups.value = [];
  activeTenantId.value = '';
  allMenuOptions.value = [];
  deptOptions.value = [];
  dictValueMap.value = {};
  dictCheckboxMap.value = {};
  form.value = { dataScope: '1', deptCheckStrictly: true };
  activeMenuGroup.value = 1;
  menuExpandMap.value = { 1: false, 2: false };
  menuNodeAllMap.value = { 1: false, 2: false };
  menuCheckedCountMap.value = { 1: 0, 2: 0 };
  deptExpand.value = true;
  deptNodeAll.value = false;
  deptCheckedCount.value = 0;
}

/** 打开抽屉：传 roleId 为编辑，否则为新增 */
const open = async (roleId?: string | number) => {
  resetState();
  isEdit.value = roleId !== undefined && roleId !== null && roleId !== '';
  visible.value = true;
  loading.value = true;
  loaded.value = false;
  try {
    if (isEdit.value) {
      const [roleRes, menuRes, deptRes, appRes, dictRes] = await Promise.all([
        getRole(roleId as string | number),
        roleMenuTreeselect(roleId as string | number),
        deptTreeSelect(roleId as string | number),
        getRoleAppConfigs(roleId as string | number),
        getRoleDictConfig(roleId as string | number)
      ]);
      const role = roleRes.data;
      baseForm.value = {
        ...createEmptyForm(),
        roleId: role.roleId,
        roleName: role.roleName,
        roleKey: role.roleKey,
        roleSort: role.roleSort,
        status: role.status,
        remark: role.remark,
        dataScope: role.dataScope,
        menuCheckStrictly: role.menuCheckStrictly,
        menuIds: menuRes.data.checkedKeys || [],
        deptCheckStrictly: role.deptCheckStrictly
      };
      allMenuOptions.value = menuRes.data.menus || [];
      deptOptions.value = deptRes.data.depts || [];
      appConfigs.value = (appRes.data || []).map(normalizeAppConfig);
      dictConfigGroups.value = dictRes.data || [];
    } else {
      const [res, menuRes] = await Promise.all([getRoleAppConfigTemplate(), treeselect()]);
      const template = res.data as RoleEditTemplate;
      baseForm.value = createEmptyForm();
      allMenuOptions.value = menuRes.data || [];
      deptOptions.value = template.deptTree || [];
      appConfigs.value = (template.appConfigs || []).map(normalizeAppConfig);
      dictConfigGroups.value = template.dictConfigs || [];
    }

    initDictMaps();
    await nextTick();
    menuRefGroup1.value?.setCheckedKeys(baseForm.value.menuIds);
    menuRefGroup2.value?.setCheckedKeys(baseForm.value.menuIds);
    refreshMenuCount();

    if (appConfigs.value.length) {
      activeTenantId.value = getAppId(appConfigs.value[0]);
      await restoreActiveApp();
    }
    loaded.value = true;
  } catch {
    loaded.value = false;
    proxy?.$modal.msgError('角色权限数据加载失败，请重试');
  } finally {
    loading.value = false;
  }
};

function initDictMaps() {
  dictValueMap.value = {};
  dictCheckboxMap.value = {};
  for (const group of dictConfigGroups.value) {
    const appId = getAppId(group);
    const items = group.allDicts || group.items || [];
    for (const item of items) {
      const key = appId + ':' + item.dictId;
      if (item.component?.componentType === 'checkbox') {
        if (item.fieldValue) {
          try {
            dictCheckboxMap.value[key] = JSON.parse(item.fieldValue);
          } catch {
            dictCheckboxMap.value[key] = String(item.fieldValue).split(',');
          }
        } else {
          dictCheckboxMap.value[key] = [];
        }
      } else {
        dictValueMap.value[key] = item.fieldValue ?? (item.component?.defaultValue ? String(item.component.defaultValue) : '');
      }
    }
  }
}

/** 将当前界面上的修改写回当前应用的配置对象 */
function syncActiveApp() {
  const cfg = activeConfig.value;
  if (!cfg) return;
  cfg.deptIds = form.value.dataScope === '2' ? getDeptAllCheckedKeys() || [] : [];
  cfg.dataScope = form.value.dataScope || '1';
  cfg.deptCheckStrictly = form.value.deptCheckStrictly;
}

/** 从当前应用配置恢复界面展示 */
async function restoreActiveApp() {
  const cfg = activeConfig.value;
  form.value.dataScope = cfg?.dataScope || '1';
  form.value.deptCheckStrictly = cfg?.deptCheckStrictly ?? true;
  await nextTick();
  deptRef.value?.setCheckedKeys(cfg?.deptIds || []);
  refreshDeptCount();
}

/** 切换数据权限应用 Tab */
async function handleAppTabChange(appId: string) {
  if (activeTenantId.value === appId) return;
  syncActiveApp();
  activeTenantId.value = appId;
  await restoreActiveApp();
}

async function handleMenuGroupChange() {
  await nextTick();
  refreshMenuCount();
}

function handleCheckedTreeExpand(value: any, type: 'menu' | 'dept') {
  const tree = type === 'menu' ? getCurrentMenuTree() : deptRef.value;
  const roots = type === 'menu' ? getCurrentMenuRoots() : deptOptions.value;
  const nodesMap = (tree as any)?.store?.nodesMap;
  if (!nodesMap) return;
  for (const node of roots) {
    if (node?.id !== undefined && nodesMap[node.id]) {
      nodesMap[node.id].expanded = value;
    }
  }
}

function handleCheckedTreeNodeAll(value: any, type: 'menu' | 'dept') {
  const tree = type === 'menu' ? getCurrentMenuTree() : deptRef.value;
  const roots = type === 'menu' ? getCurrentMenuRoots() : deptOptions.value;
  tree?.setCheckedNodes(value ? (roots as any) : []);
  if (type === 'menu') {
    refreshMenuCount();
  } else {
    refreshDeptCount();
  }
}

function handleCheckedTreeConnect(value: any, type: 'menu' | 'dept') {
  if (type === 'menu') {
    baseForm.value.menuCheckStrictly = value;
  } else {
    form.value.deptCheckStrictly = value;
  }
}

function dataScopeSelectChange(value: string) {
  if (value !== '2') {
    deptRef.value?.setCheckedKeys([]);
    refreshDeptCount();
  }
}

function refreshMenuCount() {
  menuCheckedCountMap.value[1] = menuRefGroup1.value?.getCheckedKeys()?.length || 0;
  menuCheckedCountMap.value[2] = menuRefGroup2.value?.getCheckedKeys()?.length || 0;
}

function refreshDeptCount() {
  deptCheckedCount.value = deptRef.value?.getCheckedKeys()?.length || 0;
}

function getMenuAllCheckedKeys(): any[] {
  const checked1 = menuRefGroup1.value?.getCheckedKeys() || [];
  const half1 = menuRefGroup1.value?.getHalfCheckedKeys() || [];
  const checked2 = menuRefGroup2.value?.getCheckedKeys() || [];
  const half2 = menuRefGroup2.value?.getHalfCheckedKeys() || [];
  return Array.from(new Set([...checked1, ...half1, ...checked2, ...half2]));
}

function getDeptAllCheckedKeys(): any {
  return deptRef.value?.getCheckedKeys() || [];
}

/** 组装一次性保存的角色基本信息 + 各应用权限 + 自定义权限 */
function buildPayload(): RoleForm {
  syncActiveApp();
  const defaultCfg = appConfigs.value.find((cfg) => getAppId(cfg) === '000000') || activeConfig.value || appConfigs.value[0];

  const appConfigsBo: RoleAppConfigBo[] = appConfigs.value.map((cfg) => ({
    tenantId: getAppId(cfg),
    appId: getAppId(cfg),
    dataScope: cfg.dataScope || '1',
    deptCheckStrictly: cfg.deptCheckStrictly ?? true,
    deptIds: cfg.deptIds || []
  }));

  const dictValues: RoleDictValueItem[] = [];
  for (const group of dictConfigGroups.value) {
    const appId = getAppId(group);
    const items = group.allDicts || group.items || [];
    for (const item of items) {
      const key = appId + ':' + item.dictId;
      let fieldValue = '';
      if (item.component?.componentType === 'checkbox') {
        const arr = dictCheckboxMap.value[key] || [];
        fieldValue = arr.length ? JSON.stringify(arr) : '';
      } else {
        const val = dictValueMap.value[key];
        fieldValue = val === undefined || val === null ? '' : String(val);
      }
      dictValues.push({
        appId,
        dictId: item.dictId,
        fieldKey: item.fieldKey || item.component?.fieldKey,
        fieldValue
      });
    }
  }

  const payload: RoleForm = {
    ...baseForm.value,
    dataScope: defaultCfg?.dataScope || baseForm.value.dataScope || '1',
    menuIds: getMenuAllCheckedKeys(),
    deptCheckStrictly: defaultCfg?.deptCheckStrictly ?? true,
    appConfigs: appConfigsBo,
    dictValues
  };

  if (!isEdit.value) {
    payload.roleId = undefined;
  }
  return payload;
}

/** 一次请求同时保存角色基本信息与权限配置 */
function handleSubmit() {
  baseFormRef.value?.validate(async (valid: boolean) => {
    if (!valid) return;
    if (!loaded.value) {
      proxy?.$modal.msgWarning('权限配置尚未加载完成，请重新打开后再保存');
      return;
    }
    saveLoading.value = true;
    try {
      const payload = buildPayload();
      if (isEdit.value && payload.roleId) {
        await updateRole(payload);
      } else {
        await addRole(payload);
      }
      proxy?.$modal.msgSuccess(isEdit.value ? '修改成功' : '新增成功');
      visible.value = false;
      emit('success');
    } finally {
      saveLoading.value = false;
    }
  });
}

function handleCancel() {
  visible.value = false;
}

defineExpose({ open });
</script>
