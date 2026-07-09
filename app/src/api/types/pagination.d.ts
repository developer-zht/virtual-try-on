/** 分页信息（全站通用，见 API 文档 §0.4） */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
}
