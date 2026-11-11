// Nigeria 36 states + FCT with representative cities/LGAs — searchable dataset
// Source: NGA administrative divisions; lat/lng are state capitals for map centering
export type CityEntry = { name: string; lga?: string; lat?: number; lng?: number };
export type StateEntry = { name: string; code: string; capital: string; lat: number; lng: number; cities: CityEntry[] };

export const NIGERIA_STATES: StateEntry[] = [
  { name: "Abia", code: "AB", capital: "Umuahia", lat: 5.535, lng: 7.485, cities: [{name:"Aba",lga:"Aba South"}, {name:"Umuahia",lga:"Umuahia North"}, {name:"Ohafia"}, {name:"Arochukwu"}] },
  { name: "Adamawa", code: "AD", capital: "Yola", lat: 9.2, lng: 12.48, cities: [{name:"Yola"}, {name:"Mubi"}, {name:"Jimeta"}, {name:"Numan"}] },
  { name: "Akwa Ibom", code: "AK", capital: "Uyo", lat: 5.038, lng: 7.954, cities: [{name:"Uyo"}, {name:"Eket"}, {name:"Ikot Ekpene"}, {name:"Oron"}] },
  { name: "Anambra", code: "AN", capital: "Awka", lat: 6.21, lng: 7.07, cities: [{name:"Onitsha"}, {name:"Awka"}, {name:"Nnewi"}, {name:"Ekwulobia"}] },
  { name: "Bauchi", code: "BA", capital: "Bauchi", lat: 10.31, lng: 9.84, cities: [{name:"Bauchi"}, {name:"Azare"}, {name:"Misau"}, {name:"Jama'are"}] },
  { name: "Bayelsa", code: "BY", capital: "Yenagoa", lat: 4.92, lng: 6.26, cities: [{name:"Yenagoa"}, {name:"Brass"}, {name:"Ogbia"}] },
  { name: "Benue", code: "BE", capital: "Makurdi", lat: 7.73, lng: 8.53, cities: [{name:"Makurdi"}, {name:"Gboko"}, {name:"Otukpo"}, {name:"Katsina-Ala"}] },
  { name: "Borno", code: "BO", capital: "Maiduguri", lat: 11.83, lng: 13.15, cities: [{name:"Maiduguri"}, {name:"Biu"}, {name:"Bama"}, {name:"Monguno"}] },
  { name: "Cross River", code: "CR", capital: "Calabar", lat: 4.96, lng: 8.33, cities: [{name:"Calabar"}, {name:"Ogoja"}, {name:"Ikom"}, {name:"Ugep"}] },
  { name: "Delta", code: "DE", capital: "Asaba", lat: 6.20, lng: 6.73, cities: [{name:"Warri"}, {name:"Asaba"}, {name:"Sapele"}, {name:"Ughelli"}, {name:"Agbor"}] },
  { name: "Ebonyi", code: "EB", capital: "Abakaliki", lat: 6.32, lng: 8.12, cities: [{name:"Abakaliki"}, {name:"Afikpo"}, {name:"Onueke"}] },
  { name: "Edo", code: "ED", capital: "Benin City", lat: 6.33, lng: 5.62, cities: [{name:"Benin City"}, {name:"Auchi"}, {name:"Ekpoma"}, {name:"Uromi"}] },
  { name: "Ekiti", code: "EK", capital: "Ado-Ekiti", lat: 7.62, lng: 5.22, cities: [{name:"Ado-Ekiti"}, {name:"Ikere-Ekiti"}, {name:"Effon-Alaiye"}] },
  { name: "Enugu", code: "EN", capital: "Enugu", lat: 6.44, lng: 7.49, cities: [{name:"Enugu"}, {name:"Nsukka"}, {name:"Agbani"}, {name:"Awgu"}] },
  { name: "Gombe", code: "GO", capital: "Gombe", lat: 10.29, lng: 11.17, cities: [{name:"Gombe"}, {name:"Kumo"}, {name:"Billiri"}] },
  { name: "Imo", code: "IM", capital: "Owerri", lat: 5.48, lng: 7.03, cities: [{name:"Owerri"}, {name:"Orlu"}, {name:"Okigwe"}, {name:"Oguta"}] },
  { name: "Jigawa", code: "JI", capital: "Dutse", lat: 11.76, lng: 9.34, cities: [{name:"Dutse"}, {name:"Hadejia"}, {name:"Birnin Kudu"}, {name:"Gumel"}] },
  { name: "Kaduna", code: "KD", capital: "Kaduna", lat: 10.52, lng: 7.44, cities: [{name:"Kaduna"}, {name:"Zaria"}, {name:"Kafanchan"}, {name:"Kagoro"}] },
  { name: "Kano", code: "KN", capital: "Kano", lat: 12.00, lng: 8.52, cities: [{name:"Kano"}, {name:"Wudil"}, {name:"Gaya"}, {name:"Bichi"}] },
  { name: "Katsina", code: "KT", capital: "Katsina", lat: 12.98, lng: 7.60, cities: [{name:"Katsina"}, {name:"Daura"}, {name:"Funtua"}, {name:"Malumfashi"}] },
  { name: "Kebbi", code: "KE", capital: "Birnin Kebbi", lat: 12.45, lng: 4.20, cities: [{name:"Birnin Kebbi"}, {name:"Argungu"}, {name:"Yauri"}] },
  { name: "Kogi", code: "KO", capital: "Lokoja", lat: 7.80, lng: 6.74, cities: [{name:"Lokoja"}, {name:"Okene"}, {name:"Idah"}, {name:"Kabba"}] },
  { name: "Kwara", code: "KW", capital: "Ilorin", lat: 8.50, lng: 4.54, cities: [{name:"Ilorin"}, {name:"Offa"}, {name:"Jebba"}, {name:"Lafiagi"}] },
  { name: "Lagos", code: "LA", capital: "Ikeja", lat: 6.60, lng: 3.34, cities: [{name:"Lagos Island",lat:6.45,lng:3.39}, {name:"Ikeja",lat:6.60,lng:3.34}, {name:"Lekki",lat:6.44,lng:3.46}, {name:"Ikorodu"}, {name:"Badagry"}, {name:"Epe"}, {name:"Victoria Island"}, {name:"Yaba"}, {name:"Surulere"}] },
  { name: "Nasarawa", code: "NA", capital: "Lafia", lat: 8.49, lng: 8.51, cities: [{name:"Lafia"}, {name:"Keffi"}, {name:"Akwanga"}, {name:"Nasarawa"}] },
  { name: "Niger", code: "NI", capital: "Minna", lat: 9.61, lng: 6.55, cities: [{name:"Minna"}, {name:"Bida"}, {name:"Suleja"}, {name:"Kontagora"}] },
  { name: "Ogun", code: "OG", capital: "Abeokuta", lat: 7.16, lng: 3.34, cities: [{name:"Abeokuta"}, {name:"Ijebu-Ode"}, {name:"Sagamu"}, {name:"Ota"}, {name:"Ilaro"}] },
  { name: "Ondo", code: "ON", capital: "Akure", lat: 7.25, lng: 5.19, cities: [{name:"Akure"}, {name:"Ondo Town"}, {name:"Owo"}, {name:"Ikare"}] },
  { name: "Osun", code: "OS", capital: "Osogbo", lat: 7.77, lng: 4.56, cities: [{name:"Osogbo"}, {name:"Ile-Ife"}, {name:"Ilesa"}, {name:"Ede"}] },
  { name: "Oyo", code: "OY", capital: "Ibadan", lat: 7.37, lng: 3.94, cities: [{name:"Ibadan"}, {name:"Oyo Town"}, {name:"Ogbomosho"}, {name:"Saki"}, {name:"Iseyin"}] },
  { name: "Plateau", code: "PL", capital: "Jos", lat: 9.93, lng: 8.89, cities: [{name:"Jos"}, {name:"Bukuru"}, {name:"Pankshin"}, {name:"Shendam"}] },
  { name: "Rivers", code: "RI", capital: "Port Harcourt", lat: 4.75, lng: 7.00, cities: [{name:"Port Harcourt"}, {name:"Obio-Akpor"}, {name:"Bonny"}, {name:"Okrika"}, {name:"Ahoada"}] },
  { name: "Sokoto", code: "SO", capital: "Sokoto", lat: 13.06, lng: 5.24, cities: [{name:"Sokoto"}, {name:"Tambuwal"}, {name:"Wamako"}] },
  { name: "Taraba", code: "TA", capital: "Jalingo", lat: 8.89, lng: 11.36, cities: [{name:"Jalingo"}, {name:"Wukari"}, {name:"Bali"}] },
  { name: "Yobe", code: "YO", capital: "Damaturu", lat: 11.74, lng: 11.96, cities: [{name:"Damaturu"}, {name:"Potiskum"}, {name:"Geidam"}] },
  { name: "Zamfara", code: "ZA", capital: "Gusau", lat: 12.17, lng: 6.66, cities: [{name:"Gusau"}, {name:"Kaura Namoda"}, {name:"Talata Mafara"}] },
  { name: "FCT", code: "FC", capital: "Abuja", lat: 9.07, lng: 7.49, cities: [{name:"Abuja Central"}, {name:"Gwagwalada"}, {name:"Kuje"}, {name:"Bwari"}, {name:"Kwali"}, {name:"Abaji"}] },
];

export const COUNTRIES = [
  { code: "NG", name: "Nigeria", dial: "+234" },
  { code: "GH", name: "Ghana", dial: "+233" },
  { code: "BJ", name: "Benin", dial: "+229" },
  { code: "CM", name: "Cameroon", dial: "+237" },
];

// Helper: distance km between two lat/lng
export function distanceKm(a: {lat:number,lng:number}, b:{lat:number,lng:number}){
  const R=6371;
  const dLat=(b.lat-a.lat)*Math.PI/180, dLng=(b.lng-a.lng)*Math.PI/180;
  const s1=Math.sin(dLat/2), s2=Math.sin(dLng/2);
  const c=2*Math.asin(Math.sqrt(s1*s1+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*s2*s2));
  return R*c;
}
