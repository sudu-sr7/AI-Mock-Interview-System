import openai from "../services/openaiService.js";

export async function generateQuestion(
  resumeSummary,
  history
) {
  const prompt = `
You are a professional interviewer for any domain.

Mentee Profile:
${resumeSummary}

Please provide mentee goal for this profile.

Previous Conversation:
${history}

Rules:
1. Ask ONE question at a time.
2. Ask professional interview or mentoring questions.
3. Mix:
   - Introduction
   - Background
   - Experience
   - Goals
   - Behavioral
4. Keep questions concise.
5. Do not give feedback.
6. Do not number questions.
`;

  const response =
    await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

  return response.choices[0].message.content;
}