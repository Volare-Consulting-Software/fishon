// Hourly wind from the NOAA NWS gridpoint forecast, normalized to local time
// and US units. Powers the intraday wind curve the AM/PM scrape can't provide.
export interface HourlyWindPoint {
  /** Local clock time "HH:MM". */
  time: string;
  /** Local hour of day, 0-24 (fractional). */
  hour: number;
  windSpeed: number; // mph
  windGust: number | null; // mph
  windDirDeg: number | null;
  windDirCompass: string | null;
}

export interface HourlyWindResult {
  /** Local yyyy-mm-dd -> hourly points for that day. */
  byDate: Record<string, HourlyWindPoint[]>;
  timeZone: string;
}
