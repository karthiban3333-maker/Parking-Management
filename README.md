# 🅿️ Parking Management System

A full-featured, web-based parking lot management application built with **Flask** and deployable to **Firebase / Docker**. It enables parking attendants to park vehicles, issue tickets, process checkouts with auto-calculated fees, search records, and generate reports — all from a clean browser UI.

---

## 📋 Description

**Parkline Parking** is a real-time parking management system that tracks vehicle entry and exit across three zones: Bikes, Cars, and Trucks. It automatically assigns slots, generates sequentially numbered tickets, computes time-based fees with daily rate caps, and maintains a full session history. The app ships with a reproducible fictional demo dataset and can be reset to an empty lot at any time.

---

## ✨ Features

- 🚗 **Multi-zone Slot Management** — Dedicated zones for Bikes (5 slots), Cars (6 slots), and Trucks (2 slots)
- 🎫 **Auto Ticket Generation** — Sequential ticket numbers (starting at #1001) assigned on entry
- 💰 **Dynamic Fee Calculation** — Time-based billing with per-vehicle-type rates, hourly increments, and daily caps
  - Bike: ₹10 first hour, ₹5/hr after, ₹60 daily cap
  - Car: ₹30 first hour, ₹20/hr after, ₹200 daily cap
  - Truck: ₹60 first hour, ₹40/hr after, ₹400 daily cap
  - Free for stays ≤ 10 minutes
- 📊 **Live Dashboard** — Active vehicles, recent activity, occupancy summary, and revenue at a glance
- 🗺️ **Interactive Parking Map** — Visual slot grid with filter by zone or availability status
- 🔍 **Vehicle Search** — Search active and historical records by registration number, owner name, or ticket number
- 🧾 **Checkout & Billing** — Confirm checkout with printed bill showing full session details
- 📜 **Session History** — Filterable history log by vehicle type, registration, or exit date
- 📈 **Daily Reports** — Per-day session counts and revenue breakdown by vehicle type
- 📤 **CSV Export** — Download complete parking history as a CSV file
- 🔄 **Demo Reset** — Load a reproducible fictional dataset (5 active, 3 completed, ₹470 revenue)
- 🐳 **Docker Ready** — Production-grade Dockerfile using `gunicorn`
- ☁️ **Firebase Deployable** — Firebase Hosting + Cloud Functions (2nd Gen) entrypoint included

---

## 🛠️ Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Backend     | Python 3.11+, Flask ≥ 3.0           |
| Templating  | Jinja2 (HTML templates)             |
| Frontend    | HTML5, CSS3, Vanilla JavaScript     |
| Cloud       | Firebase Hosting, Firebase Admin SDK, Firebase Cloud Functions |
| Containerization | Docker, Gunicorn               |
| Testing     | Python `unittest`                   |

---

## 📁 Folder Structure

```
Parking Management/
├── app.py                  # Flask application & route handlers
├── parking_logic.py        # Core parking logic (slots, fees, history)
├── demo_data.py            # Reproducible fictional demo dataset
├── main.py                 # Firebase Cloud Functions entrypoint
├── requirements.txt        # Python dependencies
├── Dockerfile              # Docker production image
├── firebase.json           # Firebase Hosting & Firestore config
├── firestore.rules         # Firestore security rules
├── database.rules.json     # Realtime Database security rules
├── templates/              # Jinja2 HTML templates
│   ├── base.html
│   ├── dashboard.html
│   ├── parking_map.html
│   ├── park.html
│   ├── ticket.html
│   ├── checkout.html
│   ├── bill.html
│   ├── search.html
│   ├── history.html
│   └── reports.html
├── static/                 # CSS & JS assets (Flask serving)
│   ├── css/style.css
│   └── js/
│       ├── app.js
│       └── firebase-config.js
├── public/                 # Firebase Hosting public folder
│   ├── index.html
│   └── static/
└── tests/
    └── test_parking.py     # Unit tests for parking logic
```

---

## 🚀 Installation & Running

### Prerequisites

- Python 3.11+
- pip

### 1. Clone the repository

```bash
git clone https://github.com/karthiban3333-maker/Parking-Management.git
cd Parking-Management
```

### 2. Create and activate a virtual environment

```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# macOS / Linux
python -m venv .venv
source .venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Run the app locally

```bash
python app.py
```

Open your browser at **http://localhost:5000**

---

### 🐳 Run with Docker

```bash
docker build -t parking-management .
docker run -p 8080:8080 parking-management
```

Open your browser at **http://localhost:8080**

---

### ☁️ Deploy to Firebase

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login and deploy
firebase login
firebase deploy
```

---

## 🧪 Running Tests

```bash
python -m pytest tests/
```

or

```bash
python -m unittest discover tests/
```

---

## 📸 Screenshots

> _Add screenshots here._

---

## 👤 Author

**Karthiban A** — [Kode Prime](https://github.com/karthiban3333-maker)
