import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { SysUserWecomBo, SysUserWecomQuery, SysUserWecomVo } from '@/api/system/wecomBinding/types';

/**
 * 查询企微绑定管理列表
 * @param query
 */
export const listWecomBinding = (query?: SysUserWecomQuery): AxiosPromise<SysUserWecomVo[]> => {
  return request({
    url: '/system/wecomBinding/list',
    method: 'get',
    params: query
  });
};

/**
 * 查询企微绑定管理详细
 * @param id
 */
export const getWecomBinding = (id: string | number): AxiosPromise<SysUserWecomVo> => {
  return request({
    url: '/system/wecomBinding/' + id,
    method: 'get'
  });
};

/**
 * 新增企微绑定管理
 * @param data
 */
export const addWecomBinding = (data: SysUserWecomBo): AxiosPromise<void> => {
  return request({
    url: '/system/wecomBinding',
    method: 'post',
    data: data
  });
};

/**
 * 修改企微绑定管理
 * @param data
 */
export const updateWecomBinding = (data: SysUserWecomBo): AxiosPromise<void> => {
  return request({
    url: '/system/wecomBinding',
    method: 'put',
    data: data
  });
};

/**
 * 删除企微绑定管理
 * @param id
 */
export const delWecomBinding = (id: string | number | Array<string | number>): AxiosPromise<void> => {
  return request({
    url: '/system/wecomBinding/' + id,
    method: 'delete'
  });
};
