import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { startInterview } from "../api/interviewApi";

function Home() {
  const [summary, setSummary] = useState("");

  const navigate = useNavigate();

  const handleStart = async () => {
    if (!summary.trim()) {
      alert("Please enter the mentee goal and profile.");
      return;
    }

    try {
      const data = await startInterview(summary);

      localStorage.setItem(
        "sessionId",
        data.sessionId
      );

      localStorage.setItem(
        "question",
        data.question
      );

      navigate("/interview");
    } catch (error) {
      console.error(error);
      alert("Failed to start interview");
    }
  };

  return (
    <div className="home-page">

      <div className="hero-card">

        <h1>
          JustGuide Interview Agent
        </h1>

        <p>
          AI Powered Mock Interview
          Platform
        </p>

        <textarea
          rows="10"
          value={summary}
          onChange={(e) =>
            setSummary(e.target.value)
          }
          placeholder="Please provide the mentee goal for this profile along with experience and skills..."
        />

        <button
          className="primary-btn"
          onClick={handleStart}
        >
          Start Interview
        </button>

      </div>

    </div>
  );
}

export default Home;