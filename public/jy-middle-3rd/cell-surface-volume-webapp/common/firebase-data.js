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
  serverTimestamp,
  deleteDoc
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

async function claimStudent(student) {
  const user = await studentSignIn();
  const studentUid = String(student.uid || student.studentUid || "");
  if (!studentUid) throw new Error("학생 고유번호가 없습니다.");

  const studentRef = doc(db, "students", studentUid);
  const studentSnap = await getDoc(studentRef);

  if (!studentSnap.exists()) {
    throw new Error("등록된 학생 정보가 없습니다. 교사용 화면에 먼저 로그인해 학생 정보를 등록해 주세요.");
  }

  const registered = studentSnap.data();
  const birthDate = String(student.birthDate || "");

  if (
    String(registered.classLabel) !== String(student.classLabel) ||
    String(registered.studentNumber) !== String(student.studentNumber) ||
    String(registered.birthDate) !== birthDate
  ) {
    throw new Error("반, 번호, 생년월일이 등록 정보와 일치하지 않습니다.");
  }

  await setDoc(doc(db, "studentSessions", studentUid), {
    studentUid,
    ownerUid: user.uid,
    birthDate,
    classLabel: String(student.classLabel),
    studentNumber: String(student.studentNumber),
    claimedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });

  return user;
}

function normalizeStudent(student) {
  const schoolYear = String(student.schoolYear || "2026").trim();
  const grade = String(student.grade || "3").trim();
  const classLabel = String(student.classLabel || "").trim().replace(/반$/, "");
  const studentNumber = String(student.studentNumber || "").trim().replace(/번$/, "");
  const studentName = String(student.studentName || student.name || "").trim();
  const birthDate = String(student.birthDate || "").replace(/\D/g, "");

  if (!schoolYear || !grade || !classLabel || !studentNumber || !studentName) {
    throw new Error("학년도, 학년, 반, 번호, 이름을 모두 입력해 주세요.");
  }
  if (!/^\d{8}$/.test(birthDate)) {
    throw new Error("생년월일은 숫자 8자리로 입력해 주세요.");
  }

  const studentUid = String(
    student.studentUid ||
    `stu_${schoolYear}_${grade}_${classLabel}_${studentNumber}`
  ).trim();

  return {
    studentUid,
    schoolYear,
    grade,
    classLabel,
    studentNumber,
    studentName,
    birthDate,
    active: student.active !== false
  };
}

async function saveRegisteredStudent(student) {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error("교사 Google 로그인이 필요합니다.");

  const normalized = normalizeStudent(student);
  await setDoc(doc(db, "students", normalized.studentUid), {
    ...normalized,
    updatedAt: serverTimestamp()
  }, { merge: true });
  return normalized.studentUid;
}

async function ensureStudentRegistry(students) {
  for (const student of students) {
    await saveRegisteredStudent(student);
  }
}

async function deleteRegisteredStudent(studentUid) {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error("교사 Google 로그인이 필요합니다.");
  await deleteDoc(doc(db, "students", String(studentUid)));
}

function subscribeStudents(callback, onError) {
  return onSnapshot(collection(db, "students"), (snap) => {
    const students = snap.docs.map(plain).sort((a, b) =>
      String(a.schoolYear).localeCompare(String(b.schoolYear), "ko", { numeric: true }) ||
      String(a.grade).localeCompare(String(b.grade), "ko", { numeric: true }) ||
      String(a.classLabel).localeCompare(String(b.classLabel), "ko", { numeric: true }) ||
      String(a.studentNumber).localeCompare(String(b.studentNumber), "ko", { numeric: true })
    );
    callback(students);
  }, onError);
}

async function saveSubmission(submission) {
  const user = auth.currentUser;
  if (!user?.isAnonymous) throw new Error("학생 익명 로그인이 필요합니다.");

  const id = String(submission.studentUid);
  const sessionSnap = await getDoc(doc(db, "studentSessions", id));

  if (!sessionSnap.exists() || sessionSnap.data().ownerUid !== user.uid) {
    throw new Error("학생 인증 정보가 만료되었습니다. 다시 로그인해 주세요.");
  }

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
  claimStudent,
  ensureStudentRegistry,
  saveRegisteredStudent,
  deleteRegisteredStudent,
  subscribeStudents,
  teacherSignIn,
  logout,
  onAuthStateChanged: (callback) => onAuthStateChanged(auth, callback),
  saveSubmission,
  getPublishedFeedback,
  subscribeDashboard,
  saveAiEvaluation,
  saveTeacherEvaluation
});
