// ================================================
// FIREBASE-SERVICE.JS
// Colecciones prefijadas porteros_
// SIN fallback local. Si falla, lanza error.
// ================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

import { firebaseConfig } from './firebase-config.js';
import { FIREBASE_COLLECTIONS, PORTEROS_ICONS } from './porteros-constants.js';

const C = FIREBASE_COLLECTIONS;

let _app     = null;
let _db      = null;
let _storage = null;

export function initFirebase() {
  if (!_app) {
    _app     = initializeApp(firebaseConfig);
    _db      = getFirestore(_app);
    _storage = getStorage(_app);
  }
  return true;
}

export function getDB() {
  if (!_db) throw new Error('Firebase no inicializado.');
  return _db;
}

export function getStorageInstance() {
  if (!_storage) throw new Error('Firebase Storage no inicializado.');
  return _storage;
}

// ── TEMPORADAS ────────────────────────────────────

export function listenSeasons(onData, onError) {
  const q = query(collection(getDB(), C.SEASONS), orderBy('startDate', 'desc'));
  return onSnapshot(q,
    snap => onData(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err  => onError(err),
  );
}

export async function createSeason(data) {
  const ref = doc(collection(getDB(), C.SEASONS));
  await setDoc(ref, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}

export async function setActiveSeason(id) {
  const { getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  const snap = await getDocs(collection(getDB(), C.SEASONS));
  await Promise.all(snap.docs.map(d =>
    updateDoc(doc(getDB(), C.SEASONS, d.id), { isActive: d.id === id })
  ));
}

// ── SEMANAS ───────────────────────────────────────

export async function upsertWeek(weekData) {
  const ref  = doc(getDB(), C.WEEKS, weekData.id);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, { ...weekData, updatedAt: serverTimestamp() });
  } else {
    await setDoc(ref, { ...weekData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  }
}

// ── MICROCICLO POR SEMANA Y EQUIPO ────────────────

export async function saveWeekMicro(seasonKey, teamKey, weekId, microNumber) {
  const id  = `${seasonKey.replace(/\//g, '-')}_${teamKey}_${weekId}`;
  const ref = doc(getDB(), 'porteros_week_micros', id);
  await setDoc(ref, {
    seasonKey,
    teamKey,
    weekId,
    microNumber,
    updatedAt: serverTimestamp(),
  });
}

export async function getWeekMicro(seasonKey, teamKey, weekId) {
  const id   = `${seasonKey.replace(/\//g, '-')}_${teamKey}_${weekId}`;
  const ref  = doc(getDB(), 'porteros_week_micros', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data().microNumber ?? null;
}

// ── PORTERO INDIVIDUAL ────────────────────────────
// Nombre editable del portero (guardado en config)

export async function savePorteroName(name) {
  await setDoc(doc(getDB(), C.CONFIG, 'portero_individual'), {
    name,
    updatedAt: serverTimestamp(),
  });
}

export async function getPorteroName() {
  const snap = await getDoc(doc(getDB(), C.CONFIG, 'portero_individual'));
  if (!snap.exists()) return '';
  return snap.data().name || '';
}

// Foto del portero — sube a Firebase Storage y guarda URL en Firestore

export async function uploadPorteroPhoto(file) {
  const path    = `porteros/portero_individual/foto.jpg`;
  const fileRef = storageRef(getStorageInstance(), path);
  await uploadBytes(fileRef, file);
  const url = await getDownloadURL(fileRef);
  await setDoc(doc(getDB(), C.CONFIG, 'portero_individual'), {
    photoURL: url,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return url;
}

export async function getPorteroPhoto() {
  const snap = await getDoc(doc(getDB(), C.CONFIG, 'portero_individual'));
  if (!snap.exists()) return null;
  return snap.data().photoURL || null;
}

// ── PLANES DE DÍA ─────────────────────────────────

export function listenWeekPlans(seasonKey, teamKey, weekId, onData, onError) {
  const q = query(
    collection(getDB(), C.DAY_PLANS),
    where('seasonKey', '==', seasonKey),
    where('teamKey',   '==', teamKey),
    where('weekId',    '==', weekId),
  );
  return onSnapshot(q,
    snap => onData(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err  => onError(err),
  );
}

export async function saveDayPlan(dayPlan) {
  if (dayPlan.id) {
    const { id, ...data } = dayPlan;
    await updateDoc(doc(getDB(), C.DAY_PLANS, id), { ...data, updatedAt: serverTimestamp() });
    return id;
  }
  const ref = await addDoc(collection(getDB(), C.DAY_PLANS), {
    ...dayPlan,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateDayPlan(id, patch) {
  await updateDoc(doc(getDB(), C.DAY_PLANS, id), { ...patch, updatedAt: serverTimestamp() });
}

export async function deleteDayPlan(id) {
  await deleteDoc(doc(getDB(), C.DAY_PLANS, id));
}

// ── CONFIGURACIÓN ─────────────────────────────────

export function listenConfig(onData, onError) {
  return onSnapshot(collection(getDB(), C.CONFIG),
    snap => {
      const cfg = {};
      snap.docs.forEach(d => { cfg[d.id] = d.data(); });
      onData(cfg);
    },
    err => onError(err),
  );
}

export async function saveConfigSection(sectionName, data) {
  await setDoc(doc(getDB(), C.CONFIG, sectionName), { ...data, updatedAt: serverTimestamp() });
}

export async function initConfigIfEmpty() {
  const iconsRef  = doc(getDB(), C.CONFIG, 'icons');
  const iconsSnap = await getDoc(iconsRef);
  if (!iconsSnap.exists()) {
    await setDoc(iconsRef, { ...PORTEROS_ICONS, updatedAt: serverTimestamp() });
  }
}

export async function deleteDocument(collectionName, id) {
  await deleteDoc(doc(getDB(), collectionName, id));
}

