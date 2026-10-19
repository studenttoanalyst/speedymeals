"""
Account deletion (Google Play / Play Console compliance).

Two different policies live here, deliberately:

- Customer: immediate. Anonymised on the spot, refused with 409 while an
  order is still active/pending.
- Rider: deferred and admin-reviewed. The account is deactivated at request
  time, the request lands in the grace period, and the data is only removed
  after an admin approves it. A rider with unsettled dues (wallet balance or
  collected COD cash) or an in-flight delivery can never be executed, by
  anyone, which is why execution is a separate admin-gated function.

Nothing in this module deletes rows that orders/payments point at. Orders,
wallet transactions and payouts are financial history: they are anonymised
and kept, never removed.
"""
