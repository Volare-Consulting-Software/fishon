"use client";

import type {
  ForecastRow,
  TidePrediction,
  HourlyWindPoint,
} from "@volare-consulting/fishon";
import {
  Area,
  AreaChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const BRAND = "#5e27d2";
const WAVE = "#1e6fb8";
const AXIS = "#9c97aa";
const GRID = "#ece9f3";

interface TidePoint {
  hour: number;
  value: number;
  real: boolean;
  label?: string;
}
interface PeriodPoint {
  slot: string;
  value: number;
  windDirDeg?: number;
  windDirCompass?: string;
}
interface WindPoint {
  hour: number;
  value: number;
  gust: number | null;
  windDirDeg: number | null;
  windDirCompass: string | null;
}

const round = (v: number) => Math.round(v * 100) / 100;

// All-zero temp/wind/gust/wave = a window fishweather hadn't captured, not calm.
function isCaptured(row: ForecastRow): boolean {
  return !(
    row.tempF === 0 &&
    row.windSpeed === 0 &&
    row.gust === 0 &&
    row.waveHeight === 0
  );
}

function hourLabel(hour: number): string {
  const whole = Math.floor(hour) % 24;
  const minutes = Math.round((hour - Math.floor(hour)) * 60);
  const period = whole < 12 ? "AM" : "PM";
  const h12 = whole % 12 === 0 ? 12 : whole % 12;
  return minutes === 0
    ? `${h12} ${period}`
    : `${h12}:${String(minutes).padStart(2, "0")} ${period}`;
}

function time12(hhmm: string): string {
  const [hh, mm] = hhmm.split(":").map(Number);
  const hours = hh ?? 0;
  const period = hours < 12 ? "AM" : "PM";
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${String(mm ?? 0).padStart(2, "0")} ${period}`;
}

function periodPoints(
  periods: ForecastRow[],
  getValue: (row: ForecastRow) => number
): PeriodPoint[] {
  return periods
    .filter(isCaptured)
    .sort((a, b) => (a.period === "PM" ? 1 : 0) - (b.period === "PM" ? 1 : 0))
    .map((row) => ({
      slot: row.period === "PM" ? "Afternoon" : "Morning",
      value: getValue(row),
      windDirDeg: row.windDirDeg,
      windDirCompass: row.windDirCompass,
    }));
}

function tideSeries(tides: TidePrediction[]): TidePoint[] {
  const points: TidePoint[] = tides
    .map((tide) => {
      const time = tide.time.split(" ")[1] ?? "00:00";
      const [hh, mm] = time.split(":");
      return {
        hour: round(Number(hh) + Number(mm) / 60),
        value: tide.height,
        real: true,
        label: `${tide.type} @ ${time12(time)}`,
      };
    })
    .sort((a, b) => a.hour - b.hour);
  if (points.length === 0) return [];
  const series = [...points];
  const first = points[0]!;
  const last = points[points.length - 1]!;
  if (first.hour > 0) series.unshift({ hour: 0, value: first.value, real: false });
  if (last.hour < 24) series.push({ hour: 24, value: last.value, real: false });
  return series;
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return round(values.reduce((a, b) => a + b, 0) / values.length);
}

const tideXAxis = {
  dataKey: "hour" as const,
  type: "number" as const,
  domain: [0, 24] as [number, number],
  ticks: [0, 6, 12, 18, 24],
  tick: { fill: AXIS, fontSize: 11 },
  tickFormatter: (value: number) => hourLabel(value),
};

const slotXAxis = {
  dataKey: "slot" as const,
  type: "category" as const,
  scale: "point" as const,
  padding: { left: 28, right: 28 },
  tick: { fill: AXIS, fontSize: 11 },
  tickFormatter: (value: string) =>
    value === "Afternoon" ? "Afternoon · ~3 PM" : "Morning · ~9 AM",
};

const tooltipStyle = {
  background: "#ffffff",
  border: "1px solid #e4e2ea",
  borderRadius: 8,
  fontSize: 12,
  color: "#1a1625",
};
const chartMargin = { top: 16, right: 12, bottom: 0, left: 0 };

function WindArrow(props: {
  cx?: number;
  cy?: number;
  payload?: { windDirDeg?: number | null };
}) {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined) return <g key={`${cx}-${cy}`} />;
  const angle = (payload?.windDirDeg ?? 0) + 180;
  return (
    <g key={`${cx}-${cy}`} transform={`translate(${cx} ${cy}) rotate(${angle})`}>
      <path d="M0 -7 L4.5 5 L0 2 L-4.5 5 Z" fill={BRAND} />
    </g>
  );
}

const COMPASS16 = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
];
// Cardinal direction for the wind tooltip: prefer the compass field, else
// derive it from the degrees so the tooltip always carries a direction.
function compassOf(deg?: number | null, fallback?: string | null): string {
  if (fallback) return fallback;
  if (deg === null || deg === undefined) return "";
  return COMPASS16[Math.round(deg / 22.5) % 16] ?? "";
}

export function DayCharts({
  tides,
  periods,
  hourlyWind,
}: {
  tides: TidePrediction[];
  periods: ForecastRow[];
  hourlyWind?: HourlyWindPoint[];
}) {
  const tide = tideSeries(tides ?? []);
  const safePeriods = periods ?? [];
  const hourly: WindPoint[] = (hourlyWind ?? []).map((p) => ({
    hour: p.hour,
    value: p.windSpeed,
    gust: p.windGust,
    windDirDeg: p.windDirDeg,
    windDirCompass: p.windDirCompass,
  }));
  const useHourly = hourly.length >= 2;

  const windPeriod = periodPoints(safePeriods, (r) => r.windSpeed);
  const wave = periodPoints(safePeriods, (r) => r.waveHeight);
  const avgWind = useHourly
    ? avg(hourly.map((h) => h.value))
    : avg(windPeriod.map((p) => p.value));
  const avgWave = avg(wave.map((p) => p.value));

  return (
    <div className="space-y-3 rounded-lg border border-line bg-surface p-3">
      {tide.length > 0 && (
        <ChartBlock title="Tide (ft, MLLW) · full day">
          <AreaChart data={tide} margin={chartMargin}>
            <defs>
              <linearGradient id="tideFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BRAND} stopOpacity={0.35} />
                <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis {...tideXAxis} />
            <YAxis tick={{ fill: AXIS, fontSize: 11 }} width={30} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(value) => hourLabel(Number(value))}
              formatter={(value: number, _n, item) => [
                `${value} ft${item.payload.real && item.payload.label ? ` — ${item.payload.label}` : ""}`,
                "Tide",
              ]}
            />
            <Area type="monotone" dataKey="value" stroke={BRAND} strokeWidth={2} fill="url(#tideFill)" dot={false} isAnimationActive={false} />
          </AreaChart>
        </ChartBlock>
      )}

      {useHourly ? (
        <ChartBlock title={`Wind (mph) · avg ${avgWind} · hourly (NOAA) · arrows show direction`}>
          <LineChart data={hourly} margin={chartMargin}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis {...tideXAxis} />
            <YAxis tick={{ fill: AXIS, fontSize: 11 }} width={30} domain={[0, (max: number) => Math.max(5, Math.ceil(max + 2))]} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(value) => hourLabel(Number(value))}
              formatter={(value: number, _n, item) => {
                const dir = compassOf(
                  item.payload.windDirDeg,
                  item.payload.windDirCompass
                );
                return [`${value} mph${dir ? ` from ${dir}` : ""}`, "Wind"];
              }}
            />
            <Line type="monotone" dataKey="value" stroke={BRAND} strokeWidth={2} strokeOpacity={0} dot={WindArrow} activeDot={false} isAnimationActive={false} />
          </LineChart>
        </ChartBlock>
      ) : (
        windPeriod.length > 0 && (
          <ChartBlock title={`Wind (mph) · avg ${avgWind} · arrows show direction`}>
            <LineChart data={windPeriod} margin={chartMargin}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis {...slotXAxis} />
              <YAxis tick={{ fill: AXIS, fontSize: 11 }} width={30} domain={[0, (max: number) => Math.max(5, Math.ceil(max + 2))]} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={(slot) => (slot === "Afternoon" ? "Afternoon · ~3 PM" : "Morning · ~9 AM")} formatter={(value: number, _n, item) => { const dir = compassOf(item.payload.windDirDeg, item.payload.windDirCompass); return [`${value} mph${dir ? ` from ${dir}` : ""}`, "Wind"]; }} />
              <Line type="linear" dataKey="value" stroke={BRAND} strokeWidth={2} strokeOpacity={0} dot={WindArrow} activeDot={false} isAnimationActive={false}>
                <LabelList dataKey="value" position="top" offset={12} formatter={(v: number) => `${v} mph`} style={{ fill: "#1a1625", fontSize: 11, fontWeight: 600 }} />
              </Line>
            </LineChart>
          </ChartBlock>
        )
      )}

      {wave.length > 0 && (
        <ChartBlock title={`Wave height (ft) · avg ${avgWave}`}>
          <AreaChart data={wave} margin={chartMargin}>
            <defs>
              <linearGradient id="waveFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={WAVE} stopOpacity={0.3} />
                <stop offset="100%" stopColor={WAVE} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis {...slotXAxis} />
            <YAxis tick={{ fill: AXIS, fontSize: 11 }} width={30} domain={[0, (max: number) => Math.max(2, Math.ceil(max + 1))]} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value} ft`, "Waves"]} />
            <Area type="linear" dataKey="value" stroke={WAVE} strokeWidth={2} fill="url(#waveFill)" dot={{ r: 4, fill: WAVE, strokeWidth: 0 }} isAnimationActive={false}>
              <LabelList dataKey="value" position="top" offset={12} formatter={(v: number) => `${v} ft`} style={{ fill: "#1a1625", fontSize: 11, fontWeight: 600 }} />
            </Area>
          </AreaChart>
        </ChartBlock>
      )}

      <p className="text-[11px] text-ink-3">
        Tide is NOAA&apos;s full-day high/low curve.{" "}
        {useHourly
          ? "Wind is NOAA's hourly forecast."
          : "Wind is fishweather's two daily readings."}{" "}
        Wave height is fishweather&apos;s morning &amp; afternoon readings.
      </p>
    </div>
  );
}

function ChartBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactElement;
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-3">
        {title}
      </div>
      <ResponsiveContainer width="100%" height={130}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}
