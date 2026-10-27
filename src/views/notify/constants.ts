/**
 * 消息通知模块共享常量
 */

/** 渠道选项 */
export const CHANNEL_OPTIONS = [
  { value: 'MAIL', label: '邮件' },
  { value: 'SMS', label: '短信' },
  { value: 'WECOM_ROBOT', label: '企微群机器人' },
  { value: 'WECOM_APP', label: '企微应用消息' },
  { value: 'DING_ROBOT', label: '钉钉群机器人' },
  { value: 'DING_APP', label: '钉钉工作通知' }
];

/** 群机器人渠道（无需接收者） */
export const ROBOT_CHANNELS = ['WECOM_ROBOT', 'DING_ROBOT'];

/** 需要接收者的个人渠道 */
export const PERSONAL_CHANNELS = ['MAIL', 'SMS', 'WECOM_APP', 'DING_APP'];

/**
 * 支持手机号寻址的渠道：发送测试接收方填手机号，后端从**企业通讯录快照**
 * （预拉取并缓存的 手机号 → userid 映射）中查出 userid 后发送，不在发送路径上调用三方接口
 * （WECOM_APP=企微用户手机号，DING_APP=钉钉用户手机号）
 */
export const MOBILE_TARGET_CHANNELS = ['WECOM_APP', 'DING_APP'];

/** 依赖企业通讯录快照的渠道：这些渠道的配置行才需要展示「刷新通讯录」入口 */
export const DIRECTORY_CHANNELS = MOBILE_TARGET_CHANNELS;

/** 该渠道是否依赖通讯录快照 */
export const supportsDirectory = (channel?: string): boolean => DIRECTORY_CHANNELS.includes(channel || '');

/** 各渠道支持的接收目标说明 */
export const TARGET_PLACEHOLDER: Record<string, string> = {
  MAIL: '收件邮箱，如 user@example.com',
  SMS: '手机号，如 13800138000',
  WECOM_APP: '企微用户手机号，如 13800138000',
  DING_APP: '钉钉用户手机号，如 13800138000'
};

/** 手机号格式（与后端 NotifyMobileUtils 保持一致） */
export const MOBILE_PATTERN = /^1[3-9]\d{9}$/;

/** 手机号格式校验 */
export const isValidMobile = (value?: string): boolean => MOBILE_PATTERN.test((value || '').trim());

/** 该渠道的接收目标是否要求手机号 */
export const isMobileTargetChannel = (channel?: string): boolean => MOBILE_TARGET_CHANNELS.includes(channel || '');

/** 接收目标表单标签 */
export const targetLabel = (channel?: string): string => {
  if (channel === 'WECOM_APP') return '企微手机号';
  if (channel === 'DING_APP') return '钉钉手机号';
  if (channel === 'SMS') return '接收手机号';
  return '接收目标';
};

/**
 * 接收目标校验（前端提示与后端拦截语义一致）
 * <p>
 * 空值/手机号格式非法都返回可直接展示的错误文案；合法返回空串。
 */
export const validateTarget = (channel: string | undefined, target?: string): string => {
  const value = (target || '').trim();
  if (isMobileTargetChannel(channel)) {
    if (!value) {
      return channel === 'DING_APP' ? '请输入钉钉用户手机号' : '请输入企微用户手机号';
    }
    if (!isValidMobile(value)) {
      return '请输入正确的11位手机号，如 13800138000（不支持区号、空格与短号）';
    }
    return '';
  }
  if (channel === 'MAIL') {
    if (!value) return '请输入收件邮箱';
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? '' : '邮箱格式不正确，如 user@example.com';
  }
  if (channel === 'SMS') {
    if (!value) return '请输入接收手机号';
    return isValidMobile(value) ? '' : '请输入正确的11位手机号，如 13800138000';
  }
  return value ? '' : '请填写接收目标';
};

/** 消息类型选项 */
export const MSG_TYPE_OPTIONS = [
  { value: 'TEXT', label: '文本' },
  { value: 'MARKDOWN', label: 'Markdown' }
];

/** 各渠道支持的消息类型 */
export const CHANNEL_MSG_TYPES: Record<string, string[]> = {
  MAIL: ['TEXT', 'MARKDOWN'],
  SMS: ['TEXT'],
  WECOM_ROBOT: ['TEXT', 'MARKDOWN'],
  WECOM_APP: ['TEXT', 'MARKDOWN'],
  DING_ROBOT: ['TEXT', 'MARKDOWN'],
  DING_APP: ['TEXT', 'MARKDOWN']
};

/**
 * 消息配置的发送类型选项
 * 1=群发：接收人取自配置的群发范围（通知人员 ∪ 通知部门）
 * 2=自定义：接收人由调用方随请求传入 userIds
 */
export const SEND_TYPE_OPTIONS = [
  { value: '1', label: '群发' },
  { value: '2', label: '自定义' }
];

/** 是否群发类型 */
export const isGroupSendType = (sendType?: string): boolean => sendType === '1';

/** 发送类型显示名 */
export const sendTypeLabel = (sendType?: string): string => {
  return SEND_TYPE_OPTIONS.find((t) => t.value === sendType)?.label || sendType || '';
};

/** 消息主题格式（与后端 NotifyMessageConfigBo 的 @Pattern 保持一致） */
export const THEME_PATTERN = /^[A-Z][A-Z0-9_]{1,63}$/;

/** 发送状态选项 */
export const SEND_STATUS_OPTIONS = [
  { value: '0', label: '发送中', type: 'warning' },
  { value: '1', label: '成功', type: 'success' },
  { value: '2', label: '失败', type: 'danger' }
];

/** 渠道显示名映射 */
export const channelLabel = (channel?: string): string => {
  return CHANNEL_OPTIONS.find((c) => c.value === channel)?.label || channel || '';
};

/** 发送状态标签类型 */
export const sendStatusType = (status?: string): string => {
  return SEND_STATUS_OPTIONS.find((s) => s.value === status)?.type || 'info';
};

/** 发送状态显示名 */
export const sendStatusLabel = (status?: string): string => {
  return SEND_STATUS_OPTIONS.find((s) => s.value === status)?.label || status || '';
};
