import request from '@/utils/request';
import { AxiosPromise } from 'axios';
import { DirectoryStatusVO } from '@/api/notify/directory/types';

/**
 * 查询通讯录快照状态
 */
export const getDirectoryStatus = (configKey: string): AxiosPromise<DirectoryStatusVO> => {
  return request({
    url: '/notify/directory/status',
    method: 'get',
    params: { configKey }
  });
};

/**
 * 手动刷新通讯录快照（同步等待拉取完成，万人规模企业需数秒到数十秒）
 */
export const refreshDirectory = (configKey: string): AxiosPromise<DirectoryStatusVO> => {
  return request({
    url: '/notify/directory/refresh/' + configKey,
    method: 'post'
  });
};
