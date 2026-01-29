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
import airIndia from "@/assets/airlines/air-india.png";
import vistara from "@/assets/airlines/vistara.png";
import thaiAirways from "@/assets/airlines/thai-airways.png";
import egyptair from "@/assets/airlines/egyptair.png";
import royalJordanian from "@/assets/airlines/royal-jordanian.png";
import mea from "@/assets/airlines/mea.png";
import ethiopian from "@/assets/airlines/ethiopian.png";
import kenyaAirways from "@/assets/airlines/kenya-airways.png";
import iranAir from "@/assets/airlines/iran-air.png";
import mahanAir from "@/assets/airlines/mahan-air.png";
import wizzAir from "@/assets/airlines/wizz-air.png";
import airAstana from "@/assets/airlines/air-astana.png";
import uzbekistanAirways from "@/assets/airlines/uzbekistan-airways.png";
import cebuPacific from "@/assets/airlines/cebu-pacific.png";
import airasia from "@/assets/airlines/airasia.png";
import scoot from "@/assets/airlines/scoot.png";
import vietnamAirlines from "@/assets/airlines/vietnam-airlines.png";
import chinaSouthern from "@/assets/airlines/china-southern.png";
import chinaEastern from "@/assets/airlines/china-eastern.png";
import airChina from "@/assets/airlines/air-china.png";
import koreanAir from "@/assets/airlines/korean-air.png";
import asiana from "@/assets/airlines/asiana.png";
import japanAirlines from "@/assets/airlines/japan-airlines.png";
import ana from "@/assets/airlines/ana.png";
import lufthansa from "@/assets/airlines/lufthansa.png";
import swiss from "@/assets/airlines/swiss.png";
import austrian from "@/assets/airlines/austrian.png";
import klm from "@/assets/airlines/klm.png";
import airFrance from "@/assets/airlines/air-france.png";
import virginAtlantic from "@/assets/airlines/virgin-atlantic.png";
import americanAirlines from "@/assets/airlines/american-airlines.png";
import unitedAirlines from "@/assets/airlines/united-airlines.png";
import delta from "@/assets/airlines/delta.png";
import southAfrican from "@/assets/airlines/south-african.png";
import royalBrunei from "@/assets/airlines/royal-brunei.png";
import garuda from "@/assets/airlines/garuda.png";
import batikAir from "@/assets/airlines/batik-air.png";
import nepalAirlines from "@/assets/airlines/nepal-airlines.png";
import himalayaAirlines from "@/assets/airlines/himalaya-airlines.png";
import yetiAirlines from "@/assets/airlines/yeti-airlines.png";
import novoair from "@/assets/airlines/novoair.png";
import regentAirways from "@/assets/airlines/regent-airways.png";
import sereneAir from "@/assets/airlines/serene-air.png";
import goFirst from "@/assets/airlines/go-first.png";
import airTransat from "@/assets/airlines/air-transat.png";
import aeroflot from "@/assets/airlines/aeroflot.png";
import pegasus from "@/assets/airlines/pegasus.png";
import sunexpress from "@/assets/airlines/sunexpress.png";
import tunisair from "@/assets/airlines/tunisair.png";
import royalAirMaroc from "@/assets/airlines/royal-air-maroc.png";
import saudigulf from "@/assets/airlines/saudigulf.png";
import flyadeal from "@/assets/airlines/flyadeal.png";

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
  { id: "air-india", name: "Air India", code: "AI", logo: airIndia },
  { id: "vistara", name: "Vistara", code: "UK", logo: vistara },
  { id: "thai-airways", name: "Thai Airways", code: "TG", logo: thaiAirways },
  { id: "egyptair", name: "EgyptAir", code: "MS", logo: egyptair },
  { id: "royal-jordanian", name: "Royal Jordanian", code: "RJ", logo: royalJordanian },
  { id: "mea", name: "Middle East Airlines", code: "ME", logo: mea },
  { id: "ethiopian", name: "Ethiopian Airlines", code: "ET", logo: ethiopian },
  { id: "kenya-airways", name: "Kenya Airways", code: "KQ", logo: kenyaAirways },
  { id: "iran-air", name: "Iran Air", code: "IR", logo: iranAir },
  { id: "mahan-air", name: "Mahan Air", code: "W5", logo: mahanAir },
  { id: "wizz-air-abu-dhabi", name: "Wizz Air Abu Dhabi", code: "5W", logo: wizzAir },
  { id: "air-astana", name: "Air Astana", code: "KC", logo: airAstana },
  { id: "uzbekistan-airways", name: "Uzbekistan Airways", code: "HY", logo: uzbekistanAirways },
  { id: "cebu-pacific", name: "Cebu Pacific", code: "5J", logo: cebuPacific },
  { id: "airasia", name: "AirAsia", code: "AK", logo: airasia },
  { id: "scoot", name: "Scoot", code: "TR", logo: scoot },
  { id: "vietnam-airlines", name: "Vietnam Airlines", code: "VN", logo: vietnamAirlines },
  { id: "china-southern", name: "China Southern Airlines", code: "CZ", logo: chinaSouthern },
  { id: "china-eastern", name: "China Eastern Airlines", code: "MU", logo: chinaEastern },
  { id: "air-china", name: "Air China", code: "CA", logo: airChina },
  { id: "korean-air", name: "Korean Air", code: "KE", logo: koreanAir },
  { id: "asiana", name: "Asiana Airlines", code: "OZ", logo: asiana },
  { id: "japan-airlines", name: "Japan Airlines", code: "JL", logo: japanAirlines },
  { id: "ana", name: "All Nippon Airways", code: "NH", logo: ana },
  { id: "lufthansa", name: "Lufthansa", code: "LH", logo: lufthansa },
  { id: "swiss", name: "SWISS", code: "LX", logo: swiss },
  { id: "austrian", name: "Austrian Airlines", code: "OS", logo: austrian },
  { id: "klm", name: "KLM Royal Dutch Airlines", code: "KL", logo: klm },
  { id: "air-france", name: "Air France", code: "AF", logo: airFrance },
  { id: "virgin-atlantic", name: "Virgin Atlantic", code: "VS", logo: virginAtlantic },
  { id: "american-airlines", name: "American Airlines", code: "AA", logo: americanAirlines },
  { id: "united-airlines", name: "United Airlines", code: "UA", logo: unitedAirlines },
  { id: "delta", name: "Delta Air Lines", code: "DL", logo: delta },
  { id: "south-african", name: "South African Airways", code: "SA", logo: southAfrican },
  { id: "royal-brunei", name: "Royal Brunei Airlines", code: "BI", logo: royalBrunei },
  { id: "garuda", name: "Garuda Indonesia", code: "GA", logo: garuda },
  { id: "batik-air", name: "Batik Air", code: "ID", logo: batikAir },
  { id: "nepal-airlines", name: "Nepal Airlines", code: "RA", logo: nepalAirlines },
  { id: "himalaya-airlines", name: "Himalaya Airlines", code: "H9", logo: himalayaAirlines },
  { id: "yeti-airlines", name: "Yeti Airlines", code: "YT", logo: yetiAirlines },
  { id: "novoair", name: "NOVOAIR", code: "VQ", logo: novoair },
  { id: "regent-airways", name: "Regent Airways", code: "RX", logo: regentAirways },
  { id: "serene-air", name: "Serene Air", code: "ER", logo: sereneAir },
  { id: "go-first", name: "Go First", code: "G8", logo: goFirst },
  { id: "air-transat", name: "Air Transat", code: "TS", logo: airTransat },
  { id: "aeroflot", name: "Aeroflot", code: "SU", logo: aeroflot },
  { id: "pegasus", name: "Pegasus Airlines", code: "PC", logo: pegasus },
  { id: "sunexpress", name: "SunExpress", code: "XQ", logo: sunexpress },
  { id: "tunisair", name: "Tunisair", code: "TU", logo: tunisair },
  { id: "royal-air-maroc", name: "Royal Air Maroc", code: "AT", logo: royalAirMaroc },
  { id: "saudigulf", name: "SaudiGulf Airlines", code: "6S", logo: saudigulf },
  { id: "flyadeal", name: "flyadeal", code: "F3", logo: flyadeal },
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
