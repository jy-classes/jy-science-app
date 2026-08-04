v14.1 교사용 Google 로그인 버튼 수정

수정 내용:
- teacher/index.html의 teacher/script.js를 ES module로 실행하도록 변경
- Firebase 데이터 모듈이 준비된 뒤 로그인 버튼 이벤트가 정상 연결됨

적용:
1. public 폴더를 기존 프로젝트에 병합·덮어쓰기
2. VS Code 저장
3. 커밋
4. 변경 내용 동기화
5. GitHub Actions 자동 배포 완료 후 Ctrl+Shift+R
