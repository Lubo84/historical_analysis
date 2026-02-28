# Hostplus Retirement Portfolio: Mathematical Methodology & Audit Guide

This document outlines the strict mathematical rules, order of operations, and simulation logic powering the Interactive Back-test Engine. It serves as a transparent audit guide to instil confidence in the accuracy of the historical comparisons.

## 1. Core Portfolio Architecture

The Retirement Portfolio simulation strictly segregates capital into two distinct assets with zero commingling outside of designated rebalance windows:

*   **Growth Bucket (80% Target):** Capital is exposed to the broader market (e.g., ASX200 / MSCI World).
*   **CPIplus Bucket (20% Target):** Capital is preserved in a defensive, cash-like vehicle mathematically tracking inflation plus a set spread (CPI + 2.5%).

## 2. The Monthly Waterfall (Order of Operations)

The simulation engine evaluates each month in the historical dataset (2001-2024) chronologically, executing a rigid mathematical waterfall:

### Step A: Apply Monthly Returns
At the beginning of month $t$, the simulation reads the historical index returns and applies them to the opening balances of both buckets independently.

*   $Growth_{pre} = Growth_{t-1} * (1 + Return_{Growth, t})$
*   $CPIplus_{pre} = CPIplus_{t-1} * (1 + Return_{CPIplus, t})$

### Step B: Deduct Monthly Pension Drawdown
The core mechanism protecting the Growth asset from Sequence of Return Risk is enacted here. On the first day of every month, $1/12th$ of the calculated annual pension payment is deducted.

**Crucially, this drawdown is mathematically subtracted exclusively from the CPIplus bucket.** 

*   $CPIplus_{post} = CPIplus_{pre} - Payment_{monthly}$
*   $Growth_{post} = Growth_{pre}$ (Untouched)

*Note on Drawdown Recalculation:* If the "Annual" recalculation setting is active, the annual drawdown dollar figure is recalculated strictly once every 12 months (on July 1st) by multiplying the total combined portfolio balance by the user-defined drawdown rate (e.g., 6%).

### Step C: The Exhaustion Rule
If the sequence of returns is exceptionally poor and the CPIplus bucket balance mathematical reaches zero ($CPIplus_{post} \le 0$), the engine enforces an immediate cessation of all pension drawdowns. In this "depleted" state, the Growth bucket continues to ride the market without being forcibly liquidated to fund income.

## 3. The Rules-Based Rebalancing Framework

The system actively prevents the portfolio from drifting irretrievably from its risk profile. To accomplish this, an automated rebalance check is fired at the end of every quarter (March, June, September, December).

The engine calculates the real-time proportional weighting of the defensive bucket:
$$Weight_{CPIplus} = \frac{CPIplus_{post}}{Growth_{post} + CPIplus_{post}}$$

If this weight breaches the user-defined thresholds (default 18% Lower, 23% Upper), a forced rebalance to exactly 80/20 occurs.

*   **The 23% Upper Threshold Event:** During sustained negative market returns, the Growth bucket's absolute dollar value shrinks, mechanically increasing the proportional weight of the stable CPIplus bucket. If $Weight_{CPIplus} > 23\%$, the engine triggers a mathematical transfer, forcefully moving capital from the bloated CPIplus bucket back into the Growth bucket to restore the $80/20$ ratio. 
*   **The 18% Lower Threshold Event:** During sustained positive market returns, the Growth bucket expands rapidly, mechanically shrinking the proportional weight of the CPIplus bucket. If $Weight_{CPIplus} < 18\%$, the engine liquidates precisely enough capital from the Growth bucket to top the CPIplus bucket back to its 20% target. This mechanically locks in prior equity gains to fund subsequent pension drawdowns.

## 4. Benchmark Methodologies

To ensure a rigorously fair and isolated test of the *drawdown mechanic itself*, and not simply asset allocation differences, the engine runs strict parallel benchmarks on the exact same historical data.

### Standard 80/20 Benchmark
This portfolio maintains the same fundamental building blocks (80% Growth, 20% Defensive) but removes the protective waterfall.
1.  **Pro-Rata Drawdown:** The monthly pension payment is deducted proportionally. 80% of the payment is mathematically forced out of the Growth bucket, and 20% is forced out of the Defensive bucket, regardless of prevailing market conditions. This forces the liquidation of equities during bear markets.
2.  **Mechanical Rebalance:** The portfolio forces a mathematical rebalance back to exactly 80.00% / 20.00% every single month, representing an idealized static risk profile. 

### 100% Option Comparison
This benchmark assumes a monolithic 100% allocation to a single asset class (e.g., 100% Balanced, 100% Conservative, or 100% CPIplus).
*   It operates with zero asset splitting and zero rebalancing logic.
*   The required monthly pension payment is subtracted directly from the gross total balance every month. 
*   This benchmark explicitly isolates the raw power of the two-bucket strategy against simplest, bluntest market exposure.
