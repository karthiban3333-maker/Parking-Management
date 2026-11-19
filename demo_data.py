"""Explicitly fictional, reproducible data used for the visible demo session."""
from datetime import datetime
from parking_logic import ParkingLot, ParkingError

DEMO_START = datetime(2026, 10, 18, 8, 0)


def create_demo_lot():
    """Build the documented demo: 5 active vehicles, 3 completed, ₹470 revenue.

    The returned instance is independent. The user can replace it with an empty lot
    using the app's Reset to empty lot action.
    """
    lot = ParkingLot(clock=lambda: DEMO_START)
    lot.park("TN01AB1234", "Asha Rao", "Bike", DEMO_START)
    lot.park("TN09CD5678", "Ravi Kumar", "Car", DEMO_START)
    lot.park("TN66EF9012", "Mohan Das", "Truck", datetime(2026, 10, 18, 8, 25))
    lot.park("KA03GH1111", "Leela Nair", "Bike", DEMO_START)
    lot.park("MH12JK2222", "Sara Iyer", "Car", DEMO_START)
    lot.park("KL07LM3333", "Dev Shah", "Truck", DEMO_START)

    # Duplicate active registration must not allocate a slot or ticket.
    try:
        lot.park("TN01AB1234", "Duplicate attempt", "Bike", DEMO_START)
    except ParkingError:
        pass
    else:
        raise AssertionError("Demo duplicate registration was unexpectedly accepted")

    # Original controlled cases: 8 minutes free; 200-minute car ₹90; 9-hour truck ₹380.
    lot.remove("TN01AB1234", datetime(2026, 10, 18, 8, 8))
    lot.remove("TN09CD5678", datetime(2026, 10, 18, 11, 20))
    lot.remove("KL07LM3333", datetime(2026, 10, 18, 17, 0))

    # Leave five active; both truck slots are occupied and a third truck is rejected.
    lot.park("DL8QW4444", "Nikhil Sen", "Bike", DEMO_START)
    lot.park("UP32TR6666", "Arun Joshi", "Truck", DEMO_START)
    try:
        lot.park("PB10TX7777", "Rhea Das", "Truck", DEMO_START)
    except ParkingError:
        pass
    else:
        raise AssertionError("Demo accepted a third truck")

    assert len(lot.history) == 3
    assert sum(record["fee"] for record in lot.history) == 470
    assert sum(not slot.free for slot in lot.slots) == 5
    assert sum(not slot.free and slot.v_type == "Truck" for slot in lot.slots) == 2
    assert lot.calculate_fee("Truck", lot.duration_minutes(
        datetime(2026, 10, 18, 8, 25), datetime(2026, 10, 18, 11, 0))) == 140
    # Historical demo transactions stay fixed for repeatable billing. Still-parked
    # sample vehicles accrue real elapsed time after the demo is loaded.
    lot.clock = datetime.now
    return lot
