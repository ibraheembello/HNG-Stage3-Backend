import { PrismaClient } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

const prisma = new PrismaClient();

const TOTAL_PROFILES = 2026;

type Country = {
  id: string;
  name: string;
  male_first: string[];
  female_first: string[];
  last: string[];
};

const COUNTRIES: Country[] = [
  {
    id: 'NG', name: 'Nigeria',
    male_first: ['Tunde','Chinedu','Emeka','Yusuf','Ibrahim','Olumide','Sodiq','Kelechi','Bayo','Femi','Tobi','Sani','Musa','Segun','Damilare','Chukwudi','Aliyu','Kunle','Ade','Wale','Babatunde','Obinna','Nnamdi','Uche','Bello'],
    female_first: ['Adaobi','Amaka','Chioma','Ngozi','Funmi','Aisha','Halima','Bola','Yemi','Tomi','Folake','Onyeka','Bisola','Ifeoma','Ada','Tolu','Zainab','Ruka','Hauwa','Maryam','Sade','Tope','Bukola','Iretiola','Esther'],
    last: ['Okafor','Adebayo','Eze','Bello','Ogun','Olawale','Mohammed','Ibe','Onuoha','Adeyemi','Balogun','Lawal','Nwankwo','Ojo','Salami','Afolabi','Akinola','Sanusi','Igwe','Akpan','Udo','Effiong','Hassan','Garba','Suleiman'],
  },
  {
    id: 'GH', name: 'Ghana',
    male_first: ['Kwame','Kofi','Yaw','Kojo','Kwabena','Kwaku','Akwasi','Kwesi','Nana','Akua','Atsu','Ato','Fiifi','Ekow','Paa'],
    female_first: ['Esi','Adwoa','Akosua','Yaa','Ama','Akua','Afua','Abena','Efua','Maame','Akoto','Adjoa','Serwaa','Akwele','Naana'],
    last: ['Mensah','Asante','Boateng','Owusu','Acheampong','Appiah','Annan','Agyeman','Ofori','Frimpong','Adjei','Darko','Antwi','Osei','Sarpong'],
  },
  {
    id: 'KE', name: 'Kenya',
    male_first: ['Mwangi','Kamau','Otieno','Kipchoge','Wekesa','Njoroge','Mutua','Omondi','Kibet','Wafula','Kariuki','Maina','Cheruiyot','Onyango','Korir'],
    female_first: ['Wanjiru','Akinyi','Auma','Njeri','Adhiambo','Cherono','Wambui','Atieno','Nafula','Wairimu','Wangari','Nyokabi','Achieng','Mumbi','Awino'],
    last: ['Kamau','Mwangi','Otieno','Kibet','Mutua','Onyango','Wafula','Cheruiyot','Korir','Mwende','Njoroge','Kipchoge','Kariuki','Karanja','Maina'],
  },
  {
    id: 'ZA', name: 'South Africa',
    male_first: ['Sipho','Thabo','Mandla','Sibusiso','Bongani','Lwazi','Themba','Khaya','Mzwandile','Sandile','Andile','Dumisani','Lerato','Tshepo','Bonginkosi'],
    female_first: ['Thandi','Nomusa','Lindiwe','Zanele','Ayanda','Nokuthula','Busisiwe','Ntombi','Phumzile','Refilwe','Khanyisile','Sibongile','Nontsikelelo','Palesa','Naledi'],
    last: ['Dlamini','Nkosi','Zuma','Khumalo','Ndlovu','Mkhize','Mhlongo','Mahlangu','Mthembu','Sithole','Mokoena','Tshabalala','Cele','Buthelezi','Mabaso'],
  },
  {
    id: 'EG', name: 'Egypt',
    male_first: ['Mohamed','Ahmed','Mahmoud','Mostafa','Ali','Hassan','Hossam','Karim','Tarek','Omar','Youssef','Amr','Khaled','Sherif','Sami'],
    female_first: ['Fatma','Salma','Nour','Mariam','Yara','Mona','Heba','Dina','Rania','Amina','Aya','Doaa','Eman','Sara','Hala'],
    last: ['Said','Ibrahim','Hassan','Mohamed','Ahmed','Aly','Fawzy','Zaki','Saleh','Ramadan','Naguib','Helmy','Farouk','Galal','Shawky'],
  },
  {
    id: 'MA', name: 'Morocco',
    male_first: ['Youssef','Hamza','Anas','Othmane','Karim','Reda','Aymane','Yassine','Mehdi','Adam','Hicham','Said','Tarik','Soufiane','Walid'],
    female_first: ['Salma','Hajar','Imane','Soukaina','Nour','Yasmine','Maryam','Khadija','Sara','Asma','Houda','Loubna','Nadia','Rim','Siham'],
    last: ['El Amrani','Bennani','Tazi','Alaoui','Idrissi','Chaoui','Berrada','Filali','Tahiri','Lahlou','Sefrioui','Benani','Cherkaoui','Saidi','Karim'],
  },
  {
    id: 'TZ', name: 'Tanzania',
    male_first: ['Juma','Hassan','Salim','Rashid','Hamisi','Ally','Mussa','Ramadhani','Bakari','Iddi','Mohamed','Saidi','Hamza','Athumani','Kassim'],
    female_first: ['Asha','Mwajuma','Halima','Zainabu','Salma','Rehema','Mariamu','Fatuma','Khadija','Amina','Tatu','Saada','Mwanaisha','Hadija','Subira'],
    last: ['Juma','Hassan','Mwakikagile','Mwita','Kimaro','Mushi','Mtui','Lyimo','Massawe','Marwa','Mbeki','Ngowi','Shayo','Macha','Kileo'],
  },
  {
    id: 'US', name: 'United States',
    male_first: ['Marcus','James','Michael','David','Christopher','Daniel','Matthew','Anthony','Jacob','Ethan','Liam','Noah','Mason','Logan','Lucas','Aiden','Caleb','Tyler','Brandon','Jordan','Kevin','Justin','Nicholas','Andrew','Jose'],
    female_first: ['Aaliyah','Olivia','Emma','Ava','Sophia','Isabella','Mia','Charlotte','Amelia','Harper','Evelyn','Abigail','Ella','Madison','Avery','Sofia','Camila','Aria','Scarlett','Victoria','Hannah','Layla','Ariana','Jasmine','Alexis'],
    last: ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin','Lee','Perez','Thompson','White','Harris'],
  },
  {
    id: 'GB', name: 'United Kingdom',
    male_first: ['Oliver','Harry','George','Jack','Jacob','Noah','Charlie','Muhammad','Thomas','Oscar','William','James','Henry','Leo','Alfie','Joshua','Freddie','Archie','Ethan','Isaac'],
    female_first: ['Sophia','Olivia','Lily','Emily','Amelia','Isla','Ava','Mia','Isabella','Sophie','Grace','Poppy','Ella','Charlotte','Evie','Daisy','Ruby','Florence','Phoebe','Alice'],
    last: ['Smith','Jones','Williams','Taylor','Brown','Davies','Evans','Wilson','Thomas','Roberts','Walker','Wright','Thompson','White','Hughes','Edwards','Green','Hall','Wood','Harris'],
  },
  {
    id: 'IN', name: 'India',
    male_first: ['Raj','Aarav','Vivaan','Aditya','Vihaan','Arjun','Reyansh','Krishna','Sai','Ishaan','Rohan','Aniket','Karan','Rahul','Amit','Suresh','Vikas','Manoj','Ajay','Dev','Akash','Nikhil','Pranav','Rohit','Vishal'],
    female_first: ['Priya','Aanya','Diya','Aadhya','Saanvi','Pari','Ananya','Aarohi','Anika','Navya','Riya','Kavya','Sanya','Pooja','Neha','Sneha','Anjali','Meera','Divya','Shreya','Nisha','Asha','Kiran','Sunita','Geeta'],
    last: ['Patel','Singh','Kumar','Sharma','Gupta','Verma','Mehta','Joshi','Reddy','Nair','Iyer','Menon','Khan','Das','Bose','Roy','Chatterjee','Mukherjee','Banerjee','Agarwal','Malhotra','Kapoor','Chopra','Sinha','Mishra'],
  },
  {
    id: 'BR', name: 'Brazil',
    male_first: ['Joao','Pedro','Lucas','Gabriel','Matheus','Rafael','Bruno','Felipe','Gustavo','Thiago','Diego','Marcos','Andre','Vinicius','Leonardo'],
    female_first: ['Maria','Ana','Beatriz','Julia','Camila','Larissa','Fernanda','Carolina','Mariana','Isabela','Gabriela','Leticia','Amanda','Patricia','Bruna'],
    last: ['Silva','Santos','Oliveira','Souza','Lima','Pereira','Carvalho','Almeida','Ribeiro','Rodrigues','Barbosa','Cardoso','Gomes','Martins','Araujo'],
  },
  {
    id: 'DE', name: 'Germany',
    male_first: ['Lukas','Ben','Paul','Jonas','Leon','Finn','Felix','Maximilian','Noah','Elias','Luis','Anton','Tim','Niklas','Jan'],
    female_first: ['Mia','Emma','Hannah','Sophia','Anna','Marie','Lea','Lina','Lara','Klara','Greta','Frieda','Ida','Helena','Ella'],
    last: ['Muller','Schmidt','Schneider','Fischer','Weber','Meyer','Wagner','Becker','Schulz','Hoffmann','Schafer','Koch','Bauer','Richter','Klein'],
  },
  {
    id: 'FR', name: 'France',
    male_first: ['Lucas','Hugo','Louis','Gabriel','Arthur','Raphael','Jules','Adam','Mael','Leo','Tom','Nathan','Sacha','Ethan','Liam'],
    female_first: ['Emma','Jade','Louise','Alice','Chloe','Lina','Mila','Lea','Anna','Camille','Manon','Sarah','Inès','Jeanne','Juliette'],
    last: ['Martin','Bernard','Dubois','Thomas','Robert','Richard','Petit','Durand','Leroy','Moreau','Simon','Laurent','Lefebvre','Michel','Garcia'],
  },
  {
    id: 'JP', name: 'Japan',
    male_first: ['Hiroshi','Takashi','Yuki','Daiki','Ren','Sora','Haruto','Yuto','Kaito','Aoi','Riku','Hayato','Tsubasa','Kenta','Shota'],
    female_first: ['Sakura','Hina','Yui','Aoi','Akari','Mei','Rin','Ichika','Yuna','Hana','Mio','Saki','Mio','Riko','Nanami'],
    last: ['Sato','Suzuki','Takahashi','Tanaka','Watanabe','Ito','Yamamoto','Nakamura','Kobayashi','Kato','Yoshida','Yamada','Sasaki','Yamaguchi','Matsumoto'],
  },
  {
    id: 'CN', name: 'China',
    male_first: ['Wei','Hao','Jun','Ming','Lei','Tao','Bo','Long','Yong','Chen','Liang','Peng','Yang','Jie','Kai'],
    female_first: ['Xia','Mei','Lin','Hua','Fang','Yan','Ying','Li','Hong','Min','Ling','Jing','Xuan','Wei','Qing'],
    last: ['Wang','Li','Zhang','Liu','Chen','Yang','Huang','Zhao','Wu','Zhou','Xu','Sun','Ma','Zhu','Hu'],
  },
  {
    id: 'AU', name: 'Australia',
    male_first: ['Oliver','Jack','Noah','William','Lucas','Henry','Leo','Charlie','Thomas','James','Hudson','Alexander','Ethan','Liam','Lachlan'],
    female_first: ['Charlotte','Olivia','Amelia','Isla','Mia','Ava','Grace','Willow','Harper','Chloe','Sophia','Ruby','Zoe','Evie','Matilda'],
    last: ['Smith','Jones','Williams','Brown','Wilson','Taylor','Johnson','White','Martin','Anderson','Thompson','Nguyen','Walker','Harris','Lee'],
  },
  {
    id: 'CA', name: 'Canada',
    male_first: ['Liam','Noah','Oliver','William','Benjamin','Lucas','Henry','Alexander','Mason','Ethan','Logan','Jacob','Jackson','Owen','Daniel'],
    female_first: ['Olivia','Charlotte','Emma','Ava','Sophia','Amelia','Isabella','Mia','Evelyn','Harper','Camila','Abigail','Sofia','Grace','Aria'],
    last: ['Smith','Brown','Tremblay','Martin','Roy','Gagnon','Lee','Wilson','Johnson','MacDonald','Taylor','Campbell','Anderson','Bouchard','Cote'],
  },
  {
    id: 'ES', name: 'Spain',
    male_first: ['Hugo','Martin','Lucas','Mateo','Leo','Daniel','Alejandro','Pablo','Manuel','Alvaro','Adrian','David','Diego','Mario','Javier'],
    female_first: ['Lucia','Sofia','Martina','Maria','Julia','Paula','Valeria','Daniela','Alba','Emma','Carla','Sara','Noa','Vega','Olivia'],
    last: ['Garcia','Rodriguez','Gonzalez','Fernandez','Lopez','Martinez','Sanchez','Perez','Gomez','Martin','Jimenez','Ruiz','Hernandez','Diaz','Moreno'],
  },
  {
    id: 'IT', name: 'Italy',
    male_first: ['Leonardo','Francesco','Lorenzo','Alessandro','Andrea','Mattia','Gabriele','Tommaso','Riccardo','Edoardo','Matteo','Federico','Davide','Giuseppe','Luca'],
    female_first: ['Sofia','Aurora','Giulia','Ginevra','Alice','Emma','Beatrice','Vittoria','Bianca','Greta','Anna','Martina','Chiara','Sara','Camilla'],
    last: ['Rossi','Russo','Ferrari','Esposito','Bianchi','Romano','Colombo','Ricci','Marino','Greco','Bruno','Gallo','Conti','De Luca','Mancini'],
  },
  {
    id: 'NL', name: 'Netherlands',
    male_first: ['Daan','Sem','Liam','Lucas','Noah','Finn','Mees','Bram','Jesse','Luuk','Levi','Thijs','Sven','Stijn','Tijn'],
    female_first: ['Emma','Tess','Sophie','Julia','Mila','Zoe','Sara','Olivia','Eva','Saar','Anna','Liv','Lotte','Noor','Nora'],
    last: ['De Jong','Jansen','De Vries','Van den Berg','Bakker','Janssen','Visser','Smit','Meijer','Mulder','De Boer','Bos','Vos','Peters','Hendriks'],
  },
  {
    id: 'UG', name: 'Uganda',
    male_first: ['Mukasa','Okello','Tumusiime','Mugisha','Ssemakula','Wasswa','Kato','Kalule','Lubega','Ssali','Kironde','Kasozi','Lukwago','Sserunjogi','Nakato'],
    female_first: ['Nakimera','Nabirye','Nakato','Babirye','Auma','Akello','Acan','Apio','Atim','Adong','Amito','Atieno','Achan','Amongi','Aciro'],
    last: ['Mukasa','Okello','Tumusiime','Mugisha','Ssemakula','Wasswa','Kato','Kalule','Lubega','Ssali','Lutaaya','Bukenya','Sekamatte','Kakooza','Mubiru'],
  },
  {
    id: 'RW', name: 'Rwanda',
    male_first: ['Eric','Jean','Patrick','Emmanuel','Olivier','Aimable','Jean-Paul','Innocent','Diogene','Ferdinand','Faustin','Janvier','Theogene','Vianney','Modeste'],
    female_first: ['Claudine','Beatrice','Immaculee','Vestine','Esperance','Solange','Jeanne','Diane','Aline','Yvette','Colette','Christine','Liliane','Marie','Sylvie'],
    last: ['Mukamana','Uwase','Iradukunda','Habimana','Nshimiyimana','Mukamuganga','Niyonsenga','Mukandayisenga','Bizimana','Tuyishime','Hakizimana','Murenzi','Kayitesi','Ngirente','Niyongabo'],
  },
  {
    id: 'SN', name: 'Senegal',
    male_first: ['Mamadou','Ibrahima','Cheikh','Modou','Moussa','Abdou','Ousmane','Pape','Babacar','Aliou','Souleymane','Lamine','Khadim','Demba','Idrissa'],
    female_first: ['Aminata','Fatou','Awa','Mariama','Khady','Ndeye','Aida','Sokhna','Astou','Yacine','Coumba','Penda','Bineta','Adji','Diarra'],
    last: ['Diop','Ndiaye','Fall','Sow','Ba','Diouf','Sarr','Gueye','Cisse','Faye','Mbaye','Sy','Diagne','Kane','Niang'],
  },
  {
    id: 'ET', name: 'Ethiopia',
    male_first: ['Abebe','Bekele','Daniel','Solomon','Yonas','Tewodros','Getachew','Mulugeta','Tesfaye','Henok','Dawit','Eyob','Bereket','Samuel','Yared'],
    female_first: ['Almaz','Tigist','Selamawit','Hanna','Rahel','Bethlehem','Meseret','Helen','Saba','Genet','Aida','Tsigereda','Mihret','Bezawit','Kalkidan'],
    last: ['Tadesse','Hailu','Bekele','Mengistu','Alemu','Worku','Girma','Wolde','Kebede','Tesfaye','Assefa','Gebre','Demissie','Abebe','Lemma'],
  },
  {
    id: 'ZW', name: 'Zimbabwe',
    male_first: ['Tendai','Tatenda','Tinashe','Tafadzwa','Takudzwa','Munashe','Tapiwa','Tichaona','Tonderai','Farai','Wisdom','Blessing','Brian','Tawanda','Kudzai'],
    female_first: ['Tendai','Tafadzwa','Rumbidzai','Vimbai','Chipo','Nyasha','Rutendo','Rudo','Tariro','Ropafadzo','Anesu','Tatenda','Tariro','Mufaro','Vongai'],
    last: ['Moyo','Ncube','Sibanda','Dube','Ndlovu','Mhlanga','Chigumba','Mutasa','Madondo','Chikomba','Murwira','Chigwedere','Mahoso','Nyathi','Tshuma'],
  },
];

const AGE_GROUPS: { name: string; min: number; max: number; weight: number }[] = [
  { name: 'child', min: 1, max: 12, weight: 18 },
  { name: 'teenager', min: 13, max: 19, weight: 15 },
  { name: 'adult', min: 20, max: 59, weight: 50 },
  { name: 'senior', min: 60, max: 88, weight: 17 },
];

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function pickWeighted<T extends { weight: number }>(rand: () => number, items: T[]): T {
  const total = items.reduce((s, it) => s + it.weight, 0);
  let r = rand() * total;
  for (const it of items) {
    r -= it.weight;
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function generateProfiles(total: number): Array<{
  name: string;
  gender: string;
  gender_probability: number;
  age: number;
  age_group: string;
  country_id: string;
  country_name: string;
  country_probability: number;
  created_at: Date;
}> {
  const rand = mulberry32(20260101);
  const used = new Set<string>();
  const out: any[] = [];

  // 2026 timestamp range — Jan 1 → Dec 31 2026 inclusive
  const startMs = Date.UTC(2026, 0, 1, 0, 0, 0);
  const endMs = Date.UTC(2026, 11, 31, 23, 59, 59);
  const span = endMs - startMs;

  let safety = 0;
  while (out.length < total && safety < total * 50) {
    safety++;
    const country = pick(rand, COUNTRIES);
    const isFemale = rand() < 0.5;
    const first = pick(rand, isFemale ? country.female_first : country.male_first);
    const last = pick(rand, country.last);

    const baseName = `${first} ${last}`;
    let name = baseName;
    if (used.has(name)) {
      // disambiguate with a middle initial / numeric suffix
      const letters = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','R','S','T'];
      const m = pick(rand, letters);
      name = `${first} ${m}. ${last}`;
      let n = 2;
      while (used.has(name)) {
        name = `${first} ${m}. ${last} ${n}`;
        n++;
      }
    }
    used.add(name);

    const ageGroup = pickWeighted(rand, AGE_GROUPS);
    const age = ageGroup.min + Math.floor(rand() * (ageGroup.max - ageGroup.min + 1));

    const gender_probability = round2(0.75 + rand() * 0.24);
    const country_probability = round2(0.65 + rand() * 0.34);

    const createdAt = new Date(startMs + Math.floor(rand() * span));

    out.push({
      name,
      gender: isFemale ? 'female' : 'male',
      gender_probability,
      age,
      age_group: ageGroup.name,
      country_id: country.id,
      country_name: country.name,
      country_probability,
      created_at: createdAt,
    });
  }

  if (out.length < total) {
    throw new Error(`Could only generate ${out.length} unique profiles (target ${total}). Expand name pools.`);
  }
  return out;
}

async function main() {
  console.log(`Generating ${TOTAL_PROFILES} synthetic profiles (deterministic, 2026 timestamps)…`);
  const profiles = generateProfiles(TOTAL_PROFILES);

  console.log('Clearing existing profiles…');
  const deleted = await prisma.profile.deleteMany({});
  console.log(`Deleted ${deleted.count} existing rows.`);

  const batchSize = 200;
  let inserted = 0;
  for (let i = 0; i < profiles.length; i += batchSize) {
    const batch = profiles.slice(i, i + batchSize).map((p) => ({
      id: uuidv7(),
      name: p.name,
      gender: p.gender,
      gender_probability: p.gender_probability,
      age: p.age,
      age_group: p.age_group,
      country_id: p.country_id,
      country_name: p.country_name,
      country_probability: p.country_probability,
      created_at: p.created_at,
    }));
    const res = await prisma.profile.createMany({ data: batch, skipDuplicates: true });
    inserted += res.count;
    console.log(`  batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(profiles.length / batchSize)} → +${res.count} (running total ${inserted})`);
  }

  const finalCount = await prisma.profile.count();
  console.log(`✅ Done. Profiles in DB: ${finalCount}`);
  if (finalCount !== TOTAL_PROFILES) {
    throw new Error(`Expected ${TOTAL_PROFILES} profiles but found ${finalCount}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
