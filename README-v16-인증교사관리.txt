v16 Firebase DB 기반 인증 교사 관리

핵심 변경
- authorizedTeachers 컬렉션에 등록된 이메일만 교사용 대시보드 접근
- 인증된 모든 교사는 동일한 권한
- 교사용 화면에서 교사 이메일 추가·삭제
- 인증되지 않은 Google 계정은 로그인 직후 자동 로그아웃
- Firestore 보안 규칙에서도 authorizedTeachers 컬렉션을 확인

중요: 적용 순서를 반드시 지켜 주세요.

1. Firebase Console > Firestore Database > 데이터
2. 컬렉션 authorizedTeachers 생성
3. 문서 ID를 jobchemy@gmail.com 으로 생성
4. 필드 추가:
   email: jobchemy@gmail.com
   name: 관리자
   active: true
5. 그 다음 Firestore 규칙 화면에 v16 firestore.rules 전체 붙여넣고 게시
6. public 폴더를 기존 프로젝트에 병합·덮어쓰기
7. VS Code 저장 → 커밋 → 변경 내용 동기화
8. 자동 배포 완료 후 교사용 화면 Ctrl+Shift+R

주의
- 첫 교사 문서를 만들기 전에 새 규칙부터 게시하면 모든 교사 접근이 차단됩니다.
- authorizedTeachers 문서 ID는 반드시 Google 로그인 이메일과 정확히 같아야 합니다.
- 이메일은 소문자로 등록하세요.
- 권한 분리는 없으며 모든 인증 교사는 학생·평가·교사 목록 관리 권한이 동일합니다.
