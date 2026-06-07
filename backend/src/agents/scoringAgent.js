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
          "Most responses were either empty or too short to evaluate communication skills."
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
You are a senior software engineering hiring manager.

Evaluate ONLY the candidate answers.

IMPORTANT RULES:

1. Scores MUST be between 0 and 100.
2. Return ONLY valid JSON.
3. Do NOT use markdown.
4. Ignore interviewer questions while scoring.
5. If a question was skipped, apply only a small penalty.
6. Deduction analysis must be specific and understandable.
7. Do not write generic feedback like:
   "weak technical skills"
   "poor communication"

Instead explain exactly why marks were reduced.

Examples:

GOOD:
"You explained the project outcome but did not explain why LSTM was chosen over traditional machine learning algorithms."

GOOD:
"Several answers lacked examples which made it difficult to evaluate your practical experience."

BAD:
"Weak technical skills"

Return JSON in EXACT format:

{
  "overallScore": 85,
  "technical": 82,
  "communication": 88,
  "confidence": 84,

  "strengths": [
    "strength"
  ],

  "improvements": [
    "improvement"
  ],

  "weakAreas": [
    "Machine Learning"
  ],

  "recommendations": [
    "recommendation"
  ],

  "deductionAnalysis": {
    "technical": [
      "reason 1",
      "reason 2"
    ],
    "communication": [
      "reason 1",
      "reason 2"
    ],
    "confidence": [
      "reason 1",
      "reason 2"
    ]
  }
}

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

    if (
      result.overallScore <= 10 &&
      result.technical <= 10 &&
      result.communication <= 10 &&
      result.confidence <= 10
    ) {
      result.overallScore *= 10;
      result.technical *= 10;
      result.communication *= 10;
      result.confidence *= 10;
    }

    return {
      overallScore:
        result.overallScore ?? 50,

      technical:
        result.technical ?? 50,

      communication:
        result.communication ?? 50,

      confidence:
        result.confidence ?? 50,

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