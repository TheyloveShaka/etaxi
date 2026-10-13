import json
import pathlib

SRC = {
    'fuel_use': 'https://monitor.co.ug/uganda/news/national/what-shs100-tax-levied-on-fuel-means-for-motorists-3388586',
    'pump': 'https://www.monitor.co.ug/uganda/news/national/fuel-price-snapshot-kampala-pump-prices-vary-5426166',
    'tariff': 'https://www.monitor.co.ug/uganda/news/national/uedcl-sets-new-power-tariffs-for-final-quarter-5620680',
    'annual_km': 'https://transport-links.com/fcdo-publications/urban-transport-services-in-sub-saharan-africa-recommendations-for-reform-in-uganda-codatu-x-conference-lome-togo-12-15-november-2002/',
    'ev_kwh_km': 'https://doaj.org/article/577a9283014a4f5fae423f9c85a19af1',
    'e6': 'https://www.busnews.com.au/detail/joylong-e6-1214-seater-full-electric-minibus-785503',
    'lending': 'https://eagle.co.ug/2026/04/23/ugandas-shilling-lending-rates-rise-to-18-73-in-february-2026/',
    'fx': 'https://currencyfreaks.com/historical/convert/2026-08-09/UGX/USD/5',
    'grid': 'https://cdm.unfccc.int/sunsetcms/storage/contents/stored-file-20220811123519440/PSB0058_Final_Recommendation.pdf',
    'hiace': 'https://streamlinefeed.co.ke/news/how-to-start-taxi-business-uganda-costs-regulations',
    'chargers': 'https://www.monitor.co.ug/uganda/business/markets/govt-to-install-3-500-e-vehicle-charging-stations--4690636',
    'bnef': 'https://about.bnef.com/insights/commodities/lithium-ion-battery-pack-prices-fall-to-108-per-kilowatt-hour-despite-rising-metal-prices/',
}

UGX_PER_USD = 3727
WORK_DAYS = 312
PETROL_KG_CO2_PER_L = 2.3
GRID_KG_CO2_PER_KWH = 0.137
RATE_UGX = 0.1826
RATE_FX = 0.0709
LIFE_YEARS = 8

SCENARIOS = {
    'conservative': {'litres_day': 20.0, 'price_l': 5090, 'km_day': 130, 'kwh_km': 0.50, 'tariff': 666.5,
                     'note': 'Lowest 2026 pump price seen, peak electricity tariff, heavier energy use.'},
    'base': {'litres_day': 20.0, 'price_l': 5345, 'km_day': 112, 'kwh_km': 0.39, 'tariff': 562.1,
             'note': 'City routes, mid 2026 pump price, average commercial tariff.'},
    'favourable': {'litres_day': 27.5, 'price_l': 5599, 'km_day': 150, 'kwh_km': 0.39, 'tariff': 429.7,
                   'note': 'Outskirts routes, late May 2026 pump price, off-peak depot charging.'},
}


def annuity(rate, years):
    return (1 - (1 + rate) ** -years) / rate


def run(s):
    fuel_day = s['litres_day'] * s['price_l']
    kwh_day = s['km_day'] * s['kwh_km']
    power_day = kwh_day * s['tariff']
    save_day = fuel_day - power_day
    save_year = save_day * WORK_DAYS
    co2_fuel = s['litres_day'] * PETROL_KG_CO2_PER_L * WORK_DAYS / 1000
    co2_grid = kwh_day * GRID_KG_CO2_PER_KWH * WORK_DAYS / 1000
    return {
        **s,
        'fuel_cost_day': round(fuel_day),
        'kwh_day': round(kwh_day, 1),
        'power_cost_day': round(power_day),
        'saving_day': round(save_day),
        'saving_pct': round(100 * save_day / fuel_day, 1),
        'saving_year': round(save_year),
        'saving_year_usd': round(save_year / UGX_PER_USD),
        'fuel_cost_km': round(fuel_day / s['km_day']),
        'power_cost_km': round(power_day / s['km_day']),
        'pv_saving_ugx_rate': round(save_year * annuity(RATE_UGX, LIFE_YEARS)),
        'pv_saving_fx_rate': round(save_year * annuity(RATE_FX, LIFE_YEARS)),
        'pv_saving_ugx_rate_usd': round(save_year * annuity(RATE_UGX, LIFE_YEARS) / UGX_PER_USD),
        'pv_saving_fx_rate_usd': round(save_year * annuity(RATE_FX, LIFE_YEARS) / UGX_PER_USD),
        'co2_petrol_t_year': round(co2_fuel, 1),
        'co2_grid_t_year': round(co2_grid, 1),
        'co2_avoided_t_year': round(co2_fuel - co2_grid, 1),
        'litres_year': round(s['litres_day'] * WORK_DAYS),
    }


results = {k: run(v) for k, v in SCENARIOS.items()}
base = results['base']

PHASES = [
    {'phase': 'Pilot', 'window': 'Months 0 to 12', 'vehicles': 30},
    {'phase': 'Corridor rollout', 'window': 'Years 2 to 3', 'vehicles': 300},
    {'phase': 'Network scale', 'window': 'Years 4 to 6', 'vehicles': 2000},
]
fleet = []
for p in PHASES:
    n = p['vehicles']
    fleet.append({
        **p,
        'fuel_saved_litres_year': n * base['litres_year'],
        'energy_saving_ugx_bn_year': round(n * base['saving_year'] / 1e9, 2),
        'energy_saving_usd_m_year': round(n * base['saving_year'] / UGX_PER_USD / 1e6, 2),
        'co2_avoided_t_year': round(n * base['co2_avoided_t_year']),
        'seats': n * 14,
        'kwh_day': round(n * base['kwh_day']),
    })

price_curve = []
for price in range(4500, 7001, 500):
    s = dict(SCENARIOS['base'], price_l=price)
    price_curve.append({'price_l': price, 'saving_day': run(s)['saving_day']})

out = {
    'constants': {
        'ugx_per_usd': UGX_PER_USD, 'work_days': WORK_DAYS, 'petrol_kg_co2_per_l': PETROL_KG_CO2_PER_L,
        'grid_kg_co2_per_kwh': GRID_KG_CO2_PER_KWH, 'rate_ugx': RATE_UGX, 'rate_fx': RATE_FX, 'life_years': LIFE_YEARS,
        'hiace_capital_ugx': 80_000_000, 'ac_charger_usd': 2500, 'dc_charger_usd': 35800, 'pack_usd_per_kwh': 108,
        'e6_pack_kwh': 86.1, 'e6_pack_cost_usd_at_bnef': round(86.1 * 108),
    },
    'assumptions': [
        'Working days per year (312, six days a week) is an assumption, not a measured figure.',
        'Daily distance is derived, not measured: 35,000 km a year from an old minibus survey spread over 312 days gives 112 km a day. The conservative and favourable cases use 130 and 150 km.',
        'Fuel use is driver-reported litres per day from press interviews, treated as petrol.',
        'Electric energy use of 0.39 and 0.50 kWh per km comes from the low end and a midpoint of published projections; the Joylong E6 maker claim implies 0.29.',
        'Maintenance, insurance, driver pay, vehicle price and charger cost are excluded from the saving. Only energy is compared.',
        'Present values use an eight-year life (the battery warranty term published for one comparable van) and Uganda average lending rates for shilling and foreign-currency loans.',
        'Fleet phase sizes are planning targets set by this proposal, not forecasts.',
    ],
    'scenarios': results,
    'fleet': fleet,
    'price_curve': price_curve,
    'sources': SRC,
}
path = pathlib.Path(__file__).resolve().parent.parent / 'proposal' / 'model.json'
path.write_text(json.dumps(out, indent=1), encoding='utf-8')

for k, r in results.items():
    print(k, 'fuel/day', r['fuel_cost_day'], 'power/day', r['power_cost_day'], 'save/day', r['saving_day'], f"({r['saving_pct']}%)",
          'save/yr', r['saving_year'], 'usd', r['saving_year_usd'], 'PV@ugx', r['pv_saving_ugx_rate_usd'], 'PV@fx', r['pv_saving_fx_rate_usd'],
          'co2 avoided t/yr', r['co2_avoided_t_year'], 'per km', r['fuel_cost_km'], r['power_cost_km'])
for f in fleet:
    print(f)
