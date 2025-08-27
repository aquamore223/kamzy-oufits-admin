// Firebase Config for Kamzy Outfits
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBnvkmNG7u8o6SDzATtKmOKJ41dLSr5Ro8",
  authDomain: "kamzy-outfits.firebaseapp.com",
  projectId: "kamzy-outfits",
  storageBucket: "kamzy-outfits.firebasestorage.app",
  messagingSenderId: "206575098814",
  appId: "1:206575098814:web:9d90a6c3a500cf845277ef",
  measurementId: "G-62YRDBD84M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
