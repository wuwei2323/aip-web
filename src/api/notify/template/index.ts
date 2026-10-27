import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { TemplateVO, TemplateForm, TemplateQuery } from '@/api/notify/template/types';

/**
 * 查询消息模板列表
 */
export const listTemplate = (query?: TemplateQuery): AxiosPromise<TemplateVO[]> => {
  return request({
    url: '/notify/template/list',
    method: 'get',
    params: query
  });
};

/**
 * 查询消息模板详细
 */
export const getTemplate = (id: string | number): AxiosPromise<TemplateVO> => {
  return request({
    url: '/notify/template/' + id,
    method: 'get'
  });
};

/**
 * 新增消息模板
 */
export const addTemplate = (data: TemplateForm) => {
  return request({
    url: '/notify/template',
    method: 'post',
    data: data
  });
};

/**
 * 修改消息模板
 */
export const updateTemplate = (data: TemplateForm) => {
  return request({
    url: '/notify/template',
    method: 'put',
    data: data
  });
};

/**
 * 删除消息模板
 */
export const delTemplate = (id: string | number | Array<string | number>) => {
  return request({
    url: '/notify/template/' + id,
    method: 'delete'
  });
};

/**
 * 修改模板状态
 */
export const changeTemplateStatus = (id: string | number, status: string) => {
  return request({
    url: '/notify/template/changeStatus',
    method: 'put',
    data: { id, status }
  });
};
