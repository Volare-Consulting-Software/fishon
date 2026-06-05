import { TideType } from "./tideType";

export interface TideStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface TidePrediction {
  time: string;
  height: number;
  type: TideType;
}

export interface TideResult {
  station: TideStation;
  predictions: TidePrediction[];
  byDate: Record<string, TidePrediction[]>;
}
