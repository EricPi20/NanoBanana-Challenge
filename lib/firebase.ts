import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate Firebase configuration
const isFirebaseConfigured = () => {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.databaseURL
  );
};

// Initialize Firebase only if configured
let app: FirebaseApp | null = null;
let database: Database | null = null;
let storage: FirebaseStorage | null = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    database = getDatabase(app);
    storage = getStorage(app);
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
} else {
  if (typeof window !== 'undefined') {
    console.error(`
╔══════════════════════════════════════════════════════════════╗
║          FIREBASE CONFIGURATION REQUIRED                      ║
╠══════════════════════════════════════════════════════════════╣
║  Please create a .env.local file with your Firebase config: ║
║                                                              ║
║  NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key                   ║
║  NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id             ║
║  NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://...firebaseio.com ║
║  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket            ║
║  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain               ║
║  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id     ║
║  NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id                     ║
║                                                              ║
║  See README.md for detailed setup instructions!             ║
╚══════════════════════════════════════════════════════════════╝
    `);
  }
}

// Helper functions to get Firebase instances with null checks
export const getFirebaseDatabase = (): Database => {
  if (!database) {
    throw new Error('Firebase Database is not initialized. Please configure Firebase in .env.local');
  }
  return database;
};

export const getFirebaseStorage = (): FirebaseStorage => {
  if (!storage) {
    throw new Error('Firebase Storage is not initialized. Please configure Firebase in .env.local');
  }
  return storage;
};

export const getFirebaseApp = (): FirebaseApp => {
  if (!app) {
    throw new Error('Firebase App is not initialized. Please configure Firebase in .env.local');
  }
  return app;
};

// Export nullable versions for checking
export { app, database, storage };

