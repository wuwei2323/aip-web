import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { ClientSecretVo, SysApplicationBo, SysApplicationQuery, SysApplicationVo } from '@/api/system/application/types';

/**
 * 查询子应用管理列表
 * @param query
 */
export const listApplication = (query?: SysApplicationQuery): AxiosPromise<SysApplicationVo[]> => {
  return request({
    url: '/system/application/list',
    method: 'get',
    params: query
  });
};

/**
 * 查询子应用管理详细
 * @param id
 */
export const getApplication = (id: string | number): AxiosPromise<SysApplicationVo> => {
  return request({
    url: '/system/application/' + id,
    method: 'get'
  });
};

/**
 * 新增子应用管理
 * 响应 data 为生成的明文密钥，仅此一次返回。
 * @param data
 */
export const addApplication = (data: SysApplicationBo): AxiosPromise<ClientSecretVo> => {
  return request({
    url: '/system/application',
    method: 'post',
    data: data
  });
};

/**
 * 修改子应用管理（不改变密钥）
 * @param data
 */
export const updateApplication = (data: SysApplicationBo): AxiosPromise<void> => {
  return request({
    url: '/system/application',
    method: 'put',
    data: data
  });
};

/**
 * 修改子应用状态
 * @param id 子应用主键
 * @param status 状态（0正常 1停用）
 */
export const changeApplicationStatus = (id: string | number, status: string): AxiosPromise<void> => {
  return request({
    url: '/system/application/changeStatus',
    method: 'put',
    data: { id, status }
  });
};

/**
 * 重置子应用密钥（旧密钥立即失效）
 * 响应 data 为新的明文密钥，仅此一次返回。
 * @param id
 */
export const resetApplicationSecret = (id: string | number): AxiosPromise<ClientSecretVo> => {
  return request({
    url: `/system/application/${id}/resetSecret`,
    method: 'post'
  });
};

/**
 * 删除子应用管理
 * @param id
 */
export const delApplication = (id: string | number | Array<string | number>): AxiosPromise<void> => {
  return request({
    url: '/system/application/' + id,
    method: 'delete'
  });
};
