import openai from "../services/openaiService.js";

const MIN_MEANINGFUL_WORDS = 15;
const REPEATED_TOKEN_RATIO_THRESHOLD = 0.75;
const REPEATED_CHAR_RATIO_THRESHOLD = 0.75;
const LOW_VARIETY_RATIO = 0.25;

function normalizeText(text) {
  return text.trim().replace(/\s+/g, " ");
}

function countWords(content) {
  return content
    .split(/\s+/)
    .filter(Boolean).length;
}

function mostFrequentTokenRatio(tokens) {
  const counts = {};
  tokens.forEach((token) => {
    counts[token] = (counts[token] || 0) + 1;
  });
  return Math.max(...Object.values(counts)) / tokens.length;
}

function isRepeatedCharAnswer(content) {
  const lettersOnly = content.replace(/[^a-zA-Z]/g, "");
  if (lettersOnly.length < 5) {
    return false;
  }

  const counts = {};
  for (const char of lettersOnly.toLowerCase()) {
    counts[char] = (counts[char] || 0) + 1;
  }

  return Math.max(...Object.values(counts)) / lettersOnly.length >= REPEATED_CHAR_RATIO_THRESHOLD;
}

function isRepeatedTokenAnswer(content) {
  const tokens = content
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length < 5) {
    return false;
  }

  return mostFrequentTokenRatio(tokens) >= REPEATED_TOKEN_RATIO_THRESHOLD;
}

function hasLowWordVariety(content) {
  const tokens = content
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) {
    return true;
  }

  return new Set(tokens).size / tokens.length <= LOW_VARIETY_RATIO;
}

const HEDGING_PHRASES = [
  "i think",
  "i guess",
  "maybe",
  "not sure",
  "could",
  "would",
  "probably",
  "sort of",
  "kind of",
  "seems",
  "perhaps",
];

function containsHedging(content) {
  const lower = content.toLowerCase();
  return HEDGING_PHRASES.some((phrase) => lower.includes(phrase));
}

function isNonsenseAnswer(content) {
  const trimmed = normalizeText(content);
  if (!trimmed) {
    return true;
  }

  if (trimmed === "[Skipped due to inactivity]") {
    return false;
  }

  const wordCount = countWords(trimmed);
  if (wordCount === 0) {
    return true;
  }

  if (isRepeatedCharAnswer(trimmed) || isRepeatedTokenAnswer(trimmed)) {
    return true;
  }

  if (wordCount >= 20 && hasLowWordVariety(trimmed)) {
    return true;
  }

  const lower = trimmed.toLowerCase();
  const fillerText = lower.replace(/\s+/g, "");
  if (/^(k+|a+|q+|asdf+|qwerty+)$/.test(fillerText)) {
    return true;
  }

  const vagueShortResponses = [
    "i think",
    "i guess",
    "maybe",
    "idk",
    "not sure",
    "i dont know",
    "whatever",
  ];

  if (
    vagueShortResponses.some(
      (phrase) => lower === phrase || lower.startsWith(`${phrase} `)
    ) && wordCount < 10
  ) {
    return true;
  }

  return false;
}

function analyzeAnswers(transcript) {
  const answerMap = {};
  const stats = {
    totalAnswers: transcript.length,
    totalWords: 0,
    meaningfulAnswers: 0,
    emptyAnswers: 0,
    skippedAnswers: [],
    invalidAnswers: [],
    hedgedAnswers: [],
    shortAnswers: [],
    lowVarietyAnswers: [],
    repeatedAnswers: [],
    duplicateAnswerGroups: [],
  };

  transcript.forEach((pair, index) => {
    const content = normalizeText(pair.answer);
    const questionNumber = index + 1;
    const answerKey = content.toLowerCase();

    answerMap[answerKey] = answerMap[answerKey] || [];
    answerMap[answerKey].push(questionNumber);

    if (content === "[Skipped due to inactivity]") {
      stats.skippedAnswers.push(questionNumber);
      return;
    }

    if (isNonsenseAnswer(content)) {
      stats.invalidAnswers.push({ questionNumber, question: pair.question });
      return;
    }

    const wordCount = countWords(content);
    stats.totalWords += wordCount;

    if (wordCount === 0) {
      stats.emptyAnswers++;
    }

    if (wordCount < MIN_MEANINGFUL_WORDS) {
      stats.shortAnswers.push({ questionNumber, question: pair.question, wordCount });
    }

    if (containsHedging(content)) {
      stats.hedgedAnswers.push({ questionNumber, phrase: content });
    }

    if (hasLowWordVariety(content)) {
      stats.lowVarietyAnswers.push({ questionNumber, question: pair.question });
    }

    if (isRepeatedTokenAnswer(content) || isRepeatedCharAnswer(content)) {
      stats.repeatedAnswers.push({ questionNumber, question: pair.question });
    }

    if (wordCount >= MIN_MEANINGFUL_WORDS) {
      stats.meaningfulAnswers++;
    }
  });

  Object.entries(answerMap).forEach(([answerText, questionNumbers]) => {
    if (answerText && questionNumbers.length > 1) {
      stats.duplicateAnswerGroups.push({
        answerPreview: answerText.slice(0, 120),
        questionNumbers,
      });
    }
  });

  return stats;
}

function buildDeductionAnalysis(stats) {
  const technical = [];
  const communication = [];
  const confidence = [];

  if (stats.totalAnswers === 0) {
    technical.push("No candidate answers were available to evaluate technical competence.");
    communication.push("No candidate answers were available to evaluate communication skills.");
    confidence.push("No candidate answers were available to evaluate confidence.");
    return { technical, communication, confidence };
  }

  if (stats.invalidAnswers.length > 0) {
    const invalidQuestions = stats.invalidAnswers.map((item) => item.questionNumber).join(", ");
    technical.push(
      `Answer(s) to question(s) ${invalidQuestions} were unclear or contained filler, so technical ability could not be evaluated reliably.`
    );
    communication.push(
      `Answer(s) to question(s) ${invalidQuestions} lacked clarity, which reduced confidence in communication skills.`
    );
  }

  if (stats.skippedAnswers.length > 0) {
    const skippedQuestions = stats.skippedAnswers.join(", ");
    communication.push(
      `Question(s) ${skippedQuestions} were skipped, interrupting the candidate's ability to convey ideas clearly.`
    );
    confidence.push(
      `Skipping question(s) ${skippedQuestions} suggested hesitation or uncertainty in the candidate's responses.`
    );
  }

  if (stats.shortAnswers.length > 0) {
    const shortQuestions = stats.shortAnswers.map((item) => item.questionNumber).join(", ");
    technical.push(
      `Question(s) ${shortQuestions} received brief answers, which limited the technical detail presented.`
    );
    communication.push(
      `Question(s) ${shortQuestions} were answered too briefly, reducing the chance to demonstrate structured thinking.`
    );
  }

  if (stats.hedgedAnswers.length > 0) {
    const hedgedQuestions = stats.hedgedAnswers.map((item) => item.questionNumber).join(", ");
    communication.push(
      `Question(s) ${hedgedQuestions} included hedging language like "maybe" or "I think", weakening perceived clarity.`
    );
    confidence.push(
      `Hedged language appeared in question(s) ${hedgedQuestions}, which reduced the impression of confidence.`
    );
  }

  if (stats.lowVarietyAnswers.length > 0) {
    const lowVarietyQuestions = stats.lowVarietyAnswers.map((item) => item.questionNumber).join(", ");
    technical.push(
      `Question(s) ${lowVarietyQuestions} used limited vocabulary, which made the answers seem less polished.`
    );
  }

  if (stats.repeatedAnswers.length > 0) {
    const repeatedQuestions = stats.repeatedAnswers.map((item) => item.questionNumber).join(", ");
    technical.push(
      `Question(s) ${repeatedQuestions} contained repetitive wording or structure, making the responses less substantive.`
    );
  }

  if (stats.duplicateAnswerGroups.length > 0) {
    const duplicateSummaries = stats.duplicateAnswerGroups
      .map((group) => group.questionNumbers.join(", "))
      .join("; ");
    technical.push(
      `The same answer was reused for question(s) ${duplicateSummaries}, so the candidate did not provide question-specific technical detail.`
    );
    communication.push(
      `The candidate repeated the same answer across question(s) ${duplicateSummaries}, reducing the sense of tailored communication.`
    );
    confidence.push(
      `Reusing identical responses for question(s) ${duplicateSummaries} made it harder to assess confidence because answers lacked specificity.`
    );
  }

  if (stats.totalWords < 75) {
    technical.push(
      "The overall response length was low, limiting the ability to show sufficient technical reasoning and examples."
    );
  }

  if (stats.meaningfulAnswers === 0) {
    technical.push(
      "There were no meaningful, detailed responses to evaluate technical depth."
    );
    communication.push(
      "There were no meaningful, detailed responses to evaluate communication."
    );
    confidence.push(
      "There were no meaningful, detailed responses to evaluate confidence."
    );
  }

  if (technical.length === 0) {
    technical.push(
      "The candidate answered clearly enough, though more technical examples would strengthen the evaluation."
    );
  }

  if (communication.length === 0) {
    communication.push(
      "The candidate communicated adequately, with room for more concise structure in future answers."
    );
  }

  if (confidence.length === 0) {
    confidence.push(
      "The responses did not show any major confidence concerns based on the available answers."
    );
  }

  return { technical, communication, confidence };
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
  const transcript =
    buildTranscript(messages);

  const stats =
    analyzeAnswers(transcript);

  if (
    stats.totalAnswers === 0 ||
    stats.meaningfulAnswers === 0
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

      deductionAnalysis: buildDeductionAnalysis(stats),

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