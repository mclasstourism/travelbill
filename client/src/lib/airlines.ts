import airblue from "@/assets/airlines/airblue.jpeg";
import airIndiaExpress from "@/assets/airlines/air-india-express.jpeg";
import airArabia from "@/assets/airlines/air-arabia.jpeg";
import airSial from "@/assets/airlines/air-sial.jpeg";
import akasaAir from "@/assets/airlines/akasa-air.jpeg";
import bimanBangladesh from "@/assets/airlines/biman-bangladesh.jpeg";
import britishAirways from "@/assets/airlines/british-airways.jpeg";
import cathayPacific from "@/assets/airlines/cathay-pacific.jpeg";
import emirates from "@/assets/airlines/emirates.jpeg";
import etihad from "@/assets/airlines/etihad.jpeg";
import flydubai from "@/assets/airlines/flydubai.jpeg";
import flynas from "@/assets/airlines/flynas.jpeg";
import gulfAir from "@/assets/airlines/gulf-air.jpeg";
import indigo from "@/assets/airlines/indigo.jpeg";
import jazeera from "@/assets/airlines/jazeera.jpeg";
import kuwaitAirways from "@/assets/airlines/kuwait-airways.jpeg";
import malaysiaAirlines from "@/assets/airlines/malaysia-airlines.jpeg";
import omanAir from "@/assets/airlines/oman-air.jpeg";
import philippineAirlines from "@/assets/airlines/philippine-airlines.jpeg";
import pia from "@/assets/airlines/pia.jpeg";
import qatarAirways from "@/assets/airlines/qatar-airways.jpeg";
import salamair from "@/assets/airlines/salamair.jpeg";
import saudia from "@/assets/airlines/saudia.jpeg";
import singaporeAirlines from "@/assets/airlines/singapore-airlines.jpeg";
import spicejet from "@/assets/airlines/spicejet.jpeg";
import srilankan from "@/assets/airlines/srilankan.jpeg";
import turkishAirlines from "@/assets/airlines/turkish-airlines.jpeg";
import usBangla from "@/assets/airlines/us-bangla.jpeg";
import placeholder from "@/assets/airlines/placeholder.svg";

export interface Airline {
  id: string;
  name: string;
  code: string;
  logo: string;
}

export const airlines: Airline[] = [
  // Airlines with logos (from zip file)
  { id: "airblue", name: "Airblue", code: "PA", logo: airblue },
  { id: "air-india-express", name: "Air India Express", code: "IX", logo: airIndiaExpress },
  { id: "air-arabia", name: "Air Arabia", code: "G9", logo: airArabia },
  { id: "air-sial", name: "Air Sial", code: "PF", logo: airSial },
  { id: "akasa-air", name: "Akasa Air", code: "QP", logo: akasaAir },
  { id: "biman-bangladesh", name: "Biman Bangladesh Airlines", code: "BG", logo: bimanBangladesh },
  { id: "british-airways", name: "British Airways", code: "BA", logo: britishAirways },
  { id: "cathay-pacific", name: "Cathay Pacific", code: "CX", logo: cathayPacific },
  { id: "emirates", name: "Emirates", code: "EK", logo: emirates },
  { id: "etihad", name: "Etihad Airways", code: "EY", logo: etihad },
  { id: "flydubai", name: "flydubai", code: "FZ", logo: flydubai },
  { id: "flynas", name: "Flynas", code: "XY", logo: flynas },
  { id: "gulf-air", name: "Gulf Air", code: "GF", logo: gulfAir },
  { id: "indigo", name: "IndiGo", code: "6E", logo: indigo },
  { id: "jazeera", name: "Jazeera Airways", code: "J9", logo: jazeera },
  { id: "kuwait-airways", name: "Kuwait Airways", code: "KU", logo: kuwaitAirways },
  { id: "malaysia-airlines", name: "Malaysia Airlines", code: "MH", logo: malaysiaAirlines },
  { id: "oman-air", name: "Oman Air", code: "WY", logo: omanAir },
  { id: "philippine-airlines", name: "Philippine Airlines", code: "PR", logo: philippineAirlines },
  { id: "pia", name: "Pakistan International Airlines", code: "PK", logo: pia },
  { id: "qatar-airways", name: "Qatar Airways", code: "QR", logo: qatarAirways },
  { id: "salamair", name: "SalamAir", code: "OV", logo: salamair },
  { id: "saudia", name: "Saudia", code: "SV", logo: saudia },
  { id: "singapore-airlines", name: "Singapore Airlines", code: "SQ", logo: singaporeAirlines },
  { id: "spicejet", name: "SpiceJet", code: "SG", logo: spicejet },
  { id: "srilankan", name: "SriLankan Airlines", code: "UL", logo: srilankan },
  { id: "turkish-airlines", name: "Turkish Airlines", code: "TK", logo: turkishAirlines },
  { id: "us-bangla", name: "US-Bangla Airlines", code: "BS", logo: usBangla },
  
  // Additional popular airlines
  { id: "air-india", name: "Air India", code: "AI", logo: placeholder },
  { id: "vistara", name: "Vistara", code: "UK", logo: placeholder },
  { id: "thai-airways", name: "Thai Airways", code: "TG", logo: placeholder },
  { id: "egyptair", name: "EgyptAir", code: "MS", logo: placeholder },
  { id: "royal-jordanian", name: "Royal Jordanian", code: "RJ", logo: placeholder },
  { id: "mea", name: "Middle East Airlines", code: "ME", logo: placeholder },
  { id: "ethiopian", name: "Ethiopian Airlines", code: "ET", logo: placeholder },
  { id: "kenya-airways", name: "Kenya Airways", code: "KQ", logo: placeholder },
  { id: "iran-air", name: "Iran Air", code: "IR", logo: placeholder },
  { id: "mahan-air", name: "Mahan Air", code: "W5", logo: placeholder },
  { id: "wizz-air-abu-dhabi", name: "Wizz Air Abu Dhabi", code: "5W", logo: placeholder },
  { id: "air-astana", name: "Air Astana", code: "KC", logo: placeholder },
  { id: "uzbekistan-airways", name: "Uzbekistan Airways", code: "HY", logo: placeholder },
  { id: "cebu-pacific", name: "Cebu Pacific", code: "5J", logo: placeholder },
  { id: "airasia", name: "AirAsia", code: "AK", logo: placeholder },
  { id: "scoot", name: "Scoot", code: "TR", logo: placeholder },
  { id: "vietnam-airlines", name: "Vietnam Airlines", code: "VN", logo: placeholder },
  { id: "china-southern", name: "China Southern Airlines", code: "CZ", logo: placeholder },
  { id: "china-eastern", name: "China Eastern Airlines", code: "MU", logo: placeholder },
  { id: "air-china", name: "Air China", code: "CA", logo: placeholder },
  { id: "korean-air", name: "Korean Air", code: "KE", logo: placeholder },
  { id: "asiana", name: "Asiana Airlines", code: "OZ", logo: placeholder },
  { id: "japan-airlines", name: "Japan Airlines", code: "JL", logo: placeholder },
  { id: "ana", name: "All Nippon Airways", code: "NH", logo: placeholder },
  { id: "lufthansa", name: "Lufthansa", code: "LH", logo: placeholder },
  { id: "swiss", name: "SWISS", code: "LX", logo: placeholder },
  { id: "austrian", name: "Austrian Airlines", code: "OS", logo: placeholder },
  { id: "klm", name: "KLM Royal Dutch Airlines", code: "KL", logo: placeholder },
  { id: "air-france", name: "Air France", code: "AF", logo: placeholder },
  { id: "virgin-atlantic", name: "Virgin Atlantic", code: "VS", logo: placeholder },
  { id: "american-airlines", name: "American Airlines", code: "AA", logo: placeholder },
  { id: "united-airlines", name: "United Airlines", code: "UA", logo: placeholder },
  { id: "delta", name: "Delta Air Lines", code: "DL", logo: placeholder },
  { id: "south-african", name: "South African Airways", code: "SA", logo: placeholder },
  { id: "royal-brunei", name: "Royal Brunei Airlines", code: "BI", logo: placeholder },
  { id: "garuda", name: "Garuda Indonesia", code: "GA", logo: placeholder },
  { id: "batik-air", name: "Batik Air", code: "ID", logo: placeholder },
  { id: "nepal-airlines", name: "Nepal Airlines", code: "RA", logo: placeholder },
  { id: "himalaya-airlines", name: "Himalaya Airlines", code: "H9", logo: placeholder },
  { id: "yeti-airlines", name: "Yeti Airlines", code: "YT", logo: placeholder },
  { id: "novoair", name: "NOVOAIR", code: "VQ", logo: placeholder },
  { id: "regent-airways", name: "Regent Airways", code: "RX", logo: placeholder },
  { id: "serene-air", name: "Serene Air", code: "ER", logo: placeholder },
  { id: "go-first", name: "Go First", code: "G8", logo: placeholder },
  { id: "air-transat", name: "Air Transat", code: "TS", logo: placeholder },
  { id: "aeroflot", name: "Aeroflot", code: "SU", logo: placeholder },
  { id: "pegasus", name: "Pegasus Airlines", code: "PC", logo: placeholder },
  { id: "sunexpress", name: "SunExpress", code: "XQ", logo: placeholder },
  { id: "tunisair", name: "Tunisair", code: "TU", logo: placeholder },
  { id: "royal-air-maroc", name: "Royal Air Maroc", code: "AT", logo: placeholder },
  { id: "saudigulf", name: "SaudiGulf Airlines", code: "6S", logo: placeholder },
  { id: "flyadeal", name: "flyadeal", code: "F3", logo: placeholder },
];

export const getAirlineById = (id: string): Airline | undefined => {
  return airlines.find((a) => a.id === id);
};

export const getAirlineByCode = (code: string): Airline | undefined => {
  return airlines.find((a) => a.code.toLowerCase() === code.toLowerCase());
};

export const getAirlineByName = (name: string): Airline | undefined => {
  return airlines.find((a) => a.name.toLowerCase() === name.toLowerCase());
};
