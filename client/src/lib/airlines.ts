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

export interface Airline {
  id: string;
  name: string;
  code: string;
  logo: string;
}

export const airlines: Airline[] = [
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
