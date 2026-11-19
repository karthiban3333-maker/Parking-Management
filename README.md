# 🅿️ Parking Management System

> **A real-time, web-based multi-zone parking lot management and ticketing platform built with Flask, Jinja2, and Firebase.**

Parkline Parking is a full-featured automated parking operations system designed for commercial parking complexes, valet stations, and municipal garages. It manages multi-tier vehicle parking, generates sequential entry tickets, calculates dynamic time-based fees with daily rate caps, monitors real-time bay occupancy, and exports revenue reports.

---

## 📖 About the Project

### 🎯 Problem Statement
Manual parking facilities suffer from human ticketing errors, revenue leakage, lack of real-time bay occupancy visibility, and slow checkout queues during peak hours. Attendants often struggle to accurately calculate duration-based tiered tariffs and track vehicles across different category zones (Bikes, Cars, Commercial Trucks).

### 💡 The Solution
Parkline Parking delivers a clean, browser-based command dashboard that automates the entire vehicle lifecycle from entry gate to checkout booth. On entry, attendants record vehicle details and receive sequentially numbered tickets with assigned slots. The automated billing engine tracks parking duration down to the minute, applies transparent rate tiers with grace periods and daily caps, generates printable receipts, and logs historical sessions into searchable records and exportable financial audits.

### 🌟 Core Value Proposition
- **Automated Tariff Calculation**: Eliminates calculation errors with vehicle-specific hourly increments, initial grace periods, and daily maximum caps.
- **Visual Slot Allocation**: Real-time visual slot grid indicating availability and occupancy across Bikes, Cars, and Trucks.
- **Fast Checkout & Billing**: Instant checkout modal with printable receipts detailing entry/exit timestamps and itemized charges.
- **Operational Auditing**: Filterable session logs, revenue reports by date, and one-click CSV financial exports.

---

## ✨ Features

- 🚗 **Multi-Zone Slot Management** — Dedicated zones with capacity tracking for Bikes (5 slots), Cars (6 slots), and Trucks (2 slots).
- 🎫 **Automated Ticket Generation** — Sequential entry tickets (starting at #1001) with vehicle details and entry timestamps.
- 💰 **Dynamic Hourly Fee Calculation** — Tiered pricing with grace periods (free under 10 minutes) and daily maximum limits:
  - **Bikes**: ₹10 for the 1st hour, ₹5/hr thereafter, ₹60 daily cap.
  - **Cars**: ₹30 for the 1st hour, ₹20/hr thereafter, ₹200 daily cap.
  - **Trucks**: ₹60 for the 1st hour, ₹40/hr thereafter, ₹400 daily cap.
- 📊 **Real-Time Operational Dashboard** — Live KPIs showing current occupied bays, total parked vehicles, recent gate transactions, and daily revenue.
- 🗺️ **Interactive Slot Map** — Visual bay status grid with zone and availability filtering.
- 🔍 **Universal Vehicle Search** — Rapid search by vehicle registration number, ticket ID, or owner name across active and historical sessions.
- 🧾 **Digital Checkout & Bill Printing** — Instant receipt generator displaying session summary, duration, and final bill amount.
- 📈 **Daily Reports & Analytics** — Day-by-day revenue breakdown and volume analytics by vehicle category.
- 📥 **CSV Financial Export** — Download complete parking session histories as structured CSV files.
- 🐳 **Containerized & Cloud Ready** — Includes production-grade Dockerfile with Gunicorn and Firebase Hosting integration.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend Framework** | Python 3.11+, Flask ≥ 3.0 |
| **Templating Engine** | Jinja2 (HTML5 / Bootstrap styling) |
| **Styling & UI** | Custom CSS3 + Bootstrap 5 |
| **Database & Cloud** | Firebase Admin SDK / Firestore / In-Memory Demo Engine |
| **Server Runtime** | Gunicorn (Production WSGI) |
| **Containerization** | Docker, Dockerfile |

---

## 📁 Folder Structure

```
Parking-Management/
├── public/                     # Static assets and compiled front-end files
├── static/                     # CSS stylesheets, client-side JS, Firebase config
├── templates/                  # Jinja2 HTML views (dashboard, ticket, checkout, reports)
├── tests/                      # Unit test suite for parking tariff logic
├── app.py                      # Flask application factory, routes, and API endpoints
├── demo_data.py                # Reproducible demo dataset generator
├── Dockerfile                  # Container definition for production deployment
├── firebase.json               # Firebase deployment configuration
├── main.py                     # Cloud Functions / server entrypoint
├── parking_logic.py            # Tariff engine and slot management algorithms
├── requirements.txt            # Python dependencies
└── README.md                   # Project documentation
```

---

## 🚀 How to Install and Run

### Prerequisites
- [Python](https://www.python.org/) (v3.10+) & `pip`

### 1. Clone the Repository
```bash
git clone https://github.com/karthiban3333-maker/Parking-Management.git
cd Parking-Management
```

### 2. Create Virtual Environment & Install Dependencies
```bash
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 4. Run the Application
```bash
python app.py
```
Visit `http://localhost:5000` in your browser.

### 5. Running with Docker
```bash
docker build -t parking-management .
docker run -p 8080:8080 parking-management
```

---

## 📸 Screenshots

> _Add screenshots here._

---

## 📄 License

This project is private and proprietary. All rights reserved.

---

## 👨‍💻 Author

**Karthiban A** — [Kode Prime](https://github.com/karthiban3333-maker)
