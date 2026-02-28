import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine } from 'recharts';
import { Activity, TrendingUp, ShieldAlert, DollarSign, RefreshCw, BarChart2, Info, X } from 'lucide-react';
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
  const [showInfoModal, setShowInfoModal] = useState(false);

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
    return '100% Cash Option';
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
            <button className="icon-btn" onClick={() => setShowInfoModal(true)} title="How It Works">
              <Info size={18} color="var(--text-muted)" />
            </button>
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
            <option value="Full Period">Full Period (2000-2024)</option>
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
                  <YAxis tickFormatter={(val) => `$${val / 1000}k`} width={60} domain={['dataMin - 10000', 'dataMax + 10000']} />
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
                  <YAxis tickFormatter={(val) => `${val}%`} domain={[0, 'dataMax + 5']} />
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
                  <YAxis tickFormatter={(val) => `$${val / 1000}k`} width={50} />
                  <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                  <Area type="monotone" dataKey="rpIncome" name="Income Drawn" stroke="var(--cpi-color)" strokeWidth={2} fillOpacity={1} fill="url(#colorInc)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>

      {/* INFO MODAL */}
      {showInfoModal && (
        <div className="modal-overlay" onClick={() => setShowInfoModal(false)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowInfoModal(false)}><X size={20} /></button>
            <h2>How It Works</h2>

            <h3>The Core Concept</h3>
            <p>
              The Hostplus Retirement Portfolio provides a reliable income stream while protecting your savings from a falling market. It does this by splitting your money into two distinct "buckets".
            </p>

            <ul>
              <li><strong>The Growth Bucket (80%):</strong> Invested in the broader market to generate long-term returns.</li>
              <li><strong>The CPIplus Bucket (20%):</strong> A defensive cash-like reserve targeted to beat inflation (CPI + 2.5%).</li>
            </ul>

            <h3>The Monthly Waterfall</h3>
            <p>
              Every month, your pension payment is drawn <strong>exclusively</strong> from the CPIplus defensive bucket. This protects your Growth bucket from being sold off during market downturns (Sequence of Return Risk).
            </p>
            <p>
              The system relies on rules-based rebalancing to ensure the CPIplus bucket never runs out, preventing you from ever having to sell Growth assets at a loss to fund your pension.
            </p>

            <h3>The Asymmetric Rebalance</h3>
            <p>
              The portfolio automatically checks the percentage weight of your CPIplus bucket every quarter (March, June, Sept, Dec).
            </p>
            <ul>
              <li><strong>Upper Threshold (23%):</strong> During market corrections, the value of the Growth bucket may decrease, which naturally increases the proportional weight of the stable CPIplus bucket. If the CPIplus weight exceeds 23% of the total portfolio, the system rebalances by transferring the excess value back into the Growth bucket to return to the target allocation.</li>
              <li><strong>Lower Threshold (18%):</strong> During strong bull markets, your Growth bucket expands rapidly, causing the proportional weight of CPIplus to shrink. If it drops below 18%, the portfolio sells some Growth assets to top the CPIplus bucket back up to 20%, explicitly locking in your market gains to fund future pension payments.</li>
            </ul>

            <h3>The 80/20 Benchmark Comparison</h3>
            <p>
              To demonstrate the value of this strategy, the application compares the Retirement Portfolio against a standard 80/20 Benchmark.
            </p>
            <ul>
              <li><strong>Asset Mix:</strong> Like the Retirement Portfolio, it holds a constant 80% in Growth assets and 20% in defensive assets. However, the defensive 20% is held in a standard Cash rate rather than CPIplus.</li>
              <li><strong>Pro-Rata Drawdowns:</strong> Unlike the Retirement Portfolio which protects Growth assets by drawing only from CPIplus, the Benchmark draws pension payments proportionally (80% from Growth, 20% from Cash) every single month, forcing the sale of Growth assets even during severe market crashes.</li>
              <li><strong>Consistent Rebalancing:</strong> For a fair risk comparison, the Benchmark rebalances back to its strict 80/20 target every single month.</li>
            </ul>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
