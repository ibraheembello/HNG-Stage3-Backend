import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { buildPagination, PaginationMeta } from '../../utils/pagination';

export interface ProfileFilters {
  gender?: string;
  age_group?: string;
  country_id?: string;
  min_age?: number;
  max_age?: number;
  min_gender_probability?: number;
  min_country_probability?: number;
  sort_by?: 'age' | 'created_at' | 'gender_probability';
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

const buildWhere = (filters: ProfileFilters): Prisma.ProfileWhereInput => {
  const where: Prisma.ProfileWhereInput = {};

  if (filters.gender) where.gender = filters.gender;
  if (filters.age_group) where.age_group = filters.age_group;
  if (filters.country_id) where.country_id = filters.country_id;

  if (filters.min_age !== undefined || filters.max_age !== undefined) {
    where.age = { gte: filters.min_age, lte: filters.max_age };
  }

  if (filters.min_gender_probability !== undefined) {
    where.gender_probability = { gte: filters.min_gender_probability };
  }
  if (filters.min_country_probability !== undefined) {
    where.country_probability = { gte: filters.min_country_probability };
  }

  return where;
};

export const listProfiles = async (
  filters: ProfileFilters
): Promise<{ data: unknown[]; pagination: PaginationMeta }> => {
  const sort_by = filters.sort_by ?? 'created_at';
  const order = filters.order ?? 'desc';
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;

  const where = buildWhere(filters);
  const skip = (page - 1) * pageSize;

  const [data, totalItems] = await Promise.all([
    prisma.profile.findMany({
      where,
      orderBy: { [sort_by]: order },
      skip,
      take: pageSize,
    }),
    prisma.profile.count({ where }),
  ]);

  return { data, pagination: buildPagination(page, pageSize, totalItems) };
};

export const streamProfilesForExport = async (filters: ProfileFilters) => {
  const sort_by = filters.sort_by ?? 'created_at';
  const order = filters.order ?? 'desc';
  return prisma.profile.findMany({
    where: buildWhere(filters),
    orderBy: { [sort_by]: order },
  });
};

export const getProfileById = async (id: string) => {
  return prisma.profile.findUnique({ where: { id } });
};
