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
  deleteDoc,
  query,
  where
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

async function getRegisteredStudent(studentUid) {
  await studentSignIn();
  const snap = await getDoc(doc(db, "students", String(studentUid)));
  if (!snap.exists()) return null;

  const student = plain(snap);
  return {
    uid: student.studentUid || snap.id,
    studentUid: student.studentUid || snap.id,
    schoolYear: String(student.schoolYear || "2026"),
    grade: String(student.grade || "3"),
    classLabel: String(student.classLabel || ""),
    studentNumber: String(student.studentNumber || ""),
    name: String(student.studentName || ""),
    studentName: String(student.studentName || ""),
    birthDate: String(student.birthDate || "")
  };
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
    classKey: String(registered.classKey || `${registered.schoolYear}-${registered.grade}-${registered.classLabel}`),
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

  const classKey = `${schoolYear}-${grade}-${classLabel}`;

  return {
    studentUid,
    schoolYear,
    grade,
    classLabel,
    classKey,
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

function subscribeStudents(callback, onError, managedClasses = null) {
  const classKeys = Array.isArray(managedClasses)
    ? managedClasses.filter(Boolean)
    : null;

  if (!classKeys) {
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

  if (!classKeys.length) {
    callback([]);
    return () => {};
  }

  const byClass = new Map();
  const emit = () => {
    const merged = Array.from(byClass.values()).flat().sort((a, b) =>
      String(a.schoolYear).localeCompare(String(b.schoolYear), "ko", { numeric: true }) ||
      String(a.grade).localeCompare(String(b.grade), "ko", { numeric: true }) ||
      String(a.classLabel).localeCompare(String(b.classLabel), "ko", { numeric: true }) ||
      String(a.studentNumber).localeCompare(String(b.studentNumber), "ko", { numeric: true })
    );
    callback(merged);
  };

  const unsubs = classKeys.map((classKey) =>
    onSnapshot(
      query(collection(db, "students"), where("classKey", "==", classKey)),
      (snap) => {
        byClass.set(classKey, snap.docs.map(plain));
        emit();
      },
      onError
    )
  );

  return () => unsubs.forEach((unsub) => unsub());
}

function teacherEmail(user = auth.currentUser) {
  return String(user?.email || "").trim().toLowerCase();
}

async function verifyAdmin(user = auth.currentUser) {
  const email = teacherEmail(user);
  if (!email || user?.isAnonymous) return null;
  const snap = await getDoc(doc(db, "admins", email));
  if (!snap.exists() || snap.data().active === false) return null;
  return { id: snap.id, ...snap.data(), email };
}

async function verifyAuthorizedTeacher(user = auth.currentUser) {
  const email = teacherEmail(user);
  if (!email || user?.isAnonymous) return null;

  const snap = await getDoc(doc(db, "authorizedTeachers", email));
  if (!snap.exists()) return null;

  const profile = plain(snap);
  if (profile.active === false) return null;

  return {
    ...profile,
    email,
    name: String(profile.name || user.displayName || email),
    managedClasses: Array.isArray(profile.managedClasses)
      ? profile.managedClasses.map(String)
      : []
  };
}

async function saveAuthorizedTeacher(teacher) {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error("관리자 로그인이 필요합니다.");

  const email = String(teacher.email || "").trim().toLowerCase();
  const name = String(teacher.name || "").trim();
  const managedClasses = Array.isArray(teacher.managedClasses)
    ? [...new Set(teacher.managedClasses.map(String).filter(Boolean))]
    : [];

  if (!email || !email.includes("@")) throw new Error("올바른 이메일을 입력해 주세요.");
  if (!name) throw new Error("교사 이름을 입력해 주세요.");

  await setDoc(doc(db, "authorizedTeachers", email), {
    email,
    name,
    managedClasses,
    active: teacher.active !== false,
    updatedAt: serverTimestamp(),
    updatedBy: teacherEmail(user)
  }, { merge: true });

  return email;
}

async function deleteAuthorizedTeacher(email) {
  const normalized = String(email || "").trim().toLowerCase();
  await deleteDoc(doc(db, "authorizedTeachers", normalized));
}

function subscribeAuthorizedTeachers(callback, onError) {
  return onSnapshot(collection(db, "authorizedTeachers"), (snap) => {
    const teachers = snap.docs
      .map(plain)
      .sort((a, b) => String(a.name || a.email).localeCompare(String(b.name || b.email), "ko"));
    callback(teachers);
  }, onError);
}


async function getTeacherManagedClasses(email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return [];

  const snap = await getDoc(doc(db, "authorizedTeachers", normalized));
  if (!snap.exists()) return [];

  const value = snap.data();
  return Array.isArray(value.managedClasses)
    ? value.managedClasses.map(String).filter(Boolean)
    : [];
}

async function listAvailableClasses() {
  const snap = await new Promise((resolve, reject) => {
    const unsubscribe = onSnapshot(collection(db, "students"), (value) => {
      unsubscribe();
      resolve(value);
    }, reject);
  });

  const classes = new Map();
  snap.docs.map(plain).forEach((student) => {
    const classKey = String(
      student.classKey ||
      `${student.schoolYear}-${student.grade}-${student.classLabel}`
    );
    classes.set(classKey, {
      classKey,
      schoolYear: String(student.schoolYear),
      grade: String(student.grade),
      classLabel: String(student.classLabel)
    });
  });

  return Array.from(classes.values()).sort((a, b) =>
    a.classKey.localeCompare(b.classKey, "ko", { numeric: true })
  );
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
    classKey: String(submission.classKey || `${submission.schoolYear || "2026"}-${submission.grade || "3"}-${submission.classLabel}`),
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

function subscribeDashboard(callback, onError, managedClasses = []) {
  const classKeys = Array.isArray(managedClasses)
    ? managedClasses.filter(Boolean)
    : [];

  if (!classKeys.length) {
    callback([]);
    return () => {};
  }

  const submissionsByClass = new Map();
  const evaluations = new Map();

  const emit = () => {
    const submissions = Array.from(submissionsByClass.values()).flat();
    callback(submissions.map((submission) => ({
      ...submission,
      evaluation: evaluations.get(submission.id) || null
    })));
  };

  const unsubs = [];

  classKeys.forEach((classKey) => {
    unsubs.push(
      onSnapshot(
        query(collection(db, "submissions"), where("classKey", "==", classKey)),
        (snap) => {
          submissionsByClass.set(classKey, snap.docs.map(plain));
          emit();
        },
        onError
      )
    );
  });

  unsubs.push(
    onSnapshot(collection(db, "evaluations"), (snap) => {
      evaluations = new Map(
        snap.docs
          .map((d) => [d.id, plain(d)])
          .filter(([, evaluation]) => classKeys.includes(evaluation.classKey))
      );
      emit();
    }, onError)
  );

  return () => unsubs.forEach((unsub) => unsub());
}

async function saveAiEvaluation(submissionId, ownerUid, classKey, aiEvaluation) {
  await setDoc(doc(db, "evaluations", String(submissionId)), {
    ownerUid,
    classKey,
    aiEvaluation,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

async function saveTeacherEvaluation(submissionId, ownerUid, classKey, evaluation, publish) {
  const user = auth.currentUser;
  const evaluatorName = user?.displayName || user?.email || "교사";
  const finalEvaluation = {
    ...evaluation,
    ownerUid,
    classKey,
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
      classKey,
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
  getRegisteredStudent,
  claimStudent,
  ensureStudentRegistry,
  saveRegisteredStudent,
  deleteRegisteredStudent,
  subscribeStudents,
  teacherSignIn,
  verifyAdmin,
  verifyAuthorizedTeacher,
  saveAuthorizedTeacher,
  deleteAuthorizedTeacher,
  subscribeAuthorizedTeachers,
  getTeacherManagedClasses,
  listAvailableClasses,
  logout,
  onAuthStateChanged: (callback) => onAuthStateChanged(auth, callback),
  saveSubmission,
  getPublishedFeedback,
  subscribeDashboard,
  saveAiEvaluation,
  saveTeacherEvaluation});
