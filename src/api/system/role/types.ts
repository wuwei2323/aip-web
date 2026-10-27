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
  tenantId: string;
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
  checkedDictIds: Array<number | string>;
  allDicts: RoleDictConfigItem[];
  items?: RoleDictConfigItem[];
}

export interface RoleAppConfigVo {
  tenantId: string;
  tenantName: string;
  dataScope: string;
  menuCheckStrictly: boolean;
  deptCheckStrictly: boolean;
  menuIds: Array<string | number>;
  deptIds: Array<string | number>;
  menuTree: any[];
}

export interface RoleAppConfigBo {
  tenantId: string;
  dataScope?: string;
  menuCheckStrictly?: boolean;
  deptCheckStrictly?: boolean;
  menuIds?: Array<string | number>;
  deptIds?: Array<string | number>;
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
  roleId: string | undefined;
  menuIds: Array<string | number>;
  deptIds: Array<string | number>;
  roleDictIds?: Array<number | string>;
  dictValues?: RoleDictValueItem[];
  appConfigs?: RoleAppConfigBo[];
  tenantId?: string;
}
