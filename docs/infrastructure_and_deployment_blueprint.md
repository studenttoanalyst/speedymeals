# SpeedyMeals: Infrastructure Explained (Plain-English Edition)
**For:** Founders / Investors / Non-technical team members
**Covers:** What each piece is, why we need it, how it works, cost, alternatives, where to buy it, and how our current HosterPK setup compares to the ideal scaled setup.

---

## How to read this document

Every section below follows the same pattern:
- **What it is** — plain description
- **Why we need it** — the business reason
- **How it works** — simple mental model, no jargon
- **Cost** — real numbers
- **Alternatives** — other options and when they'd make sense
- **Where to buy / set up** — exact steps

---

## 1. Domain Name — `speedymeals.com`

**What it is:** The web address people type to reach us. Like a shop's street address, but for the internet.

**Why we need it:** Without it, customers can't find us online, we can't have professional email (`support@speedymeals.com`), and riders/restaurants can't trust the brand.

**How it works:** You "rent" the name for a year at a time from a company called a **registrar**. Nobody truly "owns" a domain forever — you renew annually or lose it.

**Cost:** ~$9–12/year for a `.com`.

**Alternatives:**
| Provider | Cost/year | Notes |
|---|---|---|
| Cloudflare Registrar | $9–10 | Cheapest, no markup, easiest to manage |
| Namecheap | $10–15 (promo pricing) | Accepts Pakistani cards reliably |
| Porkbun | $10–12 | Simple, developer-friendly |

**Where to buy:**
1. Go to cloudflare.com → sign up free account → "Register Domain" → search `speedymeals.com` → pay with card.
2. If Cloudflare gives issues with Pakistani cards, use Namecheap.com instead — same process.

---

## 2. DNS (Domain Name System)

**What it is:** The internet's phonebook. It tells browsers/phones which physical server to connect to when someone types `speedymeals.com` or `api.speedymeals.com`.

**Why we need it:** Without DNS, the domain name is just a label — nothing actually points anywhere. DNS also protects us from certain attacks and speeds up load times globally.

**How it works:** You add "records" (like a phonebook entry: name → address) inside a DNS provider's dashboard. When someone visits our site, their device asks DNS "where is speedymeals.com?" and gets routed to the right server.

**Cost:** Free (Cloudflare's DNS plan is $0).

**Alternatives:**
| Provider | Cost | Notes |
|---|---|---|
| Cloudflare DNS | Free | Fastest globally, includes free attack protection (DDoS shield) |
| AWS Route 53 | ~$0.50/month + usage | Only worth it once fully on AWS |
| Registrar's default DNS | Free but basic | Slower updates, no attack protection — not recommended |

**Where to buy/set up:** Automatically available once domain is on Cloudflare (Section 1). No separate purchase.

---

## 3. Corporate Email (Google Workspace) — clarifying the "$7"

**What it is:** Professional email like `admin@speedymeals.com` instead of a personal Gmail. Runs on the same Gmail interface everyone already knows.

**Why we need it:** Looks professional to investors/restaurants/riders, and lets us manage staff accounts centrally (e.g., disable an employee's access instantly if they leave).

**How it works:** You buy **one license** (~$7/month) tied to one real inbox, e.g. `admin@speedymeals.com`. Every *other* address people see — `support@`, `riders@`, `partners@`, `contact@` — can be created for **free** as "aliases" that all deliver into that same one paid inbox (or get forwarded to different team members). You are not paying $7 per address, only per **real mailbox** you create.

**Cost:** $6–7.20/month for the first real mailbox. Additional real mailboxes (separate logins for separate people) cost another $6–7.20/month each.

**Alternatives:**
| Provider | Cost | Notes |
|---|---|---|
| Google Workspace | $6–7.20/mo/mailbox | Best-known, most trusted by investors/partners |
| Zoho Mail | Free (up to 5 users) or $1–1.25/mo | Best if conserving cash pre-revenue |
| Cloudflare Email Routing | Free | Only forwards email to an existing personal Gmail — no real "mailbox," just redirection. Good as a $0 stopgap. |

**Where to buy:**
1. Go to workspace.google.com → "Get Started" → enter `speedymeals.com` (must own the domain first, Section 1) → follow domain-verification steps (add one TXT record in Cloudflare DNS — a 2-minute copy-paste step) → pay via card.

**Verdict for us:** Not urgent for a technical MVP. Nice-to-have once investor/partner-facing communication ramps up. Can be delayed or replaced with free Cloudflare Email Routing for now.

---

## 4. Website Hosting (Next.js frontend)

**What it is:** The physical/virtual computer that actually runs our website 24/7 so anyone in the world can open it.

**Why we need it:** Code sitting on a developer's laptop isn't visible to the public — it needs to live on a server that's always on.

**How it works:** We "deploy" (upload) our website code to a hosting company. Every time we push new code to GitHub, the host can automatically rebuild and update the live site.

**Cost:** $0–20/month depending on provider.

**Alternatives:**
| Provider | Cost | Notes |
|---|---|---|
| Vercel | Free tier, then ~$20/mo team plan | Built by creators of our website framework (Next.js) — zero setup, auto-updates on every code push, fastest option |
| Self-hosted on our own server | $0 extra (uses server we already pay for) | Requires more technical setup and maintenance |
| Cloudflare Pages | Free | Fast, but occasionally needs extra technical tweaks for newer Next.js features |

**Where to buy:** vercel.com → "Sign up with GitHub" → import `speedymeals` repository → set root folder to `website` → deploy (free to start).

---

## 5. Backend Server (FastAPI — the "brain" of the app)

**What it is:** The engine that handles logins, orders, payments logic, rider assignment — everything that isn't just "showing a webpage."

**Why we need it:** The website and mobile apps are just the "face" — all real decisions (who gets assigned a delivery, how much a restaurant is owed) happen here.

**How it works:** This needs a server that's always running, unlike the frontend which can be "static." Two broad options exist:
- **Managed/shared hosting** — company runs the server for you, you just upload code (simpler, less control).
- **VPS (Virtual Private Server)** — you get your own private slice of a real machine, with full control (more setup work, more power).

**Cost:** $5–20/month for a VPS capable of running our stack.

**Decision: we are going with AWS Lightsail** — it matches our long-term plan to migrate fully into AWS's ecosystem (S3 storage, RDS database, etc.) later, so we're not throwing away setup work when we scale up.

**Alternatives (for reference, not chosen):**
| Provider | Type | Cost/month | Notes |
|---|---|---|---|
| **AWS Lightsail (chosen)** | VPS | $10–20 | Matches our future full-AWS migration path |
| DigitalOcean Droplet | VPS | $12–24 | Easiest VPS for beginners, good docs |
| Hetzner Cloud | VPS | €5–10 (~$5–11) | Cheapest for the power you get |
| HosterPK Shared Hosting (current) | Shared | Already paid (~$45/yr) | See full comparison in Section 9 |

### Which Lightsail plan to buy

| Plan | Specs | Price/month | Verdict |
|---|---|---|---|
| Nano | 1 vCPU, 1GB RAM, 40GB SSD, 2TB transfer | $5 | Too tight — backend + Redis + Nginx together will run out of memory under any real concurrent load |
| **Micro — recommended for pilot** | 2 vCPU, 2GB RAM, 60GB SSD, 3TB transfer | **$10** | Enough to run our backend + Redis + Nginx for the Karachi pilot fleet (the database itself lives separately on Supabase, so this box only needs to handle app logic and live rider GPS, not data storage) |
| Small | 2 vCPU, 4GB RAM, 80GB SSD, 4TB transfer | $20 | Upgrade to this if we expect more than ~50–100 riders online at once at launch, or want extra breathing room from day one |

The cheapest Lightsail plan technically available is $3.50/month, but that version has no public IP address — since our app needs a stable public address to be reachable, the real starting price for us is $5/month, and the $10/month Micro plan is the one we should actually buy. Lightsail bills by the hour but never charges more than the flat monthly price, so there's no risk of surprise overages from normal usage.

One region note: hosting in Asia-Pacific regions can come with a smaller "included data transfer" allowance than US regions at the same price, so before committing we should double check the exact transfer allowance for the Singapore region (our nearest low-latency choice to Karachi) on AWS's own pricing page.

**Where to buy:**
1. Go to **lightsail.aws.amazon.com** → sign in or create an AWS account (requires a card on file).
2. Click **"Create instance."**
3. Platform: **Linux/Unix**. Blueprint: **"OS Only" → Ubuntu 24.04 LTS** (a clean server, not a pre-built app template).
4. Region: **Asia Pacific (Singapore)** — closest low-latency option to Karachi.
5. Plan: select the **$10/month** instance (2GB RAM / 2 vCPU / 60GB SSD).
6. Give it a clear name, e.g. `speedymeals-backend-prod`, and click **Create**. It's live within about a minute.
7. Under the instance's **Networking** tab: attach a **free Static IP** (so the server's address never changes on restart) and open ports **22, 80, 443** so the app and our own logins can reach it.
8. Point our domain at it: in Cloudflare DNS, add an **A record** for `api.speedymeals.com` pointing to this static IP.
9. Connect via the built-in browser SSH terminal (no extra software needed) and install Docker, then deploy our backend code from GitHub, and set up free auto-renewing HTTPS via Certbot.

**Estimated real monthly cost for this piece:** **$10/month** for the server itself, plus an optional ~20% extra (~$2/month) if we turn on Lightsail's automatic daily backups once real pilot data is flowing — for a realistic total of **$10–12/month**.

---

## 6. Redis (Live Data Memory)

**What it is:** A super-fast, temporary memory layer — think of it as a whiteboard the app can read/write to instantly, instead of digging through the full filing cabinet (the database) every time.

**Why we need it:** Two specific jobs:
1. Tracking riders' live GPS location as it updates every few seconds (too fast/frequent for the main database).
2. Rate-limiting OTP codes (stopping someone from spamming login attempts).

**How it works:** Runs alongside our backend server, holding data in memory (RAM) instead of on disk — that's what makes it instant, but data disappears if the server restarts (fine, since it's just temporary live data, not permanent records).

**Cost:** Usually free — it runs on the same server as the backend, no separate purchase needed, unless using a managed cloud version.

**Alternatives:**
| Option | Cost | Notes |
|---|---|---|
| Self-run Redis on our VPS | Free | What we currently plan — runs in same Docker setup as backend |
| Managed Redis (Upstash, Redis Cloud) | Free tier, then ~$10+/mo | Removes maintenance burden, useful once traffic grows |

**Where to buy:** No purchase needed if self-hosted — installed automatically as part of our backend server setup (via Docker).

---

## 7. Database (PostgreSQL — permanent data storage)

**What it is:** The permanent filing cabinet: every user, order, restaurant, rider, and transaction record lives here forever (until deleted).

**Why we need it:** This is literally the business — orders history, money owed, accounts. Losing this data = losing the business.

**How it works:** A specialized always-on database server stores everything in organized tables. Automated backups protect against data loss.

**Cost:** $0–25/month depending on stage.

**Alternatives:**
| Provider | Cost | Notes |
|---|---|---|
| Supabase (recommended) | Free tier for MVP, $25/mo "Pro" for production | Managed Postgres + automatic backups + built-in dashboard; easiest option, no DB admin skills needed |
| Self-hosted Postgres on our VPS | Free | Riskier — if server crashes without proper backups configured, we could lose all data |
| AWS RDS | $25–35/mo | More expensive, but matches long-term AWS migration plan |

**Where to buy:** supabase.com → sign up → "New Project" → choose region closest to our backend server (Singapore) → free to start, upgrade to Pro later when real customer data is at stake.

---

## 8. Document/File Storage (for rider ID cards, licenses, restaurant contracts)

**What it is:** A separate, specialized storage service for files/images/PDFs — not something that belongs in the regular database.

**Why we need it:** Rider CNIC photos, driving licenses, restaurant contracts need to be stored securely and privately, separate from the main app data, for legal/compliance reasons.

**How it works:** Files are uploaded directly from the rider/restaurant's phone or browser straight to this storage service (not passing through our own server, which keeps our server fast and cheap).

**Cost:** Usually a few dollars/month at small scale — pay only for what's stored + downloaded.

**Alternatives:**
| Provider | Cost | Notes |
|---|---|---|
| AWS S3 | ~$0.023/GB stored + download fees | Industry standard, most tutorials/support available |
| Cloudflare R2 | Same storage cost, but **zero** download fees | Cheaper long-term if lots of file viewing happens (e.g., admin reviewing documents often) |
| Supabase Storage | Included in Supabase plan | Simplest — one less account to manage since we already use Supabase for the database |

**Where to buy:** Start with Supabase Storage (already included, zero extra setup) — switch to AWS S3 or Cloudflare R2 only once storage needs grow significantly.

---

## 9. Automated Deployment (CI/CD — "how updates go live")

**What it is:** A robot that automatically tests and publishes new code the moment a developer finishes writing it — instead of someone manually copying files to the server by hand.

**Why we need it:** Manual deployment is slow and error-prone — one mistyped command can take the whole app offline. Automation catches bugs before they reach real users and reduces downtime.

**How it works:** Every time a developer saves ("pushes") their code to GitHub, a service automatically: runs tests → builds the app → publishes it live, all within minutes, with zero manual steps.

**Cost:** Free for our team size (GitHub Actions gives free minutes for small teams).

**Alternatives:**
| Option | Cost | Notes |
|---|---|---|
| GitHub Actions | Free (small team usage) | Industry standard, well documented |
| Coolify (self-hosted) | Free (runs on our own VPS) | Gives a "Heroku-like" experience — push code, it deploys — but we maintain it ourselves |
| Manual deployment | Free but risky | Fine for the very first weeks of testing only |

**Where to buy:** No purchase — GitHub Actions is already included free with our existing GitHub account.

---

## 10. Current Setup vs. Ideal Scaled Setup — Full Comparison

### What we have right now
Investor purchased **HosterPK Shared Hosting Plan IV** (Rs. 12,470/year, ~$45/year):
- 3 CPU cores, 5GB RAM, 5000MB disk, 100GB bandwidth/month
- cPanel control panel with SSH access, Git tool, and app installers for both Node.js (our website) and Python (our backend)
- 60 email accounts, free domain, 25 subdomains
- **No isolated/dedicated resources** (shared with other customers on the same physical machine — even at this top tier)
- **30 concurrent process limit** — caps how many people can use the app at the same exact moment
- **No visible PostgreSQL support** (MySQL only) — our database engine choice doesn't natively fit
- **No Docker/root access** — can't run our planned Redis + FastAPI + Nginx container setup as designed

### What the ideal scaled setup looks like
| Layer | Current (HosterPK) | Ideal Planned Setup |
|---|---|---|
| Website hosting | Same shared server as backend | Vercel (dedicated, auto-scaling) |
| Backend server | Shared cPanel slot, 30-process cap | Dedicated VPS (DigitalOcean/Hetzner/Lightsail), full control |
| Database | Not natively supported (MySQL only) | Supabase (managed Postgres, our actual DB engine) |
| Live data (Redis) | Uncertain/limited (cache-only Redis tool) | Self-run Redis, no restrictions |
| File storage | Shared disk (5GB cap) | Supabase Storage / S3 — scales independently |
| Isolation from other customers | None (shared, even at top plan) | Full (VPS = our own dedicated slice) |
| Concurrent users supported | Low (~30 active connections) | High (thousands, scales with server size) |
| Root/server control | None | Full |
| Cost | ~$45/year (already paid) | ~$40–60/month once all pieces are live |

### Plain-English verdict
Think of HosterPK Plan IV like **renting a desk in a shared co-working space** — cheap, gets you started immediately, fine for early testing and demos. The ideal scaled setup is like **renting your own private office** — costs more, but nobody else's activity can slow you down, and you can set it up exactly how the business needs.

**Recommendation:** Use HosterPK as a **free proof-of-concept / demo environment** right now since it's already paid for — good enough to show investors a working prototype. Move to the dedicated VPS + Supabase setup **before the real Karachi pilot launch**, once real riders/customers/restaurants are using the app live, since that's when the 30-process limit and shared-resource risk would actually cause outages.

---

## 11. Suggested Order of Purchases (Budget-Conscious, Funded Path)

| Step | Item | Cost | When |
|---|---|---|---|
| 1 | Domain (Cloudflare Registrar) | ~$10/year | Immediately |
| 2 | DNS (Cloudflare) | Free | Immediately, with domain |
| 3 | Website hosting (Vercel free tier) | Free | Immediately |
| 4 | Database (Supabase free tier) | Free | Immediately, during development |
| 5 | Backend VPS — AWS Lightsail ($10/month Micro plan) | $10–12/month | Before pilot launch |
| 6 | File storage (Supabase Storage, included) | Free (included above) | Before pilot launch |
| 7 | Google Workspace email | $7/month | Once investor/partner-facing communication ramps up |
| 8 | Upgrade Supabase to Pro | $25/month | Once real customer data/traffic exists |
| 9 | CI/CD (GitHub Actions) | Free | Whenever team wants automated deploys |

**Total realistic monthly cost once fully live for pilot:** roughly **$40–55/month** — far below the multi-hundred-dollar "global scale" version, appropriately sized for a Karachi-only pilot.
