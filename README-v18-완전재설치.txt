v18 완전 재설치용 정리본

권장 최종 구조

public/
└─ jy-middle-3rd/
   ├─ common/
   │  ├─ firebase-ai-config.js
   │  └─ firebase-data.js
   ├─ admin/
   │  ├─ index.html
   │  └─ script.js
   └─ cell-surface-volume-webapp/
      ├─ common/
      │  └─ firebase-ai.js
      ├─ student/
      │  ├─ index.html
      │  └─ script.js
      └─ teacher/
         ├─ index.html
         └─ script.js

관리자 주소
https://jy-science-app.web.app/jy-middle-3rd/admin/index.html

학생 주소
https://jy-science-app.web.app/jy-middle-3rd/cell-surface-volume-webapp/student/index.html

교사 주소
https://jy-science-app.web.app/jy-middle-3rd/cell-surface-volume-webapp/teacher/index.html

완전 재설치 방법

1. 기존 프로젝트 폴더를 통째로 백업 복사합니다.
2. 기존 프로젝트에서 아래 폴더만 삭제합니다.
   public/jy-middle-3rd
3. .git, .github, firebase.json, .firebaserc, firestore.rules는 삭제하지 않습니다.
4. 이 압축파일의 public/jy-middle-3rd 폴더를 기존 public 폴더 안에 복사합니다.
5. public/jy-middle-3rd/common/firebase-ai-config.js의 Firebase 설정값과 reCAPTCHA 사이트 키를 확인합니다.
6. VS Code 저장 → 커밋 → 변경 내용 동기화합니다.
7. GitHub Actions 자동 배포가 끝나면 각 페이지에서 Ctrl+Shift+R을 누릅니다.
8. Firestore 데이터베이스의 admins, authorizedTeachers, students 등 컬렉션은 삭제하지 않습니다.

주의
- 기존 public/jy-middle-3rd 폴더를 삭제하면 옛 admin 폴더와 중복 common 파일이 모두 정리됩니다.
- Firebase 콘솔의 데이터와 Authentication 설정은 그대로 유지됩니다.
- Firestore 규칙은 현재 정상 작동 중인 v17 규칙을 그대로 사용합니다.
