// Horario ESTRUCTURADO de las tiendas (selector de días + apertura/cierre)
// más una heurística de respaldo para los horarios antiguos en texto libre.

// days: "all" | "weekdays" (L-V) | "weekend" (S-D) | "0".."6" (0 = lunes)
export interface StoreHoursRow {
  days: string;
  open: string; // "HH:MM"
  close: string; // "HH:MM"
}

export const DAY_SPECS = ["all", "weekdays", "weekend"] as const;

const SHORT_DAY_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function daysOfSpec(spec: string): number[] {
  if (spec === "all") return [0, 1, 2, 3, 4, 5, 6];
  if (spec === "weekdays") return [0, 1, 2, 3, 4];
  if (spec === "weekend") return [5, 6];
  const n = Number(spec);
  return Number.isInteger(n) && n >= 0 && n <= 6 ? [n] : [];
}

function toMinutes(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function isOpenFromHours(
  hours: StoreHoursRow[],
  now: Date = new Date()
): boolean | null {
  if (hours.length === 0) return null;
  const today = (now.getDay() + 6) % 7; // 0 = lunes
  const minutes = now.getHours() * 60 + now.getMinutes();
  let any = false;
  for (const row of hours) {
    const start = toMinutes(row.open);
    const end = toMinutes(row.close);
    if (start === null || end === null) continue;
    any = true;
    if (!daysOfSpec(row.days).includes(today)) continue;
    if (start === end) return true; // 24 horas
    const open =
      end < start
        ? minutes >= start || minutes < end // cruza medianoche
        : minutes >= start && minutes < end;
    if (open) return true;
  }
  return any ? false : null;
}

export type TimeFormat = "24h" | "12h";

// "14:30" → "2:30 PM" cuando la tienda prefiere formato AM/PM (LatAm).
function formatTime(time: string, format: TimeFormat): string {
  if (format === "24h") return time;
  const [h, m] = time.split(":").map(Number);
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

// Texto compacto en español para cabeceras y tarjetas: "L-V 9:00–20:00 ·
// Sáb 10:00–14:00". Se guarda también en stores.schedule. Una fila con
// apertura igual al cierre significa abierto las 24 horas ese día.
export function formatHours(
  hours: StoreHoursRow[],
  format: TimeFormat = "24h"
): string {
  const label = (spec: string) => {
    if (spec === "all") return "Todos los días";
    if (spec === "weekdays") return "L-V";
    if (spec === "weekend") return "S-D";
    return SHORT_DAY_ES[Number(spec)] ?? spec;
  };
  return hours
    .filter((r) => toMinutes(r.open) !== null && toMinutes(r.close) !== null)
    .map((r) => {
      if (toMinutes(r.open) === toMinutes(r.close)) {
        return r.days === "all" ? "Abierto 24/7" : `${label(r.days)} 24 h`;
      }
      return `${label(r.days)} ${formatTime(r.open, format)}–${formatTime(r.close, format)}`;
    })
    .join(" · ");
}

// Heurística para interpretar el horario en texto libre de las tiendas
// ("L-V 9:00-20:00", "Lun a Vie 9:00-14:00 y 17:00-20:00; Sáb 10:00-14:00")
// y saber si está abierta ahora. Devuelve null si el texto no es parseable:
// en ese caso el marketplace no afirma ni abierto ni cerrado.

const DAY_TOKENS: Array<[RegExp, number]> = [
  [/^(lunes|lun|monday|mon|l)$/i, 0],
  [/^(martes|mar|tuesday|tue|m)$/i, 1],
  [/^(mi[eé]rcoles|mi[eé]|wednesday|wed|x)$/i, 2],
  [/^(jueves|jue|thursday|thu|j)$/i, 3],
  [/^(viernes|vie|friday|fri|v)$/i, 4],
  [/^(s[aá]bados?|s[aá]b|saturday|sat|s)$/i, 5],
  [/^(domingos?|dom|sunday|sun|d)$/i, 6],
];

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function dayIndexOf(token: string): number | null {
  for (const [re, idx] of DAY_TOKENS) {
    if (re.test(token)) return idx;
  }
  return null;
}

// Días a los que aplica una línea: rango ("L-V", "lunes a viernes"),
// lista ("Sáb, Dom") o todos si no menciona ninguno.
function parseDays(line: string): number[] {
  const beforeTimes = line.split(/\d/)[0] ?? line;
  const tokens = beforeTimes.split(/[\s,;.·/]+|[-–—]/).filter(Boolean);
  const days: number[] = [];
  for (const token of tokens) {
    const idx = dayIndexOf(token);
    if (idx !== null && !days.includes(idx)) days.push(idx);
  }
  if (days.length === 0) return ALL_DAYS;

  const isRange =
    days.length === 2 &&
    /[a-záé]\s*([-–—]|\ba\b|\bto\b)\s*[a-záé]/i.test(beforeTimes);
  if (isRange) {
    const [from, to] = days;
    const expanded: number[] = [];
    for (let d = from; ; d = (d + 1) % 7) {
      expanded.push(d);
      if (d === to) break;
    }
    return expanded;
  }
  return days;
}

// Rangos horarios en minutos desde medianoche: "9:00-20:00", "9.30 a 14h".
function parseTimeRanges(line: string): Array<[number, number]> {
  const re =
    /(\d{1,2})(?:[:.h](\d{2}))?\s*(?:[-–—]|\ba\b|\bto\b)\s*(\d{1,2})(?:[:.h](\d{2}))?/g;
  const ranges: Array<[number, number]> = [];
  for (const m of line.matchAll(re)) {
    const h1 = Number(m[1]);
    const m1 = Number(m[2] ?? 0);
    const h2 = Number(m[3]);
    const m2 = Number(m[4] ?? 0);
    if (h1 > 24 || h2 > 24 || m1 > 59 || m2 > 59) continue;
    ranges.push([h1 * 60 + m1, h2 * 60 + m2]);
  }
  return ranges;
}

export function isOpenNow(
  schedule: string | null | undefined,
  now: Date = new Date()
): boolean | null {
  if (!schedule?.trim()) return null;

  const today = (now.getDay() + 6) % 7; // 0 = lunes
  const minutes = now.getHours() * 60 + now.getMinutes();
  const lines = schedule.split(/\n|;|·|\|/).filter((l) => l.trim());

  let parsedAny = false;

  for (const line of lines) {
    const days = parseDays(line);
    if (/cerrad[oa]|closed/i.test(line)) {
      parsedAny = true;
      if (days.includes(today)) return false;
      continue;
    }
    const ranges = parseTimeRanges(line);
    if (ranges.length === 0) continue;
    parsedAny = true;
    if (!days.includes(today)) continue;
    for (const [start, end] of ranges) {
      const open =
        end <= start
          ? minutes >= start || minutes < end // cruza medianoche
          : minutes >= start && minutes < end;
      if (open) return true;
    }
  }

  // Hubo horario parseable pero ningún rango cubre este momento.
  return parsedAny ? false : null;
}

// Distancia en línea recta entre dos coordenadas (fórmula de haversine).
export function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
