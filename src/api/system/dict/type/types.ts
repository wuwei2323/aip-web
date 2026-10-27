export interface DictComponentOption {
  label: string;
  value: string;
}

export interface DictComponentInfo {
  fieldKey?: string;
  componentType: 'textarea' | 'select' | 'radio' | 'checkbox' | 'datetime' | string;
  title: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: any;
  options?: DictComponentOption[];
}

export interface DictTypeVO extends BaseEntity {
  dictId: number | string;
  dictName: string;
  dictType: string;
  categoryType?: string;
  tenantIds?: string[];
  tenantNames?: string[];
  componentInfo?: string;
  remark: string;
}

export interface DictTypeForm {
  dictId: number | string | undefined;
  dictName: string;
  dictType: string;
  categoryType: string;
  tenantIds: string[];
  componentInfo?: string;
  remark: string;
}

export interface DictTypeQuery extends PageQuery {
  dictName: string;
  dictType: string;
  categoryType?: string;
  tenantId?: string;
}
