let submissions = [];
let selectedKey = null;

const $ = (id) => document.getElementById(id);

// 체험용 전체 명단: 실제 운영에서는 Firestore의 암호화 학생 명단을 서버에서 복호화해 사용합니다.
const DEMO_ROSTER = Array.from({ length: 6 }, (_, classIndex) =>
  Array.from({ length: 27 }, (_, numberIndex) => {
    const classLabel = String(classIndex + 1);
    const studentNumber = String(numberIndex + 1);
    let studentName = `학생${String(numberIndex + 1).padStart(2, "0")}`;
    if (classLabel === "1" && studentNumber === "1") studentName = "김가은";
    if (classLabel === "1" && studentNumber === "2") studentName = "박나연";
    return {
      schoolYear: "2026",
      grade: "3",
      classLabel,
      studentNumber,
      studentName,
      studentUid: `stu_demo_${classLabel}_${studentNumber}`
    };
  })
).flat();

function loadSubmissions() {
  // Firestore 실시간 구독에서 submissions 배열을 갱신합니다.
}

function studentKey(item) {
  return `${item.schoolYear}|${item.classLabel}|${item.studentNumber}`;
}

function allStudentRows() {
  const map = new Map(DEMO_ROSTER.map((student) => [studentKey(student), { ...student, submission: null }]));
  submissions.forEach((submission) => {
    const key = studentKey(submission);
    const current = map.get(key) || {
      schoolYear: String(submission.schoolYear),
      grade: String(submission.grade || "3"),
      classLabel: String(submission.classLabel),
      studentNumber: String(submission.studentNumber),
      studentName: submission.studentName || "이름 미등록",
      studentUid: submission.studentUid || "",
      submission: null
    };
    if (!current.submission || new Date(submission.submittedAt) > new Date(current.submission.submittedAt)) {
      current.submission = submission;
    }
    if (submission.studentName) current.studentName = submission.studentName;
    map.set(key, current);
  });
  return Array.from(map.values());
}

function filteredStudents() {
  const year = $("yearFilter").value.trim();
  const cls = $("classFilter").value.trim().replace(/반$/, "");
  const status = $("statusFilter").value;
  return allStudentRows().filter((student) => {
    const submission = student.submission;
    const currentStatus = !submission ? "unsubmitted" : (submission.evaluation?.status === "final" ? "evaluated" : "submitted");
    return (!year || String(student.schoolYear) === year) &&
      (!cls || String(student.classLabel) === cls) &&
      (!status || status === currentStatus);
  }).sort((a, b) =>
    String(a.classLabel).localeCompare(String(b.classLabel), "ko", { numeric: true }) ||
    String(a.studentNumber).localeCompare(String(b.studentNumber), "ko", { numeric: true })
  );
}

function renderSummary() {
  const list = filteredStudents();
  $("totalCount").textContent = list.length;
  $("pendingCount").textContent = list.filter((s) => s.submission && s.submission.evaluation?.status !== "final").length;
  $("evaluatedCount").textContent = list.filter((s) => s.submission?.evaluation?.status === "final").length;
  $("listCount").textContent = `${list.length}명`;
}

function renderList() {
  const list = filteredStudents();
  if (!list.length) {
    $("studentList").innerHTML = '<p class="empty">조건에 맞는 학생이 없습니다.</p>';
    $("detailPanel").innerHTML = '<div class="empty-detail"><h2>학생 자료 없음</h2><p>조회 조건을 확인해 주세요.</p></div>';
    return;
  }

  $("studentList").innerHTML = list.map((student) => {
    const submission = student.submission;
    const statusText = !submission ? "미제출" : (submission.evaluation?.status === "final" ? "평가 완료" : "제출 완료");
    const statusClass = !submission ? "not-submitted" : (submission.evaluation?.status === "final" ? "done" : "");
    return `
      <button class="student-card ${selectedKey === studentKey(student) ? "active" : ""}" data-key="${studentKey(student)}" type="button">
        <div class="row">
          <strong>${esc(student.studentNumber)}번 ${esc(student.studentName)}</strong>
          <span class="badge ${statusClass}">${statusText}</span>
        </div>
        <div class="status-line">
          <small>${esc(student.classLabel)}반</small>
          <small>${submission ? new Date(submission.submittedAt).toLocaleString("ko-KR") : "제출 기록 없음"}</small>
        </div>
      </button>`;
  }).join("");

  document.querySelectorAll(".student-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedKey = btn.dataset.key;
      renderList();
      renderDetail();
    });
  });
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function selectedStudent() {
  return allStudentRows().find((student) => studentKey(student) === selectedKey) || null;
}

function renderDetail() {
  const student = selectedStudent();
  if (!student) return;
  const s = student.submission;
  if (!s) {
    $("detailPanel").innerHTML = `
      <div class="student-header">
        <div><h2>${esc(student.classLabel)}반 ${esc(student.studentNumber)}번 ${esc(student.studentName)}</h2><p>${esc(student.schoolYear)}학년도</p></div>
        <span class="badge not-submitted">미제출</span>
      </div>
      <div class="empty-detail"><h2>아직 제출하지 않았습니다</h2><p>학생이 탐구 결과를 제출하면 이 화면에서 평가할 수 있습니다.</p></div>`;
    return;
  }
  const ev = s.evaluation || {};
  $("detailPanel").innerHTML = `
    <div class="student-header">
      <div><h2>${esc(s.classLabel)}반 ${esc(s.studentNumber)}번 ${esc(student.studentName)}</h2><p>${esc(s.schoolYear)}학년도 · 제출 ${new Date(s.submittedAt).toLocaleString("ko-KR")}</p></div>
      <span class="badge ${s.evaluation?.status === "final" ? "done" : ""}">${s.evaluation?.status === "final" ? "평가 완료" : "평가 대기"}</span>
    </div>
    <section class="block experiment-block">
      <div class="block-title-row">
        <div>
          <h3>실험 결과</h3>
          <p class="block-help">학생이 기록한 세포 크기별 결과입니다.</p>
        </div>
        <span class="result-count">${(s.records || []).length}회 기록</span>
      </div>

      <div class="desktop-result-grid">
        ${(s.records || []).map((r, index) => `
          <article class="experiment-card">
            <div class="experiment-number">${index + 1}차 실험</div>
            <strong class="experiment-size">${esc(r.size)} cm</strong>
            <div class="experiment-values">
              <div><span>표면적/부피</span><b>${esc(r.ratio)}</b></div>
              <div><span>침투 깊이</span><b>${esc(r.penetration)} cm</b></div>
              <div><span>침투 비율</span><b>${esc(r.percent)}%</b></div>
            </div>
          </article>
        `).join("")}
      </div>

      <table class="record-table compact-result-table">
        <thead>
          <tr>
            <th>실험</th>
            <th>세포 크기</th>
            <th>표면적/부피</th>
            <th>침투 깊이</th>
            <th>침투 비율</th>
          </tr>
        </thead>
        <tbody>
          ${(s.records || []).map((r, index) => `
            <tr>
              <td>${index + 1}차</td>
              <td>${esc(r.size)} cm</td>
              <td>${esc(r.ratio)}</td>
              <td>${esc(r.penetration)} cm</td>
              <td>${esc(r.percent)}%</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </section>

    <div class="evaluation-layout">
      <section class="student-response-column">
        <section class="block response-block"><h3>예상</h3><p>${esc(s.prediction)}</p></section>
        <section class="block response-block"><h3>자료 해석 1</h3><p>${esc(s.interpretation1)}</p></section>
        <section class="block response-block"><h3>자료 해석 2</h3><p>${esc(s.interpretation2)}</p></section>
        <section class="block response-block"><h3>최종 결론</h3><p>${esc(s.conclusion)}</p></section>
        <section class="block response-block"><h3>모형의 한계</h3><p>${esc(s.limitation)}</p></section>
      </section>

      <aside class="teacher-evaluation-column">
        <section class="block evaluation-block">
          <div class="dual-evaluation-grid">
            <section class="evaluation-stage ai-stage">
              <div class="evaluation-heading">
                <div>
                  <span class="stage-label">1차</span>
                  <h3>Gemini AI 평가 및 피드백</h3>
                  <p>AI가 루브릭별 점수와 피드백 초안을 제안합니다. 학생에게는 공개되지 않습니다.</p>
                </div>
                <strong id="aiTotal" class="live-total ai-total">${ev.aiEvaluation?.total ?? 0}점</strong>
              </div>

              <div class="ai-evaluation-panel">
                <div class="rubric ai-rubric">
                  <div class="rubric-row readonly"><span>탐구 수행 <small>20점</small></span><output id="aiScore1">${ev.aiEvaluation?.score1 ?? "-"}</output></div>
                  <div class="rubric-row readonly"><span>자료 처리 <small>20점</small></span><output id="aiScore2">${ev.aiEvaluation?.score2 ?? "-"}</output></div>
                  <div class="rubric-row readonly"><span>자료 해석 <small>25점</small></span><output id="aiScore3">${ev.aiEvaluation?.score3 ?? "-"}</output></div>
                  <div class="rubric-row readonly"><span>과학적 추론 <small>30점</small></span><output id="aiScore4">${ev.aiEvaluation?.score4 ?? "-"}</output></div>
                  <div class="rubric-row readonly"><span>학습 태도 <small>5점</small></span><output id="aiScore5">${ev.aiEvaluation?.score5 ?? "-"}</output></div>
                </div>

                <label class="feedback-label">
                  <span>Gemini 피드백 초안</span>
                  <textarea id="aiFeedback" rows="10" readonly placeholder="AI 1차 평가를 실행하면 결과가 표시됩니다.">${esc(ev.aiEvaluation?.feedback ?? "")}</textarea>
                </label>

                <div class="ai-actions">
                  <button id="runAiEvaluationBtn" class="primary" type="button">AI 1차 평가 실행</button>
                  <button id="applyAiEvaluationBtn" class="ghost" type="button" ${ev.aiEvaluation ? "" : "disabled"}>교사 평가로 가져오기</button>
                </div>
              </div>
            </section>

            <section class="evaluation-stage teacher-stage">
              <div class="evaluation-heading">
                <div>
                  <span class="stage-label teacher">2차</span>
                  <h3>교사 평가 및 피드백</h3>
                  <p>AI 결과와 학생 답변을 검토한 뒤 교사가 최종 점수와 피드백을 확정합니다.</p>
                </div>
                <strong id="liveTotal" class="live-total">${ev.total ?? 0}점</strong>
              </div>

              <div class="teacher-evaluation-panel">
                <div class="rubric">
                  <label class="rubric-row"><span>탐구 수행 <small>20점</small></span><input id="score1" type="number" min="0" max="20" value="${ev.score1 ?? ""}" /></label>
                  <label class="rubric-row"><span>자료 처리 <small>20점</small></span><input id="score2" type="number" min="0" max="20" value="${ev.score2 ?? ""}" /></label>
                  <label class="rubric-row"><span>자료 해석 <small>25점</small></span><input id="score3" type="number" min="0" max="25" value="${ev.score3 ?? ""}" /></label>
                  <label class="rubric-row"><span>과학적 추론 <small>30점</small></span><input id="score4" type="number" min="0" max="30" value="${ev.score4 ?? ""}" /></label>
                  <label class="rubric-row"><span>학습 태도 <small>5점</small></span><input id="score5" type="number" min="0" max="5" value="${ev.score5 ?? ""}" /></label>
                </div>

                <label class="feedback-label">
                  <span>교사가 확정한 피드백</span>
                  <textarea id="teacherFeedback" rows="10" placeholder="학생에게 전달할 최종 피드백을 작성하세요.">${esc(ev.feedback ?? "")}</textarea>
                </label>

                <div class="feedback-actions">
                  <button id="saveDraftBtn" class="ghost" type="button">임시 저장</button>
                  <button id="saveEvalBtn" class="primary" type="button">최종 저장·피드백 공개</button>
                </div>
              </div>
            </section>
          </div>
          <p id="evalMessage" class="message evaluation-message"></p>
        </section>
      </aside>
    </div>`;
  $("runAiEvaluationBtn").addEventListener("click", runAiEvaluation);
  $("applyAiEvaluationBtn").addEventListener("click", applyAiEvaluation);
  $("saveDraftBtn").addEventListener("click", () => saveEvaluation(false));
  $("saveEvalBtn").addEventListener("click", () => saveEvaluation(true));
  ["score1","score2","score3","score4","score5"].forEach((id) => {
    $(id).addEventListener("input", updateLiveTotal);
  });
  updateLiveTotal();
}

function updateLiveTotal() {
  const total = ["score1","score2","score3","score4","score5"]
    .map((id) => Number($(id)?.value || 0))
    .reduce((sum, value) => sum + value, 0);
  if ($("liveTotal")) $("liveTotal").textContent = `${total}점`;
}


function clampScore(value, max) {
  return Math.max(0, Math.min(max, Math.round(value)));
}

function buildAiEvaluation(submission) {
  const records = submission.records || [];
  const prediction = (submission.prediction || "").trim();
  const interpretation1 = (submission.interpretation1 || "").trim();
  const interpretation2 = (submission.interpretation2 || "").trim();
  const conclusion = (submission.conclusion || "").trim();
  const limitation = (submission.limitation || "").trim();
  const allText = `${prediction} ${interpretation1} ${interpretation2} ${conclusion} ${limitation}`;

  let score1 = 8;
  if (records.length >= 1) score1 += 4;
  if (records.length >= 3) score1 += 5;
  if (prediction.length >= 25) score1 += 3;

  let score2 = 6;
  if (records.length >= 3) score2 += 6;
  if (records.some(r => Number(r.ratio) > 0)) score2 += 4;
  if (records.some(r => Number(r.percent) >= 0)) score2 += 4;

  let score3 = 5;
  if (/표면적|부피/.test(interpretation1)) score3 += 6;
  if (/물질|침투|이동|효율/.test(interpretation2)) score3 += 6;
  if (interpretation1.length + interpretation2.length >= 100) score3 += 5;
  if (/\d/.test(`${interpretation1} ${interpretation2}`)) score3 += 3;

  let score4 = 6;
  if (/세포\s*분열|분열/.test(conclusion)) score4 += 8;
  if (/표면적|부피/.test(conclusion)) score4 += 5;
  if (/물질|이동|효율|침투/.test(conclusion)) score4 += 5;
  if (/\d/.test(conclusion)) score4 += 3;
  if (limitation.length >= 25) score4 += 3;

  let score5 = 2;
  if (prediction && interpretation1 && interpretation2 && conclusion && limitation) score5 += 2;
  if (records.length >= 3) score5 += 1;

  score1 = clampScore(score1, 20);
  score2 = clampScore(score2, 20);
  score3 = clampScore(score3, 25);
  score4 = clampScore(score4, 30);
  score5 = clampScore(score5, 5);

  const strengths = [];
  const improvements = [];

  if (records.length >= 3) strengths.push("서로 다른 크기의 세포 모형 결과를 비교했습니다.");
  else improvements.push("서로 다른 세포 크기의 결과를 세 번 이상 비교해 보세요.");

  if (/\d/.test(`${interpretation1} ${interpretation2} ${conclusion}`)) {
    strengths.push("수치 자료를 설명의 근거로 활용했습니다.");
  } else {
    improvements.push("표면적/부피 비나 침투 비율의 수치를 한 가지 이상 직접 인용해 보세요.");
  }

  if (/세포\s*분열|분열/.test(conclusion) && /물질|이동|효율|침투/.test(conclusion)) {
    strengths.push("물질 이동 효율과 세포 분열의 필요성을 연결했습니다.");
  } else {
    improvements.push("물질 이동 효율의 변화가 세포 분열의 필요성과 어떻게 이어지는지 더 분명히 설명해 보세요.");
  }

  if (limitation.length >= 25) strengths.push("모형 실험의 한계를 생각해 보았습니다.");
  else improvements.push("우무 조각과 실제 세포의 차이를 한 가지 이상 구체적으로 써 보세요.");

  const feedback = [
    "【AI가 찾은 강점】",
    ...(strengths.length ? strengths.map(v => `- ${v}`) : ["- 탐구 과정을 끝까지 수행했습니다."]),
    "",
    "【AI가 제안한 보완점】",
    ...(improvements.length ? improvements.map(v => `- ${v}`) : ["- 현재 답변의 근거와 설명이 비교적 잘 연결되어 있습니다."]),
    "",
    "※ 이 평가는 AI의 1차 제안이며, 최종 평가는 교사가 확정합니다."
  ].join("\n");

  return {
    score1, score2, score3, score4, score5,
    total: score1 + score2 + score3 + score4 + score5,
    feedback,
    evaluatedAt: new Date().toISOString(),
    model: "prototype-rule-engine"
  };
}

async function runAiEvaluation() {
  const submission = selectedStudent()?.submission;
  if (!submission) {
    if ($("evalMessage")) $("evalMessage").textContent = "제출된 학생 자료를 먼저 선택해 주세요.";
    return;
  }

  const button = $("runAiEvaluationBtn");

  try {
    if (typeof window.runGeminiScienceEvaluation !== "function") {
      throw new Error("Firebase AI Logic 모듈이 아직 준비되지 않았습니다. 잠시 후 다시 실행해 주세요.");
    }

    button.disabled = true;
    button.textContent = "Gemini 평가 중...";
    $("evalMessage").textContent = "Firebase AI Logic을 통해 Gemini 1차 평가를 실행하고 있습니다.";

    const aiEvaluation = await window.runGeminiScienceEvaluation(submission);

    const dataApi = await window.firebaseDataReady;
    await dataApi.saveAiEvaluation(submission.id, submission.ownerUid, aiEvaluation);

    if ($("evalMessage")) {
      $("evalMessage").textContent = "Gemini 1차 평가가 완료되었습니다. 교사가 내용을 검토해 주세요.";
    }
  } catch (error) {
    console.error("Gemini evaluation failed:", error);
    let message = error?.message || "Gemini 1차 평가 중 오류가 발생했습니다.";
    if (/app.?check|recaptcha|403|permission/i.test(message)) {
      message = "App Check 인증에 실패했습니다. reCAPTCHA 사이트 키와 등록 도메인을 확인해 주세요.";
    }
    if (/quota|429|resource exhausted/i.test(message)) {
      message = "Gemini 무료 사용량을 초과했거나 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
    }
    if ($("evalMessage")) $("evalMessage").textContent = message;
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "AI 1차 평가 실행";
    }
  }
}

function applyAiEvaluation() {
  const submission = selectedStudent()?.submission;
  const ai = submission?.evaluation?.aiEvaluation;
  if (!ai) {
    $("evalMessage").textContent = "먼저 AI 1차 평가를 실행해 주세요.";
    return;
  }

  $("score1").value = ai.score1;
  $("score2").value = ai.score2;
  $("score3").value = ai.score3;
  $("score4").value = ai.score4;
  $("score5").value = ai.score5;
  $("teacherFeedback").value = ai.feedback
    .replace("【AI가 찾은 강점】", "【잘한 점】")
    .replace("【AI가 제안한 보완점】", "【보완할 점】");
  updateLiveTotal();
  $("evalMessage").textContent = "AI 결과를 교사 평가 영역에 복사했습니다. 반드시 검토·수정한 뒤 저장하세요.";
}

async function saveEvaluation(publishToStudent = true) {
  const s = selectedStudent()?.submission;
  if (!s) return;

  const limits = [20, 20, 25, 30, 5];
  const fields = ["score1","score2","score3","score4","score5"];
  const rawValues = fields.map((id) => $(id).value.trim());

  if (rawValues.some((value) => value === "")) {
    $("evalMessage").textContent = "모든 평가 영역의 점수를 입력해 주세요.";
    return;
  }

  const values = rawValues.map(Number);
  if (values.some((value, index) => Number.isNaN(value) || value < 0 || value > limits[index])) {
    $("evalMessage").textContent = "각 영역의 배점 범위 안에서 점수를 입력해 주세요.";
    return;
  }

  try {
    $("evalMessage").textContent = publishToStudent ? "최종 평가를 저장하고 있습니다..." : "임시 저장하고 있습니다...";
    const dataApi = await window.firebaseDataReady;
    await dataApi.saveTeacherEvaluation(s.id, s.ownerUid, {
      score1: values[0], score2: values[1], score3: values[2], score4: values[3], score5: values[4],
      total: values.reduce((a, b) => a + b, 0),
      feedback: $("teacherFeedback").value.trim()
    }, publishToStudent);
    $("evalMessage").textContent = publishToStudent
      ? "교사 최종 평가가 저장되었고 피드백이 학생에게 공개되었습니다."
      : "교사 평가가 임시 저장되었습니다. 학생에게는 아직 공개되지 않습니다.";
  } catch (error) {
    console.error("Evaluation save failed", error);
    $("evalMessage").textContent = `저장 실패: ${error.message}`;
  }
}

function xmlEscape(value) { return String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;"); }
function excelCell(value, type="String", styleId="") { const style=styleId?` ss:StyleID="${styleId}"`:""; return `<Cell${style}><Data ss:Type="${type}">${xmlEscape(value)}</Data></Cell>`; }
function buildWorksheet(name, rows, widths=[]) {
  const columns=widths.map(w=>`<Column ss:AutoFitWidth="0" ss:Width="${w}"/>`).join("");
  const body=rows.map((row,i)=>`<Row>${row.map(v=>excelCell(v,typeof v==="number"&&Number.isFinite(v)?"Number":"String",i===0?"Header":"")).join("")}</Row>`).join("");
  return `<Worksheet ss:Name="${xmlEscape(name)}"><Table>${columns}${body}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane><ActivePane>2</ActivePane></WorksheetOptions></Worksheet>`;
}

function exportCurrentClassExcel() {
  const year=$("yearFilter").value.trim();
  const cls=$("classFilter").value.trim().replace(/반$/,"");
  if (!year) { alert("학년도를 입력해 주세요."); return; }
  if (!cls) { alert("반을 입력한 뒤 다운로드해 주세요."); return; }
  const students=allStudentRows().filter(s=>String(s.schoolYear)===year&&String(s.classLabel)===cls).sort((a,b)=>String(a.studentNumber).localeCompare(String(b.studentNumber),"ko",{numeric:true}));
  if (!students.length) { alert("해당 반 학생 명단이 없습니다."); return; }
  const rows=[["학년도","학년","반","번호","이름","제출 여부","제출 일시","평가 상태","탐구 수행(20)","자료 처리(20)","자료 해석(25)","과학적 추론(30)","학습 태도(5)","총점(100)","교사 피드백","예상","자료 해석 1","자료 해석 2","최종 결론","모형의 한계"]];
  const expRows=[["학년도","학년","반","번호","이름","실험 순서","세포 크기(cm)","표면적/부피 비(cm⁻¹)","침투 깊이(cm)","침투 부피 비율(%)"]];
  students.forEach(student=>{
    const s=student.submission, e=s?.evaluation;
    rows.push([student.schoolYear,student.grade,student.classLabel,student.studentNumber,student.studentName,s?"제출":"미제출",s?new Date(s.submittedAt).toLocaleString("ko-KR"):"",e?"평가 완료":(s?"평가 대기":"미평가"),e?.score1??"",e?.score2??"",e?.score3??"",e?.score4??"",e?.score5??"",e?.total??"",e?.feedback??"",s?.prediction??"",s?.interpretation1??"",s?.interpretation2??"",s?.conclusion??"",s?.limitation??""]);
    (s?.records||[]).forEach((r,i)=>expRows.push([student.schoolYear,student.grade,student.classLabel,student.studentNumber,student.studentName,i+1,Number(r.size),Number(r.ratio),Number(r.penetration),Number(r.percent)]));
  });
  const xml=`<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Font ss:FontName="맑은 고딕" ss:Size="10"/></Style><Style ss:ID="Header"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:FontName="맑은 고딕" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#2F6FED" ss:Pattern="Solid"/></Style></Styles>${buildWorksheet(`${cls}반 학생 현황`,rows,[60,45,45,45,85,65,125,70,70,70,70,80,70,70,220,220,220,220,240,220])}${buildWorksheet(`${cls}반 실험 결과`,expRows,[60,45,45,45,85,60,85,110,85,105])}</Workbook>`;
  const blob=new Blob(["\ufeff",xml],{type:"application/vnd.ms-excel;charset=utf-8"});
  const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`${year}학년도_3학년_${cls}반_세포탐구_전체학생.xls`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

function refreshAll(){
  renderSummary();
  renderList();
  if(selectedKey) renderDetail();
}

let unsubscribeDashboard = null;

async function startTeacherApp(user) {
  $("teacherLoginView").classList.add("hidden");
  $("teacherAppView").classList.remove("hidden");
  $("teacherAccount").textContent = user.email || user.displayName || "교사";

  const dataApi = await window.firebaseDataReady;
  if (unsubscribeDashboard) unsubscribeDashboard();
  unsubscribeDashboard = dataApi.subscribeDashboard((items) => {
    submissions = items;
    refreshAll();
  }, (error) => {
    console.error("Firestore dashboard error", error);
    alert(`학생 자료를 불러오지 못했습니다: ${error.message}`);
  });
}

async function initializeTeacherAuth() {
  const dataApi = await window.firebaseDataReady;
  dataApi.onAuthStateChanged((user) => {
    if (user && !user.isAnonymous) {
      startTeacherApp(user);
    } else {
      $("teacherLoginView").classList.remove("hidden");
      $("teacherAppView").classList.add("hidden");
    }
  });

  $("teacherLoginBtn").addEventListener("click", async () => {
    try {
      $("teacherLoginMessage").textContent = "Google 로그인 창을 여는 중입니다...";
      await dataApi.teacherSignIn();
      $("teacherLoginMessage").textContent = "";
    } catch (error) {
      $("teacherLoginMessage").textContent = `로그인 실패: ${error.message}`;
    }
  });

  $("teacherLogoutBtn").addEventListener("click", async () => {
    if (unsubscribeDashboard) unsubscribeDashboard();
    await dataApi.logout();
  });
}

$("refreshBtn").addEventListener("click",refreshAll);
$("applyFilterBtn").addEventListener("click",()=>{selectedKey=null;renderSummary();renderList();});
$("exportExcelBtn").addEventListener("click",exportCurrentClassExcel);
initializeTeacherAuth();
