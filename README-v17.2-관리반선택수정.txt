v17.2 관리자 페이지 관리반 선택 수정

변경 내용
- 관리자 페이지의 관리반 선택 목록을 students 컬렉션에서 만들지 않습니다.
- authorizedTeachers/jobchemy@gmail.com 문서의 managedClasses 배열을 읽어 선택 목록으로 사용합니다.
- 따라서 jobchemy@gmail.com에 등록된 관리반(예: 2026-3-1 ~ 2026-3-6)이 다른 교사 등록·수정 화면에 표시됩니다.

필수 확인
authorizedTeachers/jobchemy@gmail.com 문서에 아래와 같이 배열이 있어야 합니다.

managedClasses:
- 2026-3-1
- 2026-3-2
- 2026-3-3
- 2026-3-4
- 2026-3-5
- 2026-3-6

적용 방법
1. 압축을 풉니다.
2. public 폴더를 기존 프로젝트 public 폴더에 병합·덮어쓰기합니다.
3. VS Code 저장
4. 커밋
5. 변경 내용 동기화
6. GitHub Actions 자동 배포 완료
7. 관리자 페이지에서 Ctrl+Shift+R

Firestore 규칙은 다시 게시할 필요가 없습니다.
