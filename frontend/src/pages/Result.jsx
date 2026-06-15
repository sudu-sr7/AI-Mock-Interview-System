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

      <div
        className="recommendation-badge"
      >
        {result.recommendation}
      </div>

      <h2
        style={{
          marginTop: "30px",
          marginBottom: "20px",
          textAlign: "center",
        }}
      >
        Core Interview Scores
      </h2>

      <div className="score-grid">

        <div className="score-box">
          <h3>Domain Knowledge</h3>
          <h2>
            {result.domainKnowledge ?? result.technical}%
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

      <h2
        style={{
          marginTop: "20px",
          marginBottom: "20px",
          textAlign: "center",
        }}
      >
        Hiring Assessment
      </h2>

      <div className="score-grid">

        <div className="score-box">
          <h3>
            Interview Performance
          </h3>
          <h2>
            {result.interviewPerformanceScore}%
          </h2>
        </div>

        <div className="score-box">
          <h3>
            Job Fit
          </h3>
          <h2>
            {result.jobFitScore}%
          </h2>
        </div>

        <div className="score-box">
          <h3>
            Growth Potential
          </h3>
          <h2>
            {result.careerGrowthPotentialScore}%
          </h2>
        </div>

        <div className="score-box">
          <h3>
            Employability
          </h3>
          <h2>
            {result.employabilityScore}%
          </h2>
        </div>

      </div>

      <h2
        style={{
          marginTop: "20px",
          marginBottom: "20px",
          textAlign: "center",
        }}
      >
        Professional Competencies
      </h2>

      <div className="score-grid">

        <div className="score-box">
          <h3>
            Critical Thinking
          </h3>
          <h2>
            {result.criticalThinking}%
          </h2>
        </div>

        <div className="score-box">
          <h3>
            Leadership
          </h3>
          <h2>
            {result.leadership}%
          </h2>
        </div>

        <div className="score-box">
          <h3>
            Emotional Intelligence
          </h3>
          <h2>
            {result.emotionalIntelligence}%
          </h2>
        </div>

        <div className="score-box">
          <h3>
            Culture Fit
          </h3>
          <h2>
            {result.cultureFit}%
          </h2>
        </div>

      </div>

      <div
        style={{
          textAlign: "center",
          marginBottom: "35px",
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
              Domain Knowledge Analysis
            </h2>

            <ul>
              {result
                ?.deductionAnalysis
                ?.domainKnowledge
                ?.
                map(
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
              Communication Analysis
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
              Confidence Analysis
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

        {(() => {
          const answeredQuestions = [];
          const skippedQuestions = [];

          result.transcript?.forEach(
            (item, index) => {
              const questionNumber = index + 1;
              const itemWithNumber = {
                ...item,
                questionNumber,
              };

              if (
                item.answer ===
                "[Skipped due to inactivity]"
              ) {
                skippedQuestions.push(
                  itemWithNumber
                );
              } else {
                answeredQuestions.push(
                  itemWithNumber
                );
              }
            }
          );

          const allQuestions = [
            ...answeredQuestions,
            ...skippedQuestions,
          ];

          return allQuestions.map(
            (item) => (
              <div
                key={
                  item.questionNumber
                }
                className="transcript-card"
              >

                <h3>
                  Answer{" "}
                  {
                    item
                      .questionNumber
                  }
                </h3>

                <p>
                  {item.answer}
                </p>

                <h3>
                  Question{" "}
                  {
                    item
                      .questionNumber
                  }
                </h3>

                <p>
                  {item.question}
                </p>

              </div>
            )
          );
        })()}

      </div>

    </div>
  );
}

export default Result;