// Firebase configuration - Orlando AI
const firebaseConfig = {
  apiKey: "AIzaSyBtnzA8Uf5iomh_r9LRuymIVs6zE7_DCqg",
  authDomain: "profefacil-9318a.firebaseapp.com",
  projectId: "profefacil-9318a",
  storageBucket: "profefacil-9318a.firebasestorage.app",
  messagingSenderId: "830708638867",
  appId: "1:830708638867:web:9367c43be799372e185966",
  measurementId: "G-19V3G8BTJQ"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Collections helpers
const schoolsCol = () => db.collection('schools');
const schoolMessages = (schoolId) => db.collection('schools').doc(schoolId).collection('messages');
const schoolStudents = (schoolId) => db.collection('schools').doc(schoolId).collection('students');
const schoolMeta = (schoolId) => db.collection('schools').doc(schoolId);
