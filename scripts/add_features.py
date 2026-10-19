import html
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
PARTS = ROOT / 'proposal' / 'parts'

FLOWS = [
    ('Rider: catch an eTaxi', [
        ('Open the app', 'routes remembered'), ('Pick a route', 'Ntinda to City Square'),
        ('See the beacon', 'live eTaxis, minutes away'), ('Get a ping', 'when it is 2 min out'),
        ('Walk to the stage', 'and board'), ('Fare confirmed', 'paid by mobile money'),
        ('Press Masaawo', 'stop shows on the dash'), ('Arrive', 'receipt, rating, share'),
    ]),
    ('Rider: door-to-door pickup', [
        ('Switch on', 'door to door'), ('Set the pickup', 'your gate on the map'),
        ('See the premium', 'before confirming'), ('Pay', 'by mobile money'),
        ('Track the eTaxi', 'to your gate'), ('Drop-off', 'at the destination'),
    ]),
    ('Owner: from a condemned van to an eTaxi', [
        ('Van grounded', 'fails the DMC test'), ('Apply', 'route and driver checks'),
        ('Choose a path', 'lease to own, or shares'), ('Driver training', 'safety and the app'),
        ('eTaxi assigned', 'on an approved route'), ('Pay as you drive', 'from daily takings'),
        ('Ownership', 'or dividends'),
    ]),
]


def flow_svg(steps):
    per_row = 4
    bw, bh, gx, gy, pad = 140, 58, 26, 30, 4
    rows = (len(steps) + per_row - 1) // per_row
    width = per_row * bw + (per_row - 1) * gx + pad * 2
    height = rows * bh + (rows - 1) * gy + pad * 2
    out = [f'<svg viewBox="0 0 {width} {height}" role="img" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">']
    out.append('<defs><marker id="ah" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="var(--blue-600)"/></marker></defs>')
    pos = []
    for i, _ in enumerate(steps):
        r, c = divmod(i, per_row)
        x = pad + c * (bw + gx)
        y = pad + r * (bh + gy)
        pos.append((x, y))
    for i in range(len(steps) - 1):
        (x1, y1), (x2, y2) = pos[i], pos[i + 1]
        if y1 == y2:
            out.append(f'<line x1="{x1 + bw}" y1="{y1 + bh / 2}" x2="{x2 - 3}" y2="{y2 + bh / 2}" stroke="var(--blue-600)" stroke-width="1.5" marker-end="url(#ah)"/>')
        else:
            mid = y1 + bh + gy / 2
            out.append(f'<path d="M{x1 + bw / 2} {y1 + bh} V{mid} H{x2 + bw / 2} V{y2 - 3}" fill="none" stroke="var(--blue-600)" stroke-width="1.5" marker-end="url(#ah)"/>')
    for i, ((title, sub), (x, y)) in enumerate(zip(steps, pos)):
        last = i == len(steps) - 1
        fill = 'var(--blue-600)' if last else 'var(--n-50)'
        ink = 'var(--field)' if last else 'var(--ink)'
        muted = 'var(--blue-100)' if last else 'var(--n-600)'
        out.append(f'<rect x="{x}" y="{y}" width="{bw}" height="{bh}" rx="6" fill="{fill}" stroke="var(--n-200)" stroke-width="{0 if last else 1}"/>')
        out.append(f'<circle cx="{x + 15}" cy="{y + 16}" r="9" fill="{"var(--field)" if last else "var(--blue-600)"}"/>')
        out.append(f'<text x="{x + 15}" y="{y + 19.5}" text-anchor="middle" font-family="Switzer" font-size="10" font-weight="700" fill="{"var(--blue-700)" if last else "var(--field)"}">{i + 1}</text>')
        out.append(f'<text x="{x + 30}" y="{y + 20}" font-family="Switzer" font-size="11" font-weight="600" fill="{ink}">{html.escape(title)}</text>')
        out.append(f'<text x="{x + 12}" y="{y + 44}" font-family="Switzer" font-size="9.5" fill="{muted}">{html.escape(sub)}</text>')
    out.append('</svg>')
    return '\n'.join(out)


FEATURES = [
    ('Route search and saved routes', 'Rider', 'Finds the route from the nearest stage and remembers daily trips.', 'Pilot'),
    ('Live beacon and arrival time', 'Rider', 'Shows every eTaxi on the route and the minutes to your stage.', 'Pilot'),
    ('Find-me-an-eTaxi alerts', 'Rider', 'Keeps watching in the background, pings when the chosen eTaxi is close, and stops once you board. The server watches the vehicle, so the phone does not track the rider.', 'Pilot'),
    ('Fare shown first', 'Rider', 'A fixed fare per trip, shown before boarding.', 'Pilot'),
    ('Mobile money wallet', 'Rider', 'Pay by MTN MoMo or Airtel Money, with receipts in the app.', 'Pilot'),
    ('Masaawo stop request', 'Rider, driver', 'Request your stop from your seat; it appears on the driver’s dash.', 'Pilot'),
    ('Trip sharing and alert button', 'Rider', 'Send a live trip link home; one tap reaches the operations desk.', 'Pilot'),
    ('Driver dash', 'Driver', 'Next stops, stop requests, headway guidance and charge level.', 'Pilot'),
    ('Earnings and lease ledger', 'Driver, owner', 'Daily takings, pay-as-you-drive deductions and the balance to ownership.', 'Pilot'),
    ('Fleet console', 'Operator', 'Live map, uptime, incidents, and camera review on request under the access policy.', 'Pilot'),
    ('Door-to-door pickup', 'Rider', 'Premium pickup at the rider’s gate on selected routes.', 'Rollout'),
    ('Low-data and USSD mode', 'Rider', 'Arrival times and payment on basic phones and slow networks.', 'Rollout'),
    ('Smart charging scheduler', 'Operator', 'Moves depot charging into off-peak tariff hours.', 'Rollout'),
    ('Open data feed', 'City, developers', 'GTFS and GTFS Realtime for routes, stops and live positions.', 'Rollout'),
    ('Planner dashboards', 'KCCA, Ministry', 'Anonymised origin and destination, demand and reliability reports.', 'Scale'),
]

SCREENS = [
    ('beacon', 'Beacon: live eTaxis and arrival time'),
    ('masaawo', 'On board: next stage and Masaawo'),
    ('masaawo-pressed', 'Masaawo pressed: stop requested'),
    ('fare', 'Fare shown before boarding'),
    ('fare-door', 'Door to door switched on'),
]


def block():
    rows = '\n'.join(
        f'<tr><td><strong>{html.escape(f)}</strong></td><td>{html.escape(w)}</td><td>{html.escape(d)}</td><td>{p}</td></tr>'
        for f, w, d, p in FEATURES)
    parts = [
        '  <h2>5.5 Proposed features</h2>',
        '  <p>The features below are proposed, not built. They are grouped by who uses them and the phase in which each would ship. Pilot features are the minimum needed to run one corridor and measure it; the rest follow only if the pilot meets its gates (Section 12). <span class="tag">Proposed</span></p>',
        '  <table>',
        '    <thead><tr><th>Feature</th><th>For</th><th>What it does</th><th>Phase</th></tr></thead>',
        f'    <tbody>\n{rows}\n    </tbody>',
        '  </table>',
        '  <h2>5.6 User flows</h2>',
        '  <p>Three journeys carry most of the value: a rider catching an eTaxi from a stage, a rider booking the premium door-to-door pickup, and a taxi owner whose van has been grounded moving onto an electric vehicle. Each is shown as a proposed flow; the pilot would test every step with real users before anything is fixed.</p>',
    ]
    for n, (title, steps) in enumerate(FLOWS, start=2):
        parts.append(f'  <figure class="fig">\n{flow_svg(steps)}\n    <figcaption><b>Figure {n}.</b> {html.escape(title)}. Proposed flow.</figcaption>\n  </figure>')
    shots = '\n'.join(
        f'      <div><img src="../public/img/screens/{f}.png" alt="{html.escape(c)}" style="display:block;width:100%;height:auto"><span class="small" style="display:block;margin-top:4pt;line-height:1.3">{html.escape(c)}</span></div>'
        for f, c in SCREENS)
    parts += [
        '  <h2>5.7 App screens</h2>',
        '  <p>The screens below are concept designs taken from the eTaxi site. They show the rider’s side of the pilot features: the beacon with live arrival times, the on-board view with the Masaawo stop request before and after it is pressed, and the fare screen with and without door-to-door pickup. Fares are examples, not proposed prices.</p>',
        '  <figure class="fig">',
        '    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:7pt;align-items:start">',
        shots,
        '    </div>',
        f'    <figcaption><b>Figure {len(FLOWS) + 2}.</b> Concept app screens. Fares shown are examples.</figcaption>',
        '  </figure>',
    ]
    return '\n'.join(parts) + '\n'


sol = PARTS / '03-solution.html'
s = sol.read_text(encoding='utf-8')
anchor = '</section>\n\n<section class="sec" id="s6">'
if '5.5 Proposed features' not in s:
    assert anchor in s
    s = s.replace(anchor, block() + anchor, 1)
    sol.write_text(s, encoding='utf-8', newline='\n')

shift = len(FLOWS) + 1
for name in ['04-technology.html', '05-case.html', '06-delivery.html', '07-appendix.html']:
    p = PARTS / name
    t = p.read_text(encoding='utf-8')
    if 'data-renumbered' in t:
        continue
    t = re.sub(r'Figure (\d+)', lambda m: f'Figure {int(m.group(1)) + shift}' if int(m.group(1)) >= 2 else m.group(0), t)
    t = '<!-- data-renumbered -->\n' + t
    p.write_text(t, encoding='utf-8', newline='\n')
print('features, flows and screens inserted; figures after 1 shifted by', shift)
