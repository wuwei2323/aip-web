import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { SendLogVO, SendLogQuery } from '@/api/notify/sendLog/types';

/**
 * 查询发送日志列表
 */
export const listSendLog = (query?: SendLogQuery): AxiosPromise<SendLogVO[]> => {
  return request({
    url: '/notify/sendLog/list',
    method: 'get',
    params: query
  });
};

/**
 * 查询发送日志详细
 */
export const getSendLog = (id: string | number): AxiosPromise<SendLogVO> => {
  return request({
    url: '/notify/sendLog/' + id,
    method: 'get'
  });
};

/**
 * 重发
 */
export const resendSendLog = (id: string | number) => {
  return request({
    url: `/notify/sendLog/${id}/resend`,
    method: 'post'
  });
};
