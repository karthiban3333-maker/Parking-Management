"""Core in-memory parking rules for the student parking management system."""
from dataclasses import dataclass
from datetime import datetime
from math import ceil
from typing import Optional
import csv
import io

RATES = {
    "Bike": {"first": 10, "additional": 5, "cap": 60},
    "Car": {"first": 30, "additional": 20, "cap": 200},
    "Truck": {"first": 60, "additional": 40, "cap": 400},
}
SLOT_COUNTS = {"Bike": 5, "Car": 6, "Truck": 2}
CSV_COLUMNS = ["Ticket", "Reg No", "Owner", "Type", "Slot", "Entry", "Exit", "Minutes", "Fee"]


@dataclass
class Vehicle:
    reg_no: str
    v_type: str
    owner: str


@dataclass
class Slot:
    slot_id: str
    v_type: str
    vehicle: Optional[Vehicle] = None
    entry_time: Optional[datetime] = None
    ticket: Optional[int] = None

    @property
    def free(self):
        return self.vehicle is None


class ParkingError(ValueError):
    pass


class ParkingLot:
    def __init__(self, name="Parkline Parking", clock=None):
        self.name = name
        self.slots = [Slot(f"{prefix}{i:02d}", kind) for kind, prefix, count in
                      (("Bike", "B", 5), ("Car", "C", 6), ("Truck", "T", 2))
                      for i in range(1, count + 1)]
        self.history = []
        self.ticket_no = 1000
        self.clock = clock or datetime.now

    def find_vehicle(self, query):
        q = str(query).strip().casefold()
        if not q:
            return None
        return next((s for s in self.slots if not s.free and
                     (s.vehicle.reg_no.casefold() == q or str(s.ticket) == q)), None)

    def first_free_slot(self, v_type):
        return next((s for s in self.slots if s.v_type == v_type and s.free), None)

    @staticmethod
    def calculate_fee(v_type, duration_minutes):
        if v_type not in RATES:
            raise ParkingError("Choose Bike, Car or Truck.")
        minutes = max(0, int(duration_minutes))
        if minutes <= 10:
            return 0
        hours = ceil(minutes / 60)
        rate = RATES[v_type]
        return min(rate["first"] + (hours - 1) * rate["additional"], rate["cap"])

    def park(self, reg_no, owner, v_type, now=None):
        reg_no = " ".join(str(reg_no).strip().upper().split())
        owner = " ".join(str(owner).strip().split())
        if not reg_no or not owner:
            raise ParkingError("Registration number and owner name are required.")
        if v_type not in RATES:
            raise ParkingError("Choose Bike, Car or Truck.")
        if any(not s.free and s.vehicle.reg_no.casefold() == reg_no.casefold() for s in self.slots):
            raise ParkingError(f"{reg_no} is already parked.")
        slot = self.first_free_slot(v_type)
        if not slot:
            raise ParkingError(f"The {v_type.lower()} zone is full. No compatible slot is available.")
        self.ticket_no += 1
        slot.vehicle = Vehicle(reg_no, v_type, owner)
        slot.entry_time = now or self.clock()
        slot.ticket = self.ticket_no
        return self.session_for_slot(slot)

    @staticmethod
    def duration_minutes(start, end):
        return max(0, int((end - start).total_seconds() // 60))

    def session_for_slot(self, slot, now=None):
        end = now or self.clock()
        mins = self.duration_minutes(slot.entry_time, end)
        return {"ticket": slot.ticket, "reg_no": slot.vehicle.reg_no, "owner": slot.vehicle.owner,
                "type": slot.vehicle.v_type, "slot": slot.slot_id, "entry": slot.entry_time,
                "exit": None, "minutes": mins, "fee": self.calculate_fee(slot.vehicle.v_type, mins)}

    def remove(self, query, now=None):
        slot = self.find_vehicle(query)
        if not slot:
            raise ParkingError("No currently parked vehicle matches that registration or ticket number.")
        end = now or self.clock()
        record = self.session_for_slot(slot, end)
        record["exit"] = end
        record["minutes"] = self.duration_minutes(slot.entry_time, end)
        record["fee"] = self.calculate_fee(slot.vehicle.v_type, record["minutes"])
        self.history.append(record)
        slot.vehicle = slot.entry_time = slot.ticket = None
        return record

    def show_status(self):
        return [{"slot_id": s.slot_id, "type": s.v_type, "free": s.free,
                 "reg_no": s.vehicle.reg_no if s.vehicle else None,
                 "owner": s.vehicle.owner if s.vehicle else None,
                 "ticket": s.ticket, "entry": s.entry_time}
                for s in self.slots]

    def search(self, query):
        q = str(query).strip().casefold()
        if not q:
            return {"active": [], "history": []}
        active = [self.session_for_slot(s) for s in self.slots if not s.free and
                  any(q in value.casefold() for value in (s.vehicle.reg_no, s.vehicle.owner, str(s.ticket)))]
        done = [r for r in reversed(self.history) if any(q in str(r[k]).casefold()
                for k in ("reg_no", "owner", "ticket"))]
        return {"active": active, "history": done}

    def report(self, day=None):
        records = self.history if day is None else [r for r in self.history if r["exit"].date() == day]
        occupied = [s for s in self.slots if not s.free]
        return {"sessions": len(records), "revenue": sum(r["fee"] for r in records),
                "by_type": {t: sum(r["type"] == t for r in records) for t in RATES},
                "occupied": len(occupied), "available": len(self.slots) - len(occupied),
                "records": records}

    def export_csv(self):
        out = io.StringIO(newline="")
        writer = csv.writer(out)
        writer.writerow(CSV_COLUMNS)
        for r in self.history:
            writer.writerow([r["ticket"], r["reg_no"], r["owner"], r["type"], r["slot"],
                r["entry"].isoformat(sep=" ", timespec="minutes"), r["exit"].isoformat(sep=" ", timespec="minutes"),
                r["minutes"], r["fee"]])
        return out.getvalue()
