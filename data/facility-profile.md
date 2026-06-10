# Troop facility profile

What this troop can run at and around its HQ. The classifier reads this to seed
`data/suitability/<badge>.json`: each leaf requirement is judged against these
facilities, not against a generic troop. `unsuitable` means "we can't run it"
for any reason, not "impossible anywhere".

## Categories

- `evening` - one ~90 minute session covers it.
- `over-time` - we can run it, but it spans several sessions, a multi-week block,
  or a camp.
- `unsuitable` - we can't deliver it at or around our HQ.

## What we have

- Sessions are ~90 minutes; we can dedicate several consecutive weeks to a theme.
- Indoor hall plus outdoor space, and we can light fires: pioneering, wide games,
  fire-lighting, backwoods cooking.
- Kitchen and camping stoves: cooking on a stove or in the kitchen.
- Air rifle target range, supervised. No archery kit.
- Wifi, up to four leader laptops. Scouts bring phones, but app installs are
  unreliable (child locks).
- Outings reach walking distance from HQ: local hikes, navigation, local
  knowledge, nature spotting.
- We can usually arrange a visiting speaker or expert with notice.
- Craft supplies, hand tools, and messy work are all fine.
- We run camps a few times a year.
- Occasional budget for a paid visiting instructor on a special evening.

## What we cannot do

- Water, boats, swimming: sailing, fixed-seat rowing, dragon boating, other water
  activities, swimmer, time on the water, in-water lifesaving.
- Snow sports, aerial activities (parascending, gliding, parachuting), caving,
  rock climbing and abseiling.
- Motorised activities (power coxswain, motorsport) and anything with animals
  (horse riding).
- Planting trees or anything needing managed land we do not control. Other
  Forester requirements (identifying trees locally) are fine.
- Archery: the range is air rifle only.

## How to judge a requirement

- Satisfiable by inviting a visitor in ("find out about a job", "meet emergency
  services", "talk to a faith leader") -> `evening`.
- "Over N weeks", "keep a log", "repeat X times", needs a camp -> `over-time`.
- Reachable on foot from HQ -> `evening`; beyond walking range with no visitor or
  camp angle -> `unsuitable`.
- On the cannot-do list -> `unsuitable`, however the requirement is worded.
- The paid-instructor exception covers coach-at-HQ activities (martial arts,
  self-defence), not activities needing kit or a venue we do not have.
