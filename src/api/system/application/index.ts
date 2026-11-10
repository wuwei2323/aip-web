import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { ApplicationQuery, ApplicationVO, ApplicationForm } from './types';

/**
 * 查询应用列表
 */
export function listApplication(query?: ApplicationQuery): AxiosPromise<TableDataInfo<ApplicationVO>> {
  return request({
    url: '/system/application/list',
    method: 'get',
    params: query
  });
}

/**
 * 查询应用详细
 */
export function getApplication(id: string | number): AxiosPromise<ApplicationVO> {
  return request({
    url: '/system/application/' + id,
    method: 'get'
  });
}

/**
 * 新增应用
 */
export function addApplication(data: ApplicationForm): AxiosPromise<ApplicationVO> {
  return request({
    url: '/system/application',
    method: 'post',
    data: data
  });
}

/**
 * 修改应用
 */
export function updateApplication(data: ApplicationForm): AxiosPromise<ApplicationVO> {
  return request({
    url: '/system/application',
    method: 'put',
    data: data
  });
}

/**
 * 修改应用状态
 */
export function changeApplicationStatus(id: string | number, status: string): AxiosPromise<ApplicationVO> {
  return request({
    url: '/system/application/changeStatus',
    method: 'put',
    data: {
      id,
      status
    }
  });
}

export function syncApplication(id: string | number): AxiosPromise<ApplicationVO> {
  return request({
    url: `/system/application/${id}/sync`,
    method: 'post'
  });
}

/**
 * 重置应用密钥
 */
export function resetApplicationSecret(id: string | number): AxiosPromise<string> {
  return request({
    url: '/system/application/' + id + '/resetSecret',
    method: 'put'
  });
}

/**
 * 删除应用
 */
export function delApplication(ids: string | number | (string | number)[]): AxiosPromise<void> {
  return request({
    url: '/system/application/' + ids,
    method: 'delete'
  });
}

/**
 * 动态切换应用
 */
export function dynamicApplication(tenantId: string): AxiosPromise<void> {
  return request({
    url: '/system/application/dynamic/' + tenantId,
    method: 'get'
  });
}

/**
 * 清除动态应用
 */
export function dynamicClearApplication(): AxiosPromise<void> {
  return request({
    url: '/system/application/dynamic/clear',
    method: 'get'
  });
}

/**
 * 获取应用选择框列表
 */
export function optionselectApplication(): AxiosPromise<ApplicationVO[]> {
  return request({
    url: '/system/application/optionselect',
    method: 'get'
  });
}
