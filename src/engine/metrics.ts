import { SimResultRow, SimulationResult } from './simulation';
import { SimConfig } from './simulation';

export interface PerformanceMetrics {
    rpTotalReturn: number;
    bmTotalReturn: number;
    rpCagr: number;
    bmCagr: number;
    rpVolatility: number;
    bmVolatility: number;
    rpMaxDrawdown: number;
    bmMaxDrawdown: number;
    rpSharpeRatio: number;
    bmSharpeRatio: number;
    rpTotalIncome: number;
    bmTotalIncome: number;
    rpIncomeDurationMonths: number;
    bmIncomeDurationMonths: number;
    rpRebalanceCount: number;
    rpEndingBalance: number;
    bmEndingBalance: number;
    stdTotalReturn: number;
    stdCagr: number;
    stdVolatility: number;
    stdMaxDrawdown: number;
    stdSharpeRatio: number;
    stdTotalIncome: number;
    stdEndingBalance: number;
    stdIncomeDurationMonths: number;
}

function calculateAnnualizedVolatility(rows: SimResultRow[], getVal: (r: SimResultRow) => number): number {
    if (rows.length < 2) return 0;

    const returns: number[] = [];
    for (let i = 1; i < rows.length; i++) {
        const prev = getVal(rows[i - 1]);
        const curr = getVal(rows[i]);
        if (prev > 0) {
            returns.push((curr - prev) / prev);
        } else {
            returns.push(0);
        }
    }

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
    return Math.sqrt(variance) * Math.sqrt(12);
}

export function calculateMetrics(result: SimulationResult, config: SimConfig): PerformanceMetrics {
    const { rows, finale } = result;
    const startBal = config.startingBalance;

    // Total Return
    const rpTotalReturn = startBal > 0 ? (finale.rpEndingBalance + finale.rpTotalIncome) / startBal - 1 : 0;
    const bmTotalReturn = startBal > 0 ? (finale.bmEndingBalance + finale.bmTotalIncome) / startBal - 1 : 0;
    const stdTotalReturn = startBal > 0 ? (finale.stdEndingBalance + finale.stdTotalIncome) / startBal - 1 : 0;

    // CAGR
    const nYears = rows.length / 12;
    const rpCagr = startBal > 0 && nYears > 0 ? Math.pow(finale.rpEndingBalance / startBal, 1 / nYears) - 1 : 0;
    const bmCagr = startBal > 0 && nYears > 0 ? Math.pow(finale.bmEndingBalance / startBal, 1 / nYears) - 1 : 0;
    const stdCagr = startBal > 0 && nYears > 0 ? Math.pow(finale.stdEndingBalance / startBal, 1 / nYears) - 1 : 0;

    // Volatility
    const rpVolatility = calculateAnnualizedVolatility(rows, r => r.rpTotal);
    const bmVolatility = calculateAnnualizedVolatility(rows, r => r.bmTotal);
    const stdVolatility = calculateAnnualizedVolatility(rows, r => r.stdTotal);

    // Max Drawdown
    const rpMaxDrawdown = Math.min(0, ...rows.map(r => r.rpDrawdown));
    const bmMaxDrawdown = Math.min(0, ...rows.map(r => r.bmDrawdown));
    const stdMaxDrawdown = Math.min(0, ...rows.map(r => r.stdDrawdown));

    // Risk Free Rate assumption for Sharpe
    const riskFreeRate = 0.02; // 2% 

    const rpSharpeRatio = rpVolatility > 0 ? (rpCagr - riskFreeRate) / rpVolatility : 0;
    const bmSharpeRatio = bmVolatility > 0 ? (bmCagr - riskFreeRate) / bmVolatility : 0;
    const stdSharpeRatio = stdVolatility > 0 ? (stdCagr - riskFreeRate) / stdVolatility : 0;

    // Income Duration
    const rpFirstDepletedIdx = rows.findIndex(r => r.rpCpiDepleted);
    const rpIncomeDurationMonths = rpFirstDepletedIdx >= 0 ? rpFirstDepletedIdx : rows.length;

    // Benchmark duration (when total hits 0)
    const bmFirstDepletedIdx = rows.findIndex(r => r.bmTotal <= 0);
    const bmIncomeDurationMonths = bmFirstDepletedIdx >= 0 ? bmFirstDepletedIdx : rows.length;

    // Standard duration
    const stdFirstDepletedIdx = rows.findIndex(r => r.stdTotal <= 0);
    const stdIncomeDurationMonths = stdFirstDepletedIdx >= 0 ? stdFirstDepletedIdx : rows.length;

    return {
        rpTotalReturn,
        bmTotalReturn,
        stdTotalReturn,
        rpCagr,
        bmCagr,
        stdCagr,
        rpVolatility,
        bmVolatility,
        stdVolatility,
        rpMaxDrawdown,
        bmMaxDrawdown,
        stdMaxDrawdown,
        rpSharpeRatio,
        bmSharpeRatio,
        stdSharpeRatio,
        rpTotalIncome: finale.rpTotalIncome,
        bmTotalIncome: finale.bmTotalIncome,
        stdTotalIncome: finale.stdTotalIncome,
        rpIncomeDurationMonths,
        bmIncomeDurationMonths,
        stdIncomeDurationMonths,
        rpRebalanceCount: finale.rpRebalanceCount,
        rpEndingBalance: finale.rpEndingBalance,
        bmEndingBalance: finale.bmEndingBalance,
        stdEndingBalance: finale.stdEndingBalance
    };
}
