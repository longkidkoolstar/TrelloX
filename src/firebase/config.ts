// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAt-Ko_X54iaVG2tFuloyHI551KcSqw1so",
  authDomain: "trellox-74d88.firebaseapp.com",
  projectId: "trellox-74d88",
  storageBucket: "trellox-74d88.appspot.com",
  messagingSenderId: "926545930958",
  appId: "1:926545930958:web:fef79b8d3cfb32b8c07e9f",
  measurementId: "G-C45SXHDQWZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
