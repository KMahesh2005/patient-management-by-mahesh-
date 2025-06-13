import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";  

const firebaseConfig = {
  apiKey: "AIzaSyCCQQqwk6IjsHv1YquKGTiuFZJ6huSEUG4",
  authDomain: "clinic-6a600.firebaseapp.com",
  projectId: "clinic-6a600",
  storageBucket: "clinic-6a600.appspot.com", 
  messagingSenderId: "243593614291",
  appId: "1:243593614291:web:3b6d92bd3428d49b4a9526"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);  
