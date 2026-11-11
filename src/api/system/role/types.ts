/**
 * 菜单树形结构类型
 */
export interface DeptTreeOption {
  id: string;
  label: string;
  parentId: string;
  weight: number;
  children?: DeptTreeOption[];
}

export interface RoleDeptTree {
  checkedKeys: string[];
  depts: DeptTreeOption[];
}

export interface RoleVO extends BaseEntity {
  roleId: string | number;
  roleName: string;
  roleKey: string;
  roleSort: number;
  dataScope: string;
  menuCheckStrictly: boolean;
  deptCheckStrictly: boolean;
  status: string;
  delFlag: string;
  remark?: any;
  flag: boolean;
  menuIds?: Array<string | number>;
  deptIds?: Array<string | number>;
  admin: boolean;
}

export interface RoleQuery extends PageQuery {
  roleName: string;
  roleKey: string;
  status: string;
}

export interface RoleDictValueItem {
  tenantId?: string;
  appId?: string;
  dictId: number | string;
  fieldKey?: string;
  fieldValue?: string;
}

export interface RoleDictConfigItem {
  dictId: number | string;
  dictType: string;
  dictName: string;
  component: any;
  fieldKey: string;
  fieldValue: string;
}

export interface RoleDictConfigGroup {
  tenantId: string;
  tenantName: string;
  appId?: string;
  appName?: string;
  checkedDictIds: Array<number | string>;
  allDicts: RoleDictConfigItem[];
  items?: RoleDictConfigItem[];
}

export interface RoleAppConfigVo {
  tenantId: string;
  tenantName: string;
  appId?: string;
  appName?: string;
  dataScope: string;
  menuCheckStrictly: boolean;
  deptCheckStrictly: boolean;
  menuIds: Array<string | number>;
  deptIds: Array<string | number>;
  menuTree: any[];
}

export interface RoleAppConfigBo {
  tenantId: string;
  appId?: string;
  dataScope?: string;
  menuCheckStrictly?: boolean;
  deptCheckStrictly?: boolean;
  menuIds?: Array<string | number>;
  deptIds?: Array<string | number>;
}

/**
 * 新增角色时可用的权限模板
 */
export interface RoleEditTemplate {
  appConfigs: RoleAppConfigVo[];
  deptTree: DeptTreeOption[];
  dictConfigs: RoleDictConfigGroup[];
}

export interface RoleForm {
  roleName: string;
  roleKey: string;
  roleSort: number;
  status: string;
  menuCheckStrictly: boolean;
  deptCheckStrictly: boolean;
  remark: string;
  dataScope?: string;
  roleId?: string | number;
  menuIds: Array<string | number>;
  deptIds: Array<string | number>;
  roleDictIds?: Array<number | string>;
  dictValues?: RoleDictValueItem[];
  appConfigs?: RoleAppConfigBo[];
  tenantId?: string;
  appId?: string;
}
