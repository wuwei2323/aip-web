export interface TemplateVO {
  id: string | number;
  templateCode: string;
  templateName: string;
  channel: string;
  configKey?: string;
  msgType: string;
  titleTemplate?: string;
  contentTemplate: string;
  paramSchema?: string;
  status: string;
  remark?: string;
  createTime?: string;
}

export interface TemplateForm {
  id?: string | number;
  templateCode?: string;
  templateName?: string;
  channel?: string;
  configKey?: string;
  msgType?: string;
  titleTemplate?: string;
  contentTemplate?: string;
  paramSchema?: string;
  status?: string;
  remark?: string;
}

export interface TemplateQuery extends PageQuery {
  templateCode?: string;
  templateName?: string;
  channel?: string;
  status?: string;
}
