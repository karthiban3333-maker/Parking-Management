/**
 * Parkline Parking Management System - Client Engine with Cloud Firestore Sync
 * 100% Free Tier (Firebase Spark Plan compatible)
 */

const RATES = {
  Bike: { first: 10, additional: 5, cap: 60, totalSlots: 5, prefix: "B" },
  Car: { first: 30, additional: 20, cap: 200, totalSlots: 6, prefix: "C" },
  Truck: { first: 60, additional: 40, cap: 400, totalSlots: 2, prefix: "T" }
};

const ALL_SLOT_DEFS = [
  ...Array.from({ length: 5 }, (_, i) => ({ slot_id: `B0${i + 1}`, type: "Bike" })),
  ...Array.from({ length: 6 }, (_, i) => ({ slot_id: `C0${i + 1}`, type: "Car" })),
  ...Array.from({ length: 2 }, (_, i) => ({ slot_id: `T0${i + 1}`, type: "Truck" }))
];

// Firebase Configuration from user (configured via window or environment)
const firebaseConfig = {
  apiKey: window.FIREBASE_API_KEY || "YOUR_FIREBASE_API_KEY",
  authDomain: window.FIREBASE_AUTH_DOMAIN || "parking-management-55d59.firebaseapp.com",
  projectId: window.FIREBASE_PROJECT_ID || "parking-management-55d59",
  storageBucket: window.FIREBASE_STORAGE_BUCKET || "parking-management-55d59.firebasestorage.app",
  messagingSenderId: window.FIREBASE_MESSAGING_SENDER_ID || "266553097689",
  appId: window.FIREBASE_APP_ID || "1:266553097689:web:7968c0c4839d6fa7e42dc8",
  measurementId: window.FIREBASE_MEASUREMENT_ID || "G-821XXB32MQ"
};

// State
let db = null;
let parkingState = {
  slots: ALL_SLOT_DEFS.map(s => ({ ...s, free: true, vehicle: null, entry_time: null, ticket: null })),
  history: [],
  ticket_no: 1000
};

// Initialize Firebase
try {
  if (typeof firebase !== "undefined") {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
    console.log("Firebase Firestore initialized successfully.");
  }
} catch (err) {
  console.warn("Firestore init notice:", err);
}

// Tariff Calculation
function calculateFee(vType, durationMinutes) {
  const rate = RATES[vType];
  if (!rate) return 0;
  const mins = Math.max(0, parseInt(durationMinutes) || 0);
  if (mins <= 10) return 0;
  const hours = Math.ceil(mins / 60);
  return Math.min(rate.first + (hours - 1) * rate.additional, rate.cap);
}

function getDurationMinutes(entryIso, exitIso = null) {
  const start = new Date(entryIso);
  const end = exitIso ? new Date(exitIso) : new Date();
  return Math.max(0, Math.floor((end - start) / 60000));
}

function formatMoney(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

function formatDateTime(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

function showAlert(message, type = "success") {
  const alertsContainer = document.getElementById("alerts-container");
  if (!alertsContainer) return;
  const alert = document.createElement("div");
  alert.className = `alert ${type}`;
  alert.role = "status";
  alert.textContent = message;
  alertsContainer.innerHTML = "";
  alertsContainer.appendChild(alert);
  setTimeout(() => {
    alert.remove();
  }, 5000);
}

// Initial Sample Seed Data (Exact match with demo_data.py)
function getDemoDataset() {
  const baseTime = new Date();
  const makeEntryTime = (hoursAgo, minsAgo = 0) => {
    const t = new Date(baseTime);
    t.setHours(t.getHours() - hoursAgo);
    t.setMinutes(t.getMinutes() - minsAgo);
    return t.toISOString();
  };

  const slots = ALL_SLOT_DEFS.map(s => ({ ...s, free: true, vehicle: null, entry_time: null, ticket: null }));

  // Seed 5 Active Vehicles
  const activeSeed = [
    { slot_id: "B01", reg_no: "TN01AB1234", owner: "Asha Rao", type: "Bike", ticket: 1004, entry: makeEntryTime(1, 30) },
    { slot_id: "C01", reg_no: "MH12JK2222", owner: "Sara Iyer", type: "Car", ticket: 1005, entry: makeEntryTime(2, 45) },
    { slot_id: "T01", reg_no: "TN66EF9012", owner: "Mohan Das", type: "Truck", ticket: 1003, entry: makeEntryTime(3, 15) },
    { slot_id: "B02", reg_no: "DL8QW4444", owner: "Nikhil Sen", type: "Bike", ticket: 1007, entry: makeEntryTime(0, 45) },
    { slot_id: "T02", reg_no: "UP32TR6666", owner: "Arun Joshi", type: "Truck", ticket: 1008, entry: makeEntryTime(4, 0) }
  ];

  activeSeed.forEach(item => {
    const s = slots.find(x => x.slot_id === item.slot_id);
    if (s) {
      s.free = false;
      s.vehicle = { reg_no: item.reg_no, owner: item.owner, v_type: item.type };
      s.ticket = item.ticket;
      s.entry_time = item.entry;
    }
  });

  // Seed 3 Completed Sessions (Total ₹470)
  const history = [
    {
      ticket: 1001,
      reg_no: "TN01AB1234",
      owner: "Asha Rao",
      type: "Bike",
      slot: "B01",
      entry: makeEntryTime(5, 8),
      exit: makeEntryTime(5, 0),
      minutes: 8,
      fee: 0
    },
    {
      ticket: 1002,
      reg_no: "TN09CD5678",
      owner: "Ravi Kumar",
      type: "Car",
      slot: "C01",
      entry: makeEntryTime(6, 20),
      exit: makeEntryTime(3, 0),
      minutes: 200,
      fee: 90
    },
    {
      ticket: 1006,
      reg_no: "KL07LM3333",
      owner: "Dev Shah",
      type: "Truck",
      slot: "T02",
      entry: makeEntryTime(10, 0),
      exit: makeEntryTime(1, 0),
      minutes: 540,
      fee: 380
    }
  ];

  return { slots, history, ticket_no: 1008 };
}

// Storage Sync (Firestore + LocalStorage backup)
async function saveState() {
  localStorage.setItem("parkline_state", JSON.stringify(parkingState));
  if (db) {
    try {
      await db.collection("parking_lot").doc("state").set({
        slots: parkingState.slots,
        history: parkingState.history,
        ticket_no: parkingState.ticket_no,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) {
      console.warn("Firestore sync error (using local storage fallback):", e);
    }
  }
}

async function loadState() {
  let loadedFromFirestore = false;
  if (db) {
    try {
      const doc = await db.collection("parking_lot").doc("state").get();
      if (doc.exists) {
        const data = doc.data();
        if (data.slots && data.history) {
          parkingState.slots = data.slots;
          parkingState.history = data.history;
          parkingState.ticket_no = data.ticket_no || 1000;
          loadedFromFirestore = true;
          console.log("Loaded live state from Cloud Firestore.");
        }
      }
    } catch (err) {
      console.warn("Could not fetch from Firestore, checking local storage:", err);
    }
  }

  if (!loadedFromFirestore) {
    const local = localStorage.getItem("parkline_state");
    if (local) {
      try {
        parkingState = JSON.parse(local);
      } catch (e) {
        parkingState = getDemoDataset();
      }
    } else {
      parkingState = getDemoDataset();
      saveState();
    }
  }

  // Subscribe to real-time updates from Firestore
  if (db) {
    db.collection("parking_lot").doc("state").onSnapshot(doc => {
      if (doc.exists && !doc.metadata.hasPendingWrites) {
        const data = doc.data();
        if (data.slots && data.history) {
          parkingState.slots = data.slots;
          parkingState.history = data.history;
          parkingState.ticket_no = data.ticket_no || 1000;
          renderApp();
        }
      }
    }, err => console.log("Realtime sync:", err));
  }
}

// Core Operations
function parkVehicle(regNo, owner, vType) {
  regNo = (regNo || "").trim().toUpperCase().replace(/\s+/g, " ");
  owner = (owner || "").trim().replace(/\s+/g, " ");

  if (!regNo || !owner) {
    throw new Error("Registration number and owner name are required.");
  }
  if (!RATES[vType]) {
    throw new Error("Choose Bike, Car or Truck.");
  }

  // Check duplicate active vehicle
  const isDuplicate = parkingState.slots.some(
    s => !s.free && s.vehicle && s.vehicle.reg_no.toUpperCase() === regNo
  );
  if (isDuplicate) {
    throw new Error(`${regNo} is already parked in the lot.`);
  }

  // Find first free slot for type
  const slot = parkingState.slots.find(s => s.type === vType && s.free);
  if (!slot) {
    throw new Error(`The ${vType.toLowerCase()} zone is full. No compatible slot is available.`);
  }

  parkingState.ticket_no = (parkingState.ticket_no || 1000) + 1;
  const nowIso = new Date().toISOString();

  slot.free = false;
  slot.vehicle = { reg_no: regNo, owner: owner, v_type: vType };
  slot.ticket = parkingState.ticket_no;
  slot.entry_time = nowIso;

  saveState();
  return {
    ticket: slot.ticket,
    reg_no: regNo,
    owner: owner,
    type: vType,
    slot: slot.slot_id,
    entry: nowIso
  };
}

function findActiveSlot(query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return null;
  return parkingState.slots.find(
    s => !s.free && s.vehicle &&
      (s.vehicle.reg_no.toLowerCase() === q || String(s.ticket) === q || s.slot_id.toLowerCase() === q)
  );
}

function checkoutVehicle(query) {
  const slot = findActiveSlot(query);
  if (!slot) {
    throw new Error("No currently parked vehicle matches that registration or ticket number.");
  }

  const exitIso = new Date().toISOString();
  const minutes = getDurationMinutes(slot.entry_time, exitIso);
  const fee = calculateFee(slot.type, minutes);

  const record = {
    ticket: slot.ticket,
    reg_no: slot.vehicle.reg_no,
    owner: slot.vehicle.owner,
    type: slot.type,
    slot: slot.slot_id,
    entry: slot.entry_time,
    exit: exitIso,
    minutes: minutes,
    fee: fee
  };

  parkingState.history.unshift(record);

  slot.free = true;
  slot.vehicle = null;
  slot.ticket = null;
  slot.entry_time = null;

  saveState();
  return record;
}

function resetToDemo() {
  parkingState = getDemoDataset();
  saveState();
  showAlert("Fictional demo data loaded: 5 vehicles parked, 3 completed sessions, ₹470 completed revenue.", "success");
  renderApp();
}

function resetToEmpty() {
  parkingState.slots = ALL_SLOT_DEFS.map(s => ({ ...s, free: true, vehicle: null, entry_time: null, ticket: null }));
  parkingState.history = [];
  parkingState.ticket_no = 1000;
  saveState();
  showAlert("Lot cleared. It is now empty; the next issued ticket will be #1001.", "success");
  renderApp();
}

// Navigation Tabs
function switchTab(tabId) {
  document.querySelectorAll(".tab-view").forEach(el => el.style.display = "none");
  document.querySelectorAll(".sidebar nav a").forEach(el => el.classList.remove("active"));

  const targetView = document.getElementById(`view-${tabId}`);
  const targetNav = document.querySelector(`.sidebar nav a[data-tab="${tabId}"]`);

  if (targetView) targetView.style.display = "block";
  if (targetNav) targetNav.classList.add("active");

  const pageHeading = document.getElementById("page-heading");
  if (pageHeading) {
    const titles = {
      dashboard: "Overview",
      map: "Parking map",
      park: "Park a vehicle",
      checkout: "Checkout",
      search: "Search",
      history: "History",
      reports: "Reports"
    };
    pageHeading.textContent = titles[tabId] || "Overview";
  }

  renderApp();
}

// Rendering UI
function renderApp() {
  renderStats();
  renderDashboard();
  renderMap();
  renderHistory();
  renderReports();
}

function renderStats() {
  const activeSlots = parkingState.slots.filter(s => !s.free);
  const totalOccupied = activeSlots.length;
  const totalAvailable = 13 - totalOccupied;
  const totalRevenue = parkingState.history.reduce((acc, r) => acc + (r.fee || 0), 0);

  const occEl = document.getElementById("stat-occupied");
  const availEl = document.getElementById("stat-available");
  const revEl = document.getElementById("stat-revenue");
  const rateRingEl = document.getElementById("stat-occupancy-ring");
  const rateTextEl = document.getElementById("stat-occupancy-percent");

  if (occEl) occEl.textContent = totalOccupied;
  if (availEl) availEl.textContent = totalAvailable;
  if (revEl) revEl.textContent = formatMoney(totalRevenue);

  const percent = Math.round((totalOccupied / 13) * 100);
  if (rateRingEl) {
    rateRingEl.style.setProperty("--percent", `${percent}%`);
  }
  if (rateTextEl) {
    rateTextEl.textContent = `${percent}%`;
  }

  // Type Breakdown
  ["Bike", "Car", "Truck"].forEach(type => {
    const occ = activeSlots.filter(s => s.type === type).length;
    const total = RATES[type].totalSlots;
    const el = document.getElementById(`type-stat-${type.toLowerCase()}`);
    if (el) el.textContent = `${occ} / ${total} occupied`;
  });
}

function renderDashboard() {
  const activeTbody = document.getElementById("dashboard-active-tbody");
  if (!activeTbody) return;

  const activeSlots = parkingState.slots.filter(s => !s.free);
  if (activeSlots.length === 0) {
    activeTbody.innerHTML = `<tr><td colspan="7" class="empty">No active parked vehicles right now.</td></tr>`;
  } else {
    activeTbody.innerHTML = activeSlots.map(slot => {
      const mins = getDurationMinutes(slot.entry_time);
      const currentFee = calculateFee(slot.type, mins);
      return `
        <tr>
          <td><b>#${slot.ticket}</b></td>
          <td><b>${slot.vehicle.reg_no}</b></td>
          <td>${slot.vehicle.owner}</td>
          <td><span class="status-pill">${slot.type}</span></td>
          <td><b>${slot.slot_id}</b></td>
          <td>${formatDateTime(slot.entry_time)} (${mins}m)</td>
          <td><span class="fee">${formatMoney(currentFee)}</span></td>
          <td>
            <button class="button small primary" onclick="quickCheckout('${slot.slot_id}')">Checkout</button>
          </td>
        </tr>
      `;
    }).join("");
  }

  // Recent History on Dashboard
  const recentTbody = document.getElementById("dashboard-recent-tbody");
  if (recentTbody) {
    const recent = parkingState.history.slice(0, 5);
    if (recent.length === 0) {
      recentTbody.innerHTML = `<tr><td colspan="6" class="empty">No completed transactions yet.</td></tr>`;
    } else {
      recentTbody.innerHTML = recent.map(r => `
        <tr>
          <td><b>#${r.ticket}</b></td>
          <td><b>${r.reg_no}</b></td>
          <td>${r.type} (${r.slot})</td>
          <td>${formatDateTime(r.exit)}</td>
          <td>${r.minutes}m</td>
          <td><span class="fee">${formatMoney(r.fee)}</span></td>
        </tr>
      `).join("");
    }
  }
}

let currentMapFilter = "All";
function setMapFilter(filter) {
  currentMapFilter = filter;
  document.querySelectorAll(".filter-chip").forEach(c => {
    c.classList.toggle("selected", c.dataset.filter === filter);
  });
  renderMap();
}

function renderMap() {
  const mapContainer = document.getElementById("map-slots-container");
  if (!mapContainer) return;

  let filtered = parkingState.slots;
  if (currentMapFilter === "Available") filtered = filtered.filter(s => s.free);
  else if (currentMapFilter === "Occupied") filtered = filtered.filter(s => !s.free);
  else if (RATES[currentMapFilter]) filtered = filtered.filter(s => s.type === currentMapFilter);

  const zones = { Bike: [], Car: [], Truck: [] };
  filtered.forEach(s => {
    if (zones[s.type]) zones[s.type].push(s);
  });

  mapContainer.innerHTML = ["Bike", "Car", "Truck"].map(type => {
    const slots = zones[type];
    if (slots.length === 0) return "";
    return `
      <div class="zone">
        <div class="zone-head">
          <h2>${type} Zone (${type === "Bike" ? "B01–B05" : type === "Car" ? "C01–C06" : "T01–T02"})</h2>
          <span>${slots.filter(s => !s.free).length} / ${RATES[type].totalSlots} Occupied</span>
        </div>
        <div class="slot-grid">
          ${slots.map(s => {
            if (s.free) {
              return `
                <div class="slot-card is-free">
                  <div class="slot-top">
                    <span class="slot-icon">▤</span>
                    <span class="status-pill">AVAILABLE</span>
                  </div>
                  <h3>${s.slot_id}</h3>
                  <div class="slot-kind">${s.type} space</div>
                  <p>Ready for incoming ${s.type.toLowerCase()}</p>
                  <button class="button outline small full" onclick="quickPark('${s.type}', '${s.slot_id}')">Park here</button>
                </div>
              `;
            } else {
              const mins = getDurationMinutes(s.entry_time);
              const fee = calculateFee(s.type, mins);
              return `
                <div class="slot-card is-occupied">
                  <div class="slot-top">
                    <span class="slot-icon">🚗</span>
                    <span class="status-pill">OCCUPIED</span>
                  </div>
                  <h3>${s.slot_id}</h3>
                  <div class="slot-kind">${s.type} space</div>
                  <div class="vehicle-mini">
                    <b>${s.vehicle.reg_no}</b>
                    <span>${s.vehicle.owner}</span>
                    <small>Ticket #${s.ticket} · ${mins}m (${formatMoney(fee)})</small>
                  </div>
                  <button class="button primary small full" onclick="quickCheckout('${s.slot_id}')">Checkout</button>
                </div>
              `;
            }
          }).join("")}
        </div>
      </div>
    `;
  }).join("");
}

function quickPark(type, slotId) {
  switchTab("park");
  const typeSelect = document.getElementById("park-vtype");
  if (typeSelect) typeSelect.value = type;
  const regInput = document.getElementById("park-regno");
  if (regInput) regInput.focus();
}

function quickCheckout(query) {
  switchTab("checkout");
  const qInput = document.getElementById("checkout-query");
  if (qInput) {
    qInput.value = query;
    previewCheckout(query);
  }
}

// Checkout Preview
let pendingCheckoutQuery = null;
function previewCheckout(query) {
  pendingCheckoutQuery = query;
  const previewBox = document.getElementById("checkout-preview-box");
  const emptyBox = document.getElementById("checkout-empty-box");
  if (!previewBox || !emptyBox) return;

  const slot = findActiveSlot(query);
  if (!slot) {
    previewBox.style.display = "none";
    emptyBox.style.display = "block";
    emptyBox.textContent = query ? `No active parked vehicle matches "${query}".` : "Enter a ticket number, registration number, or slot ID to begin checkout.";
    return;
  }

  const mins = getDurationMinutes(slot.entry_time);
  const fee = calculateFee(slot.type, mins);

  document.getElementById("checkout-p-ticket").textContent = `#${slot.ticket}`;
  document.getElementById("checkout-p-regno").textContent = slot.vehicle.reg_no;
  document.getElementById("checkout-p-owner").textContent = slot.vehicle.owner;
  document.getElementById("checkout-p-slot").textContent = `${slot.slot_id} (${slot.type})`;
  document.getElementById("checkout-p-entry").textContent = formatDateTime(slot.entry_time);
  document.getElementById("checkout-p-duration").textContent = `${mins} minutes (${Math.ceil(mins / 60)} hrs billed)`;
  document.getElementById("checkout-p-fee").textContent = formatMoney(fee);

  const confirmCheck = document.getElementById("checkout-confirm-check");
  if (confirmCheck) confirmCheck.checked = false;

  previewBox.style.display = "block";
  emptyBox.style.display = "none";
}

// Modals for Ticket & Bill
function showTicketModal(ticketData) {
  document.getElementById("ticket-modal-no").textContent = `#${ticketData.ticket}`;
  document.getElementById("ticket-modal-reg").textContent = ticketData.reg_no;
  document.getElementById("ticket-modal-owner").textContent = ticketData.owner;
  document.getElementById("ticket-modal-type").textContent = ticketData.type;
  document.getElementById("ticket-modal-slot").textContent = ticketData.slot;
  document.getElementById("ticket-modal-time").textContent = formatDateTime(ticketData.entry);

  const rate = RATES[ticketData.type];
  document.getElementById("ticket-modal-rate").textContent = `First hr ₹${rate.first}, addl ₹${rate.additional}/hr, cap ₹${rate.cap}`;

  document.getElementById("ticket-modal").style.display = "flex";
}

function closeTicketModal() {
  document.getElementById("ticket-modal").style.display = "none";
}

function showBillModal(billData) {
  document.getElementById("bill-modal-ticket").textContent = `#${billData.ticket}`;
  document.getElementById("bill-modal-reg").textContent = billData.reg_no;
  document.getElementById("bill-modal-owner").textContent = billData.owner;
  document.getElementById("bill-modal-slot").textContent = `${billData.slot} (${billData.type})`;
  document.getElementById("bill-modal-entry").textContent = formatDateTime(billData.entry);
  document.getElementById("bill-modal-exit").textContent = formatDateTime(billData.exit);
  document.getElementById("bill-modal-mins").textContent = `${billData.minutes} mins`;
  document.getElementById("bill-modal-fee").textContent = formatMoney(billData.fee);

  document.getElementById("bill-modal").style.display = "flex";
}

function closeBillModal() {
  document.getElementById("bill-modal").style.display = "none";
  switchTab("dashboard");
}

// History Search & Filter
function renderHistory() {
  const tbody = document.getElementById("history-tbody");
  if (!tbody) return;

  const typeFilter = document.getElementById("history-type-filter")?.value || "All";
  const dateFilter = document.getElementById("history-date-filter")?.value || "";
  const searchFilter = (document.getElementById("history-search-input")?.value || "").trim().toLowerCase();

  let records = parkingState.history;
  if (typeFilter !== "All") records = records.filter(r => r.type === typeFilter);
  if (dateFilter) {
    records = records.filter(r => {
      const exitDate = new Date(r.exit).toISOString().split("T")[0];
      return exitDate === dateFilter;
    });
  }
  if (searchFilter) {
    records = records.filter(r =>
      r.reg_no.toLowerCase().includes(searchFilter) ||
      r.owner.toLowerCase().includes(searchFilter) ||
      String(r.ticket).includes(searchFilter)
    );
  }

  const totalRev = records.reduce((sum, r) => sum + (r.fee || 0), 0);
  const countEl = document.getElementById("history-count");
  const revEl = document.getElementById("history-revenue");
  if (countEl) countEl.textContent = `${records.length} sessions`;
  if (revEl) revEl.textContent = formatMoney(totalRev);

  if (records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty">No completed parking sessions match your filter.</td></tr>`;
  } else {
    tbody.innerHTML = records.map(r => `
      <tr>
        <td><b>#${r.ticket}</b></td>
        <td><b>${r.reg_no}</b></td>
        <td>${r.owner}</td>
        <td><span class="status-pill">${r.type}</span></td>
        <td><b>${r.slot}</b></td>
        <td>${formatDateTime(r.entry)}</td>
        <td>${formatDateTime(r.exit)}</td>
        <td>${r.minutes}m</td>
        <td><span class="fee">${formatMoney(r.fee)}</span></td>
      </tr>
    `).join("");
  }
}

// Reports
function renderReports() {
  const datePicker = document.getElementById("reports-date-picker");
  const selectedDate = datePicker?.value || new Date().toISOString().split("T")[0];

  const dayRecords = parkingState.history.filter(r => {
    return new Date(r.exit).toISOString().split("T")[0] === selectedDate;
  });

  const dayRev = dayRecords.reduce((sum, r) => sum + (r.fee || 0), 0);
  const bikeCount = dayRecords.filter(r => r.type === "Bike").length;
  const carCount = dayRecords.filter(r => r.type === "Car").length;
  const truckCount = dayRecords.filter(r => r.type === "Truck").length;

  const repDayCount = document.getElementById("report-day-count");
  const repDayRev = document.getElementById("report-day-rev");
  const repBike = document.getElementById("report-bike-count");
  const repCar = document.getElementById("report-car-count");
  const repTruck = document.getElementById("report-truck-count");

  if (repDayCount) repDayCount.textContent = dayRecords.length;
  if (repDayRev) repDayRev.textContent = formatMoney(dayRev);
  if (repBike) repBike.textContent = `${bikeCount} completed`;
  if (repCar) repCar.textContent = `${carCount} completed`;
  if (repTruck) repTruck.textContent = `${truckCount} completed`;

  const tbody = document.getElementById("report-day-tbody");
  if (tbody) {
    if (dayRecords.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty">No checkout records for ${selectedDate}.</td></tr>`;
    } else {
      tbody.innerHTML = dayRecords.map(r => `
        <tr>
          <td><b>#${r.ticket}</b></td>
          <td><b>${r.reg_no}</b></td>
          <td>${r.owner}</td>
          <td>${r.type} (${r.slot})</td>
          <td>${formatDateTime(r.exit)}</td>
          <td><span class="fee">${formatMoney(r.fee)}</span></td>
        </tr>
      `).join("");
    }
  }
}

// Search Page
function executeSearch(query) {
  const q = (query || "").trim().toLowerCase();
  const activeTbody = document.getElementById("search-active-tbody");
  const historyTbody = document.getElementById("search-history-tbody");
  if (!activeTbody || !historyTbody) return;

  if (!q) {
    activeTbody.innerHTML = `<tr><td colspan="7" class="empty">Type a ticket number, registration, or owner name above.</td></tr>`;
    historyTbody.innerHTML = `<tr><td colspan="7" class="empty">Type a query to search completed sessions.</td></tr>`;
    return;
  }

  const activeMatches = parkingState.slots.filter(s =>
    !s.free && s.vehicle && (
      s.vehicle.reg_no.toLowerCase().includes(q) ||
      s.vehicle.owner.toLowerCase().includes(q) ||
      String(s.ticket).includes(q) ||
      s.slot_id.toLowerCase().includes(q)
    )
  );

  const historyMatches = parkingState.history.filter(r =>
    r.reg_no.toLowerCase().includes(q) ||
    r.owner.toLowerCase().includes(q) ||
    String(r.ticket).includes(q) ||
    r.slot.toLowerCase().includes(q)
  );

  if (activeMatches.length === 0) {
    activeTbody.innerHTML = `<tr><td colspan="7" class="empty">No matching active vehicles found.</td></tr>`;
  } else {
    activeTbody.innerHTML = activeMatches.map(s => {
      const mins = getDurationMinutes(s.entry_time);
      const fee = calculateFee(s.type, mins);
      return `
        <tr>
          <td><b>#${s.ticket}</b></td>
          <td><b>${s.vehicle.reg_no}</b></td>
          <td>${s.vehicle.owner}</td>
          <td><span class="status-pill">${s.type}</span></td>
          <td><b>${s.slot_id}</b></td>
          <td>${formatDateTime(s.entry_time)} (${mins}m)</td>
          <td>
            <button class="button small primary" onclick="quickCheckout('${s.slot_id}')">Checkout</button>
          </td>
        </tr>
      `;
    }).join("");
  }

  if (historyMatches.length === 0) {
    historyTbody.innerHTML = `<tr><td colspan="7" class="empty">No matching history records found.</td></tr>`;
  } else {
    historyTbody.innerHTML = historyMatches.map(r => `
      <tr>
        <td><b>#${r.ticket}</b></td>
        <td><b>${r.reg_no}</b></td>
        <td>${r.owner}</td>
        <td>${r.type} (${r.slot})</td>
        <td>${formatDateTime(r.exit)}</td>
        <td>${r.minutes}m</td>
        <td><span class="fee">${formatMoney(r.fee)}</span></td>
      </tr>
    `).join("");
  }
}

// Export CSV
function exportCSV() {
  const headers = ["Ticket", "Reg No", "Owner", "Type", "Slot", "Entry", "Exit", "Minutes", "Fee"];
  const rows = parkingState.history.map(r => [
    r.ticket,
    `"${r.reg_no.replace(/"/g, '""')}"`,
    `"${r.owner.replace(/"/g, '""')}"`,
    r.type,
    r.slot,
    `"${formatDateTime(r.entry)}"`,
    `"${formatDateTime(r.exit)}"`,
    r.minutes,
    r.fee
  ]);

  const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "parking_history.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// DOM Setup & Event Listeners
document.addEventListener("DOMContentLoaded", async () => {
  await loadState();
  renderApp();

  // Navigation Links
  document.querySelectorAll(".sidebar nav a").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const tab = link.getAttribute("data-tab");
      if (tab) switchTab(tab);
    });
  });

  // Topbar Park Button
  document.getElementById("btn-topbar-park")?.addEventListener("click", () => {
    switchTab("park");
  });

  // Park Form
  document.getElementById("park-form")?.addEventListener("submit", e => {
    e.preventDefault();
    const regNo = document.getElementById("park-regno").value;
    const owner = document.getElementById("park-owner").value;
    const vType = document.getElementById("park-vtype").value;

    try {
      const ticket = parkVehicle(regNo, owner, vType);
      showAlert(`Vehicle ${ticket.reg_no} parked successfully in ${ticket.slot}.`, "success");
      document.getElementById("park-form").reset();
      showTicketModal(ticket);
    } catch (err) {
      showAlert(err.message, "error");
    }
  });

  // Checkout Search & Submit
  document.getElementById("checkout-query-form")?.addEventListener("submit", e => {
    e.preventDefault();
    const query = document.getElementById("checkout-query").value;
    previewCheckout(query);
  });

  document.getElementById("checkout-query")?.addEventListener("input", e => {
    previewCheckout(e.target.value);
  });

  document.getElementById("checkout-submit-form")?.addEventListener("submit", e => {
    e.preventDefault();
    const confirmed = document.getElementById("checkout-confirm-check").checked;
    if (!confirmed) {
      showAlert("Please check the confirmation box before releasing the space.", "error");
      return;
    }

    try {
      const bill = checkoutVehicle(pendingCheckoutQuery);
      showAlert(`Vehicle ${bill.reg_no} checked out successfully. Fee collected: ${formatMoney(bill.fee)}`, "success");
      document.getElementById("checkout-preview-box").style.display = "none";
      document.getElementById("checkout-empty-box").style.display = "block";
      document.getElementById("checkout-query").value = "";
      showBillModal(bill);
    } catch (err) {
      showAlert(err.message, "error");
    }
  });

  // Live Search Input
  document.getElementById("global-search-input")?.addEventListener("input", e => {
    executeSearch(e.target.value);
  });

  // History Filter Listeners
  ["history-type-filter", "history-date-filter", "history-search-input"].forEach(id => {
    document.getElementById(id)?.addEventListener("input", renderHistory);
  });

  // Reports Date Picker
  const datePicker = document.getElementById("reports-date-picker");
  if (datePicker) {
    datePicker.value = new Date().toISOString().split("T")[0];
    datePicker.addEventListener("change", renderReports);
  }

  // Demo Controls
  document.getElementById("btn-reload-demo")?.addEventListener("click", resetToDemo);
  document.getElementById("btn-reset-empty")?.addEventListener("click", resetToEmpty);
  document.getElementById("btn-export-csv")?.addEventListener("click", exportCSV);

  // Periodically refresh live minutes every 30s
  setInterval(() => {
    renderStats();
    renderDashboard();
  }, 30000);
});
