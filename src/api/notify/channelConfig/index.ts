import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { ChannelConfigVO, ChannelConfigForm, ChannelConfigQuery } from '@/api/notify/channelConfig/types';

/**
 * 查询渠道配置列表
 */
export const listChannelConfig = (query?: ChannelConfigQuery): AxiosPromise<ChannelConfigVO[]> => {
  return request({
    url: '/notify/channelConfig/list',
    method: 'get',
    params: query
  });
};

/**
 * 查询渠道配置详细
 */
export const getChannelConfig = (id: string | number): AxiosPromise<ChannelConfigVO> => {
  return request({
    url: '/notify/channelConfig/' + id,
    method: 'get'
  });
};

/**
 * 新增渠道配置
 */
export const addChannelConfig = (data: ChannelConfigForm) => {
  return request({
    url: '/notify/channelConfig',
    method: 'post',
    data: data
  });
};

/**
 * 修改渠道配置
 */
export const updateChannelConfig = (data: ChannelConfigForm) => {
  return request({
    url: '/notify/channelConfig',
    method: 'put',
    data: data
  });
};

/**
 * 修改启用状态
 */
export const changeChannelStatus = (id: string | number, enabled: string) => {
  return request({
    url: '/notify/channelConfig/changeStatus',
    method: 'put',
    data: { id, enabled }
  });
};

/**
 * 删除渠道配置
 */
export const delChannelConfig = (id: string | number | Array<string | number>) => {
  return request({
    url: '/notify/channelConfig/' + id,
    method: 'delete'
  });
};
