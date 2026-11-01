
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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