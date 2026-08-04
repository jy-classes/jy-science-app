import { getApps, getApp, initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

function cfg() {
  const value = window.JY_FIREBASE_AI_CONFIG;
  if (!value?.firebaseConfig) {
    throw new Error("firebase-ai-config.js의 Firebase 설정을 확인해 주세요.");
  }
  return value.firebaseConfig;
}

const app = getApps().length ? getApp() : initializeApp(cfg());
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

function iso(value) {
  if (!value) return "";
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  return String(value);
}

function plain(snapshot) {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    ...data,
    submittedAt: iso(data.submittedAt),
    updatedAt: iso(data.updatedAt),
    evaluatedAt: iso(data.evaluatedAt)
  };
}

async function studentSignIn() {
  if (auth.currentUser?.isAnonymous) return auth.currentUser;
  const result = await signInAnonymously(auth);
  return result.user;
}

async function teacherSignIn() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

async function logout() {
  await signOut(auth);
}

async function saveSubmission(submission) {
  const user = auth.currentUser;
  if (!user?.isAnonymous) throw new Error("학생 익명 로그인이 필요합니다.");
  const id = String(submission.studentUid);
  await setDoc(doc(db, "submissions", id), {
    ...submission,
    id,
    ownerUid: user.uid,
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });
  return id;
}

async function getPublishedFeedback(studentUid) {
  const snap = await getDoc(doc(db, "feedback", String(studentUid)));
  if (!snap.exists()) return null;
  const data = plain(snap);
  return data.publishedToStudent ? data : null;
}

function subscribeDashboard(callback, onError) {
  let submissions = [];
  let evaluations = new Map();
  const emit = () => callback(submissions.map(s => ({
    ...s,
    evaluation: evaluations.get(s.id) || null
  })));

  const unsub1 = onSnapshot(collection(db, "submissions"), snap => {
    submissions = snap.docs.map(plain);
    emit();
  }, onError);

  const unsub2 = onSnapshot(collection(db, "evaluations"), snap => {
    evaluations = new Map(snap.docs.map(d => [d.id, plain(d)]));
    emit();
  }, onError);

  return () => { unsub1(); unsub2(); };
}

async function saveAiEvaluation(submissionId, ownerUid, aiEvaluation) {
  await setDoc(doc(db, "evaluations", String(submissionId)), {
    ownerUid,
    aiEvaluation,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

async function saveTeacherEvaluation(submissionId, ownerUid, evaluation, publish) {
  const user = auth.currentUser;
  const evaluatorName = user?.displayName || user?.email || "교사";
  const finalEvaluation = {
    ...evaluation,
    ownerUid,
    evaluatorName,
    publishedToStudent: Boolean(publish),
    status: publish ? "final" : "draft",
    evaluatedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(doc(db, "evaluations", String(submissionId)), finalEvaluation, { merge: true });

  if (publish) {
    await setDoc(doc(db, "feedback", String(submissionId)), {
      ownerUid,
      feedback: evaluation.feedback || "",
      evaluatorName,
      publishedToStudent: true,
      evaluatedAt: serverTimestamp()
    }, { merge: true });
  }
}

window.firebaseDataReady = Promise.resolve({
  auth,
  db,
  studentSignIn,
  teacherSignIn,
  logout,
  onAuthStateChanged: (callback) => onAuthStateChanged(auth, callback),
  saveSubmission,
  getPublishedFeedback,
  subscribeDashboard,
  saveAiEvaluation,
  saveTeacherEvaluation
});
