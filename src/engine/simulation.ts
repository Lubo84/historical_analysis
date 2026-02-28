import { ProxyReturns } from './data';

export interface SimConfig {
    startingBalance: number;
    drawdownRate: number; // e.g. 0.05 for 5%
    drawdownRecalculation: 'Annual' | 'Fixed at Start';
    scenario: 'Full Period' | 'GFC' | 'COVID' | 'Rising Rates' | 'Bull Market';
    portfolioView: 'Growth 80/20' | 'Balanced 80/20' | 'Conservative 80/20';
    cpiPlusSpread: number; // e.g. 0.025
    lowerThreshold: number; // e.g. 0.18
    upperThreshold: number; // e.g. 0.23
}

export interface SimResultRow {
    date: string;
    // Retirement Portfolio
    rpTotal: number;
    rpGrowthValue: number;
    rpCpiValue: number;
    rpCpiWeight: number;
    rpIncomePaid: number;
    rpCumulativeIncome: number;
    rpRebalanceTriggered: boolean;
    rpCpiDepleted: boolean;
    rpDrawdown: number;

    // Benchmark
    bmTotal: number;
    bmGrowthValue: number;
    bmCashValue: number;
    bmIncomePaid: number;
    bmCumulativeIncome: number;
    bmDrawdown: number;

    // Standard Portfolio
    stdTotal: number;
    stdIncomePaid: number;
    stdCumulativeIncome: number;
    stdDrawdown: number;
}

export interface SimulationResult {
    rows: SimResultRow[];
    finale: {
        rpEndingBalance: number;
        bmEndingBalance: number;
        stdEndingBalance: number;
        rpTotalIncome: number;
        bmTotalIncome: number;
        stdTotalIncome: number;
        rpRebalanceCount: number;
    };
}

export function runSimulation(data: ProxyReturns[], config: SimConfig): SimulationResult {
    // 1. Filter data based on scenario
    let filteredData = data;
    if (config.scenario === 'GFC') {
        filteredData = data.filter(d => d.date >= '2007-01' && d.date <= '2012-12');
    } else if (config.scenario === 'COVID') {
        filteredData = data.filter(d => d.date >= '2019-01' && d.date <= '2022-12');
    } else if (config.scenario === 'Rising Rates') {
        filteredData = data.filter(d => d.date >= '2022-01' && d.date <= '2024-12');
    } else if (config.scenario === 'Bull Market') {
        filteredData = data.filter(d => d.date >= '2012-01' && d.date <= '2019-12');
    }

    const results: SimResultRow[] = [];

    // Initialize RP
    let rpGrowth = config.startingBalance * 0.8;
    let rpCpi = config.startingBalance * 0.2;
    let rpAnnualPayment = config.startingBalance * config.drawdownRate;
    let rpCumIncome = 0;
    let rpPeak = config.startingBalance;
    let rpRebalanceCount = 0;

    // Initialize BM
    let bmGrowth = config.startingBalance * 0.8;
    let bmCash = config.startingBalance * 0.2;
    let bmAnnualPayment = config.startingBalance * config.drawdownRate;
    let bmCumIncome = 0;
    let bmPeak = config.startingBalance;

    // Initialize STD
    let stdTotal = config.startingBalance;
    let stdAnnualPayment = config.startingBalance * config.drawdownRate;
    let stdCumIncome = 0;
    let stdPeak = config.startingBalance;

    for (let i = 0; i < filteredData.length; i++) {
        const row = filteredData[i];
        const monthIndex = parseInt(row.date.split('-')[1], 10); // 1 to 12
        const isJuly = monthIndex === 7;
        const isQuarterEnd = monthIndex % 3 === 0;

        // Determine the growth return depending on portfolio view
        let growthReturn = 0;
        let stdReturn = 0;

        if (config.portfolioView === 'Growth 80/20') {
            growthReturn = row.growth;
            stdReturn = row.balanced;
        } else if (config.portfolioView === 'Balanced 80/20') {
            growthReturn = row.balanced;
            stdReturn = row.conservative;
        } else {
            growthReturn = row.conservative;
            stdReturn = row.cpiPlus; // Default to CPIplus for Conservative 80/20 standard comparison
        }

        // In the build_model.py Excel generator, spread is hardcoded into the data series
        // and the config parameter is strangely ignored. So we just use the data value.
        const effectiveCpiPlus = row.cpiPlus;

        // ==========================================
        // 1 & 2. OPENING & APPLY RETURNS (RP)
        // ==========================================
        let rpGrowthPre = rpGrowth * (1 + growthReturn);
        let rpCpiPre = rpCpi * (1 + effectiveCpiPlus);
        let rpTotalPre = rpGrowthPre + rpCpiPre;

        // ==========================================
        // 3. DEDUCT MONTHLY PENSION (RP)
        // ==========================================
        if (isJuly && config.drawdownRecalculation === 'Annual') {
            rpAnnualPayment = rpTotalPre * config.drawdownRate;
        }
        const rpMonthlyPayment = rpAnnualPayment / 12;

        let cpiDepleted = false;
        rpCpiPre -= rpMonthlyPayment;

        // In build_model.py, a flaw exists where the Excel formula simply caps CPI at 0 
        // (=MAX(0, CPI_PostReturn - Payment)) and FAILS to deduct the shortfall from Growth!
        // To match the user's Excel model exactly, we replicate that behavior.
        if (rpCpiPre < 0) {
            cpiDepleted = true;
            rpCpiPre = 0; // The shortfall magically disappears in the Excel version.
        }

        // ==========================================
        // 4. QUARTERLY REBALANCE CHECK (RP)
        // ==========================================
        let rpTotalPostDrawdown = rpGrowthPre + rpCpiPre;
        let rpCpiWeight = rpTotalPostDrawdown > 0 ? rpCpiPre / rpTotalPostDrawdown : 0;
        let rebalanceTriggered = false;

        if (isQuarterEnd && rpTotalPostDrawdown > 0) {
            if (rpCpiWeight < config.lowerThreshold || rpCpiWeight > config.upperThreshold) {
                rpGrowth = rpTotalPostDrawdown * 0.8;
                rpCpi = rpTotalPostDrawdown * 0.2;
                rebalanceTriggered = true;
                rpCpiWeight = 0.2;
                rpRebalanceCount++;
            } else {
                rpGrowth = rpGrowthPre;
                rpCpi = rpCpiPre;
            }
        } else {
            rpGrowth = rpGrowthPre;
            rpCpi = rpCpiPre;
        }

        let rpTotalFinal = rpGrowth + rpCpi;
        rpPeak = Math.max(rpPeak, rpTotalFinal);
        let rpDrawdown = rpTotalFinal > 0 ? (rpTotalFinal / rpPeak) - 1 : -1;
        rpCumIncome += rpMonthlyPayment;


        // ==========================================
        // BENCHMARK SIMULATION
        // ==========================================
        let bmGrowthPre = bmGrowth * (1 + growthReturn);
        let bmCashPre = bmCash * (1 + row.cashRate);
        let bmTotalPre = bmGrowthPre + bmCashPre;

        if (isJuly && config.drawdownRecalculation === 'Annual') {
            bmAnnualPayment = bmTotalPre * config.drawdownRate;
        }
        const bmMonthlyPayment = bmAnnualPayment / 12;

        const bmGrowthWeight = bmTotalPre > 0 ? bmGrowthPre / bmTotalPre : 0;
        const bmCashWeight = bmTotalPre > 0 ? bmCashPre / bmTotalPre : 0;

        bmGrowth = Math.max(0, bmGrowthPre - (bmMonthlyPayment * bmGrowthWeight));
        bmCash = Math.max(0, bmCashPre - (bmMonthlyPayment * bmCashWeight));

        let bmTotalFinal = bmGrowth + bmCash;

        // Consistent 80/20 Rebalancing for Benchmark
        if (bmTotalFinal > 0) {
            bmGrowth = bmTotalFinal * 0.8;
            bmCash = bmTotalFinal * 0.2;
        }

        bmPeak = Math.max(bmPeak, bmTotalFinal);
        let bmDrawdown = bmTotalFinal > 0 ? (bmTotalFinal / bmPeak) - 1 : -1;
        bmCumIncome += bmMonthlyPayment;

        // ==========================================
        // STANDARD SIMULATION
        // ==========================================
        let stdTotalPre = stdTotal * (1 + stdReturn);
        if (isJuly && config.drawdownRecalculation === 'Annual') {
            stdAnnualPayment = stdTotalPre * config.drawdownRate;
        }
        const stdMonthlyPayment = stdAnnualPayment / 12;

        stdTotal = Math.max(0, stdTotalPre - stdMonthlyPayment);
        stdPeak = Math.max(stdPeak, stdTotal);
        let stdDrawdown = stdTotal > 0 ? (stdTotal / stdPeak) - 1 : -1;
        stdCumIncome += stdMonthlyPayment;

        // ==========================================
        // RECORD ROW
        // ==========================================
        results.push({
            date: row.date,
            rpTotal: rpTotalFinal,
            rpGrowthValue: rpGrowth,
            rpCpiValue: rpCpi,
            rpCpiWeight,
            rpIncomePaid: rpMonthlyPayment,
            rpCumulativeIncome: rpCumIncome,
            rpRebalanceTriggered: rebalanceTriggered,
            rpCpiDepleted: cpiDepleted,
            rpDrawdown,

            bmTotal: bmTotalFinal,
            bmGrowthValue: bmGrowth,
            bmCashValue: bmCash,
            bmIncomePaid: bmMonthlyPayment,
            bmCumulativeIncome: bmCumIncome,
            bmDrawdown,

            stdTotal,
            stdIncomePaid: stdMonthlyPayment,
            stdCumulativeIncome: stdCumIncome,
            stdDrawdown
        });
    }

    return {
        rows: results,
        finale: {
            rpEndingBalance: rpGrowth + rpCpi,
            bmEndingBalance: bmGrowth + bmCash,
            stdEndingBalance: stdTotal,
            rpTotalIncome: rpCumIncome,
            bmTotalIncome: bmCumIncome,
            stdTotalIncome: stdCumIncome,
            rpRebalanceCount
        }
    };
}
