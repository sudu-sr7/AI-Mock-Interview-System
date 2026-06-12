import express from "express";
import { v4 as uuidv4 } from "uuid";

import Interview from "../models/Interview.js";

import {
  generateQuestion,
} from "../agents/interviewerAgent.js";

import {
  scoreInterview,
} from "../agents/scoringAgent.js";

const router = express.Router();

const MIN_QUESTIONS = 10;
const MAX_QUESTIONS = 15;
const INTERVIEW_DURATION = 30;

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

  return Math.max(...Object.values(counts)) / lettersOnly.length >= 0.75;
}

function isRepeatedTokenAnswer(content) {
  const tokens = content
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length < 5) {
    return false;
  }

  return mostFrequentTokenRatio(tokens) >= 0.75;
}

function isNonsenseAnswer(content) {
  const trimmed = normalizeText(content);
  if (!trimmed) {
    return true;
  }

  const wordCount = countWords(trimmed);
  if (wordCount === 0) {
    return true;
  }

  if (isRepeatedCharAnswer(trimmed) || isRepeatedTokenAnswer(trimmed)) {
    return true;
  }

  if (wordCount >= 20) {
    const uniqueCount = new Set(trimmed.toLowerCase().split(/\s+/).filter(Boolean)).size;
    if (uniqueCount / wordCount <= 0.25) {
      return true;
    }
  }

  const fillerText = trimmed.toLowerCase().replace(/\s+/g, "");
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
    vagueShortResponses.some((phrase) =>
      trimmed.toLowerCase() === phrase || trimmed.toLowerCase().startsWith(`${phrase} `)
    ) && wordCount < 10
  ) {
    return true;
  }

  return false;
}

router.post(
  "/start",
  async (req, res) => {
    try {
        const { resumeSummary, goal } = req.body;

        if (!resumeSummary?.trim() || !goal?.trim()) {
          return res.status(400).json({
            error:
              "Please provide both profile summary and goal.",
          });
        }

        const sessionId = uuidv4();

        const firstQuestion =
          await generateQuestion(
            resumeSummary,
            [],
            goal
          );

        await Interview.create({
          sessionId,
          resumeSummary,
          goal,
          questionCount: 1,
          startedAt: new Date(),
          messages: [
            {
              role: "assistant",
              content: firstQuestion,
            },
          ],
        });

      res.json({
        sessionId,
        question: firstQuestion,
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        error:
          "Failed to start interview",
      });

    }
  }
);

router.post(
  "/reply",
  async (req, res) => {

    try {

      const {
        sessionId,
        answer,
        skipped = false,
      } = req.body;

      const interview =
        await Interview.findOne({
          sessionId,
        });

      if (!interview) {

        return res
          .status(404)
          .json({
            message:
              "Interview not found",
          });

      }

      let finalAnswer =
        answer?.trim() || "";

      if (!skipped) {

        if (!finalAnswer) {

          return res
            .status(400)
            .json({
              message:
                "Answer cannot be empty.",
            });

        }

        if (
          finalAnswer.length < 25
        ) {

          return res
            .status(400)
            .json({
              message:
                "Please provide a more detailed answer.",
            });

        }

        if (isNonsenseAnswer(finalAnswer)) {
          return res
            .status(400)
            .json({
              message:
                "Answer appears to be invalid or filler. Please provide a meaningful response in full sentences.",
            });
        }

      } else {

        finalAnswer =
          "[Skipped due to inactivity]";

      }

      interview.messages.push({
        role: "user",
        content:
          finalAnswer,
      });

      const elapsedMinutes =
        (Date.now() -
          new Date(
            interview.startedAt
          ).getTime()) /
        1000 /
        60;

      const shouldFinish =
        elapsedMinutes >=
          INTERVIEW_DURATION ||
        interview.questionCount >=
          MAX_QUESTIONS;

      if (shouldFinish) {

        interview.completed =
          true;

        const closingMessage =
          `Thank you for taking the time to interview with us today.

We appreciate your thoughtful responses and the effort you invested throughout this discussion.

This concludes our interview session. Your performance report is now being generated and will be available shortly.

We wish you continued success in your academic and professional journey.

Have a wonderful day.`;

        interview.messages.push({
          role: "assistant",
          content:
            closingMessage,
        });

        await interview.save();

        return res.json({
          completed: true,
          closingMessage,
        });

      }

      const nextQuestion =
        await generateQuestion(
          interview.resumeSummary,
          interview.messages,
          interview.goal
        );

      interview.messages.push({
        role: "assistant",
        content:
          nextQuestion,
      });

      interview.questionCount +=
        1;

      await interview.save();

      res.json({
        completed: false,
        question:
          nextQuestion,
        questionNumber:
          interview.questionCount,
        remainingQuestions:
          MAX_QUESTIONS -
          interview.questionCount,
        skipped,
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        error:
          "Failed to process answer",
      });

    }
  }
);

router.post(
  "/finish",
  async (req, res) => {

    try {

      const { sessionId } =
        req.body;

      const interview =
        await Interview.findOne({
          sessionId,
        });

      if (!interview) {

        return res
          .status(404)
          .json({
            message:
              "Interview not found",
          });

      }

      const result =
        await scoreInterview(
          interview.messages
        );

      const transcript = [];

      for (
        let i = 0;
        i <
        interview.messages.length - 1;
        i++
      ) {

        const current =
          interview.messages[i];

        const next =
          interview.messages[i + 1];

        if (
          current.role ===
            "assistant" &&
          next.role === "user"
        ) {

          transcript.push({
            question:
              current.content,
            answer:
              next.content,
          });

        }

      }

      const finalResult = {
        ...result,
        transcript,
      };

      interview.score =
        finalResult;

      interview.completed =
        true;

      await interview.save();

      res.json(
        finalResult
      );

    } catch (error) {

      console.error(error);

      res.status(500).json({
        error:
          "Failed to evaluate interview",
      });

    }
  }
);

export default router;