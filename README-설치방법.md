# v12 Firebase AI Logic + Gemini

Cloud Functions와 Secret Manager는 사용하지 않습니다.

반드시 수정할 파일:
public/jy-middle-3rd/cell-surface-volume-webapp/common/firebase-ai-config.js

입력할 값:
- Firebase Web API Key
- Messaging Sender ID
- App ID
- reCAPTCHA v3 사이트 키

Gemini API 키와 reCAPTCHA 비밀 키는 소스에 넣지 않습니다.

배포:
firebase deploy --only hosting,firestore:rules
