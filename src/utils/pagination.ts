export interface PaginationLinks {
  self: string;
  first: string;
  last: string;
  next: string | null;
  prev: string | null;
}

export interface PaginatedEnvelope<T> {
  status: 'success';
  data: T[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  links: PaginationLinks;
}

export const parsePageParams = (
  rawPage: unknown,
  rawLimit: unknown,
  opts: { defaultLimit?: number; maxLimit?: number } = {}
): { page: number; limit: number } => {
  const defaultLimit = opts.defaultLimit ?? 20;
  const maxLimit = opts.maxLimit ?? 100;

  const page =
    typeof rawPage === 'string' && rawPage !== '' ? parseInt(rawPage, 10) : 1;
  const limit =
    typeof rawLimit === 'string' && rawLimit !== ''
      ? parseInt(rawLimit, 10)
      : defaultLimit;

  if (!Number.isFinite(page) || page < 1) throw new Error('Invalid page');
  if (!Number.isFinite(limit) || limit < 1) throw new Error('Invalid limit');

  return { page, limit: Math.min(limit, maxLimit) };
};

export const buildLinks = (params: {
  basePath: string;
  query: Record<string, string | number | undefined>;
  page: number;
  limit: number;
  totalPages: number;
}): PaginationLinks => {
  const buildUrl = (page: number): string => {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(params.query)) {
      if (v !== undefined && v !== '' && v !== null) usp.set(k, String(v));
    }
    usp.set('page', String(page));
    usp.set('limit', String(params.limit));
    return `${params.basePath}?${usp.toString()}`;
  };

  const lastPage = Math.max(1, params.totalPages);
  return {
    self: buildUrl(params.page),
    first: buildUrl(1),
    last: buildUrl(lastPage),
    next: params.page < params.totalPages ? buildUrl(params.page + 1) : null,
    prev: params.page > 1 ? buildUrl(params.page - 1) : null,
  };
};

export const buildEnvelope = <T>(args: {
  data: T[];
  page: number;
  limit: number;
  total: number;
  basePath: string;
  query: Record<string, string | number | undefined>;
}): PaginatedEnvelope<T> => {
  const total_pages = args.limit > 0 ? Math.ceil(args.total / args.limit) : 0;
  return {
    status: 'success',
    data: args.data,
    page: args.page,
    limit: args.limit,
    total: args.total,
    total_pages,
    links: buildLinks({
      basePath: args.basePath,
      query: args.query,
      page: args.page,
      limit: args.limit,
      totalPages: total_pages,
    }),
  };
};
