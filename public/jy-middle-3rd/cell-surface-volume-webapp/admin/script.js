console.info("진케미 관리자 v17.2 로드됨");
const $ = (id) => document.getElementById(id);
let teachers = [];
let classes = [];
let unsubscribeTeachers = null;

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
}

init();
