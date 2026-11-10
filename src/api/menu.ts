import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { RouteRecordRaw } from 'vue-router';

// 获取路由
export function getRouters(groupId?: number | string): AxiosPromise<RouteRecordRaw[]> {
  return request({
    url: '/system/menu/getRouters',
    method: 'get',
    params: groupId ? { groupId } : undefined
  });
}
