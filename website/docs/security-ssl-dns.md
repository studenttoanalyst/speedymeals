# SpeedyMeals TLS / DNS & SSL Labs Maintenance Guide

This document records the infrastructure requirements and owner actions to maintain an **A+ rating** on Qualys SSL Labs and comply with enterprise security standards.

---

## 1. DNS Certification Authority Authorization (CAA) Record
- **Finding**: SSL Labs scan reports: `DNS CAA: No`.
- **Impact**: Without CAA records, any public Certificate Authority can theoretically issue certificates for the domain if misconfigured.
- **Action Required by Domain Owner**:
  Add the following DNS `CAA` record to the authoritative DNS provider (Cloudflare, Route53, Namecheap, etc.):
  ```dns
  speedymealservices.com.  IN  CAA  0 issue "letsencrypt.org"
  speedymealservices.com.  IN  CAA  0 issuewild "letsencrypt.org"
  ```
  *(Repeat for `speedymeals.pk` if applicable).*

---

## 2. TLS Certificate Lifecycle & Vercel Auto-Renewal
- **Current Certificate**: Let's Encrypt Authority X3 / R10.
- **Expiration Date**: Auto-renewed every 60-90 days.
- **Management**: Vercel manages the certificate issuance, challenge verification, and renewal automatically.
- **Owner Checklist**:
  1. Ensure the root domain (`speedymealservices.com`) and `www` remain configured within the Vercel project domains dashboard.
  2. Maintain active CNAME / A records pointing to `cname.vercel-dns.com` or Vercel's Anycast IP (`76.76.21.21`).

---

## 3. Protocol Versions & Cipher Suites
- **Supported Protocols**: **TLS 1.2** and **TLS 1.3** only.
- **Deprecated Protocols**: SSL 2.0, SSL 3.0, TLS 1.0, and TLS 1.1 are permanently disabled on Vercel's edge network.
- **Legacy Handshakes**: Handshake failures on obsolete clients (IE11 on Windows 7, Safari 8 and below, Android 4.4 and below) are expected, correct, and required for modern cryptographic posture.

---

## 4. HTTP Strict Transport Security (HSTS) Preloading
- **Current Header**:
  ```http
  Strict-Transport-Security: max-age=63072000; includeSubDomains
  ```
- **HSTS Preload Policy**:
  Once the domain owner confirms that **every** current and future subdomain (`api.*`, `admin.*`, `staging.*`, etc.) reliably serves HTTPS, append the `preload` token:
  ```http
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  ```
  Then submit the domain to [hstspreload.org](https://hstspreload.org/) for permanent inclusion into Google Chrome, Apple WebKit, and Mozilla Firefox preload lists.
