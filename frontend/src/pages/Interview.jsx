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

  const [questionTimer, setQuestionTimer] =
    useState(30);

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

    if (autoSubmitting)
      return;

    const inactivityTimer =
      setInterval(() => {

        setQuestionTimer(
          (prev) => {

            if (prev <= 1) {

              clearInterval(
                inactivityTimer
              );

              handleAutoSkip();

              return 0;
            }

            return prev - 1;

          }
        );

      }, 1000);

    return () =>
      clearInterval(
        inactivityTimer
      );

  }, [
    question,
    autoSubmitting,
  ]);

  const resetQuestionTimer =
    () => {
      setQuestionTimer(30);
    };

  const handleAutoSkip =
    async () => {

      if (autoSubmitting)
        return;

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

        setQuestionTimer(
          30
        );

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

        setQuestionTimer(
          30
        );

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
            questionTimer <= 10
              ? "#ef4444"
              : "#2563eb",
        }}
      >
        Next question in:
        {" "}
        {questionTimer}s
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