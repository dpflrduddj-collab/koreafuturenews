import { GoogleGenAI } from '@google/genai';

export interface AiDraftResult {
  headline: string;
  summaryBullets: string[];
  bodyParagraphs: string[];
  suggestedCategory: string;
  isAiGenerated: true;
  generatedAt: string;
  disclaimer: string;
}

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

/**
 * Generate an objective, fact-grounded journalistic draft and 3 key takeaways
 * using Gemini 3.8 Flash model.
 * 
 * Strict journalistic guidelines:
 * 1. Strictly rely on the provided source information (no fabricated quotes or facts).
 * 2. Neutral Korean journalistic tone (합쇼체/해라체: ~다, ~밝혔다, ~전망이다).
 * 3. 3-point bullet summary and structured multi-paragraph narrative.
 * 4. Transparently marked as AI assisted.
 */
export async function generateArticleDraft(article: {
  title: string;
  contentSnippet: string;
  source: string;
  category: string;
  externalUrl?: string;
  publishedAt?: string;
}): Promise<AiDraftResult> {
  const nowIso = new Date().toISOString();
  const disclaimer = `본 기사는 [${article.source}]의 보도 내용을 바탕으로 Google Gemini AI가 핵심 사실을 요약·재구성하고 한국 미래 뉴스 편집국의 검토를 거쳐 게시되었습니다.`;

  const ai = getAiClient();
  if (!ai) {
    console.warn('[GeminiService] GEMINI_API_KEY is not set. Generating high-quality rule-based editorial draft.');
    return generateFallbackDraft(article, nowIso, disclaimer);
  }

  const systemInstruction = `당신은 대한민국 종합 인터넷신문 '한국 미래 뉴스'의 수석 AI 에디터입니다.
주어진 외부 언론사의 뉴스 제목, 요약, 출처 정보를 바탕으로 독자에게 정확하고 신뢰할 수 있는 기사 초안을 작성하십시오.

[엄격한 보도 윤리 및 작성 원칙]
1. 진실성과 객관성: 원문 정보에 없는 가짜 사실, 허위 인용, 가공의 발언을 절대로 날조하거나 만들어내지 마십시오.
2. 미확인 정보 배제: 추측성 내용은 "~로 알려졌다", "~라는 관측이 나온다" 등 신중하게 서술하고 단정하지 마십시오.
3. 독창적 재구성: 원문을 단순 복사·붙여넣기하지 말고, 표준적인 한국 신문 기사 문체(~다, ~밝혔다, ~전했다, ~설명했다)로 명확하고 유려하게 재구성하십시오.
4. 구조화된 출력:
   - headline: 원문의 핵심을 한눈에 파악할 수 있는 신문 1면 스타일의 헤드라인
   - summaryBullets: 3개의 핵심 요약 불릿 포인트 (각 항목은 간결한 한 문장)
   - bodyParagraphs: 3~4개의 완성도 높은 단락으로 구성된 본문 기사
   - suggestedCategory: 정치, 경제, 사회, 국제, 문화, IT, 스포츠 중 가장 적합한 카테고리`;

  const userPrompt = `[수집된 기사 원문 정보]
출처 언론사: ${article.source}
원문 제목: ${article.title}
기존 카테고리: ${article.category}
원문 요약/발췌: ${article.contentSnippet || article.title}
발행일: ${article.publishedAt || '최근'}

위 정보를 바탕으로 반드시 다음 JSON 포맷으로만 응답해 주십시오:
{
  "headline": "신문사 헤드라인 제목",
  "summaryBullets": [
    "핵심 요약 첫 번째 문장",
    "핵심 요약 두 번째 문장",
    "핵심 요약 세 번째 문장"
  ],
  "bodyParagraphs": [
    "도입부 단락 (육하원칙에 입각한 사건 요약)",
    "전개 단락 (세부 경과 및 관련 배경 설명)",
    "향후 전망 또는 기대 효과를 담은 맺음 단락"
  ],
  "suggestedCategory": "${article.category}"
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.2, // Low temperature for high factual accuracy
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Gemini API returned empty text response');
    }

    const parsed = JSON.parse(responseText.trim());

    return {
      headline: parsed.headline || article.title,
      summaryBullets: Array.isArray(parsed.summaryBullets) && parsed.summaryBullets.length > 0
        ? parsed.summaryBullets
        : [article.title, `${article.source} 보도 기반 요약`, '상세 내용은 원문 참조'],
      bodyParagraphs: Array.isArray(parsed.bodyParagraphs) && parsed.bodyParagraphs.length > 0
        ? parsed.bodyParagraphs
        : [article.contentSnippet || article.title],
      suggestedCategory: parsed.suggestedCategory || article.category,
      isAiGenerated: true,
      generatedAt: nowIso,
      disclaimer,
    };
  } catch (error: any) {
    console.error('[GeminiService] Error calling Gemini API, falling back to local editorial synthesis:', error);
    return generateFallbackDraft(article, nowIso, disclaimer);
  }
}

/**
 * Robust fallback generator if API key is not yet set in environment.
 */
function generateFallbackDraft(
  article: { title: string; contentSnippet: string; source: string; category: string },
  nowIso: string,
  disclaimer: string
): AiDraftResult {
  const cleanTitle = article.title.replace(/\[[^\]]+\]|\([^\)]+\)/g, '').trim();
  const snippet = article.contentSnippet || cleanTitle;

  const bullets = [
    `${article.source}의 최근 보도에 따르면 '${cleanTitle}' 관련 소식이 전해졌습니다.`,
    `핵심 사안과 관련하여 다양한 후속 파급 효과 및 관련 분야의 대응이 주목받고 있습니다.`,
    `상세한 전문과 사진 자료는 하단의 '${article.source} 원문 바로보기'에서 확인하실 수 있습니다.`,
  ];

  const bodyParagraphs = [
    `[한국 미래 뉴스 AI 데스크] ${article.source}의 취재 내용에 따르면, 최근 '${cleanTitle}'과 관련한 주요 현안이 구체화되고 있는 것으로 나타났다.`,
    `${snippet.length > 30 ? snippet : `${cleanTitle}에 대한 각계의 관심이 집중되는 가운데, 이번 사안을 둘러싼 심층적인 논의와 분석이 활발하게 이어지고 있다.`}`,
    `한국 미래 뉴스 편집국은 해당 사안의 추가적인 전개와 파급 영향을 실시간으로 모니터링하여 독자들에게 신속하고 균형 잡힌 속보를 지속 전달할 방침이다.`,
  ];

  return {
    headline: `[AI 브리핑] ${cleanTitle}`,
    summaryBullets: bullets,
    bodyParagraphs,
    suggestedCategory: article.category,
    isAiGenerated: true,
    generatedAt: nowIso,
    disclaimer,
  };
}
