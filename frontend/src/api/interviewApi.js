import axios from "axios";

const API =
  "/api/interview";

export const startInterview =
  async (resumeSummary) => {
    const response =
      await axios.post(
        `${API}/start`,
        {
          resumeSummary,
        }
      );

    return response.data;
  };

export const sendAnswer =
  async (
    sessionId,
    answer
  ) => {
    const response =
      await axios.post(
        `${API}/reply`,
        {
          sessionId,
          answer,
        }
      );

    return response.data;
  };

export const finishInterview =
  async (
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