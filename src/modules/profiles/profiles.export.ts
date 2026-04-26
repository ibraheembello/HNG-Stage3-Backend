import { Response } from 'express';
import { rowsToCsv } from '../../utils/csv';
import { streamProfilesForExport, ProfileFilters } from './profiles.service';

const COLUMNS = [
  'id',
  'name',
  'gender',
  'gender_probability',
  'age',
  'age_group',
  'country_id',
  'country_name',
  'country_probability',
  'created_at',
] as const;

export const exportProfilesCsv = async (
  filters: ProfileFilters,
  res: Response
): Promise<void> => {
  const rows = await streamProfilesForExport(filters);
  const flat = rows.map((p) => ({
    ...p,
    created_at: p.created_at.toISOString(),
  }));

  const csv = rowsToCsv(flat as any, [...COLUMNS] as any);
  const filename = `profiles-${new Date().toISOString().slice(0, 10)}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
};
