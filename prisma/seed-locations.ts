import { PrismaClient } from "@prisma/client";
import { NIGERIA_STATES, COUNTRIES } from "../src/lib/location-data";
const prisma = new PrismaClient();
export async function seedLocations(){
  for (const c of COUNTRIES) await prisma.country.upsert({ where:{ code:c.code }, update:{ name:c.name }, create:{ code:c.code, name:c.name, dialCode:c.dial } });
  for (const s of NIGERIA_STATES) {
    const state = await prisma.stateRegion.upsert({ where:{ countryCode_name:{ countryCode:"NG", name:s.name } }, update:{ code:s.code }, create:{ countryCode:"NG", name:s.name, code:s.code } });
    for (const city of s.cities) {
      await prisma.city.upsert({ where:{ stateId_name:{ stateId: state.id, name: city.name } }, update:{}, create:{ stateId: state.id, name: city.name, lga: (city as any).lga, latitude: (city as any).lat, longitude: (city as any).lng } });
    }
  }
  console.log("[seed] locations NG 36+FCT");
}
if (require.main===module) seedLocations().then(()=>prisma.$disconnect());
