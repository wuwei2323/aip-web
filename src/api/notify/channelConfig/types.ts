export interface ChannelConfigVO {
  id: string | number;
  channel: string;
  configKey: string;
  configName: string;
  isDefault: string;
  enabled: string;
  /** 渠道配置 JSON（查询返回脱敏结构，敏感字段为 ******） */
  config?: string;
  remark?: string;
  createTime?: string;
}

export interface ChannelConfigForm {
  id?: string | number;
  channel?: string;
  configKey?: string;
  configName?: string;
  isDefault?: string;
  enabled?: string;
  config?: string;
  remark?: string;
}

export interface ChannelConfigQuery extends PageQuery {
  channel?: string;
  configKey?: string;
  configName?: string;
  enabled?: string;
}
