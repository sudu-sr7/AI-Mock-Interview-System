import axios from "axios";

const API =
  `${import.meta.env.VITE_API_URL}/api/interview`;

export const startInterview = async (
  resumeSummary
) => {

  const response =
    await axios.post(
      `${API}/start`,
      {
        resumeSummary,
      }
    );

  return response.data;
};

export const sendAnswer = async (
  sessionId,
  answer,
  skipped = false
) => {

  const response =
    await axios.post(
      `${API}/reply`,
      {
        sessionId,
        answer,
        skipped,
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