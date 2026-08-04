import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app-check.js";
import { getAI, getGenerativeModel, GoogleAIBackend } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-ai.js";

function getConfig() {
  const c = window.JY_FIREBASE_AI_CONFIG;
  const required = [
    c?.firebaseConfig?.apiKey,
    c?.firebaseConfig?.messagingSenderId,
    c?.firebaseConfig?.appId,
    c?.recaptchaSiteKey
  ];
  if (!c || required.some(v => !v || String(v).includes("여기에_"))) {
    throw new Error("firebase-ai-config.js에 Firebase 설정값과 reCAPTCHA 사이트 키를 입력해 주세요.");
  }
  return c;
}

let modelPromise;

async function getModel() {
  if (modelPromise) return modelPromise;
  modelPromise = Promise.resolve().then(() => {
    const c = getConfig();
    const app = initializeApp(c.firebaseConfig);
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(c.recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true
    });
    const ai = getAI(app, { backend: new GoogleAIBackend() });
    return getGenerativeModel(ai, {
      model: c.modelName || "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.15,
        responseMimeType: "application/json"
      }
    });
  });
  return modelPromise;
}

function buildPrompt(submission) {
  const safe = {
    records: submission.records || [],
    prediction: submission.prediction || "",
    interpretation1: submission.interpretation1 || "",
    interpretation2: submission.interpretation2 || "",
    conclusion: submission.conclusion || "",
    limitation: submission.limitation || ""
  };

  return `
당신은 대한민국 중학교 과학 탐구 수행평가의 1차 보조 평가자입니다.
최종 평가는 교사가 직접 검토하고 확정합니다.

성취기준:
[9과21-01] 개체의 생장에 세포분열이 필요한 이유를 세포의 표면적과 부피의 관계로 추론할 수 있다.

평가 영역:
- score1 탐구 수행: 0~20점
- score2 자료 처리: 0~20점
- score3 자료 해석: 0~25점
- score4 과학적 추론: 0~30점
- score5 학습 태도: 0~5점

학생 제출 자료:
${JSON.stringify(safe, null, 2)}

반드시 JSON 객체만 반환하세요.
{
  "score1": 정수,
  "score2": 정수,
  "score3": 정수,
  "score4": 정수,
  "score5": 정수,
  "strengths": ["강점 1", "강점 2"],
  "improvements": ["보완점 1", "보완점 2"],
  "feedback": "학생에게 전달할 3~6문장의 종합 피드백"
}`.trim();
}

function parseJson(text) {
  const cleaned = String(text || "").replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first < 0 || last <= first) throw new Error("Gemini 응답을 JSON 형식으로 읽지 못했습니다.");
  return JSON.parse(cleaned.slice(first, last + 1));
}

function clamp(value, max) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(max, Math.round(n))) : 0;
}

window.runGeminiScienceEvaluation = async (submission) => {
  const model = await getModel();
  const result = await model.generateContent(buildPrompt(submission));
  const parsed = parseJson(result.response.text());

  const strengths = Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 5).map(String) : [];
  const improvements = Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 5).map(String) : [];

  const evaluation = {
    score1: clamp(parsed.score1, 20),
    score2: clamp(parsed.score2, 20),
    score3: clamp(parsed.score3, 25),
    score4: clamp(parsed.score4, 30),
    score5: clamp(parsed.score5, 5),
    strengths,
    improvements,
    evaluatedAt: new Date().toISOString(),
    model: getConfig().modelName,
    provider: "Firebase AI Logic / Gemini Developer API"
  };

  evaluation.total = evaluation.score1 + evaluation.score2 + evaluation.score3 + evaluation.score4 + evaluation.score5;
  evaluation.feedback = [
    "【AI가 찾은 강점】",
    ...(strengths.length ? strengths.map(v => `- ${v}`) : ["- 작성된 탐구 내용을 확인했습니다."]),
    "",
    "【AI가 제안한 보완점】",
    ...(improvements.length ? improvements.map(v => `- ${v}`) : ["- 교사가 최종적으로 답변을 검토해 주세요."]),
    "",
    "【종합 피드백】",
    String(parsed.feedback || "교사가 최종 피드백을 작성해 주세요."),
    "",
    "※ 이 평가는 Gemini의 1차 제안이며, 최종 평가는 교사가 확정합니다."
  ].join("\n");

  return evaluation;
};
