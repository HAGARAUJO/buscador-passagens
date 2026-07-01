// Mock de voos para o FlyTracker
// Dados mockados simulando respostas de API de busca de passagens aéreas

export const MOCK_FLIGHTS = [
  {
    id: '1',
    airline: 'LATAM',
    flightNumber: 'LA1234',
    origin: 'GRU',
    originCity: 'São Paulo',
    destination: 'GIG',
    destinationCity: 'Rio de Janeiro',
    departureDate: '2026-07-15',
    departureTime: '06:30',
    arrivalTime: '08:15',
    duration: '1h45m',
    priceBRL: 289.90,
    miles: 12000,
    milesConversion: 1.0, // 1 milha = R$ 0,024
    stops: 0,
    seatsAvailable: 12,
  },
  {
    id: '2',
    airline: 'GOL',
    flightNumber: 'GJ5678',
    origin: 'GRU',
    originCity: 'São Paulo',
    destination: 'GIG',
    destinationCity: 'Rio de Janeiro',
    departureDate: '2026-07-15',
    departureTime: '08:45',
    arrivalTime: '10:20',
    duration: '1h35m',
    priceBRL: 349.90,
    miles: 8000,
    milesConversion: 1.0,
    stops: 0,
    seatsAvailable: 5,
  },
  {
    id: '3',
    airline: 'Azul',
    flightNumber: 'AD9012',
    origin: 'GRU',
    originCity: 'São Paulo',
    destination: 'GIG',
    destinationCity: 'Rio de Janeiro',
    departureDate: '2026-07-15',
    departureTime: '11:00',
    arrivalTime: '12:40',
    duration: '1h40m',
    priceBRL: 419.00,
    miles: 6500,
    milesConversion: 1.0,
    stops: 0,
    seatsAvailable: 8,
  },
  {
    id: '4',
    airline: 'LATAM',
    flightNumber: 'LA5678',
    origin: 'GRU',
    originCity: 'São Paulo',
    destination: 'BSB',
    destinationCity: 'Brasília',
    departureDate: '2026-07-15',
    departureTime: '07:00',
    arrivalTime: '09:10',
    duration: '2h10m',
    priceBRL: 459.90,
    miles: 15000,
    milesConversion: 1.0,
    stops: 0,
    seatsAvailable: 20,
  },
  {
    id: '5',
    airline: 'GOL',
    flightNumber: 'GJ3456',
    origin: 'GRU',
    originCity: 'São Paulo',
    destination: 'BSB',
    destinationCity: 'Brasília',
    departureDate: '2026-07-15',
    departureTime: '14:30',
    arrivalTime: '16:40',
    duration: '2h10m',
    priceBRL: 389.00,
    miles: 11000,
    milesConversion: 1.0,
    stops: 0,
    seatsAvailable: 3,
  },
  {
    id: '6',
    airline: 'Azul',
    flightNumber: 'AD7890',
    origin: 'GRU',
    originCity: 'São Paulo',
    destination: 'REC',
    destinationCity: 'Recife',
    departureDate: '2026-07-15',
    departureTime: '05:50',
    arrivalTime: '09:00',
    duration: '3h10m',
    priceBRL: 629.00,
    miles: 22000,
    milesConversion: 1.0,
    stops: 1,
    stopsLocation: 'SSA',
    seatsAvailable: 15,
  },
  {
    id: '7',
    airline: 'LATAM',
    flightNumber: 'LA9012',
    origin: 'GRU',
    originCity: 'São Paulo',
    destination: 'FOR',
    destinationCity: 'Fortaleza',
    departureDate: '2026-07-15',
    departureTime: '08:20',
    arrivalTime: '11:50',
    duration: '3h30m',
    priceBRL: 549.90,
    miles: 18000,
    milesConversion: 1.0,
    stops: 0,
    seatsAvailable: 7,
  },
  {
    id: '8',
    airline: 'GOL',
    flightNumber: 'GJ7890',
    origin: 'GRU',
    originCity: 'São Paulo',
    destination: 'POA',
    destinationCity: 'Porto Alegre',
    departureDate: '2026-07-15',
    departureTime: '18:00',
    arrivalTime: '20:10',
    duration: '2h10m',
    priceBRL: 339.00,
    miles: 9500,
    milesConversion: 1.0,
    stops: 0,
    seatsAvailable: 10,
  },
  {
    id: '9',
    airline: 'Azul',
    flightNumber: 'AD3456',
    origin: 'GIG',
    originCity: 'Rio de Janeiro',
    destination: 'GRU',
    destinationCity: 'São Paulo',
    departureDate: '2026-07-16',
    departureTime: '07:30',
    arrivalTime: '09:05',
    duration: '1h35m',
    priceBRL: 259.00,
    miles: 7000,
    milesConversion: 1.0,
    stops: 0,
    seatsAvailable: 22,
  },
  {
    id: '10',
    airline: 'LATAM',
    flightNumber: 'LA6789',
    origin: 'GIG',
    originCity: 'Rio de Janeiro',
    destination: 'GRU',
    destinationCity: 'São Paulo',
    departureDate: '2026-07-16',
    departureTime: '16:15',
    arrivalTime: '17:50',
    duration: '1h35m',
    priceBRL: 319.00,
    miles: 10000,
    milesConversion: 1.0,
    stops: 0,
    seatsAvailable: 6,
  },
];

export const MOCK_ALERTS = [
  {
    id: 'a1',
    origin: 'GRU',
    originCity: 'São Paulo',
    destination: 'GIG',
    destinationCity: 'Rio de Janeiro',
    maxPrice: 350,
    maxMiles: 10000,
    active: true,
    createdAt: '2026-06-28',
  },
  {
    id: 'a2',
    origin: 'GRU',
    originCity: 'São Paulo',
    destination: 'REC',
    destinationCity: 'Recife',
    maxPrice: 600,
    maxMiles: 20000,
    active: true,
    createdAt: '2026-06-25',
  },
  {
    id: 'a3',
    origin: 'CGH',
    originCity: 'São Paulo (Congonhas)',
    destination: 'POA',
    destinationCity: 'Porto Alegre',
    maxPrice: 400,
    maxMiles: 12000,
    active: false,
    createdAt: '2026-06-20',
  },
  {
    id: 'a4',
    origin: 'BSB',
    originCity: 'Brasília',
    destination: 'FOR',
    destinationCity: 'Fortaleza',
    maxPrice: 700,
    maxMiles: 25000,
    active: true,
    createdAt: '2026-06-18',
  },
];

export const POPULAR_AIRPORTS = [
  { code: 'GRU', city: 'São Paulo (Guarulhos)' },
  { code: 'CGH', city: 'São Paulo (Congonhas)' },
  { code: 'GIG', city: 'Rio de Janeiro (Galeão)' },
  { code: 'SDU', city: 'Rio de Janeiro (Santos Dumont)' },
  { code: 'BSB', city: 'Brasília' },
  { code: 'CNF', city: 'Belo Horizonte (Confins)' },
  { code: 'POA', city: 'Porto Alegre' },
  { code: 'REC', city: 'Recife' },
  { code: 'FOR', city: 'Fortaleza' },
  { code: 'SSA', city: 'Salvador' },
  { code: 'CWB', city: 'Curitiba' },
  { code: 'MAO', city: 'Manaus' },
];

// Funções mockadas para simular API

export function searchFlights({ origin, destination, date }) {
  const results = MOCK_FLIGHTS.filter((f) => {
    const matchOrigin = origin ? f.origin === origin.toUpperCase() : true;
    const matchDest = destination ? f.destination === destination.toUpperCase() : true;
    const matchDate = date ? f.departureDate === date : true;
    return matchOrigin && matchDest && matchDate;
  });

  return results.sort((a, b) => a.priceBRL - b.priceBRL);
}

export function createAlert(alertData) {
  const newAlert = {
    id: `a${Date.now()}`,
    ...alertData,
    active: true,
    createdAt: new Date().toISOString().split('T')[0],
  };
  MOCK_ALERTS.unshift(newAlert);
  return newAlert;
}

export function toggleAlert(alertId) {
  const alert = MOCK_ALERTS.find((a) => a.id === alertId);
  if (alert) {
    alert.active = !alert.active;
  }
  return alert;
}

export function deleteAlert(alertId) {
  const idx = MOCK_ALERTS.findIndex((a) => a.id === alertId);
  if (idx !== -1) {
    MOCK_ALERTS.splice(idx, 1);
    return true;
  }
  return false;
}

export { MOCK_FLIGHTS as default };
