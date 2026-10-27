import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { UserBindingVO, UserBindingForm, UserBindingQuery } from '@/api/notify/userBinding/types';

/**
 * 查询用户渠道绑定列表
 */
export const listUserBinding = (query?: UserBindingQuery): AxiosPromise<UserBindingVO[]> => {
  return request({
    url: '/notify/userBinding/list',
    method: 'get',
    params: query
  });
};

/**
 * 查询用户渠道绑定详细
 */
export const getUserBinding = (id: string | number): AxiosPromise<UserBindingVO> => {
  return request({
    url: '/notify/userBinding/' + id,
    method: 'get'
  });
};

/**
 * 新增用户渠道绑定
 */
export const addUserBinding = (data: UserBindingForm) => {
  return request({
    url: '/notify/userBinding',
    method: 'post',
    data: data
  });
};

/**
 * 修改用户渠道绑定
 */
export const updateUserBinding = (data: UserBindingForm) => {
  return request({
    url: '/notify/userBinding',
    method: 'put',
    data: data
  });
};

/**
 * 删除用户渠道绑定
 */
export const delUserBinding = (id: string | number | Array<string | number>) => {
  return request({
    url: '/notify/userBinding/' + id,
    method: 'delete'
  });
};
