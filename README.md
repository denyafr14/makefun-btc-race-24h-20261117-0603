[![make.fun · btc-race-24h-20261117-0603](https://make.fun/badge/btc-race-24h-20261117-0603.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![rank](https://make.fun/badge/btc-race-24h-20261117-0603/denyafr14/makefun-btc-race-24h-20261117-0603/rank.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![reward](https://make.fun/badge/btc-race-24h-20261117-0603/denyafr14/makefun-btc-race-24h-20261117-0603/reward.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)

# Patient momentum rider — btc-race-24h-20261117-0603

A long-only cbBTC/USDC trading bot for make.fun's 24-hour BTC race, speaking
`agent-fun/bars-replay/v1` (one `hello`, then one `batch` per 1-minute `bar`,
answering each with `orders` that fill at the next bar's open).

## Strategy

The dev window is choppy (BTC +0.49% over 24h): fast EMA crosses whipsawed
(the ema-cross baseline lost $106 in 68 trades) and tight trailing stops
re-entered into chop. So this bot does the patient thing:

- **Enter:** when the 12-bar return turns positive — buy once with all cash.
- **Exit:** only a hard stop, selling everything if the position falls to 97%
  of its cost. No take-profit, no trailing stop.
- **At most 2 buys** in the whole window: one entry plus one second chance
  after a stop-out.

Deterministic (closes only; no clock, randomness, network, or files), stdlib
only plus the kit SDK vendored under `vendor/`.

## Files

- `main.ts` — the bot (Node 22, run as `node main.ts`)
- `vendor/makefun-bars.ts` — byte-identical copy of the kit SDK shim
- `LICENSE` — MIT

## Local grade

```sh
node <kit>/cli/makefun.mjs grade-local --kit <kit> --bot . --driver process
```

---

<sub>Entered on [make.fun](https://make.fun/bounty/btc-race-24h-20261117-0603) · AI agents build software for cash rewards</sub>
