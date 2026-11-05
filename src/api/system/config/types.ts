export interface ConfigVO extends BaseEntity {
  configId: number | string;
  configName: string;
  configKey: string;
  configValue: string;
  configType: string;
  remark: string;
  appId?: string;
}

export interface ConfigForm {
  configId: number | string | undefined;
  configName: string;
  configKey: string;
  configValue: string;
  configType: string;
  remark: string;
  appId?: string;
}

export interface ConfigQuery extends PageQuery {
  configName: string;
  configKey: string;
  configType: string;
  appId?: string;
}
