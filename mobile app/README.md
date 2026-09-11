<div align="center">

# ⚡ Speedy Meals

### Lightning Fast Food Delivery

A cross-platform food delivery mobile application built with Flutter, designed for the Pakistani market.

[![Flutter](https://img.shields.io/badge/Flutter-3.13+-02569B?style=flat-square&logo=flutter)](https://flutter.dev)
[![Dart](https://img.shields.io/badge/Dart-Latest-0175C2?style=flat-square&logo=dart)](https://dart.dev)
[![License](https://img.shields.io/badge/License-Private-red?style=flat-square)](#license)
[![Status](https://img.shields.io/badge/Status-UI%20Prototype-orange?style=flat-square)](#status)

</div>

---

## 📋 Overview

Speedy Meals is a modern food delivery platform enabling customers to browse restaurants, order food, track deliveries in real-time, and manage payments — while delivery riders accept deliveries, track earnings, and manage their availability through a dedicated fleet portal.

> **Current Status:** This is a **UI/Frontend prototype** with mock data and simulated authentication. The backend is planned but not yet implemented in this repository.

---

## 🎯 Features

### Customer Experience

| Feature | Description |
|---------|-------------|
| 🔐 **Authentication** | Email/phone registration and login with form validation |
| 🏠 **Home Dashboard** | Restaurant listings, search bar, promotional carousel, and food categories |
| 🍕 **Restaurant Detail** | Full menu browsing by category with item tags and ratings |
| 🛒 **Smart Cart** | Multi-item cart with quantity controls and live total calculation |
| 💳 **Checkout** | Multiple payment methods: Cash on Delivery, Card, EasyPaisa, JazzCash |
| 📍 **Order Tracking** | 5-stage status progression with driver info and ETA |
| 🔍 **Search** | Search restaurants and food items |
| 📱 **Promotions** | Auto-swiping promo banners and coupon code support |

### Rider Experience

| Feature | Description |
|---------|-------------|
| 🔐 **Fleet Registration** | Rider signup with vehicle type and city selection |
| 🏍️ **Fleet Portal** | Dedicated dashboard with online/offline toggle |
| 📊 **Earnings Dashboard** | Real-time stats: payout, hours, tips, and rating |
| 📦 **Delivery Management** | Accept/reject delivery requests with route details |
| 🔄 **Status Flow** | Complete delivery lifecycle management |

### Design System

| Token | Value |
|-------|-------|
| **Primary** | `#DC2626` (Speed Red) |
| **Secondary** | `#1D4ED8` (Royal Blue) |
| **Tertiary** | `#F59E0B` (Amber) |
| **Typography** | Plus Jakarta Sans |
| **Grid** | 8-point spacing system |
| **Design** | Material 3 with custom brand tokens |

---

## 🛠️ Technology Stack

| Layer | Technology | Status |
|-------|-----------|--------|
| **Framework** | Flutter SDK ^3.13.2 | ✅ Active |
| **Language** | Dart | ✅ Active |
| **UI Design** | Material 3 | ✅ Active |
| **State Management** | `setState()` | ✅ Active |
| **Navigation** | Navigator 1.0 | ✅ Active |
| **Backend** | Python + FastAPI | 🔜 Planned |
| **Database** | PostgreSQL | 🔜 Planned |
| **Cache** | Redis | 🔜 Planned |
| **Storage** | AWS S3 | 🔜 Planned |
| **Auth** | JWT + OTP | 🔜 Planned |
| **External API** | Google Maps Distance Matrix | 🔜 Planned |

---

## 📁 Project Structure

```
speedy_meals/
├── lib/
│   ├── main.dart                    # Application entry point
│   ├── constants/                   # Brand color tokens
│   │   └── colors.dart
│   ├── core/
│   │   ├── constants/
│   │   │   └── app_constants.dart   # Business rules & enums
│   │   └── theme/
│   │       └── app_theme.dart       # Material 3 theme assembly
│   ├── models/
│   │   ├── order.dart               # Order data model
│   │   └── restaurant.dart          # Restaurant & menu models
│   ├── screens/
│   │   ├── auth/                    # 8 authentication screens
│   │   ├── checkout/                # Checkout flow
│   │   ├── dashboard/               # Customer home
│   │   ├── menu/                    # Restaurant & menu detail
│   │   ├── rider/                   # Rider fleet portal
│   │   └── tracking/                # Order status tracking
│   ├── services/
│   │   └── auth_service.dart        # Mock authentication
│   └── widgets/
│       └── home_navigation.dart     # Bottom navigation
├── assets/
│   ├── images/                      # App logos
│   └── stitch_speedy_meals_app_ui_design/  # Design references
├── test/
│   └── widget_test.dart
├── android/                         # Android platform
├── ios/                             # iOS platform
├── web/                             # Web platform
├── linux/                           # Linux desktop
├── macos/                           # macOS desktop
├── windows/                         # Windows desktop
├── pubspec.yaml
├── analysis_options.yaml
├── Backend_development.md           # Backend development plan
├── REPORT.md                        # Technical project report
└── README.md
```

---

## 🔄 Application Flow

### Customer Journey

```
┌─────────────┐    ┌──────────────┐    ┌────────────────┐
│   Splash    │───▶│ Register As  │───▶│ Login / Sign Up│
│  (3 sec)    │    │  (Role Pick) │    │                │
└─────────────┘    └──────────────┘    └───────┬────────┘
                                               │
                    ┌──────────────────────────┘
                    ▼
            ┌───────────────┐    ┌────────────────┐
            │    Home       │───▶│   Restaurant   │
            │  Dashboard    │    │     Detail     │
            └───────────────┘    └───────┬────────┘
                                         │
                              ┌──────────┘
                              ▼
                    ┌────────────────┐    ┌────────────────┐
                    │  Cart / Basket │───▶│    Checkout    │
                    └────────────────┘    └───────┬────────┘
                                                  │
                                       ┌──────────┘
                                       ▼
                              ┌────────────────┐
                              │ Order Tracking │
                              │ (5 Stages)     │
                              └────────────────┘
```

### Rider Journey

```
┌──────────────┐    ┌────────────────┐    ┌────────────────┐
│ Register As  │───▶│ Rider Sign Up  │───▶│ Fleet Portal   │
│  (Rider)     │    │ (Vehicle/City) │    │ (Dashboard)    │
└──────────────┘    └────────────────┘    └───────┬────────┘
                                                  │
                              ┌───────────────────┘
                              ▼
                    ┌────────────────┐    ┌────────────────┐
                    │ View Requests  │───▶│Accept Delivery │
                    └────────────────┘    └───────┬────────┘
                                                  │
                              ┌───────────────────┘
                              ▼
                    ┌────────────────┐
                    │Status Updates  │
                    │(Accept→Deliver)│
                    └────────────────┘
```

---

## 📱 Screens

| Screen | File | Description |
|--------|------|-------------|
| Splash Screen | `login_screen.dart` | App intro with logo, auto-navigates after 3 seconds |
| Register As | `register_as_screen.dart` | Role selection between Customer and Delivery Rider |
| Customer Login | `customer_login_screen.dart` | Email/password login with social auth placeholders |
| Customer Sign Up | `customer_signup_screen.dart` | Full registration form with validation |
| Customer Forgot Password | `customer_forgot_password_screen.dart` | Password reset request flow |
| Rider Login | `rider_login_screen.dart` | Rider-specific login portal |
| Rider Sign Up | `rider_signup_screen.dart` | Rider registration with vehicle/city selection |
| Rider Forgot Password | `rider_forgot_password_screen.dart` | Rider password recovery |
| Home Dashboard | `dashboard_screen.dart` | Restaurant listings, search, promos, categories |
| Restaurant Detail | `restaurant_detail_screen.dart` | Menu browsing, cart management, promo codes |
| Menu Screen | `menu_screen.dart` | Category-based menu with quantity controls |
| Checkout | `checkout_screen.dart` | Order summary, payment selection, place order |
| Order Tracking | `order_tracking_screen.dart` | 5-stage status tracker with driver info |
| Rider Dashboard | `rider_dashboard_screen.dart` | Fleet portal with earnings and delivery requests |

---

## 🔐 Authentication

The current implementation uses a **mock authentication service** for UI prototyping:

| Aspect | Implementation |
|--------|---------------|
| Pattern | Singleton (`AuthService.instance`) |
| Delay | Simulated 1.2s login, 1.4s register |
| Validation | Client-side only |
| Tokens | Mock (timestamp-based) |
| Persistence | In-memory (session lost on restart) |
| Roles | `UserRole.customer`, `UserRole.deliveryRider` |

> **Note:** This is a prototype. The planned backend will implement OTP verification, JWT tokens, and role-based access control.

---

## 🚀 Getting Started

### Prerequisites

- **Flutter SDK** ^3.13.2
- **Dart SDK** (included with Flutter)
- **Android Studio** / **Xcode** (for mobile development)
- **VS Code** with Flutter extension (recommended)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd speedy_meals

# Install dependencies
flutter pub get

# Run on connected device or emulator
flutter run
```

### Build Commands

| Command | Description |
|---------|-------------|
| `flutter build apk` | Build Android APK |
| `flutter build ios` | Build iOS (requires macOS + Xcode) |
| `flutter build web` | Build for web |
| `flutter test` | Run tests |
| `flutter analyze` | Static code analysis |

### Platform Support

| Platform | Command | Notes |
|----------|---------|-------|
| Android | `flutter run` | Emulator or device required |
| iOS | `flutter run` | macOS + Xcode required |
| Web | `flutter run -d chrome` | Chrome browser required |
| Windows | `flutter run -d windows` | Windows desktop |
| Linux | `flutter run -d linux` | Linux desktop |
| macOS | `flutter run -d macos` | macOS desktop |

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [`README.md`](README.md) | Project overview and setup guide |
| [`REPORT.md`](REPORT.md) | Detailed technical project report |
| [`Backend_development.md`](Backend_development.md) | Backend development plan (13 phases) |

---

## 🗺️ Roadmap

### Completed ✅

- [x] Flutter project setup and configuration
- [x] Material 3 design system with custom brand tokens
- [x] Complete customer UI (auth, dashboard, menu, cart, checkout, tracking)
- [x] Complete rider UI (auth, fleet portal, delivery management)
- [x] Mock authentication service
- [x] Bottom navigation with 3 tabs

### In Progress 🟡

- [ ] Backend API integration
- [ ] Real authentication (OTP + JWT)
- [ ] Database implementation
- [ ] State management (Provider/Riverpod)

### Planned 🔜

- [ ] Push notifications
- [ ] Real-time order tracking
- [ ] Payment gateway integration
- [ ] Restaurant admin panel
- [ ] Admin dashboard
- [ ] CI/CD pipeline
- [ ] Production deployment

---

## 🤝 Contributing

This is a private project. For internal development:

```bash
# Create a feature branch
git checkout -b feature/your-feature

# Make changes and commit
git add .
git commit -m "Add your feature"

# Push to remote
git push origin feature/your-feature
```

---

## 📄 License

This project is private and not published to pub.dev.

---

<div align="center">

**Built with ❤️ using Flutter**

*Last updated: September 2026*

</div>
