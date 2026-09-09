# SpeedyMeals â€” Food Delivery MVP
## Complete Product Specification (v5.0 â€” FINAL LOCKED)
### Validated against real-world Foodpanda operational model | Commission Updated to 10% | Distance-Based Delivery Fee Locked | Rider Earns 100% of Delivery Fee

---

## 1. Overview

SpeedyMeals is starting as a **Food Delivery MVP** â€” the first module of a future multi-service ecosystem (Ride-Hailing, Courier, Medicine Delivery, Technician Services to follow).

This specification has been cross-checked against real-world confirmation from active Foodpanda riders and restaurant partners â€” our cash-flow model (rider deposits cash â†’ weekly payout; restaurant paid weekly directly) matches actual industry practice. This document is now FINAL and LOCKED for MVP development.

**Changes in this version (v5.0):**
- Restaurant commission finalized at **10%** (previously inconsistent between 5% and 10% across sections â€” now uniform).
- Delivery fee model changed from flat fee to **distance-based**: Base Fee (Rs. 50) + Per-KM Rate (Rs. 20/km), calculated via Google Maps Distance Matrix.
- Rider earning clarified: rider receives **100% of the delivery fee** â€” SpeedyMeals earns only through the restaurant commission (10%) and the flat Rs. 10 wallet deduction per delivery.

---

## 2. User Roles & Platforms

| Role | Platform | Technology |
|---|---|---|
| Customer | Mobile App | Flutter |
| Rider | Mobile App | Flutter |
| Restaurant/Vendor | Web Dashboard | Next.js |
| Admin | Web Panel | Next.js |

**Why Restaurant uses Web, not Mobile:** Confirmed against real-world Foodpanda practice â€” restaurants primarily manage orders via a Web Portal (desktop/laptop at the restaurant counter), with mobile apps offered only as a secondary, on-the-go convenience. MVP builds only the Web Dashboard for restaurants; a mobile app can be added later once the business scales.

---

## 3. Revenue Model (Final, Confirmed)

### 3.1 Rider â€” Prepaid Wallet (Rs. 10/delivery)
- Minimum Rs. 500 wallet balance required to go online.
- Rs. 10 auto-deducted from wallet instantly on each completed delivery â€” this is SpeedyMeals' entire earning from the rider side.
- Below minimum balance â†’ rider automatically taken offline until recharge.
- Recharge methods: bank transfer, JazzCash, EasyPaisa, or card.
- **No security deposit required in MVP.** Fraud protection is instead handled through document verification, daily cash deposit requirements, and a cash collection cap (see Section 3.4 and Section 6).

### 3.2 Restaurant â€” 10% Commission, Weekly Settlement
- No upfront deposit or registration fee from restaurant.
- **10% commission** calculated per order, at the time the order is placed.
- Commission accrues in the restaurant's settlement ledger.
- **Confirmed real-world pattern:** Restaurant receives payment **directly from SpeedyMeals, weekly**, regardless of how individual customers paid (COD or Digital) â€” restaurant is never paid by the rider directly, exactly as Foodpanda operates.
- Commission rate is configurable per restaurant in the system (Admin can adjust individual rates if needed), with 10% as the MVP default.

### 3.3 Delivery Fee â€” Distance-Based (Locked Formula)

```
Delivery Fee = Base Fee (Rs. 50) + (Distance in KM Ã— Rs. 20 per KM)
```

**Examples:**

| Distance | Calculation | Total Delivery Fee |
|---|---|---|
| 0.5 km | Rs. 50 + (0.5 Ã— 20) | Rs. 60 |
| 1 km | Rs. 50 + (1 Ã— 20) | Rs. 70 |
| 3 km | Rs. 50 + (3 Ã— 20) | Rs. 110 |
| 5 km | Rs. 50 + (5 Ã— 20) | Rs. 150 |
| 10 km | Rs. 50 + (10 Ã— 20) | Rs. 250 |

- Distance is calculated using the **Google Maps Distance Matrix API**, based on actual road distance between the restaurant and the customer's delivery address (not straight-line distance).
- The calculated distance is stored against the order (`delivery_distance_km`) for transparency and dispute resolution.
- **The entire delivery fee belongs to the rider** â€” SpeedyMeals takes no cut from this amount. This is a deliberate business decision: SpeedyMeals earns exclusively through restaurant commission (10%) and the flat Rs. 10 per-delivery wallet deduction, keeping the rider's delivery earning fully transparent and competitive.

### 3.4 COD Cash Handling â€” Confirmed Real-World Flow
- Rider collects the full order amount (cash) from the customer at delivery.
- Rider **submits collected cash daily to SpeedyMeals** â€” via company account (bank transfer) or a designated branch/hub, mirroring exactly how Foodpanda riders operate today.
- Rider's own delivery earning is **not self-deducted** from this cash â€” it is paid to them separately, in the **weekly payout**, matching Foodpanda's confirmed practice.
- System tracks "expected cash" (calculated from completed COD orders) vs. "actual cash submitted" per rider â€” discrepancies are flagged for Admin review.
- **Cash collection cap** (e.g., Rs. 10,000 pending): once a rider's undeposited cash reaches this limit, the system automatically stops assigning new COD orders to them (digital-payment orders still allowed) until they deposit.

---

## 4. Payment Flow â€” Digital Payment

1. Customer selects "Pay Online" at checkout and completes payment via a payment gateway (JazzCash Business, EasyPaisa Business, or bank-integrated gateway).
2. The full order amount (food + distance-based delivery fee) goes **directly into SpeedyMeals' company merchant account** â€” never to the restaurant or rider directly.
3. System records the order as "Paid â€” Digital."
4. From this centrally-held amount, SpeedyMeals later pays out: Restaurant's share (weekly settlement, 90% of food price) and Rider's earning (weekly payout, 100% of delivery fee); SpeedyMeals keeps its 10% commission.
5. Rider's Rs. 10 wallet deduction still happens instantly upon delivery completion, same as any order.

---

## 5. Payment Flow â€” Cash on Delivery (Confirmed Model)

1. Rider picks up food from the restaurant â€” **no cash is exchanged between rider and restaurant at any point**, regardless of the order's payment method.
2. Customer pays the rider the full order amount (food + delivery fee) in cash at delivery.
3. The moment the rider marks the order "Delivered," the system instantly deducts Rs. 10 from the rider's prepaid wallet.
4. The rider now holds the remaining collected cash â€” tracked in the system as "pending cash owed," not the rider's own money (except their delivery fee earning, which they will also receive separately via weekly payout for accounting consistency).
5. The rider must submit the total collected cash to SpeedyMeals **daily** (bank transfer, mobile wallet transfer, or a designated collection point/hub).
6. SpeedyMeals' system compares "expected cash" (from completed COD orders) against "actual cash deposited" â€” any shortfall is flagged immediately.
7. SpeedyMeals pays **Restaurant weekly** (from its own funds, direct to restaurant's account) and **Rider weekly** (their full delivery fee earnings, a separate transaction from the cash they submitted) â€” confirmed to match real-world Foodpanda practice.

---

## 6. Fraud Handling (Without Security Deposit)

Since the security deposit has been removed from MVP scope, fraud protection relies on the following layered controls:

1. **Document Verification at Onboarding** â€” CNIC, license, and vehicle documents collected and manually verified by Admin before a rider is approved. This is the legal basis for any future recourse.
2. **Daily Cash Deposit Requirement** â€” limits how long a rider can hold company/restaurant money, reducing maximum exposure to roughly one day's collection at a time.
3. **Cash Collection Cap** â€” automatically restricts new COD order assignment once a rider's pending cash reaches a set limit (e.g., Rs. 10,000), preventing exposure from growing unchecked.
4. **If a rider disappears with cash:**
   - Immediate account suspension and platform blacklist.
   - Legal action (FIR/police report) using the CNIC and documents collected at onboarding.
   - Any resulting loss is treated as a normal operational cost at MVP scale â€” standard practice in COD-heavy delivery businesses.
5. **Future consideration (LATER, not MVP):** Once real fraud/loss data is available from actual operations, a security deposit or delivery insurance can be reintroduced with a properly calibrated amount, rather than an early guess.

---

## 7. Customer Journey â€” Step by Step

**Step 1: Open the App (First Time)**
Splash screen with logo â†’ 2â€“3 onboarding slides ("Order Fast," "Track Live," "Pay Easy") â†’ shown only the first time.

**Step 2: Create Account**
Enter phone number â†’ OTP sent via SMS â†’ OTP verified â†’ enter name (email optional) â†’ account created.

**Step 3: Login (Returning User)**
Phone number + OTP â†’ login. If token still valid, auto-login without asking again.

**Step 4: Set Delivery Address**
App requests location permission â†’ GPS auto-detects location â†’ customer confirms/adjusts pin on map â†’ address saved (labeled "Home"/"Work"/"Other"). Multiple addresses can be saved.

**Step 5: Browse Restaurants**
Home screen shows nearby restaurants (sorted by distance/rating) â†’ search by name or cuisine â†’ basic filters (cuisine type, rating).

**Step 6: View Restaurant Menu**
Tap restaurant â†’ menu shown by category (Starters, Main, Drinks) â†’ each item shows photo, name, description, price.

**Step 7: Add Items to Cart**
Tap item → select quantity/variant → add to cart. Each restaurant gets its own **carts** tab — adding from a different restaurant silently opens a new tab without clearing the existing one. Customer checks out each tab as a separate order, with its own rider and delivery running simultaneously.

**Step 8: Checkout**
Review cart (edit/remove items) â†’ confirm delivery address â†’ system calculates distance-based delivery fee (Base Rs. 50 + Rs. 20/km) â†’ price breakdown shown (Food Subtotal + Delivery Fee = Total) â†’ select payment method: **Cash on Delivery** or **Pay Online (Digital)**.

**Step 9: Place Order**
Tap "Place Order." System records the order and, in the background, calculates the restaurant's payable amount (90% of food price), SpeedyMeals' commission (10%), and the rider's earning (100% of delivery fee) â€” all invisible to the customer, who only sees the total.

**Step 10: Track Order Live**
Real-time status updates: `Placed â†’ Accepted by Restaurant â†’ Preparing â†’ Rider Assigned â†’ Picked Up â†’ On the Way â†’ Delivered`. Once assigned, rider's name and phone number are visible (tap to call).

**Step 11: Order Delivered**
Status changes to "Delivered." If COD, customer pays the rider cash at the door; if Digital, no cash exchange (already paid at checkout). Customer is prompted to rate the order (1â€“5 stars, optional comment).

**Step 12: Order History**
View list of past orders. Tap a past order â†’ "Reorder" button repeats the same order.

**Step 13: Profile & Settings**
Edit name, manage saved addresses, view wallet balance, log out.

---

## 8. Rider Journey â€” Step by Step

**Step 1: Install App & Sign Up**
Enter phone number â†’ OTP verify â†’ fill details: name, CNIC number, vehicle type (bike/car), vehicle registration number â†’ upload documents (CNIC photo, license photo, vehicle photo) â†’ submit â†’ status: "Pending Approval."

**Step 2: Admin Approval**
Admin manually reviews documents â†’ approves or rejects â†’ rider notified.

**Step 3: Login**
Phone + OTP â†’ login.

**Step 4: Add Wallet Balance (Mandatory Before Going Online)**
Rider deposits a **minimum Rs. 500** into their SpeedyMeals wallet (bank transfer, JazzCash, EasyPaisa, or card). This balance funds the recurring Rs. 10 per-delivery deduction. *(No separate security deposit â€” this wallet balance is the only prerequisite.)*

**Step 5: Go Online**
If wallet balance is sufficient, rider toggles "Go Online" (disabled with a recharge prompt if balance is too low). App starts sharing live location.

**Step 6: Receive Delivery Request**
System assigns the nearest available online rider when a restaurant marks an order "Ready for Pickup." Rider sees pickup location, drop-off location, payment type (COD or Digital), distance, and estimated earning (the full distance-based delivery fee). Rider can Accept or Reject (rejected requests go to the next nearest rider).

**Step 7: Navigate to Restaurant**
Tap "Navigate" â†’ opens Google Maps to restaurant location â†’ rider marks "Arrived at Restaurant."

**Step 8: Pick Up the Order**
Restaurant hands over the food only â€” **no payment is exchanged between rider and restaurant.** Rider marks "Picked Up" â†’ customer's tracking screen updates automatically.

**Step 9: Navigate to Customer**
Tap "Navigate" â†’ Google Maps to customer address â†’ rider marks "On the Way."

**Step 10: Complete Delivery (Wallet Deduction Happens Here)**
Rider marks "Delivered." The system **instantly deducts Rs. 10** from the rider's wallet balance â€” this is the only amount SpeedyMeals collects from the rider, per delivery.
- If COD: rider collects the full amount in cash (food + delivery fee); this is tracked as "pending cash owed."
- If Digital: no cash involved â€” payment already processed at checkout.

**Step 11: Daily Cash Deposit (COD Riders Only)**
At the end of each day, rider deposits all collected COD cash to SpeedyMeals (bank transfer, mobile wallet, or designated hub). System compares expected vs. actual deposited amount and flags any shortfall. If pending cash reaches the platform cap, the rider stops receiving new COD orders until deposited.

**Step 12: Receive Weekly Payout**
Rider receives their accumulated delivery fee earnings (100% of every delivery fee from completed orders) via weekly payout â€” a transaction separate from the daily cash they submitted.

**Step 13: View Earnings**
Rider sees: **Earnings Balance** (weekly payout accumulation â€” full delivery fees earned), **Wallet/Credit Balance** (prepaid balance, with recharge prompt when low), and **Pending Cash Owed** (COD cash not yet deposited, if any).

**Step 14: Profile**
View/edit details, vehicle info, log out.

---

## 9. Restaurant Journey â€” Step by Step

**Step 1: Onboarding**
SpeedyMeals business team manually onboards the restaurant (business details, menu, documents) at MVP stage. Admin creates the restaurant's account in the Admin Panel â€” including setting up its login credentials (see Step 2).

**Step 2: Account & Login Setup (Finalized)**
Every restaurant account includes the following login-related fields, set during onboarding:
- **Email** (unique) â€” primary login identifier.
- **Password** â€” set during onboarding, restaurant can change it later from their dashboard.
- **Phone Number** (unique) â€” secondary contact/login option, and used for account recovery or urgent notifications.

Restaurant staff can log in using **either email + password, or phone number (with OTP)** â€” whichever is more convenient for them.

**Step 3: Login**
Restaurant logs in via the Web Dashboard (Next.js) using email/password or phone+OTP.

**Step 4: Commission Agreement**
Admin sets the restaurant's commission rate â€” **10% per order** (default, configurable per restaurant if needed). No upfront deposit required.

**Step 5: Menu Management**
Add/edit/remove menu items (name, price, description, photo, category); mark items "Available" or "Sold Out."

**Step 6: Receive Orders**
New orders appear on the dashboard with an alert, showing items, customer name, delivery address, and payment method (informational only â€” does not affect how the restaurant is paid).

**Step 7: Prepare the Order**
Mark "Preparing" â†’ mark "Ready for Pickup" once food is ready â€” this triggers rider assignment.

**Step 8: Hand Over the Order**
Rider arrives, restaurant hands over food only â€” **no payment exchange happens here, regardless of the order's payment method.**

**Step 9: Weekly Settlement (Restaurant Gets Paid)**
End of each week, restaurant dashboard shows: Total Sales, Commission Deducted (10%), and Net Payable (90% of total food sales). SpeedyMeals pays this directly from its own company funds to the restaurant's account â€” confirmed to match real-world Foodpanda practice, unaffected by whether underlying orders were COD or Digital.

**Step 10: View Order History & Reports**
View past orders and basic sales reports (daily/weekly order counts and revenue).

**Step 11: Restaurant Profile**
Edit restaurant name, address, operating hours, logo, cover photo â€” and update login email/phone/password if needed.

---

## 10. Admin Journey â€” Step by Step

**Step 1: Login**
Admin/support staff log in with email and password (role-based access: super_admin vs. support).

**Step 2: Dashboard Overview**
Real-time summary: today's total orders, gross revenue, SpeedyMeals net revenue (commission + wallet deductions), pending restaurant payouts, total rider wallet balances, total pending COD cash across all riders.

**Step 3: Manage Restaurants**
View, add, edit, approve, or deactivate restaurants; set up or reset restaurant login credentials; adjust commission rates per restaurant.

**Step 4: Manage Riders**
Review documents, approve/reject applications, monitor wallet balances and pending cash-owed per rider. Deactivate riders for fraud or repeated violations.

**Step 5: Manage Orders**
View all orders (live + history); filter by status, date, restaurant; manually intervene if needed (cancel stuck orders, reassign riders); view distance and delivery fee breakdown per order.

**Step 6: Process Restaurant Settlements**
View list of restaurants due for weekly settlement with amounts owed; process payment (manual bank transfer at MVP stage); mark as "Settled."

**Step 7: Process Rider Payouts & Cash Reconciliation**
View riders' weekly delivery fee earnings due for payout; view COD cash deposit records vs. expected amounts; flag and investigate discrepancies.

**Step 8: Manage Customers**
View customer accounts and order history; block/deactivate accounts if necessary.

**Step 9: View Reports**
Weekly/monthly trends: total orders, revenue, top-performing restaurants, rider payout totals, cash discrepancy reports, average delivery distance/fee trends.

---

## 11. Complete Money Flow (Final, Confirmed, Corrected Math)

**COD Order Example (Rs. 1,000 food + delivery distance 3km):**

```
Delivery Fee = Rs. 50 (base) + (3 km Ã— Rs. 20) = Rs. 110

Customer pays Rider (COD): Rs. 1,000 (food) + Rs. 110 (delivery) = Rs. 1,110

Instantly on "Delivered": Rs. 10 deducted from Rider's prepaid wallet

Rider submits Rs. 1,110 to SpeedyMeals (daily cash deposit)

SpeedyMeals then (weekly):
  â†’ Restaurant: Rs. 900 (Rs. 1,000 minus 10% commission)
  â†’ Rider: Rs. 110 (full delivery fee â€” rider's earning)
  â†’ SpeedyMeals keeps: Rs. 100 (10% commission) + Rs. 10 (wallet deduction) = Rs. 110 total
```

**Digital Payment Order Example (same order, paid online):**

```
Customer pays SpeedyMeals account: Rs. 1,110 (instant, digital)

SpeedyMeals then (weekly):
  â†’ Restaurant: Rs. 900
  â†’ Rider: Rs. 110 (full delivery fee)
  â†’ SpeedyMeals keeps: Rs. 100 (commission)

Instantly on "Delivered": Rs. 10 deducted from Rider's prepaid wallet (regardless of payment type)
  â†’ SpeedyMeals' total earning: Rs. 110 (Rs. 100 commission + Rs. 10 wallet deduction)
```

**Key principle confirmed:** SpeedyMeals earns exactly the same amount (Rs. 100 commission + Rs. 10 wallet deduction = Rs. 110 total, in this example) regardless of payment method or delivery distance â€” only the food price and distance change the absolute numbers, not the underlying revenue logic. The rider always receives 100% of the delivery fee, and the restaurant always receives 90% of the food price.

---

## 12. Database Design Alignment

This specification is directly reflected in the locked Entity-Relationship Design, with the following key alignments:

- **`riders` table** â€” no security deposit field; only `wallet_balance` and `pending_cash_owed` are tracked, matching the fraud-handling approach in Section 6.
- **`restaurants` table** â€” includes `email` (unique), `password_hash`, and `phone_number` (unique) fields to fully support the login mechanism described in Section 9, Step 2; `commission_rate` defaults to 10.00.
- **`orders` table** â€” stores `commission_amount`, `restaurant_payable`, `rider_earning`, and `delivery_distance_km` as snapshot values at the time of order placement, ensuring historical accuracy even if commission rates or fee formulas change later.
- **`wallet_transactions`** â€” tracks every rider wallet recharge and the flat Rs. 10 deduction per delivery.
- **`cash_deposits`** â€” tracks rider daily cash submissions against expected amounts.
- **`settlements`** â€” tracks weekly restaurant payouts (90% of food sales).
- **`rider_payouts`** â€” tracks weekly rider earnings (100% of delivery fees), kept separate from `cash_deposits` per the confirmed real-world model (cash submission and earnings payout are distinct transactions).

---

## 13. MVP Scope â€” Included
âœ… Customer: signup/login, browse, menu, multi-restaurant cart (simultaneous carts per restaurant with independent riders and concurrent delivery), order (COD/Digital), distance-based delivery fee display, live tracking, history, reorder, rating
âœ… Rider: signup/login, documents, prepaid wallet (min Rs. 500), online/offline, request accept/reject, navigation, delivery status, daily cash deposit, weekly earnings view (full delivery fee payout)
âœ… Restaurant: manual onboarding with email/password/phone login setup, 10% commission agreement, menu management, order accept/status, weekly settlement view, reports
âœ… Admin: dashboard, restaurant/rider/order/customer management, weekly settlement + payout processing, cash reconciliation, reports

## 14. MVP Scope â€” Excluded (Later Phases)
â Œ Rider security deposit (deferred â€” to be reconsidered once real fraud data is available)
â Œ Scheduled/future-dated orders
â Œ Speedy Kitchen (in-house cloud kitchen)
â Œ Loyalty points / referral system
â Œ Speedy Card membership/subscription
â Œ In-app chat (phone call is sufficient for now)
â Œ Advanced search filters
â Œ Push notifications (in-app status refresh is enough for MVP)
â Œ Multiple payment gateways (one digital method + COD is enough)
â Œ AI-based delivery time prediction or route optimization
â Œ Automated restaurant/rider payouts (manual process at MVP stage)
â Œ Delivery insurance (consider once at scale)
â Œ Restaurant mobile app (Web Dashboard only for MVP; mobile app is a later addition)
â Œ Multi-staff restaurant accounts (one login per restaurant for MVP; role-based staff accounts are a later addition)
â Œ Minimum-distance fee floor / surge pricing adjustments (can be added later if very short deliveries prove financially unattractive to riders)
â Œ Ride-Hailing, Courier, Medicine Delivery, Technician Services modules (future ecosystem expansion, built one at a time after Food Delivery MVP proves successful)

---

## 15. Why This Scope (Summary Reasoning)

Every feature included directly supports one core goal: **a customer can order food, track it, and receive it reliably â€” and the business can operate, earn, and protect its revenue from day one.**

The rider's prepaid wallet guarantees SpeedyMeals' per-delivery fee (Rs. 10) is collected instantly, regardless of payment method â€” without requiring an upfront security deposit, fraud exposure is instead controlled through document verification, daily cash deposit discipline, and a hard cap on pending cash per rider. The distance-based delivery fee (Base Rs. 50 + Rs. 20/km) ensures fair, scalable compensation for riders regardless of how far they travel, while giving riders 100% of that fee keeps their earnings transparent and competitive â€” SpeedyMeals' revenue comes cleanly from two sources only: the 10% restaurant commission and the flat Rs. 10 wallet deduction. The restaurant's weekly settlement model (paid directly by SpeedyMeals, never by riders) keeps restaurant relationships simple and trustworthy, matching how Foodpanda operates. The restaurant login mechanism (email/password + phone) ensures every restaurant account is fully functional from day one, with no gaps between the product specification and the underlying database design.

---

*Document version: 6.0 â€” FINAL LOCKED*
*Commission finalized at 10%. Delivery fee locked as distance-based (Base Rs. 50 + Rs. 20/km) via Google Maps Distance Matrix. Rider receives 100% of delivery fee; SpeedyMeals earns via commission + flat wallet deduction only.*
*v6.0 change: Multi-cart model adopted â€” customers can maintain simultaneous, independent carts per restaurant; each becomes a separate order with its own rider and concurrent delivery. The "clear cart" single-restaurant restriction is removed.*
*Next step (revised): the database design above is implemented in the backend — `delivery_distance_km` on orders and `commission_rate` default 10.00 on restaurants (see backend/docs/Backend_development.md); multi-cart deliberately lives in Redis cart keys rather than a `carts` table. Remaining product-level next step: finalize the System Design Diagrams (Architecture Diagram, Sequence Diagrams, Order Status Flow, Multi-Cart Flow).*
