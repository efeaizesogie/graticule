// One everyday icon per answer, so the choices scan at a glance.
const ICONS: [RegExp, string][] = [
  [/internet/i, '📶'],
  [/forest/i, '🌳'],
  [/babies/i, '👶'],
  [/rich/i, '💰'],
  [/hot/i, '🌡️'],
  [/rain/i, '🌧️'],
  [/crowded/i, '🧍'],
  [/desert/i, '🏜️'],
  [/over 65/i, '👵'],
  [/children/i, '🧒'],
  [/cities/i, '🏙️'],
  [/electricity/i, '💡'],
  [/are men/i, '👨'],
  [/CO₂/i, '🏭'],
  [/born abroad/i, '✈️'],
  [/phone/i, '📱'],
  [/tourists/i, '🧳'],
  [/air/i, '😷'],
  [/women/i, '👩‍💼'],
  [/water/i, '🚰'],
  [/military/i, '🪖'],
  [/oil/i, '🛢️'],
  [/growing/i, '📈'],
  [/farmland/i, '🌾'],
  [/find a job/i, '💼'],
  [/live$/i, '⏳'],
];

export function iconFor(label: string): string {
  for (const [re, icon] of ICONS) if (re.test(label)) return icon;
  return '◦';
}
