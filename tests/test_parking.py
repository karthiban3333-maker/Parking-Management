import csv
import io
import unittest
from datetime import datetime

import app as webapp
from demo_data import create_demo_lot
from parking_logic import CSV_COLUMNS, RATES, ParkingError, ParkingLot


class ParkingLogicTests(unittest.TestCase):
    def setUp(self):
        self.lot = ParkingLot(clock=lambda: datetime(2026, 10, 18, 8, 0))

    def test_13_slots_and_types(self):
        self.assertEqual(len(self.lot.slots), 13)
        self.assertEqual([s.slot_id for s in self.lot.slots],
                         [f'B{i:02}' for i in range(1, 6)] +
                         [f'C{i:02}' for i in range(1, 7)] + ['T01', 'T02'])
        self.assertEqual({t: sum(s.v_type == t for s in self.lot.slots) for t in RATES},
                         {'Bike': 5, 'Car': 6, 'Truck': 2})

    def test_compatible_slot_duplicate_and_first_ticket(self):
        bike = self.lot.park(' tn01ab1234 ', 'Asha', 'Bike')
        car = self.lot.park('CAR1', 'Mina', 'Car')
        truck = self.lot.park('TRUCK1', 'Dev', 'Truck')
        self.assertEqual((bike['slot'], bike['ticket'], bike['reg_no']), ('B01', 1001, 'TN01AB1234'))
        self.assertEqual((car['slot'], truck['slot']), ('C01', 'T01'))
        self.assertEqual([s.slot_id for s in self.lot.slots if not s.free], ['B01', 'C01', 'T01'])
        with self.assertRaises(ParkingError): self.lot.park('TN01AB1234', 'Other', 'Bike')
        self.assertEqual(self.lot.ticket_no, 1003)

    def test_invalid_and_full_zone_do_not_partially_mutate(self):
        for values in [('', 'X', 'Bike'), ('ABC', '', 'Bike'), ('ABC', 'X', 'Plane')]:
            with self.subTest(values=values), self.assertRaises(ParkingError):
                self.lot.park(*values)
        self.assertEqual((self.lot.ticket_no, sum(not s.free for s in self.lot.slots)), (1000, 0))
        for i in range(5): self.lot.park(f'B{i}', 'Owner', 'Bike')
        before = (self.lot.ticket_no, len(self.lot.history))
        with self.assertRaises(ParkingError): self.lot.park('B5', 'Owner', 'Bike')
        self.assertEqual((self.lot.ticket_no, len(self.lot.history)), before)

    def test_tariff_boundaries_examples_and_daily_caps(self):
        cases = [
            ('Bike', 0, 0), ('Bike', 8, 0), ('Bike', 10, 0), ('Bike', 11, 10),
            ('Bike', 60, 10), ('Bike', 61, 15), ('Bike', 120, 15),
            ('Car', 60, 30), ('Car', 120, 50), ('Car', 200, 90),
            ('Truck', 155, 140), ('Truck', 540, 380),
            ('Bike', 1000, 60), ('Car', 1000, 200), ('Truck', 1000, 400),
        ]
        for kind, minutes, fee in cases:
            with self.subTest(kind=kind, minutes=minutes):
                self.assertEqual(self.lot.calculate_fee(kind, minutes), fee)
        with self.assertRaises(ParkingError): self.lot.calculate_fee('Bus', 10)

    def test_checkout_history_slot_release_and_unknown(self):
        self.lot.park('B1', 'Asha', 'Bike', datetime(2026, 10, 18, 8, 0))
        with self.assertRaises(ParkingError): self.lot.remove('UNKNOWN')
        record = self.lot.remove('1001', datetime(2026, 10, 18, 8, 8))
        self.assertEqual((record['fee'], record['minutes'], len(self.lot.history)), (0, 8, 1))
        self.assertTrue(self.lot.slots[0].free)
        with self.assertRaises(ParkingError): self.lot.remove('1001')

    def test_search_report_and_csv_headers_escaping_and_empty_history(self):
        self.lot.park('TN1', 'Asha, "QA"', 'Bike', datetime(2026, 10, 18, 8, 0))
        self.lot.remove('TN1', datetime(2026, 10, 18, 8, 8))
        self.assertEqual(len(self.lot.search('asha')['history']), 1)
        report = self.lot.report(datetime(2026, 10, 18).date())
        self.assertEqual((report['sessions'], report['revenue'], report['by_type']['Bike']), (1, 0, 1))
        rows = list(csv.reader(io.StringIO(self.lot.export_csv())))
        self.assertEqual(rows[0], CSV_COLUMNS)
        self.assertEqual(rows[1][2], 'Asha, "QA"')
        self.assertEqual(list(csv.reader(io.StringIO(ParkingLot().export_csv()))), [CSV_COLUMNS])

    def test_demo_expected_results_and_full_truck_zone(self):
        demo = create_demo_lot()
        self.assertEqual(len(demo.history), 3)
        self.assertEqual(sum(r['fee'] for r in demo.history), 470)
        self.assertEqual(sum(not s.free for s in demo.slots), 5)
        trucks = [s for s in demo.slots if not s.free and s.v_type == 'Truck']
        self.assertEqual(len(trucks), 2)
        with self.assertRaises(ParkingError): demo.park('THIRDTRUCK', 'Owner', 'Truck')
        self.assertEqual(demo.calculate_fee('Car', 200), 90)
        self.assertEqual(demo.calculate_fee('Bike', 8), 0)
        self.assertEqual(demo.calculate_fee('Truck', 540), 380)
        tn = demo.find_vehicle('TN66EF9012')
        self.assertEqual(demo.duration_minutes(tn.entry_time, datetime(2026, 10, 18, 11)), 155)
        self.assertEqual(demo.calculate_fee('Truck', 155), 140)

    def test_flask_routes_forms_default_sample_and_reset(self):
        webapp.app.testing = True
        client = webapp.app.test_client()
        webapp.lot = create_demo_lot()
        for path in ['/', '/parking-map', '/park', '/checkout', '/search', '/history', '/reports']:
            self.assertEqual(client.get(path).status_code, 200, path)
        dashboard = client.get('/').get_data(as_text=True)
        self.assertIn('Reload sample data', dashboard)
        self.assertIn('Reset to empty lot', dashboard)
        self.assertIn('Recently issued tickets', dashboard)
        self.assertEqual(len(webapp.lot.history), 3)
        self.assertEqual(client.get('/search?q=TN66EF9012').status_code, 200)
        self.assertEqual(client.post('/lot/reset').status_code, 302)
        self.assertEqual((webapp.lot.ticket_no, len(webapp.lot.history), sum(not s.free for s in webapp.lot.slots)), (1000, 0, 0))
        response = client.post('/park', data={'reg_no': 'tn1ab2', 'owner': 'Test Owner', 'v_type': 'Bike'}, follow_redirects=True)
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'#1001', response.data)
        duplicate = client.post('/park', data={'reg_no': 'TN1AB2', 'owner': 'Again', 'v_type': 'Bike'}, follow_redirects=True)
        self.assertIn(b'already parked', duplicate.data)
        self.assertEqual(client.get('/search?q=TN1AB2').status_code, 200)
        unconfirmed = client.post('/checkout', data={'query': '1001'})
        self.assertEqual(unconfirmed.status_code, 400)
        self.assertEqual(len(webapp.lot.history), 0)
        checkout = client.post('/checkout', data={'query': '1001', 'confirm_checkout': 'yes'}, follow_redirects=True)
        self.assertIn(b'Itemized parking bill', checkout.data)
        self.assertEqual(len(webapp.lot.history), 1)
        csv_response = client.get('/export/csv')
        self.assertIn('text/csv', csv_response.content_type)
        self.assertEqual(list(csv.reader(io.StringIO(csv_response.get_data(as_text=True))))[0], CSV_COLUMNS)
        self.assertEqual(client.get('/reports').status_code, 200)
        client.post('/demo/reset')
        self.assertEqual((len(webapp.lot.history), sum(not s.free for s in webapp.lot.slots)), (3, 5))

    def test_application_starts_with_sample_data(self):
        demo = create_demo_lot()
        self.assertEqual((len(demo.history), sum(not s.free for s in demo.slots)), (3, 5))
        self.assertIn('TN66EF9012', [s.vehicle.reg_no for s in demo.slots if not s.free])


if __name__ == '__main__':
    unittest.main()
