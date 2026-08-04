v18.2 완전 재설치본 누락 파일 전체 수정

추가·복구된 파일:
- public/jy-middle-3rd/cell-surface-volume-webapp/common/firebase-ai.js
- public/jy-middle-3rd/cell-surface-volume-webapp/student/style.css
- public/jy-middle-3rd/cell-surface-volume-webapp/teacher/style.css

현재 화면의
'Firebase AI Logic 모듈이 아직 준비되지 않았습니다'
오류는 firebase-ai.js 누락이 원인이었습니다.

적용:
1. public/jy-middle-3rd 폴더를 현재 프로젝트에서 삭제
2. 이 압축파일의 public/jy-middle-3rd 폴더를 public 안에 복사
3. public/jy-middle-3rd/common/firebase-ai-config.js 설정값 확인
4. 저장 → 커밋 → 동기화
5. 자동 배포 완료 후 Ctrl+Shift+R
