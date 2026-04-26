import { Request, Response, NextFunction } from 'express';
import { errors } from '../../utils/errors';
import { parsePageParams, buildEnvelope } from '../../utils/pagination';
import {
  listProfiles,
  getProfileById,
  createProfile,
  ProfileFilters,
  CreateProfileInput,
} from './profiles.service';
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
  let page: number, limit: number;
  try {
    ({ page, limit } = parsePageParams(q.page, q.limit, {
      defaultLimit: 20,
      maxLimit: 100,
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
    limit,
  };
};

const queryAsRecord = (q: Request['query']): Record<string, string | number | undefined> => {
  const out: Record<string, string | number | undefined> = {};
  for (const [k, v] of Object.entries(q)) {
    if (typeof v === 'string') out[k] = v;
  }
  return out;
};

/** GET /api/v1/profiles */
export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = buildFiltersFromQuery(req);
    const result = await listProfiles(filters);
    res.json(
      buildEnvelope({
        data: result.data,
        page: result.page,
        limit: result.limit,
        total: result.total,
        basePath: '/api/v1/profiles',
        query: queryAsRecord(req.query),
      })
    );
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

    let page: number, limit: number;
    try {
      ({ page, limit } = parsePageParams(req.query.page, req.query.limit, {
        defaultLimit: 20,
        maxLimit: 100,
      }));
    } catch (e: any) {
      throw errors.unprocessable(e.message || 'Invalid pagination');
    }

    const nlFilters = parseNLQuery(q);
    if (!nlFilters) {
      return res.json(
        buildEnvelope({
          data: [],
          page,
          limit,
          total: 0,
          basePath: '/api/v1/profiles/search',
          query: queryAsRecord(req.query),
        })
      );
    }

    const result = await listProfiles({ ...nlFilters, page, limit });
    res.json(
      buildEnvelope({
        data: result.data,
        page: result.page,
        limit: result.limit,
        total: result.total,
        basePath: '/api/v1/profiles/search',
        query: queryAsRecord(req.query),
      })
    );
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
    res.json({ status: 'success', data: profile });
  } catch (e) {
    next(e);
  }
};

const requireString = (v: unknown, name: string): string => {
  if (typeof v !== 'string' || v.trim() === '')
    throw errors.unprocessable(`${name} is required`);
  return v;
};

const requireNumber = (v: unknown, name: string, opts: { int?: boolean; min?: number; max?: number } = {}): number => {
  const n = opts.int ? parseInt(v as string, 10) : parseFloat(v as string);
  if (!Number.isFinite(n)) throw errors.unprocessable(`${name} must be a number`);
  if (opts.min !== undefined && n < opts.min) throw errors.unprocessable(`${name} must be >= ${opts.min}`);
  if (opts.max !== undefined && n > opts.max) throw errors.unprocessable(`${name} must be <= ${opts.max}`);
  return n;
};

/** POST /api/v1/profiles  (admin only) */
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body ?? {};

    const input: CreateProfileInput = {
      name: requireString(body.name, 'name'),
      gender: requireString(body.gender, 'gender'),
      gender_probability: requireNumber(body.gender_probability, 'gender_probability', { min: 0, max: 1 }),
      age: requireNumber(body.age, 'age', { int: true, min: 0, max: 150 }),
      age_group: requireString(body.age_group, 'age_group'),
      country_id: requireString(body.country_id, 'country_id'),
      country_name: requireString(body.country_name, 'country_name'),
      country_probability: requireNumber(body.country_probability, 'country_probability', { min: 0, max: 1 }),
    };

    if (input.country_id.length !== 2) throw errors.unprocessable('country_id must be a 2-letter ISO code');

    const profile = await createProfile(input);
    res.status(201).json({ status: 'success', data: profile });
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return next(errors.conflict('A profile with that name already exists'));
    }
    next(e);
  }
};
