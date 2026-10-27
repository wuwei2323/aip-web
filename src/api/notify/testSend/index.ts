import request from '@/utils/request';
import { AxiosPromise } from 'axios';

export interface TestSendForm {
  templateCode?: string;
  channel?: string;
  configKey?: string;
  msgType?: string;
  title?: string;
  content?: string;
  /** 显式投递目标：targetMode=MOBILE 时为接收人手机号；否则沿用原目标语义 */
  target?: string;
  /**
   * 目标语义：DIRECT（默认，目标即最终投递值）/ MOBILE（目标为接收人手机号）
   * <p>
   * MOBILE 仅对 WECOM_APP（企微用户手机号）、DING_APP（钉钉用户手机号）生效：
   * 后端先调用平台通讯录接口换取 userid 再发送；其他渠道忽略该标记。
   */
  targetMode?: 'DIRECT' | 'MOBILE';
  params?: Record<string, any>;
}

export interface TestSendResult {
  success: boolean;
  channel: string;
  errorCode?: string;
  errorMsg?: string;
  costMs: number;
  providerMsgId?: string;
  retryable?: boolean;
}

/**
 * 测试发送（同步返回结果）
 */
export const testSend = (data: TestSendForm): AxiosPromise<TestSendResult[]> => {
  return request({
    url: '/notify/test/send',
    method: 'post',
    data: data
  });
};
