// Import the functions you need from the SDKs you need using valid CDN URLs
import { initializeApp } from "https://esm.run/firebase@10.8.0/app";
import { getAnalytics } from "https://esm.run/firebase@10.8.0/analytics";
import { getAuth } from "https://esm.run/firebase@10.8.0/auth";
import { getFirestore } from "https://esm.run/firebase@10.8.0/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCgcE0GZ6GwX7ZkYEWzj7YvE5EK2nlJFHc",
  authDomain: "sistem-peralatan-sukan.firebaseapp.com",
  projectId: "sistem-peralatan-sukan",
  storageBucket: "sistem-peralatan-sukan.firebasestorage.app",
  messagingSenderId: "711842731701",
  appId: "1:711842731701:web:b7f1ff7e193cc00717d0fc",
  measurementId: "G-32TECVF89C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export { app };
