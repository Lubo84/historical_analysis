import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine } from 'recharts';
import { Activity, TrendingUp, ShieldAlert, DollarSign, RefreshCw, BarChart2 } from 'lucide-react';
import { historicalData } from './engine/data';
import { runSimulation, SimConfig } from './engine/simulation';
import { calculateMetrics } from './engine/metrics';
import './index.css';

function App() {
  const [config, setConfig] = useState<SimConfig>({
    startingBalance: 500000,
    drawdownRate: 0.06,
    drawdownRecalculation: 'Annual',
    scenario: 'Full Period',
    portfolioView: 'Balanced 80/20',
    cpiPlusSpread: 0.025,
    lowerThreshold: 0.18,
    upperThreshold: 0.23
  });

  const handleConfigChange = (key: keyof SimConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const { result, metrics } = useMemo(() => {
    const simResult = runSimulation(historicalData, config);
    const perfMetrics = calculateMetrics(simResult, config);
    return { result: simResult, metrics: perfMetrics };
  }, [config]);

  // Formatters
  const formatCurrency = (val: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(val);
  const formatPercent = (val: number) => new Intl.NumberFormat('en-AU', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val);
  const formatDate = (dateStr: string) => {
    const [y, m] = dateStr.split('-');
    return `${m}/${y.substring(2)}`;
  };

  const getStandardName = () => {
    if (config.portfolioView.startsWith('Growth')) return '100% Balanced';
    if (config.portfolioView.startsWith('Balanced')) return '100% Conservative';
    return '100% CPIplus';
  };
  const standardName = getStandardName();

  // Chart Data preparation
  const chartData = result.rows.map(row => ({
    date: row.date,
    rpTotal: Math.max(0, row.rpTotal),
    bmTotal: Math.max(0, row.bmTotal),
    stdTotal: Math.max(0, row.stdTotal),
    rpCpiWeight: row.rpCpiWeight * 100,
    rpIncome: row.rpCumulativeIncome,
    rpRebalanceEvent: row.rpRebalanceTriggered ? row.rpCpiWeight * 100 : null
  }));

  return (
    <div className="app-container">
      {/* SIDEBAR CONFIGURATION */}
      <div className="glass-panel sidebar animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert color="var(--text-accent)" size={28} />
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Retirement Portfolios
          </h1>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>Interactive Back-test Engine</p>

        <div className="config-group" style={{ animationDelay: '0.1s' }}>
          <div className="config-value-display">
            <label className="config-label">Starting Balance</label>
            <span className="config-value-text">{formatCurrency(config.startingBalance)}</span>
          </div>
          <input
            type="range" min="100000" max="2000000" step="50000"
            value={config.startingBalance}
            onChange={e => handleConfigChange('startingBalance', Number(e.target.value))}
          />
        </div>

        <div className="config-group" style={{ animationDelay: '0.2s' }}>
          <div className="config-value-display">
            <label className="config-label">Drawdown Rate</label>
            <span className="config-value-text">{formatPercent(config.drawdownRate)}</span>
          </div>
          <input
            type="range" min="0" max="0.15" step="0.005"
            value={config.drawdownRate}
            onChange={e => handleConfigChange('drawdownRate', Number(e.target.value))}
          />
        </div>

        <div className="config-group">
          <label className="config-label">Market Scenario</label>
          <select value={config.scenario} onChange={e => handleConfigChange('scenario', e.target.value)}>
            <option value="Full Period">Full Period (2001-2024)</option>
            <option value="GFC">Global Financial Crisis (2007-2012)</option>
            <option value="COVID">COVID-19 Crash & Recovery (2019-2022)</option>
            <option value="Rising Rates">Rising Rates / Inflation (2022-2024)</option>
            <option value="Bull Market">Sustained Bull Market (2012-2019)</option>
          </select>
        </div>

        <div className="config-group">
          <label className="config-label">Portfolio Configuration</label>
          <select value={config.portfolioView} onChange={e => handleConfigChange('portfolioView', e.target.value)}>
            <option value="Growth 80/20">Growth 80/20</option>
            <option value="Balanced 80/20">Balanced 80/20</option>
            <option value="Conservative 80/20">Conservative 80/20</option>
          </select>
        </div>

        <hr style={{ borderColor: 'var(--border-glass)', margin: '8px 0' }} />

        <div className="config-group">
          <label className="config-label">Rebalance Thresholds (%)</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lower</span>
              <input type="number" step="0.01" max="0.3" min="0"
                value={config.lowerThreshold}
                onChange={e => handleConfigChange('lowerThreshold', Number(e.target.value))} />
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Upper</span>
              <input type="number" step="0.01" max="0.5" min="0"
                value={config.upperThreshold}
                onChange={e => handleConfigChange('upperThreshold', Number(e.target.value))} />
            </div>
          </div>
        </div>

      </div>

      {/* MAIN CONTENT DASHBOARD */}
      <div className="main-content">

        {/* METRICS SUMMARY */}
        <div className="metrics-row animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="glass-panel metric-card">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="metric-title">Ending Balance</span>
              <DollarSign size={18} color="var(--text-muted)" />
            </div>
            <div className="metric-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <div className="metric-val-container">
                <span className="metric-val-label">Retirement Port</span>
                <span className="metric-val val-rp">{formatCurrency(metrics.rpEndingBalance)}</span>
              </div>
              <div className="metric-val-container">
                <span className="metric-val-label">80/20 Benchmark</span>
                <span className="metric-val val-bm">{formatCurrency(metrics.bmEndingBalance)}</span>
              </div>
              <div className="metric-val-container">
                <span className="metric-val-label">{standardName}</span>
                <span className="metric-val val-std" style={{ color: 'var(--growth-color)' }}>{formatCurrency(metrics.stdEndingBalance)}</span>
              </div>
            </div>
          </div>

          <div className="glass-panel metric-card">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="metric-title">Max Drawdown</span>
              <TrendingUp size={18} color="var(--text-muted)" style={{ transform: 'scaleY(-1)' }} />
            </div>
            <div className="metric-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <div className="metric-val-container">
                <span className="metric-val-label">Retirement Port</span>
                <span className="metric-val val-rp">{formatPercent(metrics.rpMaxDrawdown)}</span>
              </div>
              <div className="metric-val-container">
                <span className="metric-val-label">80/20 Benchmark</span>
                <span className="metric-val val-bm">{formatPercent(metrics.bmMaxDrawdown)}</span>
              </div>
              <div className="metric-val-container">
                <span className="metric-val-label">{standardName}</span>
                <span className="metric-val val-std" style={{ color: 'var(--growth-color)' }}>{formatPercent(metrics.stdMaxDrawdown)}</span>
              </div>
            </div>
          </div>

          <div className="glass-panel metric-card">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="metric-title">Total Return (CAGR)</span>
              <Activity size={18} color="var(--text-muted)" />
            </div>
            <div className="metric-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <div className="metric-val-container">
                <span className="metric-val-label">Retirement Port</span>
                <span className="metric-val val-rp">{formatPercent(metrics.rpCagr)}</span>
              </div>
              <div className="metric-val-container">
                <span className="metric-val-label">80/20 Benchmark</span>
                <span className="metric-val val-bm">{formatPercent(metrics.bmCagr)}</span>
              </div>
              <div className="metric-val-container">
                <span className="metric-val-label">{standardName}</span>
                <span className="metric-val val-std" style={{ color: 'var(--growth-color)' }}>{formatPercent(metrics.stdCagr)}</span>
              </div>
            </div>
          </div>

          <div className="glass-panel metric-card">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="metric-title">Feature Activity</span>
              <RefreshCw size={18} color="var(--text-muted)" />
            </div>
            <div className="metric-grid">
              <div className="metric-val-container">
                <span className="metric-val-label">Rebalance Events</span>
                <span className="metric-val val-rp">{metrics.rpRebalanceCount} times</span>
              </div>
              <div className="metric-val-container">
                <span className="metric-val-label">Total Income Paid</span>
                <span className="metric-val val-cpi" style={{ color: 'var(--cpi-color)' }}>{formatCurrency(metrics.rpTotalIncome)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* CHARTS */}
        <div className="charts-grid animate-fade-in" style={{ animationDelay: '0.4s' }}>

          <div className="glass-panel chart-card wide">
            <div className="chart-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart2 size={20} color="var(--text-accent)" />
                <span className="chart-title">Portfolio Value Journey</span>
              </div>
              <div className="chart-legend">
                <div className="legend-item"><div className="legend-color" style={{ background: 'var(--rp-color)' }}></div>Retirement Portfolio</div>
                <div className="legend-item"><div className="legend-color" style={{ background: 'var(--bm-color)' }}></div>80/20 Benchmark</div>
                <div className="legend-item"><div className="legend-color" style={{ background: 'var(--growth-color)' }}></div>{standardName}</div>
              </div>
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorRp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--rp-color)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--rp-color)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorBm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--bm-color)" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="var(--bm-color)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={formatDate} minTickGap={30} />
                  <YAxis tickFormatter={(val) => `$${Math.round(val / 1000)}k`} width={60} domain={['auto', 'auto']} />
                  <Tooltip
                    formatter={(val: any) => formatCurrency(Number(val))}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Area type="monotone" dataKey="bmTotal" name="80/20 Benchmark" stroke="var(--bm-color)" fillOpacity={1} fill="url(#colorBm)" />
                  <Area type="monotone" dataKey="stdTotal" name={standardName} stroke="var(--growth-color)" strokeWidth={2} strokeDasharray="5 5" fillOpacity={0} />
                  <Area type="monotone" dataKey="rpTotal" name="Retirement Portfolio" stroke="var(--rp-color)" strokeWidth={2} fillOpacity={1} fill="url(#colorRp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-panel chart-card">
            <div className="chart-header">
              <span className="chart-title">CPIplus Weight & Rebalancing</span>
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={formatDate} minTickGap={40} />
                  <YAxis tickFormatter={(val) => `${Math.round(val)}%`} domain={[0, 'auto']} />
                  <Tooltip formatter={(val: any) => formatPercent(Number(val) / 100)} />
                  <ReferenceLine y={config.lowerThreshold * 100} stroke="var(--bm-color)" strokeDasharray="3 3" />
                  <ReferenceLine y={config.upperThreshold * 100} stroke="var(--cpi-color)" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="rpCpiWeight" name="CPIplus %" stroke="var(--text-accent)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-panel chart-card">
            <div className="chart-header">
              <span className="chart-title">Cumulative Income Paid</span>
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--cpi-color)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--cpi-color)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={formatDate} minTickGap={40} />
                  <YAxis tickFormatter={(val) => `$${Math.round(val / 1000)}k`} width={50} domain={[0, 'auto']} />
                  <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                  <Area type="monotone" dataKey="rpIncome" name="Income Drawn" stroke="var(--cpi-color)" strokeWidth={2} fillOpacity={1} fill="url(#colorInc)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}

export default App;
