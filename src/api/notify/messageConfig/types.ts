/**
 * 消息配置（通知公告 → 消息配置）
 * 主题是子应用调用开放接口发送消息的凭据，全局唯一。
 */

export interface MessageConfigVO {
  id: string | number;
  /** 消息主题（全局唯一） */
  theme: string;
  /** 配置名称 */
  configName: string;
  /** 渠道 */
  channel: string;
  /** 指定渠道配置实例键（空=渠道默认实例） */
  configKey?: string;
  /** 消息类型 */
  msgType: string;
  /** 发送类型（1群发 2自定义） */
  sendType: string;
  /** 群发范围-通知人员 */
  groupUserIds?: Array<string | number>;
  /** 群发范围-通知部门 */
  groupDeptIds?: Array<string | number>;
  /** 部门是否含下级（1含 0不含） */
  includeSubDept?: string;
  /** 默认标题 */
  titleTemplate?: string;
  /** 状态（1启用 0停用） */
  status: string;
  /** 备注 */
  remark?: string;
  /** 群发范围摘要（后端计算，仅列表展示） */
  scopeSummary?: string;
  createTime?: string;
}

export interface MessageConfigForm {
  id?: string | number;
  theme?: string;
  configName?: string;
  channel?: string;
  configKey?: string;
  msgType?: string;
  sendType?: string;
  groupUserIds?: Array<string | number>;
  groupDeptIds?: Array<string | number>;
  includeSubDept?: string;
  titleTemplate?: string;
  status?: string;
  remark?: string;
}

export interface MessageConfigQuery extends PageQuery {
  theme?: string;
  configName?: string;
  channel?: string;
  sendType?: string;
  status?: string;
}
