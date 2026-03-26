export interface Node {
  id: string;
  barangay: string;
  lat: number;
  lng: number;
  status: 'online' | 'offline' | 'maintenance';
  lastUpdate: string;
  battery: number;
  thresholds: {
    tempMax: number;
    humMin: number;
    aqiMax: number;
  };
}

export interface Reading {
  id?: string;
  nodeId: string;
  temp: number;
  humidity: number;
  aqi: number;
  pressure: number;
  battery: number;
  timestamp: string;
}

export interface Alert {
  id?: string;
  nodeId: string;
  barangay: string;
  type: 'heat' | 'fire' | 'air_quality' | 'weather' | 'thunderstorm';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  resolved: boolean;
}

export type RiskLevel = 'SAFE' | 'ALERT' | 'DANGER';

export interface WeatherData {
  current: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
    visibility: number;
    wind_speed: number;
    description: string;
    main: string;
    icon: string;
  };
  alerts: {
    thunderstorm: boolean;
    rainProbability: number;
    summary: string;
  };
}

export interface FirstAidGuide {
  id?: string;
  condition: string;
  category: 'burns' | 'wounds' | 'poisoning' | 'heat' | 'bites' | 'other';
  overview: string;
  emergencySigns: string[];
  itemsNeeded: string[];
  steps: string[];
  otcGuidance?: string;
  notToDo: string[];
  aftercare: string;
  visualGuide?: string;
  imageQueries: string[];
  videoQuery: string;
}

export interface News {
  id?: string;
  title: string;
  summary: string;
  date: string;
  category: string;
  timestamp: string;
}
