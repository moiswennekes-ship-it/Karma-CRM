// Karma points reference data — mirrors the Karma Club Points Table (points
// members, capped at Two Bedroom) and the Karma Royal Residences Points Table
// (fractional owners, up to Four Bedroom). Each cell is { w, d }: the weekly
// rate for a 7-night stay, and the daily rate applied to any remaining nights
// of a partial week. Edit the numbers directly here if Karma revises a rate card.

export const TIERS = ['Emerald', 'Titanium', 'Platinum', 'Silver']

export const ROOM_TYPES = [
  { id: 'studio', label: 'Studio', pax: 2 },
  { id: 'one_bed', label: 'One Bedroom', pax: 4 },
  { id: 'two_bed', label: 'Two Bedroom', pax: 6 },
  { id: 'three_bed', label: 'Three Bedroom', pax: 8 },
  { id: 'four_bed', label: 'Four Bedroom', pax: 10 },
]

// Points Members and prospects can only ever book up to a Two Bedroom.
// Only Fractional Owners can book a Three or Four Bedroom (the 'Two Bedroom
// Combination' and larger units).
export const ROOM_TYPES_POINTS = ROOM_TYPES.filter(rt => rt.id === 'studio' || rt.id === 'one_bed' || rt.id === 'two_bed')

export const SEASONS = [
  { id: 'red', label: 'Red season', hint: 'Peak / high-demand' },
  { id: 'white', label: 'White season', hint: 'Shoulder season' },
  { id: 'blue', label: 'Blue season', hint: 'Value / low season' },
]

// Karma Club Points Table — Points Members (capped at Two Bedroom).
export const MATRIX_POINTS = {
  Emerald: {
    studio: { red: { w: 210, d: 43 }, white: { w: 193, d: 38 }, blue: { w: 179, d: 35 } },
    one_bed: { red: { w: 263, d: 53 }, white: { w: 242, d: 48 }, blue: { w: 224, d: 44 } },
    two_bed: { red: { w: 315, d: 63 }, white: { w: 290, d: 58 }, blue: { w: 268, d: 54 } },
  },
  Titanium: {
    studio: { red: { w: 147, d: 29 }, white: { w: 136, d: 26 }, blue: { w: 125, d: 25 } },
    one_bed: { red: { w: 185, d: 36 }, white: { w: 171, d: 34 }, blue: { w: 158, d: 31 } },
    two_bed: { red: { w: 223, d: 44 }, white: { w: 207, d: 41 }, blue: { w: 190, d: 38 } },
  },
  Platinum: {
    studio: { red: { w: 132, d: 26 }, white: { w: 121, d: 24 }, blue: { w: 110, d: 21 } },
    one_bed: { red: { w: 165, d: 33 }, white: { w: 151, d: 30 }, blue: { w: 138, d: 28 } },
    two_bed: { red: { w: 198, d: 39 }, white: { w: 182, d: 36 }, blue: { w: 165, d: 33 } },
  },
  Silver: {
    studio: { red: { w: 120, d: 19 }, white: { w: 110, d: 17 }, blue: { w: 100, d: 16 } },
    one_bed: { red: { w: 150, d: 24 }, white: { w: 138, d: 22 }, blue: { w: 125, d: 20 } },
    two_bed: { red: { w: 180, d: 28 }, white: { w: 165, d: 26 }, blue: { w: 150, d: 24 } },
  },
}

// Karma Royal Residences Points Table — Fractional Owners (up to Four Bedroom).
export const MATRIX_FRACTIONAL = {
  Emerald: {
    studio: { red: { w: 210, d: 43 }, white: { w: 193, d: 38 }, blue: { w: 179, d: 35 } },
    one_bed: { red: { w: 263, d: 53 }, white: { w: 242, d: 48 }, blue: { w: 224, d: 44 } },
    two_bed: { red: { w: 315, d: 63 }, white: { w: 290, d: 58 }, blue: { w: 268, d: 54 } },
    three_bed: { red: { w: 369, d: 73 }, white: { w: 339, d: 66 }, blue: { w: 314, d: 61 } },
    four_bed: { red: { w: 423, d: 83 }, white: { w: 388, d: 75 }, blue: { w: 359, d: 70 } },
  },
  Titanium: {
    studio: { red: { w: 147, d: 29 }, white: { w: 136, d: 26 }, blue: { w: 125, d: 25 } },
    one_bed: { red: { w: 185, d: 36 }, white: { w: 171, d: 34 }, blue: { w: 158, d: 31 } },
    two_bed: { red: { w: 223, d: 44 }, white: { w: 207, d: 41 }, blue: { w: 190, d: 38 } },
    three_bed: { red: { w: 261, d: 51 }, white: { w: 242, d: 48 }, blue: { w: 223, d: 44 } },
    four_bed: { red: { w: 299, d: 58 }, white: { w: 277, d: 55 }, blue: { w: 256, d: 50 } },
  },
  Platinum: {
    studio: { red: { w: 132, d: 26 }, white: { w: 121, d: 24 }, blue: { w: 110, d: 21 } },
    one_bed: { red: { w: 165, d: 33 }, white: { w: 151, d: 30 }, blue: { w: 138, d: 28 } },
    two_bed: { red: { w: 198, d: 39 }, white: { w: 182, d: 36 }, blue: { w: 165, d: 33 } },
    three_bed: { red: { w: 231, d: 45 }, white: { w: 212, d: 41 }, blue: { w: 193, d: 38 } },
    four_bed: { red: { w: 264, d: 51 }, white: { w: 242, d: 47 }, blue: { w: 221, d: 44 } },
  },
  Silver: {
    studio: { red: { w: 120, d: 19 }, white: { w: 110, d: 17 }, blue: { w: 100, d: 16 } },
    one_bed: { red: { w: 150, d: 24 }, white: { w: 138, d: 22 }, blue: { w: 125, d: 20 } },
    two_bed: { red: { w: 180, d: 28 }, white: { w: 165, d: 26 }, blue: { w: 150, d: 24 } },
    three_bed: { red: { w: 210, d: 33 }, white: { w: 193, d: 30 }, blue: { w: 175, d: 28 } },
    four_bed: { red: { w: 240, d: 38 }, white: { w: 221, d: 34 }, blue: { w: 200, d: 32 } },
  },
}

// Points Elite: a Points Membership upgrade that gives access to any resort
// tier at one flat rate, regardless of which grade you actually book — you
// always pay Platinum's room/season rate. Confirmed against a real example:
// an Emerald studio for a red-season week is normally 210 pts, but 132 pts
// on Elite — exactly Platinum's studio/red rate below. This is the real
// rule, not a guess, so these numbers mirror MATRIX_POINTS.Platinum exactly.
export const MATRIX_POINTS_ELITE = {
  studio: { red: { w: 132, d: 26 }, white: { w: 121, d: 24 }, blue: { w: 110, d: 21 } },
  one_bed: { red: { w: 165, d: 33 }, white: { w: 151, d: 30 }, blue: { w: 138, d: 28 } },
  two_bed: { red: { w: 198, d: 39 }, white: { w: 182, d: 36 }, blue: { w: 165, d: 33 } },
}

// Member resorts by tier.
export const DESTINATIONS = [
  { id: 'karma-kandara-phase-5', name: "Karma Kandara Phase 5", tier: 'Emerald' },
  { id: 'mentari-residences', name: "Mentari Residences", tier: 'Emerald' },
  { id: 'karma-bavaria', name: "Karma Bavaria", tier: 'Emerald' },
  { id: 'karma-royal-haathi-mahal', name: "Karma Royal Haathi Mahal", tier: 'Emerald' },
  { id: 'karma-borgo-di-colleoli', name: "Karma Borgo di Colleoli", tier: 'Emerald' },
  { id: 'karma-chateau-de-samary', name: "Karma Chateau de Samary", tier: 'Emerald' },
  { id: 'karma-fushi', name: "Karma Fushi", tier: 'Emerald' },
  { id: 'karma-st-martin-s', name: "Karma St. Martin's", tier: 'Emerald' },
  { id: 'karma-vythiri-studio-suite-with-pool', name: "Karma Vythiri (Studio Suite with Pool)", tier: 'Emerald' },
  { id: 'karma-bayon', name: "Karma Bayon", tier: 'Titanium' },
  { id: 'imperial', name: "Imperial", tier: 'Titanium' },
  { id: 'karma-jimbaran', name: "Karma Jimbaran", tier: 'Titanium' },
  { id: 'karma-salford-hall', name: "Karma Salford Hall", tier: 'Titanium' },
  { id: 'karma-seven-lakes', name: "Karma Seven Lakes", tier: 'Titanium' },
  { id: 'karma-amaatra', name: "Karma Amaatra", tier: 'Titanium' },
  { id: 'karma-lake-of-menteith', name: "Karma Lake of Menteith", tier: 'Titanium' },
  { id: 'karma-karnak-suites', name: "Karma Karnak (Suites)", tier: 'Titanium' },
  { id: 'karma-la-herriza', name: "Karma La Herriza", tier: 'Titanium' },
  { id: 'karma-minoan', name: "Karma Minoan", tier: 'Titanium' },
  { id: 'karma-haveli', name: "Karma Haveli", tier: 'Platinum' },
  { id: 'karma-chakra', name: "Karma Chakra", tier: 'Platinum' },
  { id: 'karma-royal-palms', name: "Karma Royal Palms", tier: 'Platinum' },
  { id: 'karma-royal-monterio', name: "Karma Royal MonteRio", tier: 'Platinum' },
  { id: 'karma-royal-jimbaran', name: "Karma Royal Jimbaran", tier: 'Platinum' },
  { id: 'karma-sitabani', name: "Karma Sitabani", tier: 'Platinum' },
  { id: 'karma-song-hoai', name: "Karma Song Hoai", tier: 'Platinum' },
  { id: 'karma-duy-n', name: "Karma Duyên", tier: 'Platinum' },
  { id: 'karma-martam-retreat', name: "Karma Martam Retreat", tier: 'Platinum' },
  { id: 'karma-munnar', name: "Karma Munnar", tier: 'Platinum' },
  { id: 'karma-karnak-standard-cabins', name: "Karma Karnak (Standard Cabins)", tier: 'Platinum' },
  { id: 'karma-utopia', name: "Karma Utopia", tier: 'Platinum' },
  { id: 'karma-lakewood', name: "Karma Lakewood", tier: 'Platinum' },
  { id: 'karma-tashi', name: "Karma Tashi", tier: 'Platinum' },
  { id: 'karma-vythiri', name: "Karma Vythiri", tier: 'Platinum' },
  { id: 'karma-weekly-escapes', name: "Karma Weekly Escapes", tier: 'Platinum' },
  { id: 'karma-alliance', name: "Karma Alliance", tier: 'Platinum' },
  { id: 'karma-royal-candidasa', name: "Karma Royal Candidasa", tier: 'Silver' },
  { id: 'karma-royal-sanur', name: "Karma Royal Sanur", tier: 'Silver' },
  { id: 'karma-royal-boat-lagoon', name: "Karma Royal Boat Lagoon", tier: 'Silver' },
  { id: 'karma-sunshine-village', name: "Karma Sunshine Village", tier: 'Silver' },
  { id: 'karma-golden-camp', name: "Karma Golden Camp", tier: 'Silver' },
  { id: 'karma-panalee', name: "Karma Panalee", tier: 'Silver' },
  { id: 'karma-sawet', name: "Karma Sawet", tier: 'Silver' },
  { id: 'ye-olde-salutation-inn', name: "Ye Olde Salutation Inn", tier: 'Silver' },
]

// Points Membership packages.
export const PACKAGES = [
  { id: 'pkg-132', name: '132 Points', pts: 132 },
  { id: 'pkg-165', name: '165 Points', pts: 165 },
  { id: 'pkg-185', name: '185 Points', pts: 185 },
  { id: 'pkg-198', name: '198 Points', pts: 198 },
  { id: 'pkg-231', name: '231 Points', pts: 231 },
  { id: 'pkg-263', name: '263 Points', pts: 263 },
  { id: 'pkg-315', name: '315 Points', pts: 315 },
]

// Fractional ownership shares.
export const FRACTIONAL_PACKAGES = [
  { id: 'frac-studio-half', name: "Studio — Half Share", pts: 301 },
  { id: 'frac-studio-full', name: "Studio — Full Share", pts: 602 },
  { id: 'frac-1bed-half', name: "1-Bedroom — Half Share", pts: 371 },
  { id: 'frac-1bed-full', name: "1-Bedroom — Full Share", pts: 742 },
  { id: 'frac-2bed-half', name: "2-Bedroom — Half Share", pts: 442 },
  { id: 'frac-2bed-full', name: "2-Bedroom — Full Share", pts: 882 },
]

// How many years of points can realistically be banked/accumulated toward a
// single bigger stay, when suggesting a lower-commitment package alongside the
// main recommendation.
export const BANKING_YEARS = 3
