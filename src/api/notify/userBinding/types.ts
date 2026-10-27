export interface UserBindingVO {
  id: string | number;
  userId: string | number;
  userName?: string;
  channel: string;
  bindingValue: string;
  status: string;
  remark?: string;
  createTime?: string;
}

export interface UserBindingForm {
  id?: string | number;
  userId?: string | number;
  channel?: string;
  bindingValue?: string;
  status?: string;
  remark?: string;
}

export interface UserBindingQuery extends PageQuery {
  userId?: string | number;
  channel?: string;
  bindingValue?: string;
  status?: string;
}
