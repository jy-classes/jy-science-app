v13 Firestore 연결 패치

1. 압축 안의 public 폴더를 기존 프로젝트 public 폴더에 병합합니다.
2. firestore.rules에서 "여기에_교사_Google_이메일"을 실제 교사 Google 이메일로 바꿉니다.
3. 기존 firebase-ai-config.js는 덮어쓰지 않습니다. 현재 정상 작동하는 Firebase 설정과 Gemini 모델 값을 그대로 유지합니다.
4. VS Code에서 저장 → 소스 제어 → 커밋 → 변경 내용 동기화를 실행합니다.
5. GitHub Actions가 firestore.rules도 배포하는지 확인합니다. Hosting만 배포한다면 규칙은 별도 반영이 필요합니다.

주의: 현재 학생 명단은 체험용 2명입니다. 학생 인증은 익명 인증 + 기존 반/번호/생년월일 확인 구조라 실제 학교 운영용 강한 본인 인증은 아닙니다.
