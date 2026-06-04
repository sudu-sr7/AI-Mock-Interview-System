import openai from "../services/openaiService.js";

function analyzeAnswers(messages) {
  const answers = messages.filter(
    (m) => m.role === "user"
  );

  let totalWords = 0;
  let meaningfulAnswers = 0;
  let emptyAnswers = 0;

  answers.forEach((answer) => {
    const wordCount = answer.content
      .trim()
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
    stats.meaningfulAnswers === 0
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

IMPORTANT:

Scores MUST be between 0 and 100.

DO NOT use a 1-10 scale.

Identify:

1. Technical Score
2. Communication Score
3. Confidence Score
4. Overall Score
5. Strengths
6. Improvements
7. Weak Areas
8. Recommendations

Weak Areas should contain technologies,
concepts or skills that require improvement.

Examples:

[
 "Machine Learning",
 "NLP",
 "System Design",
 "REST APIs"
]

Recommendations should be specific learning suggestions.

Return ONLY valid JSON.

Format:

{
  "overallScore": 85,
  "technical": 88,
  "communication": 82,
  "confidence": 84,

  "strengths": [
    "strength 1"
  ],

  "improvements": [
    "improvement 1"
  ],

  "weakAreas": [
    "Machine Learning"
  ],

  "recommendations": [
    "Study model evaluation metrics"
  ]
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

      transcript,
    };
  }
}