// One surprising fact per map, written from the fetched numbers.
// {ISO3} is replaced with that country's value, formatted like the legend.
// {count>X} / {count<X} counts countries above / below X; {n} = countries with data.
// The build fails if a token can't be resolved, so a fact can never cite missing data.
export const FACTS = {
  'male-share': 'Qatar is {QAT}% male. Migrant workers, most of them men, mean men outnumber women there more than two to one.',
  remittances: 'Money sent home by Tajiks working abroad equals {TJK}% of Tajikistan\'s GDP, the highest share on Earth.',
  'fuel-exports': 'Fuel is {IRQ}% of everything Iraq exports. Guyana only started pumping oil in 2019, and it is already at {GUY}%.',
  forest: 'Suriname is {SUR}% forest. The United Kingdom is {GBR}%.',
  density: 'Macao squeezes about {MAC} people into each square kilometre. Greenland has {GRL}, roughly one person per 7 km².',
  fertility: 'South Korea\'s fertility rate is {KOR} births per woman, the lowest of any country and well under half the 2.1 needed to hold a population steady.',
  'over-65': 'In Japan, {JPN}% of people are 65 or older. In Qatar it is {QAT}%.',
  internet: 'Bahrain, Kuwait, Saudi Arabia and the UAE all report {KWT}% of people online. India, with the second-most internet users of any country, is at {IND}%.',
  'electricity-access': 'Only {SSD}% of people in South Sudan have electricity at home. In India it is {IND}%.',
  mobile: 'Most of the world has more phone subscriptions than people: {count>100} of {n} countries are above 100 per 100. Fiji reports {FJI}.',
  renewables: 'Nigeria gets {NGA}% of its energy from renewables, far more than the United States ({USA}%). Most of it is firewood and charcoal burned for cooking.',
  co2: 'The average person in Qatar emits {QAT} tonnes of CO₂ a year. The average Nigerian emits {NGA}.',
  urban: 'Liechtenstein, one of the richest countries on Earth, counts only {LIE}% of its people as urban. Its towns are too small to count as cities.',
  military: 'Ukraine spends {UKR}% of its GDP on its military. Costa Rica, which abolished its army in 1948, spends {CRI}%.',
  arable: 'Bangladesh crops {BGD}% of its land, the highest share in the world. Brazil, a farming superpower, crops only {BRA}%.',
  'women-work': '{NGA}% of Nigerian women are in the workforce, higher than in the United States ({USA}%) or the UK ({GBR}%).',
  'under-15': 'In the Central African Republic {CAF}% of people are under 15. In South Korea it is {KOR}%.',
  migrants: '{QAT}% of the people living in Qatar were born in another country. In China it is {CHN}%.',
  'agri-gdp': 'Farming, forestry and fishing make up {NER}% of Niger\'s economy, and {USA}% of the United States\'.',
  'life-exp': 'A baby born in Monaco can expect to live {MCO} years. A baby born in Nigeria can expect {NGA}.',
  'infant-mortality': 'In San Marino, {SMR} babies in every 1,000 die before their first birthday. In South Sudan it is {SSD}.',
  'pop-growth': 'The UAE\'s population grew {ARE}% in a single year. Moldova\'s growth was {MDA}%: it is shrinking as people emigrate.',
  'health-spend': 'The United States spends {USA}% of its GDP on health, more than any other large economy. The UK spends {GBR}%.',
  pm25: 'The WHO says air is safe below 5 µg/m³ of fine particles. Only {count<5} of {n} countries on this map meet that.',
  'gdp-pc': 'Ireland ranks near the top at ${IRL} per person, partly because multinational companies book their profits there.',
  unemployment: 'South Africa\'s unemployment rate is {ZAF}%. Qatar\'s is {QAT}%.',
  'teen-births': 'In Niger, {NER} of every 1,000 girls aged 15–19 give birth each year. In South Korea it is {KOR}.',
  'clean-water': 'Only {NGA}% of Nigerians have safe drinking water at home, compared with {USA}% of Americans.',
  tourism: 'Andorra welcomed {AND} tourist arrivals for every resident in 2019. Many were day-trippers from Spain and France coming to shop tax-free.',
  'water-stress': 'Kuwait uses {KWT}% of its renewable freshwater, about 38 times what nature refills. Most of the rest comes from desalinated seawater.',
  aid: 'Foreign aid to Tuvalu equals {TUV}% of its national income, more than everything the country earns.',
};

// Nicer display names than the World Bank's catalogue style.
export const NAMES = {
  KOR: 'South Korea', PRK: 'North Korea', COD: 'DR Congo', COG: 'Congo', EGY: 'Egypt', IRN: 'Iran', RUS: 'Russia', SYR: 'Syria',
  VEN: 'Venezuela', YEM: 'Yemen', GMB: 'The Gambia', BHS: 'The Bahamas', LAO: 'Laos', KGZ: 'Kyrgyzstan', SVK: 'Slovakia',
  MAC: 'Macao', HKG: 'Hong Kong', FSM: 'Micronesia', SOM: 'Somalia', VCT: 'St Vincent & the Grenadines', KNA: 'St Kitts & Nevis',
  LCA: 'St Lucia', TUR: 'Türkiye', CZE: 'Czechia', NRU: 'Nauru', PSE: 'Palestine', CIV: "Côte d'Ivoire", STP: 'São Tomé & Príncipe',
  BRN: 'Brunei', MAF: 'St Martin', SXM: 'Sint Maarten', VIR: 'US Virgin Islands', VGB: 'British Virgin Islands', PRI: 'Puerto Rico',
  TCA: 'Turks & Caicos', MNP: 'N. Mariana Islands', ASM: 'American Samoa', CUW: 'Curaçao', USA: 'United States', GBR: 'United Kingdom',
  ARE: 'UAE', CAF: 'Central African Rep.', DOM: 'Dominican Rep.', BIH: 'Bosnia & Herzegovina', TTO: 'Trinidad & Tobago', ATG: 'Antigua & Barbuda',
  XKX: 'Kosovo',
};
