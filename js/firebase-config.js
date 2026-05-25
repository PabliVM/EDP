export const firebaseConfig = {
  apiKey:            'AIzaSyDveE5_vWYc6bp6C_hP_ESKt_pXPluPaRE',
  authDomain:        'coord-edp.firebaseapp.com',
  projectId:         'coord-edp',
  storageBucket:     'coord-edp.firebasestorage.app',
  messagingSenderId: '433758579534',
  appId:             '1:433758579534:web:08e748ef0a50dbca1f4c1f',
};

export function isFirebaseUnconfigured() {
  return firebaseConfig.apiKey === 'TU_API_KEY';
}
