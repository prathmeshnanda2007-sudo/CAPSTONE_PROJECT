import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STATES = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '25', name: 'Daman & Diu' },
  { code: '26', name: 'Dadra & Nagar Haveli' },
  { code: '27', name: 'Maharashtra' },
  { code: '28', name: 'Andhra Pradesh' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Ladakh' },
];

async function main() {
  console.log('🌱 Seeding NeonDB with all Indian States...');

  // Country
  const country = await prisma.country.upsert({
    where: { code: 'IN' },
    update: { name: 'India' },
    create: { code: 'IN', name: 'India' },
  });
  console.log(`✓ Country: ${country.name} (${country.id})`);

  // States
  for (const s of STATES) {
    await prisma.state.upsert({
      where: { code: s.code },
      update: { name: s.name },
      create: { code: s.code, name: s.name, countryId: country.id },
    });
  }
  const stateCount = await prisma.state.count();
  console.log(`✓ States seeded: ${stateCount}`);

  // Sample Maharashtra → Nandurbar → Akkalkuwa district/subdistrict/villages
  const mh = await prisma.state.findUnique({ where: { code: '27' } });
  if (mh) {
    const dist = await prisma.district.upsert({
      where: { code: '497' },
      update: { name: 'Nandurbar' },
      create: { code: '497', name: 'Nandurbar', stateId: mh.id },
    });
    const sub = await prisma.subDistrict.upsert({
      where: { code: '03950' },
      update: { name: 'Akkalkuwa' },
      create: { code: '03950', name: 'Akkalkuwa', districtId: dist.id },
    });
    const sampleVillages = [
      { code: '525002', name: 'Manibeli' },
      { code: '525003', name: 'Dhankhedi' },
      { code: '525004', name: 'Chimalkhadi' },
      { code: '525005', name: 'Sinduri' },
      { code: '525006', name: 'Molgi' },
    ];
    for (const v of sampleVillages) {
      await prisma.village.upsert({
        where: { code: v.code },
        update: { name: v.name },
        create: { code: v.code, name: v.name, subDistrictId: sub.id },
      });
    }
    console.log(`✓ Sample Maharashtra data: 1 district, 1 sub-district, 5 villages`);
  }

  console.log('\n✅ Seed complete! Import the full MDDS Excel for all 600k+ villages.');
  console.log('   Run: cd scripts && python import_data.py <path_to_mdds.xlsx>');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
