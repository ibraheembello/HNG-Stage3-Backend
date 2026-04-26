import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { v7 as uuidv7 } from 'uuid';

const prisma = new PrismaClient();

const FALLBACK_PROFILES = [
  { name: 'Adaobi', gender: 'female', gender_probability: 0.94, age: 22, age_group: 'adult', country_id: 'NG', country_name: 'Nigeria', country_probability: 0.91 },
  { name: 'Tunde', gender: 'male', gender_probability: 0.97, age: 31, age_group: 'adult', country_id: 'NG', country_name: 'Nigeria', country_probability: 0.88 },
  { name: 'Amaka', gender: 'female', gender_probability: 0.93, age: 17, age_group: 'teenager', country_id: 'NG', country_name: 'Nigeria', country_probability: 0.85 },
  { name: 'Kwame', gender: 'male', gender_probability: 0.96, age: 45, age_group: 'adult', country_id: 'GH', country_name: 'Ghana', country_probability: 0.84 },
  { name: 'Esi', gender: 'female', gender_probability: 0.92, age: 9, age_group: 'child', country_id: 'GH', country_name: 'Ghana', country_probability: 0.82 },
  { name: 'Wanjiru', gender: 'female', gender_probability: 0.91, age: 67, age_group: 'senior', country_id: 'KE', country_name: 'Kenya', country_probability: 0.86 },
  { name: 'Mwangi', gender: 'male', gender_probability: 0.95, age: 19, age_group: 'teenager', country_id: 'KE', country_name: 'Kenya', country_probability: 0.83 },
  { name: 'Sipho', gender: 'male', gender_probability: 0.94, age: 35, age_group: 'adult', country_id: 'ZA', country_name: 'South Africa', country_probability: 0.81 },
  { name: 'Thandi', gender: 'female', gender_probability: 0.93, age: 28, age_group: 'adult', country_id: 'ZA', country_name: 'South Africa', country_probability: 0.80 },
  { name: 'Aaliyah', gender: 'female', gender_probability: 0.89, age: 24, age_group: 'adult', country_id: 'US', country_name: 'United States', country_probability: 0.78 },
  { name: 'Marcus', gender: 'male', gender_probability: 0.96, age: 52, age_group: 'senior', country_id: 'US', country_name: 'United States', country_probability: 0.79 },
  { name: 'Raj', gender: 'male', gender_probability: 0.97, age: 41, age_group: 'adult', country_id: 'IN', country_name: 'India', country_probability: 0.90 },
  { name: 'Priya', gender: 'female', gender_probability: 0.94, age: 27, age_group: 'adult', country_id: 'IN', country_name: 'India', country_probability: 0.88 },
  { name: 'Oliver', gender: 'male', gender_probability: 0.95, age: 14, age_group: 'teenager', country_id: 'GB', country_name: 'United Kingdom', country_probability: 0.83 },
  { name: 'Sophia', gender: 'female', gender_probability: 0.93, age: 11, age_group: 'child', country_id: 'GB', country_name: 'United Kingdom', country_probability: 0.82 },
];

async function main() {
  const seedFile = path.resolve(__dirname, '../profiles.json');
  let profiles: any[];

  if (fs.existsSync(seedFile)) {
    const data = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
    profiles = data.profiles || [];
    console.log(`Loaded ${profiles.length} profiles from profiles.json`);
  } else {
    profiles = FALLBACK_PROFILES;
    console.log(`profiles.json not found — seeding ${profiles.length} fallback profiles`);
  }

  const existing = await prisma.profile.findMany({ select: { name: true } });
  const existingNames = new Set(existing.map((p) => p.name));
  const newProfiles = profiles.filter((p) => !existingNames.has(p.name));

  if (newProfiles.length === 0) {
    console.log('No new profiles to seed.');
    return;
  }

  const batchSize = 100;
  for (let i = 0; i < newProfiles.length; i += batchSize) {
    const batch = newProfiles.slice(i, i + batchSize).map((p) => ({
      id: uuidv7(),
      name: p.name,
      gender: p.gender,
      gender_probability: p.gender_probability,
      age: p.age,
      age_group: p.age_group,
      country_id: p.country_id,
      country_name: p.country_name,
      country_probability: p.country_probability,
    }));

    await prisma.profile.createMany({ data: batch, skipDuplicates: true });
    console.log(`Seeded batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(newProfiles.length / batchSize)}`);
  }

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
