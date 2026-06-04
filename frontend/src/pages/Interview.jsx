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

  const [error, setError] =
    useState("");

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

          navigate("/result");

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

        console.error(error);
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

      <div className="progress-container">

        <div
          className="progress-fill"
          style={{
            width: `${progress}%`,
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
          onChange={(e) =>
            setAnswer(
              e.target.value
            )
          }
          placeholder="Type your answer here..."
        />

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