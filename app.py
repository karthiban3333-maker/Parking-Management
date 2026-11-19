from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, flash, make_response
from parking_logic import ParkingLot, ParkingError, RATES
from demo_data import create_demo_lot

app = Flask(__name__)
app.secret_key = "local-student-demo-key"
lot = create_demo_lot()


def money(n): return f"₹{n:,}"
app.jinja_env.filters["money"] = money
app.jinja_env.filters["dt"] = lambda value: value.strftime("%d %b %Y, %I:%M %p") if value else "—"

@app.get("/")
def dashboard():
    active = [s for s in lot.show_status() if not s["free"]]
    summary = lot.report()
    return render_template("dashboard.html", active=active, summary=summary,
                           recent=lot.history[-6:][::-1], recent_issued=sorted(active, key=lambda row: row["ticket"], reverse=True)[:5], rates=RATES)

@app.get("/parking-map")
def parking_map():
    filter_by = request.args.get("filter", "All")
    statuses = lot.show_status()
    if filter_by == "Available": statuses = [s for s in statuses if s["free"]]
    elif filter_by == "Occupied": statuses = [s for s in statuses if not s["free"]]
    elif filter_by in RATES: statuses = [s for s in statuses if s["type"] == filter_by]
    return render_template("parking_map.html", slots=statuses, current_filter=filter_by,
                           zones={t: [s for s in statuses if s["type"] == t] for t in RATES})

@app.route("/park", methods=["GET", "POST"])
def park():
    if request.method == "POST":
        try:
            rec = lot.park(request.form.get("reg_no", ""), request.form.get("owner", ""), request.form.get("v_type", ""))
            flash(f"Vehicle parked successfully in {rec['slot']}.", "success")
            return redirect(url_for("ticket", ticket_number=rec["ticket"]))
        except ParkingError as e: flash(str(e), "error")
    return render_template("park.html", rates=RATES)

@app.get("/ticket/<int:ticket_number>")
def ticket(ticket_number):
    slot = next((s for s in lot.slots if s.ticket == ticket_number), None)
    if not slot:
        flash("That active parking ticket was not found.", "error")
        return redirect(url_for("dashboard"))
    return render_template("ticket.html", record=lot.session_for_slot(slot), lot_name=lot.name, rates=RATES)

@app.route("/checkout", methods=["GET", "POST"])
def checkout():
    q = request.values.get("q", "")
    slot = lot.find_vehicle(q)
    record = lot.session_for_slot(slot) if slot else None
    if request.method == "POST":
        if request.form.get("confirm_checkout") != "yes":
            flash("Please confirm checkout before releasing this parking space.", "error")
            query = request.form.get("query", "")
            slot = lot.find_vehicle(query)
            record = lot.session_for_slot(slot) if slot else None
            return render_template("checkout.html", record=record, query=query), 400
        try:
            rec = lot.remove(request.form.get("query", ""))
            return render_template("bill.html", record=rec, lot_name=lot.name)
        except ParkingError as e: flash(str(e), "error")
    return render_template("checkout.html", record=record, query=q)

@app.get("/search")
def search():
    q = request.args.get("q", "")
    results = lot.search(q)
    return render_template("search.html", q=q, results=results)

@app.get("/history")
def history():
    kind, q, day = request.args.get("type", "All"), request.args.get("q", "").strip().casefold(), request.args.get("date", "")
    records = list(reversed(lot.history))
    if kind in RATES: records = [r for r in records if r["type"] == kind]
    if q: records = [r for r in records if q in r["reg_no"].casefold()]
    if day:
        try: records = [r for r in records if r["exit"].date().isoformat() == day]
        except ValueError: pass
    return render_template("history.html", records=records, total=len(lot.history), revenue=sum(r["fee"] for r in lot.history), kind=kind, q=request.args.get("q", ""), day=day)

@app.get("/reports")
def reports():
    default_day = max((r["exit"].date() for r in lot.history), default=datetime.now().date())
    date_text = request.args.get("date", default_day.isoformat())
    try: date_value = datetime.strptime(date_text, "%Y-%m-%d").date()
    except ValueError: date_value = default_day
    report = lot.report(date_value)
    return render_template("reports.html", report=report, date_text=date_value.isoformat(), all_report=lot.report())

@app.get("/export/csv")
def export_csv():
    response = make_response(lot.export_csv())
    response.headers["Content-Type"] = "text/csv; charset=utf-8"
    response.headers["Content-Disposition"] = "attachment; filename=parking_history.csv"
    return response

@app.post("/demo/reset")
def demo_reset():
    """Replace session state with the reproducible fictional sample dataset."""
    global lot
    lot = create_demo_lot()
    flash("Fictional demo data loaded: 5 vehicles parked, 3 completed sessions, ₹470 completed revenue.", "success")
    return redirect(url_for("dashboard"))

@app.post("/lot/reset")
def reset_empty_lot():
    """Clear all current session records and reset ticket numbering."""
    global lot
    lot = ParkingLot()
    flash("Lot cleared. It is now empty; the next successful ticket will be #1001.", "success")
    return redirect(url_for("dashboard"))

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
