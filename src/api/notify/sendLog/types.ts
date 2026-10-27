export interface SendLogVO {
  id: string | number;
  templateId?: string | number;
  templateCode?: string;
  /** 消息主题（主题发送时有值） */
  theme?: string;
  /** 调用方应用ID（开放接口发送时有值） */
  appId?: string;
  channel: string;
  configKey?: string;
  msgType?: string;
  title?: string;
  content?: string;
  receiverUserId?: string | number;
  receiverTarget?: string;
  sendStatus: string;
  retryCount?: number;
  maxRetry?: number;
  errorMsg?: string;
  errorStack?: string;
  costMs?: number;
  providerMsgId?: string;
  bizType?: string;
  bizId?: string;
  sendTime?: string;
  createTime?: string;
}

export interface SendLogQuery extends PageQuery {
  channel?: string;
  configKey?: string;
  templateCode?: string;
  theme?: string;
  appId?: string;
  sendStatus?: string;
  receiverTarget?: string;
  bizType?: string;
  bizId?: string;
  beginTime?: string;
  endTime?: string;
}
