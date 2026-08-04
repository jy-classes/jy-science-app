v17.5 인증 교사 대시보드 Firestore 권한 오류 수정

오류 원인
- 교사용 대시보드가 evaluations 컬렉션 전체를 조회한 뒤
  브라우저에서 관리반만 필터링하고 있었습니다.
- Firestore 규칙은 관리반 문서만 허용하므로 컬렉션 전체 조회가 거부되었습니다.
- 그 결과 Missing or insufficient permissions 오류가 발생했습니다.

수정 내용
- submissions와 evaluations 모두 classKey 조건으로 관리반별 조회
- 인증 교사는 지정된 관리반의 제출·평가 문서만 서버에서 받아옴
- AI 평가 저장 및 교사 최종 평가 흐름 유지

적용
1. 압축 해제
2. public 폴더를 기존 프로젝트에 병합·덮어쓰기
3. VS Code 저장
4. 커밋
5. 변경 내용 동기화
6. GitHub Actions 자동 배포 완료
7. 교사용 페이지에서 Ctrl+Shift+R

Firestore 규칙은 변경하지 않습니다.

주의
기존 evaluations 문서에 classKey 필드가 없다면 해당 평가 문서는 관리반 조회에 나타나지 않습니다.
기존 테스트 평가 문서는 삭제 후 다시 AI 평가를 실행하거나,
Firebase 콘솔에서 classKey 예: 2026-3-1 필드를 추가하세요.
