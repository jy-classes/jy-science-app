console.info("진케미 관리자 v17.4 로드됨");
const $ = (id) => document.getElementById(id);
let teachers = [];
let classes = [];
let unsubscribeTeachers = null;
let students = [];
let unsubscribeStudents = null;
const selectedStudentUids = new Set();

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function message(text, error = false) {
  $("adminMessage").textContent = text;
  $("adminMessage").classList.toggle("error", error);
}

function selectedClasses() {
  return Array.from(document.querySelectorAll('input[name="managedClass"]:checked'))
    .map((input) => input.value);
}

function renderClassChoices(selected = []) {
  $("classChoices").innerHTML = classes.map((item) => `
    <label class="class-chip">
      <input type="checkbox" name="managedClass" value="${esc(item.classKey)}"
        ${selected.includes(item.classKey) ? "checked" : ""} />
      ${esc(item.schoolYear)}학년도 ${esc(item.grade)}학년 ${esc(item.classLabel)}반
    </label>
  `).join("") || "<p>jobchemy@gmail.com 계정에 관리반이 등록되어 있지 않습니다.</p>";
}

function renderTeachers() {
  if (!teachers.length) {
    $("teacherTable").innerHTML = '<tr><td colspan="4">등록된 교사가 없습니다.</td></tr>';
    return;
  }

  $("teacherTable").innerHTML = teachers.map((teacher) => `
    <tr>
      <td>${esc(teacher.email || teacher.id)}</td>
      <td>${esc(teacher.name || "")}</td>
      <td>${(teacher.managedClasses || []).map((key) => esc(key.split("-").at(-1) + "반")).join(", ") || "미지정"}</td>
      <td class="actions">
        <button class="ghost editBtn" data-email="${esc(teacher.email || teacher.id)}">수정</button>
        <button class="ghost danger deleteBtn" data-email="${esc(teacher.email || teacher.id)}">삭제</button>
      </td>
    </tr>
  `).join("");

  document.querySelectorAll(".editBtn").forEach((button) => {
    button.addEventListener("click", () => editTeacher(button.dataset.email));
  });
  document.querySelectorAll(".deleteBtn").forEach((button) => {
    button.addEventListener("click", () => deleteTeacher(button.dataset.email));
  });
}

function resetForm() {
  $("teacherForm").reset();
  $("editingEmail").value = "";
  $("teacherEmail").disabled = false;
  $("cancelEditBtn").classList.add("hidden");
  renderClassChoices([]);
}

function editTeacher(email) {
  const teacher = teachers.find((item) => (item.email || item.id) === email);
  if (!teacher) return;
  $("editingEmail").value = email;
  $("teacherEmail").value = email;
  $("teacherEmail").disabled = true;
  $("teacherName").value = teacher.name || "";
  $("cancelEditBtn").classList.remove("hidden");
  renderClassChoices(teacher.managedClasses || []);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteTeacher(email) {
  if (!confirm(`${email} 교사의 인증을 삭제할까요?`)) return;
  try {
    const api = await window.firebaseDataReady;
    await api.deleteAuthorizedTeacher(email);
    message("교사 인증을 삭제했습니다.");
  } catch (error) {
    message(`삭제 실패: ${error.message}`, true);
  }
}


function studentMessage(text, error = false) {
  $("studentMessage").textContent = text;
  $("studentMessage").classList.toggle("error", error);
}

function makeStudentUid(student) {
  return `stu_${student.schoolYear}_${student.grade}_${student.classLabel}_${student.studentNumber}`;
}

function studentFormValue() {
  const student = {
    schoolYear: $("studentYear").value.trim(),
    grade: $("studentGrade").value.trim(),
    classLabel: $("studentClass").value.trim().replace(/반$/, ""),
    studentNumber: $("studentNumber").value.trim().replace(/번$/, ""),
    studentName: $("studentName").value.trim(),
    birthDate: $("studentBirthDate").value.replace(/\D/g, "")
  };
  student.studentUid = $("editingStudentUid").value || makeStudentUid(student);
  return student;
}

function resetStudentForm() {
  $("studentForm").reset();
  $("studentYear").value = "2026";
  $("studentGrade").value = "3";
  $("editingStudentUid").value = "";
  $("saveStudentBtn").textContent = "학생 등록";
  $("cancelStudentEditBtn").classList.add("hidden");
}

function filteredStudents() {
  const keyword = $("studentSearch").value.trim().toLowerCase();
  return students.filter((s) => {
    if (!keyword) return true;
    return [
      s.schoolYear, s.grade, s.classLabel,
      s.studentNumber, s.studentName, s.birthDate
    ].some((value) =>
      String(value || "").toLowerCase().includes(keyword)
    );
  });
}

function updateBulkStudentControls() {
  const visible = filteredStudents();
  const visibleIds = visible.map((s) => s.studentUid || s.id);
  const selectedVisibleCount = visibleIds.filter((uid) =>
    selectedStudentUids.has(uid)
  ).length;

  $("selectedStudentCount").textContent =
    `선택 ${selectedStudentUids.size}명`;

  $("deleteSelectedStudentsBtn").disabled =
    selectedStudentUids.size === 0;

  $("selectAllStudents").checked =
    visibleIds.length > 0 &&
    selectedVisibleCount === visibleIds.length;

  $("selectAllStudents").indeterminate =
    selectedVisibleCount > 0 &&
    selectedVisibleCount < visibleIds.length;
}

function renderStudents() {
  const filtered = filteredStudents();

  $("studentCount").textContent =
    `등록 학생 ${students.length}명`;

  // 이미 삭제되거나 목록에서 사라진 학생은 선택 상태에서도 제거
  const existingIds = new Set(
    students.map((s) => s.studentUid || s.id)
  );
  [...selectedStudentUids].forEach((uid) => {
    if (!existingIds.has(uid)) selectedStudentUids.delete(uid);
  });

  if (!filtered.length) {
    $("studentTable").innerHTML =
      '<tr><td colspan="8">등록된 학생이 없습니다.</td></tr>';
    updateBulkStudentControls();
    return;
  }

  $("studentTable").innerHTML = filtered.map((s) => {
    const uid = s.studentUid || s.id;
    return `
      <tr>
        <td class="student-select-cell">
          <input
            type="checkbox"
            class="studentRowCheckbox"
            data-uid="${esc(uid)}"
            ${selectedStudentUids.has(uid) ? "checked" : ""}
            aria-label="${esc(s.studentName)} 학생 선택"
          />
        </td>
        <td>${esc(s.schoolYear)}</td>
        <td>${esc(s.grade)}</td>
        <td>${esc(s.classLabel)}</td>
        <td>${esc(s.studentNumber)}</td>
        <td>${esc(s.studentName)}</td>
        <td>${esc(s.birthDate)}</td>
        <td class="actions">
          <button
            class="ghost editStudentBtn"
            data-uid="${esc(uid)}"
          >수정</button>
          <button
            class="ghost danger deleteStudentBtn"
            data-uid="${esc(uid)}"
          >삭제</button>
        </td>
      </tr>
    `;
  }).join("");

  document.querySelectorAll(".studentRowCheckbox").forEach(
    (checkbox) => {
      checkbox.addEventListener("change", () => {
        const uid = checkbox.dataset.uid;
        if (checkbox.checked) {
          selectedStudentUids.add(uid);
        } else {
          selectedStudentUids.delete(uid);
        }
        updateBulkStudentControls();
      });
    }
  );

  document.querySelectorAll(".editStudentBtn").forEach((button) => {
    button.addEventListener(
      "click",
      () => editStudent(button.dataset.uid)
    );
  });

  document.querySelectorAll(".deleteStudentBtn").forEach((button) => {
    button.addEventListener(
      "click",
      () => deleteStudent(button.dataset.uid)
    );
  });

  updateBulkStudentControls();
}

function editStudent(studentUid) {
  const s = students.find((item) => (item.studentUid || item.id) === studentUid);
  if (!s) return;

  $("editingStudentUid").value = s.studentUid || s.id;
  $("studentYear").value = s.schoolYear;
  $("studentGrade").value = s.grade;
  $("studentClass").value = s.classLabel;
  $("studentNumber").value = s.studentNumber;
  $("studentName").value = s.studentName;
  $("studentBirthDate").value = s.birthDate;
  $("saveStudentBtn").textContent = "수정 저장";
  $("cancelStudentEditBtn").classList.remove("hidden");
  $("studentForm").scrollIntoView({ behavior: "smooth", block: "center" });
}

async function deleteStudent(studentUid) {
  const s = students.find((item) => (item.studentUid || item.id) === studentUid);
  if (!s) return;

  if (!confirm(`${s.classLabel}반 ${s.studentNumber}번 ${s.studentName} 학생을 삭제할까요?\n기존 제출·평가 자료는 자동 삭제되지 않습니다.`)) {
    return;
  }

  try {
    const api = await window.firebaseDataReady;
    await api.deleteRegisteredStudent(studentUid);
    studentMessage("학생 명단에서 삭제했습니다.");
  } catch (error) {
    studentMessage(`삭제 실패: ${error.message}`, true);
  }
}

async function deleteSelectedStudents() {
  const ids = [...selectedStudentUids];
  if (!ids.length) return;

  const ok = confirm(
    `선택한 ${ids.length}명의 학생을 명단에서 삭제할까요?\n` +
    "기존 제출·평가·피드백 자료는 자동 삭제되지 않습니다."
  );

  if (!ok) return;

  const button = $("deleteSelectedStudentsBtn");

  try {
    button.disabled = true;
    button.textContent = "삭제 중...";

    const api = await window.firebaseDataReady;
    const deletedCount =
      await api.deleteRegisteredStudents(ids);

    selectedStudentUids.clear();
    studentMessage(
      `${deletedCount}명의 학생을 명단에서 삭제했습니다.`
    );
  } catch (error) {
    studentMessage(
      `일괄 삭제 실패: ${error.message}`,
      true
    );
  } finally {
    button.textContent = "선택 학생 일괄 삭제";
    updateBulkStudentControls();
  }
}


function parseCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (ch === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }

  values.push(current.trim());
  return values;
}

function parseStudentCsv(text) {
  const lines = String(text || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());

  const result = [];

  lines.forEach((line, index) => {
    const cols = parseCsvLine(line);

    if (index === 0 && /학년도|이름|생년월일/i.test(cols.join(" "))) {
      return;
    }

    if (cols.length < 6) {
      throw new Error(`${index + 1}번째 줄의 항목이 부족합니다.`);
    }

    const student = {
      schoolYear: cols[0],
      grade: cols[1],
      classLabel: cols[2],
      studentNumber: cols[3],
      studentName: cols[4],
      birthDate: cols[5].replace(/\D/g, "")
    };

    student.studentUid = makeStudentUid(student);
    result.push(student);
  });

  return result;
}

async function importStudents() {
  try {
    const items = parseStudentCsv($("studentCsvInput").value);
    if (!items.length) throw new Error("등록할 학생 명단이 없습니다.");

    const api = await window.firebaseDataReady;
    await api.ensureStudentRegistry(items);

    studentMessage(`${items.length}명의 학생을 등록했습니다.`);
    $("studentCsvInput").value = "";

    classes = await api.listAvailableClasses();
    renderClassChoices([]);
  } catch (error) {
    studentMessage(`일괄 등록 실패: ${error.message}`, true);
  }
}

function downloadStudentCsvTemplate() {
  const content =
    "\uFEFF학년도,학년,반,번호,이름,생년월일\n" +
    "2026,3,1,1,홍길동,20120301\n";

  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "학생명단_등록양식.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

async function startAdmin(user) {
  const api = await window.firebaseDataReady;
  const admin = await api.verifyAdmin(user);
  if (!admin) {
    await api.logout();
    $("loginMessage").textContent = "이 계정은 관리자 목록에 등록되어 있지 않습니다.";
    return;
  }

  $("loginView").classList.add("hidden");
  $("adminView").classList.remove("hidden");
  $("logoutBtn").classList.remove("hidden");

  const masterClassKeys = await api.getTeacherManagedClasses("jobchemy@gmail.com");

  classes = masterClassKeys.map((classKey) => {
    const [schoolYear = "", grade = "", classLabel = ""] = String(classKey).split("-");
    return {
      classKey,
      schoolYear,
      grade,
      classLabel
    };
  });

  renderClassChoices([]);

  if (unsubscribeTeachers) unsubscribeTeachers();
  if (unsubscribeStudents) unsubscribeStudents();

  unsubscribeStudents = api.subscribeStudents((items) => {
    students = items;
    renderStudents();
  }, (error) => studentMessage(`학생 목록 오류: ${error.message}`, true), null);

  unsubscribeTeachers = api.subscribeAuthorizedTeachers((items) => {
    teachers = items;
    renderTeachers();
  }, (error) => message(`교사 목록 오류: ${error.message}`, true));
}

async function init() {
  const api = await window.firebaseDataReady;

  api.onAuthStateChanged(async (user) => {
    if (user && !user.isAnonymous) {
      try {
        await startAdmin(user);
      } catch (error) {
        console.error(error);
        $("loginMessage").textContent = `관리자 인증 실패: ${error.message}`;
      }
    } else {
      $("loginView").classList.remove("hidden");
      $("adminView").classList.add("hidden");
      $("logoutBtn").classList.add("hidden");
    }
  });

  $("loginBtn").addEventListener("click", async () => {
    try {
      $("loginMessage").textContent = "Google 로그인 중입니다.";
      await api.teacherSignIn();
    } catch (error) {
      $("loginMessage").textContent = `로그인 실패: ${error.message}`;
    }
  });

  $("logoutBtn").addEventListener("click", async () => {
    if (unsubscribeTeachers) unsubscribeTeachers();
    if (unsubscribeStudents) unsubscribeStudents();
    await api.logout();
  });

  $("teacherForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const email = $("editingEmail").value || $("teacherEmail").value;
      await api.saveAuthorizedTeacher({
        email,
        name: $("teacherName").value,
        managedClasses: selectedClasses(),
        active: true
      });
      message("교사 정보와 관리반을 저장했습니다.");
      resetForm();
    } catch (error) {
      message(`저장 실패: ${error.message}`, true);
    }
  });

  $("cancelEditBtn").addEventListener("click", resetForm);

  $("studentForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const student = studentFormValue();
      await api.saveRegisteredStudent(student);

      studentMessage(
        $("editingStudentUid").value
          ? "학생 정보를 수정했습니다."
          : "학생을 등록했습니다."
      );

      resetStudentForm();

      classes = await api.listAvailableClasses();
      renderClassChoices([]);
    } catch (error) {
      studentMessage(`저장 실패: ${error.message}`, true);
    }
  });

  $("cancelStudentEditBtn").addEventListener("click", resetStudentForm);
  $("studentSearch").addEventListener("input", renderStudents);
  $("importStudentsBtn").addEventListener("click", importStudents);
  $("downloadStudentCsvBtn").addEventListener("click", downloadStudentCsvTemplate);

  $("studentCsvFile").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    $("studentCsvInput").value = await file.text();
    studentMessage("CSV 파일을 불러왔습니다. '명단 등록'을 눌러 주세요.");
  });

  $("selectAllStudents").addEventListener("change", () => {
    const visibleIds = filteredStudents().map(
      (student) => student.studentUid || student.id
    );

    if ($("selectAllStudents").checked) {
      visibleIds.forEach((uid) => selectedStudentUids.add(uid));
    } else {
      visibleIds.forEach((uid) => selectedStudentUids.delete(uid));
    }

    renderStudents();
  });

  $("deleteSelectedStudentsBtn").addEventListener(
    "click",
    deleteSelectedStudents
  );
}

init();
