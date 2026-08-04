v15.1 학생 로그인 수정

원인:
v15 학생용 script.js가 Firestore students 컬렉션을 조회하지 않고,
예전 테스트 학생 배열(DEMO_STUDENTS)만 검색하고 있었습니다.

수정:
- 반·번호로 학생 문서 ID를 계산
- Firestore students 컬렉션에서 실제 등록 학생 조회
- 생년월일 일치 여부 확인
- 로그인 후 기존 제출·피드백 흐름 유지

적용:
1. public 폴더를 기존 프로젝트에 병합·덮어쓰기
2. VS Code 저장
3. 커밋
4. 변경 내용 동기화
5. GitHub Actions 자동 배포 완료
6. 학생 페이지에서 Ctrl+Shift+R

Firestore 규칙은 변경하지 않습니다.
