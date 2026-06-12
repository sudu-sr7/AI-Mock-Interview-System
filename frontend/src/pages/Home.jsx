import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { startInterview } from "../api/interviewApi";

function Home() {
  const [summary, setSummary] = useState("");
  const [goal, setGoal] = useState("");

  const navigate = useNavigate();

  const handleStart = async () => {
    if (!summary.trim() || !goal.trim()) {
      alert("Please enter both the mentee profile summary and goal.");
      return;
    }

    try {
      const data = await startInterview(summary, goal);

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
          placeholder="Please provide the mentee profile summary, experience, and skills..."
        />

        <textarea
          rows="4"
          value={goal}
          onChange={(e) =>
            setGoal(e.target.value)
          }
          placeholder="Please provide the mentee goal for this interview session..."
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