import { Request, Response, NextFunction } from 'express';
import { errors } from '../../utils/errors';
import { parsePageParams } from '../../utils/pagination';
import { listProfiles, getProfileById, ProfileFilters } from './profiles.service';
import { parseNLQuery } from './nl.parser';
import { exportProfilesCsv } from './profiles.export';

const parseNumeric = (raw: unknown, name: string, isInt = true): number | undefined => {
  if (raw === undefined || raw === '' || raw === null) return undefined;
  const v = isInt ? parseInt(raw as string, 10) : parseFloat(raw as string);
  if (!Number.isFinite(v)) throw errors.unprocessable(`Invalid ${name}`);
  return v;
};

const parseSort = (raw: unknown): ProfileFilters['sort_by'] => {
  if (raw === undefined) return undefined;
  if (!['age', 'created_at', 'gender_probability'].includes(raw as string))
    throw errors.unprocessable('Invalid sort_by');
  return raw as ProfileFilters['sort_by'];
};

const parseOrder = (raw: unknown): ProfileFilters['order'] => {
  if (raw === undefined) return undefined;
  if (!['asc', 'desc'].includes(raw as string))
    throw errors.unprocessable('Invalid order');
  return raw as ProfileFilters['order'];
};

const buildFiltersFromQuery = (req: Request): ProfileFilters => {
  const q = req.query;
  let page: number, pageSize: number;
  try {
    ({ page, pageSize } = parsePageParams(q.page, q.pageSize ?? q.limit, {
      defaultPageSize: 20,
      maxPageSize: 100,
    }));
  } catch (e: any) {
    throw errors.unprocessable(e.message || 'Invalid pagination');
  }

  return {
    gender: typeof q.gender === 'string' ? q.gender : undefined,
    age_group: typeof q.age_group === 'string' ? q.age_group : undefined,
    country_id: typeof q.country_id === 'string' ? q.country_id : undefined,
    min_age: parseNumeric(q.min_age, 'min_age'),
    max_age: parseNumeric(q.max_age, 'max_age'),
    min_gender_probability: parseNumeric(q.min_gender_probability, 'min_gender_probability', false),
    min_country_probability: parseNumeric(q.min_country_probability, 'min_country_probability', false),
    sort_by: parseSort(q.sort_by),
    order: parseOrder(q.order),
    page,
    pageSize,
  };
};

/** GET /api/v1/profiles */
export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = buildFiltersFromQuery(req);
    const result = await listProfiles(filters);
    res.json({ data: result.data, pagination: result.pagination });
  } catch (e) {
    next(e);
  }
};

/** GET /api/v1/profiles/search */
export const search = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = req.query.q;
    if (!q || typeof q !== 'string' || q.trim() === '')
      throw errors.badRequest('Missing or empty parameter: q');

    const nlFilters = parseNLQuery(q);
    if (!nlFilters) {
      return res.status(200).json({
        data: [],
        pagination: { page: 1, pageSize: 0, totalItems: 0, totalPages: 0, hasNext: false, hasPrev: false },
        message: 'Unable to interpret query',
      });
    }

    let page: number, pageSize: number;
    try {
      ({ page, pageSize } = parsePageParams(req.query.page, req.query.pageSize ?? req.query.limit, {
        defaultPageSize: 20,
        maxPageSize: 100,
      }));
    } catch (e: any) {
      throw errors.unprocessable(e.message || 'Invalid pagination');
    }

    const result = await listProfiles({ ...nlFilters, page, pageSize });
    res.json({ data: result.data, pagination: result.pagination });
  } catch (e) {
    next(e);
  }
};

/** GET /api/v1/profiles/export */
export const exportCsv = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = buildFiltersFromQuery(req);
    if (typeof req.query.q === 'string' && req.query.q.trim() !== '') {
      const nl = parseNLQuery(req.query.q);
      if (nl) Object.assign(filters, nl);
    }
    await exportProfilesCsv(filters, res);
  } catch (e) {
    next(e);
  }
};

/** GET /api/v1/profiles/:id */
export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await getProfileById(req.params.id);
    if (!profile) throw errors.notFound('Profile not found');
    res.json({ data: profile });
  } catch (e) {
    next(e);
  }
};
