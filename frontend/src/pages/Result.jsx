import { useState } from "react";

function Result() {

  const result =
    JSON.parse(
      localStorage.getItem(
        "result"
      )
    );

  const [
    showAnalysis,
    setShowAnalysis,
  ] = useState(false);

  return (
    <div className="result-page">

      <div className="score-circle">
        {result.overallScore}%
      </div>

      <h1>
        Interview Report
      </h1>

      <div className="score-grid">

        <div className="score-box">
          <h3>Technical</h3>
          <h2>
            {result.technical}%
          </h2>
        </div>

        <div className="score-box">
          <h3>Communication</h3>
          <h2>
            {result.communication}%
          </h2>
        </div>

        <div className="score-box">
          <h3>Confidence</h3>
          <h2>
            {result.confidence}%
          </h2>
        </div>

      </div>

      <div
        style={{
          textAlign:
            "center",
          marginBottom:
            "35px",
        }}
      >
        <button
          className="primary-btn"
          onClick={() =>
            setShowAnalysis(
              !showAnalysis
            )
          }
        >
          {showAnalysis
            ? "Hide Deduction Analysis"
            : "Why Were Marks Deducted?"}
        </button>
      </div>

      {showAnalysis && (

        <div className="deduction-section">

          <div className="deduction-card">

            <h2>
              Technical Score Analysis
            </h2>

            <ul>
              {result
                ?.deductionAnalysis
                ?.technical
                ?.map(
                  (
                    item,
                    index
                  ) => (
                    <li
                      key={index}
                    >
                      {item}
                    </li>
                  )
                )}
            </ul>

          </div>

          <div className="deduction-card">

            <h2>
              Communication Score Analysis
            </h2>

            <ul>
              {result
                ?.deductionAnalysis
                ?.communication
                ?.map(
                  (
                    item,
                    index
                  ) => (
                    <li
                      key={index}
                    >
                      {item}
                    </li>
                  )
                )}
            </ul>

          </div>

          <div className="deduction-card">

            <h2>
              Confidence Score Analysis
            </h2>

            <ul>
              {result
                ?.deductionAnalysis
                ?.confidence
                ?.map(
                  (
                    item,
                    index
                  ) => (
                    <li
                      key={index}
                    >
                      {item}
                    </li>
                  )
                )}
            </ul>

          </div>

        </div>

      )}

      <div className="feedback-section">

        <div>

          <h2>
            Strengths
          </h2>

          <ul>
            {result.strengths?.map(
              (
                item,
                index
              ) => (
                <li key={index}>
                  {item}
                </li>
              )
            )}
          </ul>

        </div>

        <div>

          <h2>
            Improvements
          </h2>

          <ul>
            {result.improvements?.map(
              (
                item,
                index
              ) => (
                <li key={index}>
                  {item}
                </li>
              )
            )}
          </ul>

        </div>

      </div>

      <div className="feedback-section">

        <div>

          <h2>
            Weak Areas
          </h2>

          <ul>
            {result.weakAreas?.map(
              (
                item,
                index
              ) => (
                <li key={index}>
                  {item}
                </li>
              )
            )}
          </ul>

        </div>

        <div>

          <h2>
            Recommendations
          </h2>

          <ul>
            {result.recommendations?.map(
              (
                item,
                index
              ) => (
                <li key={index}>
                  {item}
                </li>
              )
            )}
          </ul>

        </div>

      </div>

      <div className="transcript-section">

        <h2>
          Interview Transcript
        </h2>

        {result.transcript?.map(
          (
            item,
            index
          ) => (
            <div
              key={index}
              className="transcript-card"
            >

              <h3>
                Question {index + 1}
              </h3>

              <p>
                {item.question}
              </p>

              <h3>
                Answer {index + 1}
              </h3>

              <p>
                {item.answer}
              </p>

            </div>
          )
        )}

      </div>

    </div>
  );
}

export default Result;