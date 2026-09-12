# SpeedyMeals: Infrastructure, Cloud Deployment & DevOps Blueprint

**Target Context:** Pakistan & Regional South Asia/Middle East Launch $\rightarrow$ Future Scale to Global AWS  
**Tech Stack:** Next.js 15 (Web) + FastAPI (Backend) + Redis 7 (Live GPS/Cache) + Supabase PostgreSQL $\rightarrow$ AWS Aurora + Flutter (Mobile) + Google Workspace

---

## 1. What Is This Skill Called?

This discipline sits at the intersection of several core software engineering roles:

* **DevOps Engineering (Development + Operations):** The practice of bridging software development with cloud infrastructure, automation, CI/CD pipelines, and server provisioning.
* **Cloud & Platform Engineering:** Designing cloud architecture (VPC, compute, managed databases, IAM security, object storage) that scales reliably.
* **Web Operations (WebOps) / Systems Administration (SysAdmin):** Managing domain registrars, DNS records, reverse proxies (Nginx/Caddy), SSL certificates, Linux servers, and corporate email protocols (SPF/DKIM/DMARC).

---

## 2. Curated Learning Resources (YouTube Channels & Videos)

To build deep mental models and practical proficiency in these skills, study these specific creators and video topics:

### A. The Fundamentals of Networking, DNS & Cloudflare
1. **NetworkChuck**
   * *Search:* `"NetworkChuck what is DNS"` and `"NetworkChuck Cloudflare setup"`
   * *Why:* The most intuitive visual explanations of how DNS queries travel, how A/CNAME/MX records work, and why Cloudflare acts as an edge shield.
2. **Hussein Nasser**
   * *Search:* `"Hussein Nasser Reverse Proxy vs Forward Proxy"`, `"Hussein Nasser Nginx crash course"`, `"Hussein Nasser TLS Handshake"`
   * *Why:* Deep, engineering-grade explanations of backend network architecture, WebSockets, reverse proxies, and database connection pooling.

### B. Linux VPS, Docker & Server Deployment
1. **TechWorld with Nana**
   * *Search:* `"TechWorld with Nana Docker tutorial for beginners"` and `"TechWorld with Nana DevOps Roadmap"`
   * *Why:* Gold standard for learning containerization, environment variables, Docker Compose, and CI/CD concepts.
2. **Traversy Media / Net Ninja**
   * *Search:* `"Traversy Media Nginx Crash Course"` and `"Traversy Media Docker Compose Tutorial"`
   * *Why:* Clear, practical step-by-step guides on setting up production web servers on a raw Ubuntu VPS.
3. **Christian Lempa**
   * *Search:* `"Christian Lempa secure your Linux server"` and `"Christian Lempa Cloudflare DNS and Tunnels"`
   * *Why:* Focuses on security best practices: SSH key authentication, UFW firewalls, fail2ban, and modern DNS management.

### C. Conceptual Overviews (Quick Refreshers)
1. **Fireship (100-Second Series)**
   * *Search:* `"Fireship DNS in 100 Seconds"`, `"Fireship Docker in 100 Seconds"`, `"Fireship Nginx in 100 Seconds"`
   * *Why:* Fast 2-minute high-level explanations before diving into setup steps.

---

## 3. User Preferences & Architectural Constraints Captured So Far

| Parameter | Decision / Context |
| :--- | :--- |
| **Initial Market** | Pakistan (Karachi / regional pilot), expanding to South Asia / Middle East. |
| **Payment Constraints** | Pakistani cards (SadaPay, NayaPay, Meezan, HBL) require 3D Secure / e-commerce enablement; 5–10% local withholding tax on international SaaS charges. |
| **Website / Landing** | Next.js 15 (App Router), React 19, Tailwind v4, Framer Motion. |
| **Backend API** | FastAPI (Python 3.11), SQLAlchemy, WebSockets for rider tracking. |
| **In-Memory Store** | Redis 7 (OTP rate limiting, rider GPS coordinates). |
| **Primary Database** | **Supabase PostgreSQL** for Pakistan launch phase $\rightarrow$ planned migration to **AWS Aurora / RDS** when scaling globally. |
| **Document Storage** | **AWS S3** for KYC verification files (rider CNIC, driver's licenses, restaurant contracts). |
| **Email Service** | **Google Workspace** (`admin@speedymeals.com`, `support@speedymeals.com`). |
| **Target Latency** | Sub-10ms between API and Database; sub-80ms for Pakistani end users. |

---

## 4. End-to-End Infrastructure Plan (Step-by-Step with Alternatives)

```
                            [ USER / CLIENTS ]
                                    │
                        Cloudflare Edge Anycast DNS
                         (DDoS / CDN / SSL Proxy)
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
speedymeals.com             api.speedymeals.com         Google Workspace
  (Next.js Web)              (FastAPI Backend)          (Corporate Mail)
        │                           │                           │
  Vercel Edge              AWS Lightsail VPS           MX / SPF / DKIM
                                    │                           │
                            ┌───────┴───────┐                   ▼
                            │ Docker Engine │              Inbox / Aliases
                            │ ├── FastAPI   │
                            │ └── Redis 7   │
                            └───────┬───────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
            Supabase Postgres                     AWS S3
         (AWS Singapore / EU)               (KYC Documents)
                    │
                    ▼ (Future Phase)
            AWS Aurora Serverless
```

---

### Stage 1: Domain Name Registration

Acquiring your root commercial domain (e.g., `speedymeals.com`).

* **User Preference:** Clean global brand name (`.com`), smooth payment via Pakistani banking cards.
* **Top Recommendation:** **Cloudflare Registrar**
  * *Why:* Sells domains at exact wholesale ICANN cost ($9–$10/year for `.com`) with zero renewal markups, includes free lifetime WHOIS privacy, and immediately integrates into Cloudflare's DNS engine.
* **Alternative 1: Namecheap**
  * *Why:* Generous first-year promo rates, accepts Pakistani cards reliably, free lifetime privacy protection.
* **Alternative 2: Porkbun**
  * *Why:* Transparent pricing, user-friendly UI, popular among developers.

---

### Stage 2: DNS Management & Security Layer

The authoritative phonebook that translates your domain into IP addresses and routes traffic.

* **Top Recommendation:** **Cloudflare DNS (Free Plan)**
  * *Why:* World's fastest Anycast DNS network. Features regional edge presence near Pakistan, automated Let's Encrypt SSL certificates, DDoS mitigation, and CNAME flattening on root domains.
* **Alternative 1: AWS Route 53**
  * *Why:* Keeps DNS inside your eventual AWS ecosystem, but costs $0.50/month per hosted zone plus query fees, and lacks built-in free web proxying/DDoS shielding.
* **Alternative 2: Registrar Default DNS (e.g., Namecheap BasicDNS)**
  * *Why:* Simple to leave as-is, but propagation is slow (up to 24 hours) and lacks modern edge proxying.

---

### Stage 3: Corporate Email & Workspace Setup

Setting up branded inboxes (`support@speedymeals.com`, `admin@speedymeals.com`).

* **User Preference:** Google Workspace.
* **Top Recommendation:** **Google Workspace (Business Starter)**
  * *Cost:* ~$6–$7.20 / user / month.
  * *Strategy:* Purchase **one single license** (e.g., `admin@speedymeals.com`). Use Google Admin's **Free Email Aliases** to create `support@`, `riders@`, `partners@`, and `contact@` at zero extra cost.
  * *Mandatory Authentication:* Configure **SPF**, **DKIM (2048-bit)**, and **DMARC** in Cloudflare to prevent emails going to recipients' spam folders.
* **Alternative 1: Zoho Mail**
  * *Cost:* Free tier (up to 5 users, web-only) or $1–$1.25 / user / month.
  * *Why:* The most budget-friendly startup email provider if cash flow needs to be conserved during pre-launch.
* **Alternative 2: Resend / SendGrid / Amazon SES (Transactional Only)**
  * *Why:* Google Workspace is designed for human-to-human email. For sending 10,000 automated OTPs or order confirmation emails, use **Resend** or **Amazon SES** instead of your Google inbox to protect your domain reputation.

---

### Stage 4: Subdomain Topology & Architecture Mapping

Organizing your services cleanly under your domain:

| Domain / Subdomain | Destination Service | Protocol | Purpose |
| :--- | :--- | :--- | :--- |
| `speedymeals.com` | Vercel (or VPS) | HTTPS | Customer landing & registration portal |
| `www.speedymeals.com` | Vercel (Redirect) | HTTPS | Redirects to apex `speedymeals.com` |
| `api.speedymeals.com` | AWS Lightsail VPS | HTTPS / WSS | FastAPI REST endpoints & live WebSocket tracking |
| `admin.speedymeals.com` | Vercel / Static | HTTPS | Internal operations dashboard (Phase 4) |
| `partner.speedymeals.com` | Vercel / Static | HTTPS | Restaurant merchant portal (Phase 5) |
| `docs.speedymeals.com` | Mintlify / GitHub Pages| HTTPS | Internal or developer API documentation |

---

### Stage 5: Website Deployment (Next.js 15)

Deploying the frontend registration and marketing experience.

* **Top Recommendation:** **Vercel**
  * *Why:* Built by the creators of Next.js. Provides zero-configuration builds for Next.js 15 App Router, automatic image optimization, global CDN edge caching, and automated preview deployments on every Git Pull Request.
* **Alternative 1: Dockerized on AWS Lightsail VPS (Co-hosted)**
  * *Why:* Zero incremental hosting cost since you are already paying for the VPS.
  * *Trade-off:* Requires configuring Nginx reverse proxy, manual SSL renewal, and consumes RAM that FastAPI and Redis could otherwise use.
* **Alternative 2: Cloudflare Pages / AWS Amplify Hosting**
  * *Why:* Fast edge distribution, but can require custom adapters for certain Next.js 15 server features.

---

### Stage 6: Backend & Real-Time Compute (FastAPI + Redis)

Hosting your Python API, WebSockets, and in-memory cache.

* **User Preference:** Cost-effective for Pakistan scale, clean migration path to AWS later.
* **Top Recommendation:** **AWS Lightsail VPS ($10 to $20/month)**
  * *Region:* **Singapore (`ap-southeast-1`)** or **Mumbai (`ap-south-1`)**.
  * *Specs:* 2 vCPU, 2 GB to 4 GB RAM, 60–80 GB SSD, 3 TB pooled bandwidth.
  * *Why:* Direct VPC peering into AWS S3, predictable flat-rate billing, identical Linux/AWS security patterns that transition easily into **AWS ECS Fargate** when you go global.
* **Alternative 1: DigitalOcean Droplets ($12 to $24/month)**
  * *Location:* Singapore (`SGP1`).
  * *Why:* Intuitive developer dashboard, frictionless card checkout for Pakistani banks, excellent 1-click Docker droplets.
* **Alternative 2: Hetzner Cloud (€5 to €10/month in Singapore or Germany)**
  * *Why:* Industry-leading raw CPU performance per dollar.
  * *Trade-off:* Stricter account verification hurdles for users registering from Pakistan.

---

### Stage 7: Database Strategy (PostgreSQL)

Storing orders, users, menus, and transaction ledgers.

* **User Preference:** Supabase at Pakistan scale $\rightarrow$ AWS Aurora/RDS when scaling globally.
* **Top Recommendation:** **Supabase Pro ($25/month) in AWS Singapore or Frankfurt**
  * *Why:* Gives you managed PostgreSQL 15, automated daily backups, row-level security (RLS), and connection pooling (PgBouncer/Supavisor).
  * *Critical Rule:* Deploy Supabase in the **same geographical region** as your FastAPI VPS to keep query latency $<10\text{ms}$.
* **Alternative 1: AWS RDS PostgreSQL (db.t4g.micro or small)**
  * *Why:* Starts directly on AWS, eliminating the future cross-cloud migration step.
  * *Trade-off:* Costs slightly more (~$25–$35/mo with storage) and lacks Supabase's built-in web studio dashboard.
* **Alternative 2: Self-Hosted PostgreSQL Container on the VPS**
  * *Why:* $0 additional monthly cost.
  * *Trade-off:* High risk of data loss if the VPS crashes without automated off-site S3 WAL-E/pgBackRest backups. Not recommended for production transactional data.

---

### Stage 8: Document Storage (KYC & Assets)

Handling rider CNIC scans, driver's licenses, and restaurant contracts.

* **User Preference:** AWS S3.
* **Top Recommendation:** **AWS S3 Standard (Region matching backend)**
  * *Security Pattern:* Private bucket (all public access blocked) + IAM programmatic user with restrictive permissions + **Presigned Upload URLs** generated by FastAPI so mobile clients upload directly to S3 without burdening your VPS.
* **Alternative 1: Cloudflare R2**
  * *Why:* Exact drop-in S3-compatible API (`boto3` works with standard S3 client configurations), but has **$0 egress fees** (bandwidth is completely free).
* **Alternative 2: Supabase Storage**
  * *Why:* Already integrated into your Supabase project dashboard; uses S3 under the hood.

---

### Stage 9: CI/CD & Deployment Automation

How code moves from your local computer to the live servers without manual SSH commands.

* **Top Recommendation:** **GitHub Actions Workflow**
  * *Frontend:* Automatic build & deploy to Vercel on `git push origin main`.
  * *Backend:* GitHub Action builds the Docker container, tests via `pytest`, and triggers deployment on the VPS via SSH key.
* **Alternative 1: Coolify (Self-Hosted PaaS on your VPS)**
  * *Why:* Provides an open-source "Heroku/Vercel" experience running on your own VPS. Pulls directly from GitHub and handles Docker rebuilds and SSL automatically.
* **Alternative 2: Manual Git Pull + Docker Compose**
  * *Why:* Fine for day 1 testing, but error-prone and causes downtime during manual updates.

---

## 5. Master DNS Records Blueprint (Copy-Paste Reference)

When setting up your domain in Cloudflare DNS, configure this unified set of records:

| Record Type | Name / Host | Value / Target | Proxy Status | Description |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `@` | `76.76.21.21` | DNS Only (Grey) | Vercel Apex Website |
| **CNAME** | `www` | `cname.vercel-dns.com` | DNS Only (Grey) | Vercel WWW Redirect |
| **A** | `api` | `<YOUR_VPS_PUBLIC_IP>` | Proxied (Orange) | FastAPI Backend API |
| **MX** | `@` | `SMTP.GOOGLE.COM` (Priority 1) | Auto / None | Google Workspace Email |
| **TXT** | `@` | `google-site-verification=...` | Auto / None | Google Ownership Proof |
| **TXT** | `@` | `v=spf1 include:_spf.google.com ~all` | Auto / None | SPF Anti-Spoofing |
| **TXT** | `google._domainkey`| `v=DKIM1; k=rsa; p=<YOUR_DKIM_KEY>` | Auto / None | DKIM 2048-bit Signature |
| **TXT** | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:admin@speedymeals.com` | Auto / None | DMARC Enforcement |

---

## 6. Execution Roadmap & Priority Order

To avoid getting stuck or paying for idle resources, execute in this chronological order:

1. **Day 1: Domain & Identity**
   * Purchase domain on **Cloudflare Registrar** (or Namecheap).
   * Activate nameservers on Cloudflare.
   * Sign up for **Google Workspace** (1 user) and verify domain ownership via TXT record.
   * Add MX, SPF, DKIM, and DMARC records; test delivery with [mail-tester.com](https://www.mail-tester.com).
2. **Day 2: Frontend Launch**
   * Push `speedymeals/website` to GitHub.
   * Connect repo to **Vercel**, set Root Directory to `speedymeals/website`.
   * Bind `speedymeals.com` and `www.speedymeals.com` in Vercel and Cloudflare.
3. **Day 3: Backend & Database Provisioning**
   * Create Supabase project in **AWS Singapore** (or Frankfurt).
   * Launch **AWS Lightsail VPS** (2 vCPU / 2–4 GB RAM) in the same region.
   * Set up Docker Compose on the VPS (`FastAPI` + `Redis 7` + `Caddy/Nginx`).
   * Add `api.speedymeals.com` A-record in Cloudflare pointing to the VPS IP.
   * Create AWS S3 bucket for rider KYC documents.
4. **Day 4: Integration & Mobile App Pointing**
   * Set `NEXT_PUBLIC_API_URL=https://api.speedymeals.com` in Vercel.
   * Update Flutter mobile app endpoints to `https://api.speedymeals.com`.
