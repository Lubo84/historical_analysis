import json

def simulate():
    with open('/Users/ianlioubachevskii/.gemini/antigravity/scratch/hostplus-app/src/engine/real_data.json', 'r') as f:
        data = json.load(f)

    startingBalance = 500000
    drawdownRate = 0.06
    lowerThreshold = 0.18
    upperThreshold = 0.23

    rpGrowth = startingBalance * 0.8
    rpCpi = startingBalance * 0.2
    
    # We will compute both to see differences, but tracking exactly what TS does:
    rpAnnualPayment = startingBalance * drawdownRate
    rpRebalanceCount = 0
    rebalance_dates = []

    for i, row in enumerate(data):
        date = row["date"]
        month_index = int(date.split('-')[1])
        isJuly = (month_index == 7)
        isQuarterEnd = (month_index % 3 == 0)

        growthReturn = row["balanced"]
        effectiveCpiPlus = row["cpiPlus"]

        rpGrowthPre = rpGrowth * (1 + growthReturn)
        rpCpiPre = rpCpi * (1 + effectiveCpiPlus)
        rpTotalPre = rpGrowthPre + rpCpiPre

        if isJuly:
            rpAnnualPayment = rpTotalPre * drawdownRate
        rpMonthlyPayment = rpAnnualPayment / 12

        rpCpiPre -= rpMonthlyPayment

        if rpCpiPre < 0:
            rpCpiPre = 0

        rpTotalPostDrawdown = rpGrowthPre + rpCpiPre
        rpCpiWeight = rpCpiPre / rpTotalPostDrawdown if rpTotalPostDrawdown > 0 else 0

        if isQuarterEnd and rpTotalPostDrawdown > 0:
            if rpCpiWeight < lowerThreshold or rpCpiWeight > upperThreshold:
                rpGrowth = rpTotalPostDrawdown * 0.8
                rpCpi = rpTotalPostDrawdown * 0.2
                rpRebalanceCount += 1
                rebalance_dates.append(date)
            else:
                rpGrowth = rpGrowthPre
                rpCpi = rpCpiPre
        else:
            rpGrowth = rpGrowthPre
            rpCpi = rpCpiPre

        if i < 5:
            print(f"{date}: Open=({rpGrowthPre/(1+growthReturn)}, {rpCpiPre/(1+effectiveCpiPlus)}) Ret=({growthReturn}, {effectiveCpiPlus}) Pay={rpMonthlyPayment} Wt={rpCpiWeight}")

    print(f"Total Rebalances: {rpRebalanceCount}")
    print(rebalance_dates)

if __name__ == "__main__":
    simulate()
