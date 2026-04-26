export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export const buildPagination = (
  page: number,
  pageSize: number,
  totalItems: number
): PaginationMeta => {
  const totalPages = pageSize > 0 ? Math.ceil(totalItems / pageSize) : 0;
  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};

export const parsePageParams = (
  rawPage: unknown,
  rawPageSize: unknown,
  opts: { defaultPageSize?: number; maxPageSize?: number } = {}
): { page: number; pageSize: number } => {
  const defaultPageSize = opts.defaultPageSize ?? 20;
  const maxPageSize = opts.maxPageSize ?? 100;

  const page =
    typeof rawPage === 'string' && rawPage !== '' ? parseInt(rawPage, 10) : 1;
  const pageSize =
    typeof rawPageSize === 'string' && rawPageSize !== ''
      ? parseInt(rawPageSize, 10)
      : defaultPageSize;

  if (!Number.isFinite(page) || page < 1) throw new Error('Invalid page');
  if (!Number.isFinite(pageSize) || pageSize < 1)
    throw new Error('Invalid pageSize');

  return { page, pageSize: Math.min(pageSize, maxPageSize) };
};
