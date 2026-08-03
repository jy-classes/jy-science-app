
const DEMO_STUDENTS = [
  { classLabel: "1", studentNumber: "1", birthDate: "20120301", name: "김가은", uid: "stu_demo_001" },
  { classLabel: "1", studentNumber: "2", birthDate: "20120417", name: "박나연", uid: "stu_demo_002" }
];

const state = {
  student: null,
  size: 2,
  penetration: 0.5,
  records: [],
  currentStep: 1
};

const $ = (id) => document.getElementById(id);
const els = {
  loginView: $("loginView"), appView: $("appView"), loginMessage: $("loginMessage"),
  classInput: $("classInput"), numberInput: $("numberInput"), birthInput: $("birthInput"),
  loginBtn: $("loginBtn"), logoutBtn: $("logoutBtn"), studentLabel: $("studentLabel"),
  studentName: $("studentName"), prediction: $("prediction"), interpretation1: $("interpretation1"),
  interpretation2: $("interpretation2"), conclusion: $("conclusion"), limitation: $("limitation"),
  sizeValue: $("sizeValue"), penetrationValue: $("penetrationValue"), penetrationRange: $("penetrationRange"),
  cellCube: $("cellCube"), innerCube: $("innerCube"), cellSizeText: $("cellSizeText"),
  surfaceArea: $("surfaceArea"), volume: $("volume"), ratio: $("ratio"),
  penetratedPercent: $("penetratedPercent"), recordList: $("recordList"),
  summaryCards: $("summaryCards"), submitMessage: $("submitMessage"),
  feedbackSection: $("feedbackSection"),
  feedbackEvaluator: $("feedbackEvaluator"), feedbackDate: $("feedbackDate"),
  feedbackText: $("feedbackText")
};

function normalizeText(value) {
  return String(value ?? "").trim().replace(/반$|번$/g, "").replace(/^0+(?=\d)/, "");
}

function validBirthDate(value) {
  if (!/^\d{8}$/.test(value)) return false;
  const y = Number(value.slice(0, 4));
  const m = Number(value.slice(4, 6));
  const d = Number(value.slice(6, 8));
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

function storageKey() {
  return state.student ? `cellApp_${state.student.uid}` : "cellApp_guest";
}

function saveDraft() {
  if (!state.student) return;
  const payload = {
    student: state.student,
    size: state.size,
    penetration: state.penetration,
    records: state.records,
    prediction: els.prediction.value,
    interpretation1: els.interpretation1.value,
    interpretation2: els.interpretation2.value,
    conclusion: els.conclusion.value,
    limitation: els.limitation.value,
    savedAt: new Date().toISOString()
  };
  localStorage.setItem(storageKey(), JSON.stringify(payload));
}

function loadDraft() {
  const raw = localStorage.getItem(storageKey());
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    state.size = data.size ?? 2;
    state.penetration = data.penetration ?? 0.5;
    state.records = Array.isArray(data.records) ? data.records : [];
    els.prediction.value = data.prediction ?? "";
    els.interpretation1.value = data.interpretation1 ?? "";
    els.interpretation2.value = data.interpretation2 ?? "";
    els.conclusion.value = data.conclusion ?? "";
    els.limitation.value = data.limitation ?? "";
  } catch (error) {
    console.warn("Draft load failed", error);
  }
}

function calculate() {
  const s = state.size;
  const p = Math.min(state.penetration, s / 2);
  const surface = 6 * s * s;
  const volume = s * s * s;
  const innerSide = Math.max(s - 2 * p, 0);
  const innerVolume = innerSide ** 3;
  const penetrated = volume === 0 ? 0 : ((volume - innerVolume) / volume) * 100;
  return { surface, volume, ratio: surface / volume, penetrated, innerSide };
}

function renderSimulation() {
  const result = calculate();
  els.sizeValue.textContent = state.size.toFixed(1).replace(".0", "");
  els.penetrationValue.textContent = state.penetration.toFixed(1);
  els.cellSizeText.textContent = `${els.sizeValue.textContent} cm`;
  els.surfaceArea.textContent = result.surface.toFixed(1).replace(".0", "");
  els.volume.textContent = result.volume.toFixed(1).replace(".0", "");
  els.ratio.textContent = result.ratio.toFixed(2);
  els.penetratedPercent.textContent = result.penetrated.toFixed(1);

  const cubeWidth = Math.max(105, Math.min(205, 95 + state.size * 30));
  els.cellCube.style.width = `${cubeWidth}px`;
  const innerPercent = state.size > 0 ? Math.max(0, (result.innerSide / state.size) * 100) : 0;
  els.innerCube.style.width = `${innerPercent}%`;

  const maxPen = Math.max(0.1, Math.min(1.5, state.size / 2));
  els.penetrationRange.max = maxPen.toFixed(1);
  if (state.penetration > maxPen) {
    state.penetration = maxPen;
    els.penetrationRange.value = state.penetration;
  }
}

function renderRecords() {
  if (!state.records.length) {
    els.recordList.innerHTML = '<p class="empty">아직 기록된 실험이 없습니다.</p>';
    els.summaryCards.innerHTML = '<p class="empty">실험 결과를 1개 이상 기록하세요.</p>';
    return;
  }

  const latest = state.records.slice(-3).reverse();
  els.recordList.innerHTML = latest.map((r) => `
    <article class="record-card">
      <div><span>크기</span><strong>${r.size} cm</strong></div>
      <div><span>표면적/부피</span><strong>${r.ratio}</strong></div>
      <div><span>침투 깊이</span><strong>${r.penetration} cm</strong></div>
      <div><span>침투 비율</span><strong>${r.percent}%</strong></div>
    </article>
  `).join("");

  els.summaryCards.innerHTML = state.records.slice(-5).map((r) => `
    <article class="summary-card">
      <strong>${r.size} cm</strong>
      <div>
        <div class="bar"><span style="width:${Math.min(100, r.percent)}%"></span></div>
        <small>표면적/부피 ${r.ratio} · 침투 ${r.percent}%</small>
      </div>
    </article>
  `).join("");
}


function renderTeacherFeedback() {
  if (!state.student) return;
  const submissions = JSON.parse(localStorage.getItem("cellAppSubmissions") || "[]");
  const evaluations = JSON.parse(localStorage.getItem("cellAppEvaluations") || "{}");
  const latest = submissions
    .filter((s) => s.studentUid === state.student.uid)
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0];

  if (!latest) {
    els.feedbackSection.classList.add("hidden");
    return;
  }

  const ev = evaluations[latest.id];
  if (!ev || !ev.publishedToStudent || state.currentStep !== 1) {
    els.feedbackSection.classList.add("hidden");
    return;
  }

  els.feedbackSection.classList.remove("hidden");
  els.feedbackEvaluator.textContent = `평가 교사: ${ev.evaluatorName || "교사"}`;
  els.feedbackDate.textContent = `평가일: ${new Date(ev.evaluatedAt).toLocaleString("ko-KR")}`;
  els.feedbackText.textContent = ev.feedback || "등록된 피드백이 없습니다.";
}

function goToStep(step) {
  state.currentStep = step;
  document.querySelectorAll(".step-panel").forEach((panel) => {
    panel.classList.toggle("hidden", Number(panel.dataset.panel) !== step);
  });
  document.querySelectorAll(".step").forEach((btn) => {
    btn.classList.toggle("active", Number(btn.dataset.step) === step);
  });
  if (step === 3) renderRecords();
  renderTeacherFeedback();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function login() {
  const classLabel = normalizeText(els.classInput.value);
  const studentNumber = normalizeText(els.numberInput.value);
  const birthDate = els.birthInput.value.trim();

  if (!classLabel || !studentNumber || !validBirthDate(birthDate)) {
    els.loginMessage.textContent = "반, 번호, 생년월일 8자리를 다시 확인해 주세요.";
    return;
  }

  const student = DEMO_STUDENTS.find((s) =>
    s.classLabel === classLabel &&
    s.studentNumber === studentNumber &&
    s.birthDate === birthDate
  );

  if (!student) {
    els.loginMessage.textContent = "입력한 학생 정보를 확인할 수 없습니다.";
    return;
  }

  state.student = student;
  sessionStorage.setItem("cellAppSession", student.uid);
  els.loginView.classList.add("hidden");
  els.appView.classList.remove("hidden");
  els.logoutBtn.classList.remove("hidden");
  els.studentLabel.textContent = `3학년 ${student.classLabel}반 ${student.studentNumber}번`;
  els.studentName.textContent = student.name;
  loadDraft();
  renderSimulation();
  renderRecords();
  renderTeacherFeedback();
  goToStep(1);
}

function logout() {
  sessionStorage.removeItem("cellAppSession");
  state.student = null;
  location.reload();
}

function restoreSession() {
  const uid = sessionStorage.getItem("cellAppSession");
  const student = DEMO_STUDENTS.find((s) => s.uid === uid);
  if (!student) return;
  state.student = student;
  els.loginView.classList.add("hidden");
  els.appView.classList.remove("hidden");
  els.logoutBtn.classList.remove("hidden");
  els.studentLabel.textContent = `3학년 ${student.classLabel}반 ${student.studentNumber}번`;
  els.studentName.textContent = student.name;
  loadDraft();
  renderSimulation();
  renderRecords();
  renderTeacherFeedback();
}

els.loginBtn.addEventListener("click", login);
els.birthInput.addEventListener("keydown", (e) => { if (e.key === "Enter") login(); });
els.logoutBtn.addEventListener("click", logout);

$("minusBtn").addEventListener("click", () => {
  state.size = Math.max(0.5, Number((state.size - 0.5).toFixed(1)));
  renderSimulation(); saveDraft();
});
$("plusBtn").addEventListener("click", () => {
  state.size = Math.min(6, Number((state.size + 0.5).toFixed(1)));
  renderSimulation(); saveDraft();
});
els.penetrationRange.addEventListener("input", (e) => {
  state.penetration = Number(e.target.value);
  renderSimulation(); saveDraft();
});

$("runBtn").addEventListener("click", () => {
  const result = calculate();
  state.records.push({
    size: state.size.toFixed(1).replace(".0", ""),
    penetration: state.penetration.toFixed(1),
    ratio: result.ratio.toFixed(2),
    percent: result.penetrated.toFixed(1),
    createdAt: new Date().toISOString()
  });
  if (state.records.length > 10) state.records = state.records.slice(-10);
  renderRecords();
  saveDraft();
});

$("clearRecordsBtn").addEventListener("click", () => {
  if (!confirm("실험 기록을 모두 초기화할까요?")) return;
  state.records = [];
  renderRecords();
  saveDraft();
});

document.querySelectorAll(".next-btn").forEach((btn) => btn.addEventListener("click", () => {
  if (Number(btn.dataset.next) === 3 && state.records.length === 0) {
    alert("실험 결과를 1개 이상 기록해 주세요.");
    return;
  }
  goToStep(Number(btn.dataset.next));
}));
document.querySelectorAll(".prev-btn").forEach((btn) => btn.addEventListener("click", () => goToStep(Number(btn.dataset.prev))));
document.querySelectorAll(".step").forEach((btn) => btn.addEventListener("click", () => goToStep(Number(btn.dataset.step))));

[els.prediction, els.interpretation1, els.interpretation2, els.conclusion, els.limitation]
  .forEach((el) => el.addEventListener("input", saveDraft));

$("submitBtn").addEventListener("click", () => {
  const requiredText = [
    els.prediction.value.trim(),
    els.interpretation1.value.trim(),
    els.interpretation2.value.trim(),
    els.conclusion.value.trim(),
    els.limitation.value.trim()
  ];
  const checks = [$("check1").checked, $("check2").checked, $("check3").checked];

  if (requiredText.some((v) => !v) || state.records.length === 0 || checks.some((v) => !v)) {
    els.submitMessage.textContent = "빈 항목과 자기 점검 항목을 모두 확인해 주세요.";
    return;
  }

  const submissions = JSON.parse(localStorage.getItem("cellAppSubmissions") || "[]");
  submissions.push({
    id: `sub_${Date.now()}`,
    studentUid: state.student.uid,
    schoolYear: "2026",
    grade: "3",
    classLabel: state.student.classLabel,
    studentNumber: state.student.studentNumber,
    studentName: state.student.name,
    activityId: "cell-surface-volume",
    records: state.records,
    prediction: els.prediction.value.trim(),
    interpretation1: els.interpretation1.value.trim(),
    interpretation2: els.interpretation2.value.trim(),
    conclusion: els.conclusion.value.trim(),
    limitation: els.limitation.value.trim(),
    status: "submitted",
    submittedAt: new Date().toISOString()
  });
  localStorage.setItem("cellAppSubmissions", JSON.stringify(submissions));
  els.submitMessage.style.color = "#16845b";
  els.submitMessage.textContent = "제출이 완료되었습니다. 체험판에서는 이 브라우저에 저장됩니다.";
});

renderSimulation();
restoreSession();
