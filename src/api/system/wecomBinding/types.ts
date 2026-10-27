/**
 * 企微绑定管理（平台用户与企业微信成员绑定关系）
 */

export interface SysUserWecomVo {
  /**
   * 主键
   */
  id: string | number;

  /**
   * 平台用户ID（sys_user）
   */
  userId: string | number;

  /**
   * 租户编号
   */
  tenantId: string;

  /**
   * 企微渠道实例标识
   */
  configKey: string;

  /**
   * 企业微信 corpid
   */
  corpId: string;

  /**
   * 企业微信成员 userid
   */
  wecomUserid: string;

  /**
   * 企业微信 open_userid
   */
  openUserid: string;

  /**
   * 手机号
   */
  mobile: string;

  /**
   * 来源（IN_APP | QRCODE | BIND | SYNC）
   */
  source: string;

  /**
   * 状态（1有效 0失效）
   */
  status: string;

  /**
   * 最后同步时间
   */
  lastSyncTime: string;

  /**
   * 备注
   */
  remark: string;

  /**
   * 创建时间
   */
  createTime?: string;
}

export interface SysUserWecomBo {
  /**
   * 主键
   */
  id?: string | number;

  /**
   * 平台用户ID（sys_user）
   */
  userId?: string | number;

  /**
   * 租户编号
   */
  tenantId?: string;

  /**
   * 企微渠道实例标识
   */
  configKey?: string;

  /**
   * 企业微信 corpid
   */
  corpId?: string;

  /**
   * 企业微信成员 userid
   */
  wecomUserid?: string;

  /**
   * 企业微信 open_userid
   */
  openUserid?: string;

  /**
   * 手机号
   */
  mobile?: string;

  /**
   * 来源（IN_APP | QRCODE | BIND | SYNC）
   */
  source?: string;

  /**
   * 状态（1有效 0失效）
   */
  status?: string;

  /**
   * 最后同步时间
   */
  lastSyncTime?: string;

  /**
   * 备注
   */
  remark?: string;
}

export interface SysUserWecomQuery extends PageQuery {
  /**
   * 平台用户ID（sys_user）
   */
  userId?: string | number;

  /**
   * 租户编号
   */
  tenantId?: string;

  /**
   * 企业微信 corpid
   */
  corpId?: string;

  /**
   * 企业微信成员 userid
   */
  wecomUserid?: string;

  /**
   * 状态（1有效 0失效）
   */
  status?: string;
}
