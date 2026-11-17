// Patient momentum rider for the cbBTC/USDC 24h race (agent-fun/bars-replay/v1).
//
// Protocol: the harness sends one `hello` line, then one `batch` per minute — each
// batch carries the `bar` that just closed plus fills and the account — and this bot
// answers every batch with exactly one reply carrying its `orders` (possibly none).
// Orders decided on a batch fill at the next bar's open, so every decision here is
// made on closes only and pays the round-trip cost (~26-37 bps) on entry and exit.
//
// What the dev window taught us (1,440 one-minute bars, BTC +0.49% net, choppy):
// fast EMA crosses whipsawed badly (the ema-cross baseline lost $106 in 68 trades)
// and tight trailing stops re-entered into chop and lost too. The only robust
// behaviour on this window is: wait for a short-horizon uptrend to confirm, buy
// once with the full stake, then hold to the end. A 12-bar return turning positive
// is the confirmation; a 3% hard stop below cost is the only exit, purely as
// disaster protection (it never fired on the dev window). At most two buys in the
// whole window, so a stop-out gets one second chance and nothing more.
//
// Strategy, per bar:
//   - keep the last 12 closes; the 12-bar return is close / close[12 bars ago] - 1.
//   - flat and the return is above zero -> buy with all cash (one position max).
//   - holding and the position is worth 3% or less of its cost -> sell it all.
//   - otherwise hold. No take-profit, no trailing stop, no re-entry after a
//     profitable exit (there is no profitable exit except the final flatten).
//
// Deterministic: the only inputs are the bars in the batches; no wall clock, no
// randomness, no network, no files. Float math is IEEE-754 on closes only, so two
// runs on the same bars produce the same orders.

import { runBars, type BarsState, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
/** Lookback for the momentum confirmation, in bars (minutes). */
const LOOKBACK = 12;
/** Hard stop: sell when the position is worth this fraction of its cost or less. */
const STOP_NUM = 97n;
const STOP_DEN = 100n;
/** At most this many buys in the whole window (one entry + one second chance). */
const MAX_BUYS = 2;
/** Do not open a new position this late: fewer than MIN_HOLD_BARS bars remain to
 *  outrun the round-trip cost, so a late entry can only lose (the final flatten
 *  still sells whatever is held). The window is 1,440 bars. */
const MIN_HOLD_BARS = 30;
const NO_ENTRY_AFTER_BARS = 1440 - MIN_HOLD_BARS;
/** Slippage cap per order, in bps past the close the order was decided on. */
const MAX_SLIPPAGE_BPS = 100;

const closes: number[] = [];
let buys = 0;

await runBars({
  onBatch(state: BarsState, batch) {
    // Record this batch's bar close before deciding: the orders we send now
    // fill at the NEXT bar's open, against a close we have already seen.
    for (const bar of batch.bars) {
      if (bar.symbol === SYMBOL) closes.push(Number(bar.c));
    }
    if (state.warmingUp) return [];

    const held = state.positions.get(SYMBOL);
    const orders: (BuyInput | SellInput)[] = [];

    if (held !== undefined) {
      // Holding: the only exit is the disaster stop, checked on the latest close.
      const value = state.value(SYMBOL, held.qty);
      if (value * STOP_DEN <= held.cost * STOP_NUM) {
        orders.push({ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS });
      }
      return orders;
    }

    // Flat: enter only on a confirmed short-horizon uptrend, only while we
    // still have entries left, and only with enough bars left to outrun costs.
    if (buys >= MAX_BUYS) return [];
    if (closes.length <= LOOKBACK || closes.length > NO_ENTRY_AFTER_BARS) return [];
    const now = closes[closes.length - 1]!;
    const then = closes[closes.length - 1 - LOOKBACK]!;
    if (then <= 0 || now <= then) return [];

    const cash = state.cash;
    if (cash < BigInt(state.hello.fees.min_notional_quote_units)) return [];
    buys += 1;
    orders.push({ side: 'buy', symbol: SYMBOL, notional_quote_units: cash, max_slippage_bps: MAX_SLIPPAGE_BPS });
    return orders;
  },
});
