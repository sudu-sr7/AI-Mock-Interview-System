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

      setError("");

      const sessionId =
        localStorage.getItem(
          "sessionId"
        );

      try {

        const response =
          await sendAnswer(
            sessionId,
            cleaned
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

  const progress =
    (questionNumber / 15) *
    100;

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