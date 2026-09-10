/**
 * Firebase Configuration — Running Shoes Store
 * Proyecto: running-shoes-store-26ced
 */

// Firebase initialization (compat SDK)
const firebaseConfig = {
  apiKey: "AIzaSyBlHjLUXrHMHhkUpxUY_MHGsl5jHNTXNu4",
  authDomain: "running-shoes-store-26ced.firebaseapp.com",
  projectId: "running-shoes-store-26ced",
  storageBucket: "running-shoes-store-26ced.firebasestorage.app",
  messagingSenderId: "624528222838",
  appId: "1:624528222838:web:85feabb0eefc5c2c218d57"
};

// Initialize Firebase app (only once)
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

window.RUNNING_SHOES_FIREBASE = {
  config: firebaseConfig,
  isConfigured: function () {
    return true;
  }
};
