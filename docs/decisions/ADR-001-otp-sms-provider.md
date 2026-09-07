# ADR-001: Defer SMS/OTP Provider Choice Until Post-MVP

## Status
Accepted

## Context
Phase 2 (Auth & Users) needs to send OTP codes to customer/rider/restaurant phone numbers.
Pakistan-specific SMS providers (e.g. local aggregators like SendPK, D7 Networks, Unimatrix)
require Sender ID registration with PTA before any real SMS can be sent — this takes
2-4 weeks and has a one-time fee (~PKR 5,000-25,000). International providers (Twilio) work
but are far more expensive per message for Pakistan (~PKR 130+/SMS vs ~PKR 0.15-1/SMS locally)
and are not the right long-term fit.

Blocking Phase 2 development on this decision would stall the whole phase for weeks
without adding any value to the code itself.

## Decision
- Build the OTP flow now with the SMS-sending step isolated behind a single interface/function.
- In dev/test, that function runs in **console mode**: the OTP is written to the server log only,
  no real SMS is sent, no cost is incurred.
- The real provider is chosen and wired in only once the MVP is otherwise complete and ready for
  real-device testing — by then Sender ID registration should already be underway (see Consequence).
- Config controlled via `.env`: `SMS_PROVIDER_MODE=console|production`, `SMS_API_KEY=`.

## Consequence
- Zero cost and zero blocking during development.
- Sender ID / PTA registration (2-4 week lead time) should be **started before** MVP is fully
  complete, not after — otherwise real-device testing and launch will be delayed waiting on
  paperwork, not code.
- Swapping in a real provider later is a one-file change (implement the same interface), not a
  rewrite of the OTP flow.
