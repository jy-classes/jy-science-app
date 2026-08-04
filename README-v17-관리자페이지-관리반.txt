v17 관리자 전용 페이지 + 교사별 관리반

구조
- 학생용: student/index.html
- 교사용: teacher/index.html
- 관리자용: admin/index.html

관리자 페이지 주소
https://jy-science-app.web.app/jy-middle-3rd/cell-surface-volume-webapp/admin/index.html

관리자 기능
- 인증 교사 등록·수정·삭제
- 각 교사의 관리반 지정
- 학생 명단에 존재하는 반 목록 자동 표시

교사용 기능
- authorizedTeachers 문서에 등록된 이메일만 로그인
- managedClasses에 지정된 반 학생만 조회·평가
- 다른 반의 학생 문서는 Firestore 규칙에서도 차단
- 관리반 미지정 교사는 로그인 불가

반드시 먼저 할 일
1. Firebase Console > Firestore Database > 데이터
2. admins 컬렉션 생성
3. 문서 ID: jobchemy@gmail.com
4. 필드:
   email = "jobchemy@gmail.com" (문자열)
   name = "관리자" (문자열)
   active = true (불리언)
5. 기존 authorizedTeachers/jobchemy@gmail.com 문서에는 managedClasses 배열을 추가
   예: ["2026-3-1", "2026-3-2"]
6. 기존 students 문서에 classKey 필드가 없다면 관리자 페이지의 학생 명단 재저장 또는 수동 추가
   예: 2026학년도 3학년 1반 → classKey = "2026-3-1"
7. Firestore 규칙에 v17 firestore.rules 전체 붙여넣기 후 게시
8. public 폴더 병합·덮어쓰기
9. VS Code 저장 → 커밋 → 동기화

중요
- 관리자만 학생 명단 및 교사 계정을 관리합니다.
- 일반 교사는 지정된 관리반 학생만 볼 수 있습니다.
- 권한 검사는 화면 필터뿐 아니라 Firestore 규칙에서도 적용됩니다.
