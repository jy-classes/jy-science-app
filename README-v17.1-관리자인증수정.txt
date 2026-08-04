v17.1 관리자 로그인 오류 수정

오류 원인
- common/firebase-data.js 안에는 verifyAdmin 함수가 있었지만,
  window.firebaseDataReady 공개 객체에 verifyAdmin이 포함되지 않아
  관리자 페이지에서 api.verifyAdmin is not a function 오류가 발생했습니다.

수정 내용
- verifyAdmin 및 관리자 관련 함수들을 firebaseDataReady에 공개
- 관리자 페이지 진단용 버전 로그 추가

적용 방법
1. 압축을 풉니다.
2. public 폴더를 기존 프로젝트의 public 폴더에 병합·덮어쓰기합니다.
3. VS Code 저장
4. 커밋
5. 변경 내용 동기화
6. GitHub Actions 자동 배포 완료
7. 관리자 페이지에서 Ctrl+Shift+R

Firestore 규칙은 다시 게시하지 않아도 됩니다.
admins 및 authorizedTeachers 컬렉션도 그대로 유지합니다.
