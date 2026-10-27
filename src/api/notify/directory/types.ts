/** 通讯录快照状态（企微应用 / 钉钉工作通知的手机号寻址依赖它） */
export interface DirectoryStatusVO {
  /** 渠道配置实例键 */
  configKey: string;
  channel?: string;
  configName?: string;
  /** 是否已有可用快照 */
  loaded: boolean;
  /** 已建立索引的成员数（不含手机号被隐藏者） */
  userCount: number;
  /** 未获取到手机号的成员数（被平台隐藏或通讯录未填写）：大于 0 说明这些成员无法用手机号寻址 */
  missingMobileCount: number;
  /** 一个手机号对应多个账号的数量 */
  ambiguousCount: number;
  /** 快照加载完成时间 */
  loadedAt?: string;
  /** 本次加载耗时（毫秒） */
  costMs: number;
}
