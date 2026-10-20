# `https://speedymealservices.com/delete-account` — exact page copy

> Status: the endpoints this page calls are implemented in the backend; see
> `admin-api-contract.md` for the request/response contract.

Nothing was created inside `website/`. Copy/paste ready for your web developer.
Text in quotes is literal. Placeholders in `{{…}}` come from the API.

---

## Page shell

**Browser title:** `Delete your SpeedyMeals account`

**Meta description:** `Request deletion of your SpeedyMeals account. 7-day grace period, admin review, deletion only with no pending dues.`

**H1:** `Delete your SpeedyMeals account`

**Intro paragraph:**
`You can delete your SpeedyMeals account from this page, without opening the app. Enter the phone number you registered with and we will send you a verification code. Your data is never deleted automatically — every request is reviewed by our team first.`

**No sign-in required.** The page must work on a phone browser, without the app, for both customers and riders.

---

## Form (step 1 — phone)

**Field label:** `Phone number`
**Placeholder:** `03XXXXXXXXX`
**Helper text:** `Enter the number your SpeedyMeals account is registered with.`
**Button:** `Send verification code`

After submit, always show (identical for known and unknown numbers):
`If an account is registered with this number, a verification code has been sent. Enter it to continue.`

---

## Form (step 2 — code)

**Field label:** `Verification code`
**Placeholder:** `6-digit code`
**Helper text:** `The code is valid for a few minutes.`
**Button:** `Verify and request deletion`

**Resend link text:** `Send a new code` (disabled for 45 seconds)

---

## Result — customer (API `result: "deleted"`)

**H2:** `Your account has been deleted`
**Body:**
`Your account and your personal data have been deleted. Order and payment records are kept in anonymised form, because we need them for accounting, fraud prevention and legal compliance. Your saved addresses and profile details are gone. You can sign up again at any time with the same number.`

---

## Result — rider (API `result: "pending"`)

**H2:** `Your deletion request has been received`
**Body:**
`Your account has been deactivated immediately, so you will not receive new deliveries.`
`Your account will be deactivated now. After 7 days your request goes to admin review. Deletion happens only after approval and only if you have no pending dues. You can cancel before then.`

**Details block (labels + values):**
- `Request submitted:` `{{requested_at, local date}}`
- `Goes to admin review on:` `{{grace_ends_at, local date}}`
- `Status:` `Pending` / `Under review` / `On hold` / `Completed` / `Cancelled`

**Next steps paragraph:**
`After the grace period, an admin reviews your request. We aim to decide within 30 days of your request. Your wallet balance and any collected cash (COD) must be zero before your account can be deleted — settle them and your request continues. Your CNIC, driving licence and vehicle photos are removed only when the admin handling your request says so.`

**Buttons:**
- `Cancel my deletion request` — shown while the request is `pending` or `under review` (API: `can_cancel: true`). Confirmation: `Your account will become active again. Continue?` → `Yes, cancel the request` / `Keep my request`.
- `Contact support` → `mailto:support@speedymealservices.com`

---

## Result — no account (API `result: "no_account"`)

**H2:** `No account found`
**Body:** `No SpeedyMeals account is registered with this phone number. If you think this is a mistake, contact support@speedymealservices.com.`

---

## Error states

**Wrong or expired code** (`400`):
`The code you entered is not correct or has expired. Please request a new one.`

**Active order / active delivery** (`409`):
- Customer: `You have an active or pending order. Please wait until it is delivered or cancelled, then delete your account.`
- Rider: `You still have an active delivery. Complete it, then request account deletion again.`

**Rate limited** (`429`):
`Too many attempts. Please wait a moment and try again.`

**Service error** (network / 5xx):
`Something went wrong on our side. Please try again in a few minutes, or email support@speedymealservices.com.`

---

## Footer block (always visible on the page)

`Deleting your account is permanent. Order and payment records are kept in anonymised form for accounting and legal purposes. Rider KYC documents (CNIC, driving licence, vehicle photos) are kept only as long as the admin handling your request decides, and are never shown publicly.`

**Links:** `Terms of Service` · `Privacy Policy` · `Email support`

**Support:** `support@speedymealservices.com`

---

## Notes for the developer

1. Use `POST /account-deletion/request` then `POST /account-deletion/confirm` (see `admin-api-contract.md` §3).
2. Never show a different message for "number registered" vs "number not registered" at step 1.
3. After step 2 the API does tell the owner their own account state — that is fine, they proved control of the number.
4. Persist `grace_ends_at` / `status` so a returning visitor can see their request state without signing in (add `GET` by OTP again, or show the result of a repeated `request` + `confirm`).
5. Link this page from the Play Console "Account deletion URL" field and from the app's Profile screen
   (`https://speedymealservices.com/delete-account` — already linked in the app).
