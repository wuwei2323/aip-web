import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { MessageConfigVO, MessageConfigForm, MessageConfigQuery } from '@/api/notify/messageConfig/types';

/**
 * 查询消息配置列表
 */
export const listMessageConfig = (query?: MessageConfigQuery): AxiosPromise<MessageConfigVO[]> => {
  return request({
    url: '/notify/messageConfig/list',
    method: 'get',
    params: query
  });
};

/**
 * 查询消息配置详细
 */
export const getMessageConfig = (id: string | number): AxiosPromise<MessageConfigVO> => {
  return request({
    url: '/notify/messageConfig/' + id,
    method: 'get'
  });
};

/**
 * 新增消息配置
 */
export const addMessageConfig = (data: MessageConfigForm) => {
  return request({
    url: '/notify/messageConfig',
    method: 'post',
    data: data
  });
};

/**
 * 修改消息配置
 */
export const updateMessageConfig = (data: MessageConfigForm) => {
  return request({
    url: '/notify/messageConfig',
    method: 'put',
    data: data
  });
};

/**
 * 修改消息配置状态（启停控制）
 */
export const changeMessageConfigStatus = (id: string | number, status: string) => {
  return request({
    url: '/notify/messageConfig/changeStatus',
    method: 'put',
    data: { id, status }
  });
};

/**
 * 删除消息配置
 */
export const delMessageConfig = (id: string | number | Array<string | number>) => {
  return request({
    url: '/notify/messageConfig/' + id,
    method: 'delete'
  });
};
