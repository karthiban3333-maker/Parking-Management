"""Firebase Cloud Functions (2nd Gen) entrypoint for Parkline Parking Management System."""
from firebase_functions import https_fn
from firebase_admin import initialize_app
from app import app

# Initialize Firebase Admin SDK
initialize_app()

@https_fn.on_request()
def parking_app(req: https_fn.Request) -> https_fn.Response:
    """Dispatches incoming HTTPS requests to the Flask application."""
    with app.request_context(req.environ):
        return app.full_dispatch_request()
