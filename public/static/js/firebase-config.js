// Firebase Web SDK Configuration for Parkline
const firebaseConfig = {
  apiKey: window.FIREBASE_API_KEY || "YOUR_FIREBASE_API_KEY",
  authDomain: window.FIREBASE_AUTH_DOMAIN || "parking-management-55d59.firebaseapp.com",
  projectId: window.FIREBASE_PROJECT_ID || "parking-management-55d59",
  storageBucket: window.FIREBASE_STORAGE_BUCKET || "parking-management-55d59.firebasestorage.app",
  messagingSenderId: window.FIREBASE_MESSAGING_SENDER_ID || "266553097689",
  appId: window.FIREBASE_APP_ID || "1:266553097689:web:7968c0c4839d6fa7e42dc8",
  measurementId: window.FIREBASE_MEASUREMENT_ID || "G-821XXB32MQ"
};

// Initialize Firebase if compat SDK is loaded
if (typeof firebase !== "undefined" && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
