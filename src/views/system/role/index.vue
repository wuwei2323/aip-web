<template>
  <div class="p-2">
    <el-card shadow="hover">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-bold">角色列表</span>
          <div>
            <el-button v-hasPermi="['system:role:add']" type="primary" plain icon="Plus" size="small" @click="handleAdd"> 新增 </el-button>
            <el-button
              v-hasPermi="['system:role:remove']"
              type="danger"
              plain
              icon="Delete"
              size="small"
              :disabled="ids.length === 0"
              @click="handleDelete()"
            >
              删除
            </el-button>
          </div>
        </div>
      </template>

      <el-form ref="queryFormRef" :model="queryParams" :inline="true" size="small">
        <el-form-item label="角色名称" prop="roleName">
          <el-input v-model="queryParams.roleName" placeholder="请输入角色名称" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table ref="roleTableRef" v-loading="loading" border :data="roleList" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="45" align="center" />
        <el-table-column label="角色名称" prop="roleName" align="center" min-width="140" />
        <el-table-column label="数据权限" align="center" min-width="160">
          <template #default="scope">
            <el-tag size="small" :type="getDataScopeTagType(scope.row.dataScope)">
              {{ getDataScopeLabel(scope.row.dataScope) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="排序" prop="roleSort" align="center" width="80" />
        <el-table-column label="操作" align="center" width="140">
          <template #default="scope">
            <el-tooltip v-if="scope.row.roleId !== 1" content="编辑角色" placement="top">
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

    <!-- 新增 / 编辑角色抽屉：基本信息 + 各应用权限一次保存 -->
    <RoleEditDrawer ref="editDrawerRef" @success="getList" />
  </div>
</template>

<script setup name="Role" lang="ts">
import { delRole, listRole } from '@/api/system/role';
import { RoleQuery, RoleVO } from '@/api/system/role/types';
import RoleEditDrawer from './components/RoleEditDrawer.vue';

const router = useRouter();
const { proxy } = getCurrentInstance() as ComponentInternalInstance;

const roleList = ref<RoleVO[]>([]);
const loading = ref(true);
const ids = ref<Array<string | number>>([]);
const total = ref(0);

/** 数据范围选项 */
const dataScopeOptions = [
  { value: '1', label: '全部数据权限' },
  { value: '2', label: '自定数据权限' },
  { value: '3', label: '本部门数据权限' },
  { value: '4', label: '本部门及以下数据权限' },
  { value: '5', label: '仅本人数据权限' },
  { value: '6', label: '部门及以下或本人数据权限' }
];

const queryParams = ref<RoleQuery>({
  pageNum: 1,
  pageSize: 10,
  roleName: '',
  roleKey: '',
  status: ''
});

const queryFormRef = ref<ElFormInstance>();
const roleTableRef = ref<ElTableInstance>();
const editDrawerRef = ref<InstanceType<typeof RoleEditDrawer>>();

const getDataScopeLabel = (dataScopeValue: string) => {
  const item = dataScopeOptions.find((opt) => opt.value === dataScopeValue);
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

/** 新增角色：打开合并编辑抽屉 */
const handleAdd = () => {
  editDrawerRef.value?.open();
};

/** 编辑角色：打开合并编辑抽屉 */
const handleUpdate = (row: RoleVO) => {
  editDrawerRef.value?.open(row.roleId);
};

/** 删除角色 */
const handleDelete = async (row?: RoleVO) => {
  const roleIds = row?.roleId || ids.value;
  if (!roleIds || (Array.isArray(roleIds) && !roleIds.length)) {
    proxy?.$modal.msgWarning('请选择要删除的角色');
    return;
  }
  await proxy?.$modal.confirm('是否确认删除选中的角色数据项？');
  await delRole(roleIds);
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
