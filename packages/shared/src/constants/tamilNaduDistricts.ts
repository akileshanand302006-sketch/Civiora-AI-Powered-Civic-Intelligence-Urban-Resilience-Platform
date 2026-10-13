// ============================================================
// Civiora — Canonical Tamil Nadu 38 Districts Reference Dataset
// Authoritative Government of Tamil Nadu Administrative Boundary Model
// Covers all 38 districts with IDs, centroids, bounding boxes & aliases
// ============================================================

export interface TamilNaduDistrict {
  id: string; // Canonical slug (e.g., 'chennai', 'coimbatore', 'the_nilgiris')
  name: string; // Official English display name
  tamilName: string; // Tamil script official name
  code: string; // Regional abbreviation / RTO prefix
  headquarters: string;
  center: [number, number]; // [longitude, latitude] GeoJSON convention
  bounds: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
  aliases: string[]; // Known variants and spellings
  division: 'North' | 'Central' | 'South' | 'West';
}

export const TAMIL_NADU_STATE_BOUNDS = {
  south: 8.0883,
  west: 76.22,
  north: 13.55,
  east: 80.35,
} as const;

export const TAMIL_NADU_CENTER: [number, number] = [78.6569, 11.1271]; // [lng, lat]
export const TAMIL_NADU_DEFAULT_ZOOM = 7;

export const TAMIL_NADU_DISTRICTS: TamilNaduDistrict[] = [
  {
    id: 'ariyalur',
    name: 'Ariyalur',
    tamilName: 'அரியலூர்',
    code: 'AR',
    headquarters: 'Ariyalur',
    center: [79.0747, 11.1401],
    bounds: { south: 10.88, west: 78.85, north: 11.45, east: 79.45 },
    aliases: ['Ariyalur', 'Ariyaloor'],
    division: 'Central',
  },
  {
    id: 'chengalpattu',
    name: 'Chengalpattu',
    tamilName: 'செங்கல்பட்டு',
    code: 'CGL',
    headquarters: 'Chengalpattu',
    center: [79.9864, 12.6921],
    bounds: { south: 12.25, west: 79.7, north: 12.95, east: 80.25 },
    aliases: ['Chengalpattu', 'Chingleput', 'Chengalpet'],
    division: 'North',
  },
  {
    id: 'chennai',
    name: 'Chennai',
    tamilName: 'சென்னை',
    code: 'CHN',
    headquarters: 'Chennai',
    center: [80.2707, 13.0827],
    bounds: { south: 12.9, west: 80.12, north: 13.25, east: 80.35 },
    aliases: ['Chennai', 'Madras'],
    division: 'North',
  },
  {
    id: 'coimbatore',
    name: 'Coimbatore',
    tamilName: 'கோயம்புத்தூர்',
    code: 'CBE',
    headquarters: 'Coimbatore',
    center: [76.9558, 11.0168],
    bounds: { south: 10.35, west: 76.6, north: 11.3, east: 77.15 },
    aliases: ['Coimbatore', 'Kovai', 'Cbe'],
    division: 'West',
  },
  {
    id: 'cuddalore',
    name: 'Cuddalore',
    tamilName: 'கடலூர்',
    code: 'CUD',
    headquarters: 'Cuddalore',
    center: [79.768, 11.748],
    bounds: { south: 11.18, west: 79.15, north: 11.95, east: 79.85 },
    aliases: ['Cuddalore', 'Kadalur'],
    division: 'Central',
  },
  {
    id: 'dharmapuri',
    name: 'Dharmapuri',
    tamilName: 'தர்மபுரி',
    code: 'DPI',
    headquarters: 'Dharmapuri',
    center: [78.1584, 12.1211],
    bounds: { south: 11.75, west: 77.65, north: 12.45, east: 78.6 },
    aliases: ['Dharmapuri'],
    division: 'West',
  },
  {
    id: 'dindigul',
    name: 'Dindigul',
    tamilName: 'திண்டுக்கல்',
    code: 'DGL',
    headquarters: 'Dindigul',
    center: [77.9803, 10.3673],
    bounds: { south: 9.95, west: 77.25, north: 10.75, east: 78.35 },
    aliases: ['Dindigul', 'Dindigul District'],
    division: 'South',
  },
  {
    id: 'erode',
    name: 'Erode',
    tamilName: 'ஈரோடு',
    code: 'ERD',
    headquarters: 'Erode',
    center: [77.7172, 11.341],
    bounds: { south: 11.0, west: 76.85, north: 11.85, east: 77.95 },
    aliases: ['Erode'],
    division: 'West',
  },
  {
    id: 'kallakurichi',
    name: 'Kallakurichi',
    tamilName: 'கள்ளக்குறிச்சி',
    code: 'KLK',
    headquarters: 'Kallakurichi',
    center: [78.9629, 11.7384],
    bounds: { south: 11.45, west: 78.6, north: 12.1, east: 79.35 },
    aliases: ['Kallakurichi', 'Kallakkurichi'],
    division: 'Central',
  },
  {
    id: 'kancheepuram',
    name: 'Kancheepuram',
    tamilName: 'காஞ்சிபுரம்',
    code: 'KCH',
    headquarters: 'Kancheepuram',
    center: [79.7036, 12.8342],
    bounds: { south: 12.55, west: 79.45, north: 13.05, east: 80.05 },
    aliases: ['Kancheepuram', 'Kanchipuram', 'Conjeevaram'],
    division: 'North',
  },
  {
    id: 'kanniyakumari',
    name: 'Kanniyakumari',
    tamilName: 'கன்னியாகுமரி',
    code: 'KK',
    headquarters: 'Nagercoil',
    center: [77.5385, 8.0883],
    bounds: { south: 8.05, west: 77.1, north: 8.55, east: 77.65 },
    aliases: ['Kanniyakumari', 'Kanyakumari', 'Cape Comorin'],
    division: 'South',
  },
  {
    id: 'karur',
    name: 'Karur',
    tamilName: 'கரூர்',
    code: 'KRR',
    headquarters: 'Karur',
    center: [78.0766, 10.9601],
    bounds: { south: 10.65, west: 77.75, north: 11.15, east: 78.35 },
    aliases: ['Karur'],
    division: 'Central',
  },
  {
    id: 'krishnagiri',
    name: 'Krishnagiri',
    tamilName: 'கிருஷ்ணகிரி',
    code: 'KGI',
    headquarters: 'Krishnagiri',
    center: [78.2146, 12.5186],
    bounds: { south: 12.15, west: 77.45, north: 12.9, east: 78.7 },
    aliases: ['Krishnagiri', 'Hosur District'],
    division: 'West',
  },
  {
    id: 'madurai',
    name: 'Madurai',
    tamilName: 'மதுரை',
    code: 'MDU',
    headquarters: 'Madurai',
    center: [78.1198, 9.9252],
    bounds: { south: 9.6, west: 77.8, north: 10.2, east: 78.45 },
    aliases: ['Madurai'],
    division: 'South',
  },
  {
    id: 'mayiladuthurai',
    name: 'Mayiladuthurai',
    tamilName: 'மயிலாடுதுறை',
    code: 'MYD',
    headquarters: 'Mayiladuthurai',
    center: [79.6524, 11.1075],
    bounds: { south: 10.95, west: 79.45, north: 11.35, east: 79.95 },
    aliases: ['Mayiladuthurai', 'Mayuram'],
    division: 'Central',
  },
  {
    id: 'nagapattinam',
    name: 'Nagapattinam',
    tamilName: 'நாகப்பட்டினம்',
    code: 'NGP',
    headquarters: 'Nagapattinam',
    center: [79.8448, 10.7672],
    bounds: { south: 10.25, west: 79.55, north: 11.05, east: 79.95 },
    aliases: ['Nagapattinam', 'Nagapattinam District', 'Nagapatnam'],
    division: 'Central',
  },
  {
    id: 'namakkal',
    name: 'Namakkal',
    tamilName: 'நாமக்கல்',
    code: 'NKL',
    headquarters: 'Namakkal',
    center: [78.1674, 11.2189],
    bounds: { south: 11.0, west: 77.65, north: 11.55, east: 78.5 },
    aliases: ['Namakkal'],
    division: 'West',
  },
  {
    id: 'perambalur',
    name: 'Perambalur',
    tamilName: 'பெரம்பலூர்',
    code: 'PBL',
    headquarters: 'Perambalur',
    center: [78.8797, 11.2333],
    bounds: { south: 11.05, west: 78.65, north: 11.45, east: 79.15 },
    aliases: ['Perambalur'],
    division: 'Central',
  },
  {
    id: 'pudukkottai',
    name: 'Pudukkottai',
    tamilName: 'புதுக்கோட்டை',
    code: 'PDK',
    headquarters: 'Pudukkottai',
    center: [78.8219, 10.3797],
    bounds: { south: 9.85, west: 78.45, north: 10.7, east: 79.25 },
    aliases: ['Pudukkottai', 'Pudukottai'],
    division: 'Central',
  },
  {
    id: 'ramanathapuram',
    name: 'Ramanathapuram',
    tamilName: 'ராமநாதபுரம்',
    code: 'RMD',
    headquarters: 'Ramanathapuram',
    center: [78.8395, 9.3639],
    bounds: { south: 9.05, west: 78.15, north: 9.95, east: 79.35 },
    aliases: ['Ramanathapuram', 'Ramnad', 'Rameswaram District'],
    division: 'South',
  },
  {
    id: 'ranipet',
    name: 'Ranipet',
    tamilName: 'ராணிப்பேட்டை',
    code: 'RNP',
    headquarters: 'Ranipet',
    center: [79.333, 12.9272],
    bounds: { south: 12.65, west: 79.15, north: 13.15, east: 79.8 },
    aliases: ['Ranipet', 'Ranipettai'],
    division: 'North',
  },
  {
    id: 'salem',
    name: 'Salem',
    tamilName: 'சேலம்',
    code: 'SLM',
    headquarters: 'Salem',
    center: [78.146, 11.6643],
    bounds: { south: 11.35, west: 77.75, north: 12.1, east: 78.65 },
    aliases: ['Salem'],
    division: 'West',
  },
  {
    id: 'sivaganga',
    name: 'Sivaganga',
    tamilName: 'சிவகங்கை',
    code: 'SVG',
    headquarters: 'Sivaganga',
    center: [78.4809, 9.8433],
    bounds: { south: 9.5, west: 78.1, north: 10.25, east: 78.95 },
    aliases: ['Sivaganga', 'Sivagangai'],
    division: 'South',
  },
  {
    id: 'tenkasi',
    name: 'Tenkasi',
    tamilName: 'தென்காசி',
    code: 'TKS',
    headquarters: 'Tenkasi',
    center: [77.315, 8.9594],
    bounds: { south: 8.7, west: 77.1, north: 9.35, east: 77.65 },
    aliases: ['Tenkasi', 'Thenkasi'],
    division: 'South',
  },
  {
    id: 'thanjavur',
    name: 'Thanjavur',
    tamilName: 'தஞ்சாவூர்',
    code: 'TNJ',
    headquarters: 'Thanjavur',
    center: [79.1378, 10.787],
    bounds: { south: 10.15, west: 78.75, north: 11.15, east: 79.55 },
    aliases: ['Thanjavur', 'Tanjore'],
    division: 'Central',
  },
  {
    id: 'theni',
    name: 'Theni',
    tamilName: 'தேனி',
    code: 'THN',
    headquarters: 'Theni',
    center: [77.4768, 10.0104],
    bounds: { south: 9.6, west: 77.15, north: 10.25, east: 77.75 },
    aliases: ['Theni'],
    division: 'South',
  },
  {
    id: 'thoothukudi',
    name: 'Thoothukudi',
    tamilName: 'தூத்துக்குடி',
    code: 'TKD',
    headquarters: 'Thoothukudi',
    center: [78.1348, 8.7642],
    bounds: { south: 8.35, west: 77.8, north: 9.35, east: 78.35 },
    aliases: ['Thoothukudi', 'Tuticorin', 'Thoothukkudi'],
    division: 'South',
  },
  {
    id: 'tiruchirappalli',
    name: 'Tiruchirappalli',
    tamilName: 'திருச்சிராப்பள்ளி',
    code: 'TRY',
    headquarters: 'Tiruchirappalli',
    center: [78.7047, 10.7905],
    bounds: { south: 10.45, west: 78.25, north: 11.25, east: 79.05 },
    aliases: ['Tiruchirappalli', 'Trichy', 'Tiruchi'],
    division: 'Central',
  },
  {
    id: 'tirunelveli',
    name: 'Tirunelveli',
    tamilName: 'திருநெல்வேலி',
    code: 'TNV',
    headquarters: 'Tirunelveli',
    center: [77.7567, 8.7139],
    bounds: { south: 8.25, west: 77.35, north: 9.15, east: 77.95 },
    aliases: ['Tirunelveli', 'Nellai'],
    division: 'South',
  },
  {
    id: 'tirupathur',
    name: 'Tirupathur',
    tamilName: 'திருப்பத்தூர்',
    code: 'TPR_N',
    headquarters: 'Tirupathur',
    center: [78.5678, 12.4925],
    bounds: { south: 12.2, west: 78.35, north: 12.8, east: 78.95 },
    aliases: ['Tirupathur', 'Tirupattur'],
    division: 'North',
  },
  {
    id: 'tiruppur',
    name: 'Tiruppur',
    tamilName: 'திருப்பூர்',
    code: 'TPR',
    headquarters: 'Tiruppur',
    center: [77.3411, 11.1085],
    bounds: { south: 10.35, west: 77.1, north: 11.35, east: 77.75 },
    aliases: ['Tiruppur', 'Tirupur'],
    division: 'West',
  },
  {
    id: 'tiruvallur',
    name: 'Tiruvallur',
    tamilName: 'திருவள்ளூர்',
    code: 'TLR',
    headquarters: 'Tiruvallur',
    center: [79.9083, 13.1432],
    bounds: { south: 12.95, west: 79.45, north: 13.55, east: 80.35 },
    aliases: ['Tiruvallur', 'Thiruvallur'],
    division: 'North',
  },
  {
    id: 'tiruvannamalai',
    name: 'Tiruvannamalai',
    tamilName: 'திருவண்ணாமலை',
    code: 'TVM',
    headquarters: 'Tiruvannamalai',
    center: [79.0747, 12.2253],
    bounds: { south: 11.85, west: 78.65, north: 12.75, east: 79.5 },
    aliases: ['Tiruvannamalai', 'Thiruvannamalai'],
    division: 'North',
  },
  {
    id: 'tiruvarur',
    name: 'Tiruvarur',
    tamilName: 'திருவாரூர்',
    code: 'TVR',
    headquarters: 'Tiruvarur',
    center: [79.6344, 10.7725],
    bounds: { south: 10.35, west: 79.35, north: 11.05, east: 79.85 },
    aliases: ['Tiruvarur', 'Thiruvarur'],
    division: 'Central',
  },
  {
    id: 'vellore',
    name: 'Vellore',
    tamilName: 'வேலூர்',
    code: 'VEL',
    headquarters: 'Vellore',
    center: [79.1325, 12.9165],
    bounds: { south: 12.65, west: 78.75, north: 13.15, east: 79.35 },
    aliases: ['Vellore'],
    division: 'North',
  },
  {
    id: 'viluppuram',
    name: 'Viluppuram',
    tamilName: 'விழுப்புரம்',
    code: 'VPM',
    headquarters: 'Viluppuram',
    center: [79.4924, 11.9401],
    bounds: { south: 11.6, west: 79.05, north: 12.35, east: 80.05 },
    aliases: ['Viluppuram', 'Villupuram'],
    division: 'Central',
  },
  {
    id: 'virudhunagar',
    name: 'Virudhunagar',
    tamilName: 'விருதுநகர்',
    code: 'VRD',
    headquarters: 'Virudhunagar',
    center: [77.9579, 9.5872],
    bounds: { south: 9.2, west: 77.4, north: 9.9, east: 78.35 },
    aliases: ['Virudhunagar', 'Virudunagar'],
    division: 'South',
  },
  {
    id: 'the_nilgiris',
    name: 'The Nilgiris',
    tamilName: 'நீலகிரி',
    code: 'NIL',
    headquarters: 'Udhagamandalam (Ooty)',
    center: [76.7032, 11.4102],
    bounds: { south: 11.15, west: 76.22, north: 11.75, east: 77.05 },
    aliases: ['The Nilgiris', 'Nilgiris', 'Ooty', 'Udhagamandalam'],
    division: 'West',
  },
];

/**
 * Total count of canonical districts in Tamil Nadu
 */
export const TAMIL_NADU_DISTRICT_COUNT = TAMIL_NADU_DISTRICTS.length; // 38

/**
 * Lookup map by canonical ID
 */
export const TAMIL_NADU_DISTRICT_BY_ID: Record<string, TamilNaduDistrict> =
  Object.fromEntries(TAMIL_NADU_DISTRICTS.map((d) => [d.id, d]));

/**
 * Normalizes a district search query, address string, or input name into canonical district
 */
export function resolveTamilNaduDistrict(nameOrQuery: string): TamilNaduDistrict | undefined {
  if (!nameOrQuery) return undefined;
  const clean = nameOrQuery.toLowerCase().trim().replace(/ district$/i, '');

  // Exact ID match
  if (TAMIL_NADU_DISTRICT_BY_ID[clean]) {
    return TAMIL_NADU_DISTRICT_BY_ID[clean];
  }

  // Exact or alias match
  return TAMIL_NADU_DISTRICTS.find((d) => {
    if (d.id === clean || d.name.toLowerCase() === clean) return true;
    return d.aliases.some((a) => a.toLowerCase() === clean || clean.includes(a.toLowerCase()));
  });
}

/**
 * Finds the nearest or containing district for given geographic coordinates [lng, lat]
 */
export function findDistrictByCoordinates(
  lng: number,
  lat: number
): TamilNaduDistrict | undefined {
  if (!isWithinTamilNadu(lng, lat)) return undefined;

  // Filter districts whose bounding box contains the coordinate (with slight tolerance)
  const candidates = TAMIL_NADU_DISTRICTS.filter((d) => {
    return (
      lat >= d.bounds.south - 0.05 &&
      lat <= d.bounds.north + 0.05 &&
      lng >= d.bounds.west - 0.05 &&
      lng <= d.bounds.east + 0.05
    );
  });

  // If candidate districts found, choose the one with minimum distance to centroid
  if (candidates.length > 0) {
    let best = candidates[0]!;
    let minDist = Infinity;
    for (const c of candidates) {
      const dx = c.center[0] - lng;
      const dy = c.center[1] - lat;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        best = c;
      }
    }
    return best;
  }

  // Fallback to nearest district within reasonable vicinity (~80km)
  let nearest: TamilNaduDistrict | undefined = undefined;
  let minDistance = Infinity;

  for (const d of TAMIL_NADU_DISTRICTS) {
    const dx = d.center[0] - lng;
    const dy = d.center[1] - lat;
    const dist = dx * dx + dy * dy;
    if (dist < minDistance) {
      minDistance = dist;
      nearest = d;
    }
  }

  return minDistance <= 0.75 * 0.75 ? nearest : undefined;
}

/**
 * Validates whether coordinates fall within the broader Tamil Nadu territorial limits
 */
export function isWithinTamilNadu(lng: number, lat: number): boolean {
  // Check outer Tamil Nadu bounding box
  if (
    lat < TAMIL_NADU_STATE_BOUNDS.south - 0.05 ||
    lat > TAMIL_NADU_STATE_BOUNDS.north + 0.05 ||
    lng < TAMIL_NADU_STATE_BOUNDS.west - 0.05 ||
    lng > TAMIL_NADU_STATE_BOUNDS.east + 0.05
  ) {
    return false;
  }

  // Exclude Karnataka/Bangalore notch (Lat > 12.82 and Lng < 78.0)
  if (lat > 12.82 && lng < 78.0) {
    return false;
  }

  return true;
}

