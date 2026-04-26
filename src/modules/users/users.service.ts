import { prisma } from '../../config/prisma';
import { buildPagination, PaginationMeta } from '../../utils/pagination';
import { errors } from '../../utils/errors';
import type { Role } from '../../middleware/rbac';

export const listUsers = async (params: {
  page: number;
  pageSize: number;
}): Promise<{ data: unknown[]; pagination: PaginationMeta }> => {
  const skip = (params.page - 1) * params.pageSize;
  const [data, totalItems] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: params.pageSize,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        github_id: true,
        github_username: true,
        email: true,
        name: true,
        avatar_url: true,
        role: true,
        created_at: true,
      },
    }),
    prisma.user.count(),
  ]);
  return { data, pagination: buildPagination(params.page, params.pageSize, totalItems) };
};

export const updateUserRole = async (id: string, role: Role) => {
  const exists = await prisma.user.findUnique({ where: { id } });
  if (!exists) throw errors.notFound('User not found');
  return prisma.user.update({
    where: { id },
    data: { role },
    select: {
      id: true,
      github_username: true,
      role: true,
      updated_at: true,
    },
  });
};
