import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, doc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyAwmu7lzZ_aB9JFHa2bf_a8QKN-jNiaWVw",
    authDomain: "d0wnthedrain.firebaseapp.com",
    projectId: "d0wnthedrain",
    storageBucket: "d0wnthedrain.firebasestorage.app",
    messagingSenderId: "446498397523",
    appId: "1:446498397523:web:760d63009139651f0fd5a6",
    measurementId: "G-BLTSFHLWG9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Helper functions for pathing based on app structure
const APP_ID = firebaseConfig.projectId || 'obscura-vtt';

export const getPublicCollection = (colName: string) => {
    return collection(db, 'artifacts', APP_ID, 'public', 'data', colName);
};

export const getPublicDoc = (colName: string, docId: string) => {
    return doc(db, 'artifacts', APP_ID, 'public', 'data', colName, docId);
};

export const getPrivateCollection = (uid: string, subPath: string) => {
    return collection(db, 'artifacts', APP_ID, 'users', uid, subPath);
};

export const getPrivateDoc = (uid: string, subPath: string, docId: string) => {
    return doc(db, 'artifacts', APP_ID, 'users', uid, subPath, docId);
};