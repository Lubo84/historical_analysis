export interface MonthlyData {
  date: string; // YYYY-MM 
  asx200: number; // monthly return e.g. 0.015 for 1.5%
  msci: number;
  ausBond: number;
  cash: number;
  cpiProxy: number; // approximate quarterly change divided by 3, annualized later
}

export interface ProxyReturns {
  date: string;
  growth: number;
  balanced: number;
  conservative: number;
  cpiPlus: number;
  cashRate: number; // for benchmark
}

import realDataJson from './real_data.json';

// Cast the JSON array as ProxyReturns[]
export const historicalData: ProxyReturns[] = realDataJson as ProxyReturns[];

