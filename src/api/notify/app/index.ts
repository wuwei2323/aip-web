import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { AppVO, AppForm, AppQuery } from '@/api/notify/app/types';

/**
 * 查询子应用列表
 */
export const listApp = (query?: AppQuery): AxiosPromise<AppVO[]> => {
  return request({
    url: '/notify/app/list',
    method: 'get',
    params: query
  });
};

/**
 * 查询子应用详细（不含密钥）
 */
export const getApp = (id: string | number): AxiosPromise<AppVO> => {
  return request({
    url: '/notify/app/' + id,
    method: 'get'
  });
};

/**
 * 新增子应用
 * 响应 data 为生成的明文密钥，仅此一次返回。
 */
export const addApp = (data: AppForm) => {
  return request({
    url: '/notify/app',
    method: 'post',
    data: data
  });
};

/**
 * 修改子应用（不改变密钥）
 */
export const updateApp = (data: AppForm) => {
  return request({
    url: '/notify/app',
    method: 'put',
    data: data
  });
};

/**
 * 修改子应用启用状态
 */
export const changeAppStatus = (id: string | number, enabled: string) => {
  return request({
    url: '/notify/app/changeStatus',
    method: 'put',
    data: { id, enabled }
  });
};

/**
 * 重置应用密钥（旧密钥立即失效）
 * 响应 data 为新的明文密钥，仅此一次返回。
 */
export const resetAppSecret = (id: string | number) => {
  return request({
    url: `/notify/app/${id}/resetSecret`,
    method: 'post'
  });
};

/**
 * 删除子应用
 */
export const delApp = (id: string | number | Array<string | number>) => {
  return request({
    url: '/notify/app/' + id,
    method: 'delete'
  });
};
