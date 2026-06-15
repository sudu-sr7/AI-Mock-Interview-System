import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  sendAnswer,
  finishInterview,
} from "../api/interviewApi";

function Interview() {
  const navigate =
    useNavigate();

  const [answer, setAnswer] =
    useState("");

  const [question, setQuestion] =
    useState("");

  const [questionNumber, setQuestionNumber] =
    useState(1);

  const [seconds, setSeconds] =
    useState(1800);

  const [phase, setPhase] =
    useState("thinking");

  const [phaseTimer, setPhaseTimer] =
    useState(10);

  const [showPresencePopup, setShowPresencePopup] =
    useState(false);

  const [presenceCountdown, setPresenceCountdown] =
    useState(10);

  const [error, setError] =
    useState("");

  const [skipMessage, setSkipMessage] =
    useState("");

  const [autoSubmitting, setAutoSubmitting] =
    useState(false);

  const [isRetryQuestion, setIsRetryQuestion] =
    useState(false);

  const [remainingSkipped, setRemainingSkipped] =
    useState(0);

  const [totalSkipped, setTotalSkipped] =
    useState(0);

  const [submittedAnswers, setSubmittedAnswers] =
    useState([]);

  const normalizeText = (text) =>
    text.trim().replace(/\s+/g, " ");

  const normalizeAnswerForComparison = (text) =>
    normalizeText(text)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "");

  const countWords = (text) =>
    text
      .split(/\s+/)
      .filter(Boolean).length;

  const mostFrequentTokenRatio = (tokens) => {
    const counts = {};
    tokens.forEach((token) => {
      counts[token] = (counts[token] || 0) + 1;
    });
    return Math.max(...Object.values(counts)) / tokens.length;
  };

  const isRepeatedCharAnswer = (content) => {
    const lettersOnly = content.replace(/[^a-zA-Z]/g, "");
    if (lettersOnly.length < 5) {
      return false;
    }

    const counts = {};
    for (const char of lettersOnly.toLowerCase()) {
      counts[char] = (counts[char] || 0) + 1;
    }

    return Math.max(...Object.values(counts)) / lettersOnly.length >= 0.75;
  };

  const isRepeatedTokenAnswer = (content) => {
    const tokens = content
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    if (tokens.length < 5) {
      return false;
    }

    return mostFrequentTokenRatio(tokens) >= 0.75;
  };

  const hasLowWordVariety = (content) => {
    const tokens = content
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    if (tokens.length === 0) {
      return true;
    }

    return new Set(tokens).size / tokens.length <= 0.25;
  };

  const hasLowVowelDensity = (content) => {
    const tokens = content
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => token.replace(/[^a-z]/g, ""));

    if (tokens.length === 0) {
      return true;
    }

    const vowelTokenRatio =
      tokens.filter((token) => /[aeiou]/.test(token)).length /
      tokens.length;

    const longNoVowelTokens = tokens.filter(
      (token) => token.length >= 5 && !/[aeiou]/.test(token)
    ).length;

    const vowelPoorTokens = tokens.filter((token) => {
      if (token.length < 4) {
        return false;
      }
      const vowelCount = (token.match(/[aeiou]/g) || []).length;
      return vowelCount / token.length < 0.35;
    }).length;

    return (
      vowelTokenRatio <= 0.4 ||
      longNoVowelTokens / tokens.length >= 0.25 ||
      vowelPoorTokens / tokens.length >= 0.4
    );
  };

  const containsHedging = (content) => {
    const hedgingPhrases = [
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
    const lower = content.toLowerCase();
    return hedgingPhrases.some((phrase) => lower.includes(phrase));
  };

  const isGibberishAnswer = (content) => {
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

    if (hasLowVowelDensity(trimmed)) {
      return true;
    }

    if (wordCount >= 5 && hasLowWordVariety(trimmed)) {
      return true;
    }

    const lower = trimmed.toLowerCase();
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
      )
    ) {
      return true;
    }

    const repeatedWordPattern = /\b([a-z]{2,})\b(?:.*\b\1\b){3,}/i;
    if (repeatedWordPattern.test(trimmed)) {
      return true;
    }

    return false;
  };

  const isDuplicateAnswer = (content) => {
    const normalized = normalizeAnswerForComparison(content);
    if (!normalized) {
      return false;
    }

    return submittedAnswers.some(
      (saved) => saved === normalized
    );
  };

  useEffect(() => {
    setQuestion(
      localStorage.getItem(
        "question"
      )
    );
  }, []);

  useEffect(() => {
    const timer =
      setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }

          return prev - 1;
        });
      }, 1000);

    return () =>
      clearInterval(timer);
  }, []);

  useEffect(() => {
    setPhase("thinking");
    setPhaseTimer(10);
    setShowPresencePopup(false);
    setPresenceCountdown(10);
  }, [question]);

  useEffect(() => {
    if (autoSubmitting || showPresencePopup) {
      return;
    }

    if (phase === "thinking") {
      if (phaseTimer <= 0) {
        setPhase("inactivity");
        setPhaseTimer(30);
        return;
      }

      const bufferTimer =
        setInterval(() => {
          setPhaseTimer((prev) => {
            if (prev <= 1) {
              return 0;
            }

            return prev - 1;
          });
        }, 1000);

      return () =>
        clearInterval(bufferTimer);
    }

    if (phase === "inactivity") {
      if (phaseTimer <= 0) {
        setShowPresencePopup(true);
        setPresenceCountdown(10);
        return;
      }

      const inactivityTimer =
        setInterval(() => {
          setPhaseTimer((prev) => {
            if (prev <= 1) {
              return 0;
            }

            return prev - 1;
          });
        }, 1000);

      return () =>
        clearInterval(inactivityTimer);
    }
  }, [phase, phaseTimer, showPresencePopup, autoSubmitting]);

  useEffect(() => {
    if (!showPresencePopup || autoSubmitting) {
      return;
    }

    if (presenceCountdown <= 0) {
      handleAutoSkip();
      return;
    }

    const countdownTimer =
      setInterval(() => {
        setPresenceCountdown((prev) => {
          if (prev <= 1) {
            return 0;
          }

          return prev - 1;
        });
      }, 1000);

    return () =>
      clearInterval(countdownTimer);
  }, [showPresencePopup, presenceCountdown, autoSubmitting]);

  const resetQuestionTimer =
    () => {
      setPhase("inactivity");
      setPhaseTimer(30);
      setShowPresencePopup(false);
      setPresenceCountdown(10);
    };

  const handleAutoSkip =
    async () => {

      if (autoSubmitting)
        return;

      setShowPresencePopup(false);
      setPresenceCountdown(10);
      setAutoSubmitting(true);

      try {

        const sessionId =
          localStorage.getItem(
            "sessionId"
          );

        const response =
          await sendAnswer(
            sessionId,
            "",
            true
          );

        if (
          response.completed
        ) {

          const result =
            await finishInterview(
              sessionId
            );

          localStorage.setItem(
            "result",
            JSON.stringify(
              result
            )
          );

          navigate("/result");

          return;
        }

        setSkipMessage(
          "Question skipped due to inactivity."
        );

        setTimeout(() => {
          setSkipMessage(
            ""
          );
        }, 4000);

        setQuestion(
          response.question
        );

        setQuestionNumber(
          response.questionNumber
        );

        setIsRetryQuestion(
          response.isRetryQuestion || false
        );

        setRemainingSkipped(
          response.remainingSkipped || 0
        );

        setTotalSkipped(
          response.totalSkipped || 0
        );

        setAnswer("");

      } catch (error) {

        console.error(
          error
        );

      } finally {

        setAutoSubmitting(
          false
        );

      }
    };

  const handleSend =
    async () => {

      const cleaned =
        answer.trim();

      if (!cleaned) {

        setError(
          "Please provide an answer before continuing."
        );

        return;
      }

      if (
        cleaned.length < 25
      ) {

        setError(
          "Answer must contain at least 25 characters."
        );

        return;
      }

      if (isGibberishAnswer(cleaned)) {
        setError(
          "Please provide a meaningful, complete response instead of filler or repeated text."
        );
        return;
      }

      if (isDuplicateAnswer(cleaned)) {
        setError(
          "This answer appears to be a repeat of an earlier response. Please provide a fresh, domain-relevant answer."
        );
        return;
      }

      setError("");

      const sessionId =
        localStorage.getItem(
          "sessionId"
        );

      try {

        const response =
          await sendAnswer(
            sessionId,
            cleaned,
            false,
            isRetryQuestion
          );

        if (
          response.completed
        ) {

          const result =
            await finishInterview(
              sessionId
            );

          localStorage.setItem(
            "result",
            JSON.stringify(
              result
            )
          );

          navigate(
            "/result"
          );

          return;
        }

        setQuestion(
          response.question
        );

        setQuestionNumber(
          response.questionNumber
        );

        setIsRetryQuestion(
          response.isRetryQuestion || false
        );

        setRemainingSkipped(
          response.remainingSkipped || 0
        );

        setTotalSkipped(
          response.totalSkipped || 0
        );

        const normalizedAnswer = normalizeAnswerForComparison(cleaned);
        if (normalizedAnswer) {
          setSubmittedAnswers((prev) => [
            ...prev,
            normalizedAnswer,
          ]);
        }

        setAnswer("");

      } catch (error) {

        if (
          error?.response?.data
            ?.message
        ) {

          setError(
            error.response.data
              .message
          );

        } else {

          setError(
            "Failed to submit answer."
          );

        }

        console.error(
          error
        );
      }
    };

  const mins =
    Math.floor(
      seconds / 60
    );

  const secs =
    seconds % 60;

  const progress = (() => {
    if (!isRetryQuestion) {
      return Math.min((questionNumber / 15) * 100, 100);
    }

    const totalSteps = 15 + totalSkipped;
    const completedRetryCount =
      totalSkipped - remainingSkipped;
    const currentStep =
      15 + Math.max(0, completedRetryCount);

    return Math.min((currentStep / totalSteps) * 100, 100);
  })();
  const timerLabel =
    showPresencePopup
      ? "Are you still there?"
      : phase === "thinking"
      ? "Thinking buffer"
      : "Inactivity timer";

  const timerValue =
    showPresencePopup
      ? presenceCountdown
      : phaseTimer;

  const timerColor =
    showPresencePopup || timerValue <= 10
      ? "#ef4444"
      : "#2563eb";

  const handleContinueInterview =
    () => {
      setShowPresencePopup(false);
      setPhase("inactivity");
      setPhaseTimer(30);
      setPresenceCountdown(10);
      setSkipMessage("");
    };

  return (
    <div className="interview-page">

      <div className="top-bar">

        <div>
          ⏳ {mins}:
          {secs
            .toString()
            .padStart(2, "0")}
        </div>

        <div>
          Question {questionNumber}
          / 15
        </div>

      </div>

      <div
        style={{
          marginBottom:
            "15px",
          fontWeight:
            "600",
          color:
            timerColor,
        }}
      >
        {timerLabel}:
        {" "}
        {timerValue}s
      </div>

      <div className="progress-container">

        <div
          className="progress-fill"
          style={{
            width:
              `${progress}%`,
          }}
        />

      </div>

      <div className="question-card">

        <h3>
          AI Interviewer
        </h3>

        {isRetryQuestion && (
          <p
            style={{
              color:
                "#f59e0b",
              marginBottom:
                "12px",
              fontWeight:
                "600",
              padding:
                "10px",
              backgroundColor:
                "#fef3c7",
              borderRadius:
                "5px",
            }}
          >
            ⚠️ This is a previously skipped question. Please provide an answer now. ({remainingSkipped} more to go)
          </p>
        )}

        <p>{question}</p>

      </div>

      {showPresencePopup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "420px",
              padding: "24px",
              borderRadius: "12px",
              background: "#ffffff",
              boxShadow:
                "0 20px 60px rgba(0,0,0,0.16)",
              textAlign: "center",
            }}
          >
            <h2>Are you still there?</h2>
            <p
              style={{
                margin: "12px 0",
                color: "#374151",
              }}
            >
              Continue within {presenceCountdown}s or the
              question will be skipped automatically.
            </p>
            <button
              className="primary-btn"
              onClick={handleContinueInterview}
            >
              Continue Interview
            </button>
          </div>
        </div>
      )}

      <div className="answer-card">

        <h3>
          Your Answer
        </h3>

        <textarea
          rows="8"
          value={answer}
          onChange={(e) => {
            setAnswer(
              e.target.value
            );

            resetQuestionTimer();
          }}
          placeholder="Type your answer here..."
        />

        {skipMessage && (
          <p
            style={{
              color:
                "#f59e0b",
              marginTop:
                "10px",
              fontWeight:
                "600",
            }}
          >
            {skipMessage}
          </p>
        )}

        {error && (
          <p
            style={{
              color:
                "#ef4444",
              marginTop:
                "10px",
            }}
          >
            {error}
          </p>
        )}

        <button
          className="primary-btn"
          onClick={handleSend}
        >
          Send Answer
        </button>

      </div>

    </div>
  );
}

export default Interview;