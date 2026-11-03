/**
 * 应用管理视图对象
 */
export interface ApplicationVO extends BaseEntity {
  id: string | number;
  appId: string;
  appName: string;
  category: string;
  description: string;
  icon?: string;
  entryUrl: string;
  redirectUris: string;
  clientSecret?: string;
  status: string;
  createTime?: string;
}

/**
 * 应用管理表单对象
 */
export interface ApplicationForm {
  id?: string | number;
  appId?: string;
  appName: string;
  category: string;
  description: string;
  icon?: string;
  entryUrl: string;
  redirectUris: string;
  status?: string;
}

/**
 * 应用管理查询对象
 */
export interface ApplicationQuery extends PageQuery {
  appId?: string;
  appName?: string;
  category?: string;
  status?: string;
}
