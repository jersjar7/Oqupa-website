import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyBBdwf8ClZyPbW2BigyCk5impOReVYRVfY',
  authDomain: 'oqupa-production.firebaseapp.com',
  projectId: 'oqupa-production',
  storageBucket: 'oqupa-production.firebasestorage.app',
  messagingSenderId: '109922131848',
  appId: '1:109922131848:web:bb2f23f49a1f3d378fe43d',
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
export const storage = getStorage(app)
