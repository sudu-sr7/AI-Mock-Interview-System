import openai from "../services/openaiService.js";

function analyzeAnswers(messages) {
  const answers = messages.filter(
    (m) => m.role === "user"
  );

  let totalWords = 0;
  let meaningfulAnswers = 0;
  let emptyAnswers = 0;
  let skippedAnswers = 0;

  answers.forEach((answer) => {
    const content =
      answer.content.trim();

    if (
      content ===
      "[Skipped due to inactivity]"
    ) {
      skippedAnswers++;
      return;
    }

    const wordCount = content
      .split(/\s+/)
      .filter(Boolean).length;

    totalWords += wordCount;

    if (wordCount === 0) {
      emptyAnswers++;
    }

    if (wordCount >= 15) {
      meaningfulAnswers++;
    }
  });

  return {
    totalAnswers: answers.length,
    totalWords,
    meaningfulAnswers,
    emptyAnswers,
    skippedAnswers,
  };
}

function buildTranscript(messages) {
  const transcript = [];

  for (let i = 0; i < messages.length; i++) {
    const current = messages[i];
    const next = messages[i + 1];

    if (
      current.role === "assistant" &&
      next &&
      next.role === "user"
    ) {
      transcript.push({
        question: current.content,
        answer: next.content,
      });
    }
  }

  return transcript;
}

export async function scoreInterview(
  messages
) {
  const stats =
    analyzeAnswers(messages);

  const transcript =
    buildTranscript(messages);

  if (
    stats.totalAnswers === 0 ||
    (
      stats.meaningfulAnswers === 0 &&
      stats.skippedAnswers === 0
    )
  ) {
    return {
      overallScore: 5,

      technical: 5,
      communication: 5,
      confidence: 5,

      criticalThinking: 5,
      leadership: 5,
      emotionalIntelligence: 5,
      cultureFit: 5,

      interviewPerformanceScore: 5,
      jobFitScore: 5,
      careerGrowthPotentialScore: 5,
      employabilityScore: 5,

      recommendation:
        "Needs Significant Improvement",

      strengths: [],

      improvements: [
        "Provide complete answers",
        "Explain projects in detail",
        "Demonstrate technical knowledge",
        "Answer questions meaningfully",
      ],

      weakAreas: [
        "Technical Knowledge",
        "Communication",
        "Problem Solving",
      ],

      recommendations: [
        "Practice mock interviews",
        "Review core technical concepts",
      ],

      deductionAnalysis: {
        technical: [
          "No meaningful technical responses were provided during the interview."
        ],
        communication: [
          "Most responses were too short or incomplete to evaluate communication ability."
        ],
        confidence: [
          "There was insufficient information to assess confidence accurately."
        ],
      },

      transcript,
    };
  }

  const conversation =
    messages
      .map(
        (m) =>
          `${m.role.toUpperCase()}: ${m.content}`
      )
      .join("\n\n");

  const prompt = `
You are a senior engineering hiring manager.

Evaluate ONLY the candidate answers.

IMPORTANT RULES

1. Every score MUST be between 0 and 100.
2. Return ONLY valid JSON.
3. No markdown.
4. Ignore interviewer questions.
5. Skipped questions should receive only a small penalty.
6. Deduction analysis must be specific and understandable.
7. Explain WHY marks were reduced.

Return JSON in EXACT format:

{
  "overallScore": 82,

  "technical": 78,
  "communication": 85,
  "confidence": 79,

  "criticalThinking": 80,
  "leadership": 84,
  "emotionalIntelligence": 88,
  "cultureFit": 83,

  "interviewPerformanceScore": 82,
  "jobFitScore": 84,
  "careerGrowthPotentialScore": 89,
  "employabilityScore": 81,

  "recommendation": "Strong Candidate",

  "strengths": [],
  "improvements": [],
  "weakAreas": [],
  "recommendations": [],

  "deductionAnalysis": {
    "technical": [],
    "communication": [],
    "confidence": []
  }
}

Recommendation must be one of:

"Outstanding Candidate"
"Strong Candidate"
"Recommended"
"Borderline"
"Needs Improvement"

Interview Conversation:

${conversation}
`;

  try {

    const response =
      await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.2,
      });

    const cleaned =
      response.choices[0].message.content
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

    const result =
      JSON.parse(cleaned);

    return {
      overallScore:
        result.overallScore ?? 50,

      technical:
        result.technical ?? 50,

      communication:
        result.communication ?? 50,

      confidence:
        result.confidence ?? 50,

      criticalThinking:
        result.criticalThinking ?? 50,

      leadership:
        result.leadership ?? 50,

      emotionalIntelligence:
        result.emotionalIntelligence ?? 50,

      cultureFit:
        result.cultureFit ?? 50,

      interviewPerformanceScore:
        result.interviewPerformanceScore ?? 50,

      jobFitScore:
        result.jobFitScore ?? 50,

      careerGrowthPotentialScore:
        result.careerGrowthPotentialScore ?? 50,

      employabilityScore:
        result.employabilityScore ?? 50,

      recommendation:
        result.recommendation ??
        "Recommended",

      strengths:
        result.strengths ?? [],

      improvements:
        result.improvements ?? [],

      weakAreas:
        result.weakAreas ?? [],

      recommendations:
        result.recommendations ?? [],

      deductionAnalysis:
        result.deductionAnalysis ?? {
          technical: [],
          communication: [],
          confidence: [],
        },

      transcript,
    };

  } catch (error) {

    console.error(
      "Scoring Error:",
      error
    );

    return {
      overallScore: 50,

      technical: 50,
      communication: 50,
      confidence: 50,

      criticalThinking: 50,
      leadership: 50,
      emotionalIntelligence: 50,
      cultureFit: 50,

      interviewPerformanceScore: 50,
      jobFitScore: 50,
      careerGrowthPotentialScore: 50,
      employabilityScore: 50,

      recommendation:
        "Recommended",

      strengths: [
        "Interview completed",
      ],

      improvements: [
        "Unable to generate detailed evaluation",
      ],

      weakAreas: [],

      recommendations: [],

      deductionAnalysis: {
        technical: [],
        communication: [],
        confidence: [],
      },

      transcript,
    };
  }
}