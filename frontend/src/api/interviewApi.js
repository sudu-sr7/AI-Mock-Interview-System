import axios from "axios";

const API =
  `${import.meta.env.VITE_API_URL}/api/interview`;

export const startInterview = async (
  resumeSummary,
  goal
) => {

  const response =
    await axios.post(
      `${API}/start`,
      {
        resumeSummary,
        goal,
      }
    );

  return response.data;
};

export const sendAnswer = async (
  sessionId,
  answer,
  skipped = false,
  retry = false
) => {

  const response =
    await axios.post(
      `${API}/reply`,
      {
        sessionId,
        answer,
        skipped,
        retry,
      }
    );

  return response.data;
};

export const finishInterview = async (
  sessionId
) => {

  const response =
    await axios.post(
      `${API}/finish`,
      {
        sessionId,
      }
    );

  return response.data;
};