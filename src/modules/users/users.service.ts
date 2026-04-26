import { prisma } from '../../config/prisma';
import { errors } from '../../utils/errors';
import type { Role } from '../../middleware/rbac';

export const listUsers = async (params: { page: number; limit: number }) => {
  const skip = (params.page - 1) * params.limit;
  const [data, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: params.limit,
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
  return { data, page: params.page, limit: params.limit, total };
};

export const updateUserRole = async (id: string, role: Role) => {
  const exists = await prisma.user.findUnique({ where: { id } });
  if (!exists) throw errors.notFound('User not found');
  return prisma.user.update({
    where: { id },
    data: { role },
    select: { id: true, github_username: true, role: true, updated_at: true },
  });
};
