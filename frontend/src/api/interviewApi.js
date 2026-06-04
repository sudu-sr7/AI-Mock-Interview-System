import axios from "axios";

const API =
  axios.create({
    baseURL:
      "http://localhost:5000/api/interview",
  });

export const startInterview =
  async (resumeSummary) => {

    const res =
      await API.post(
        "/start",
        {
          resumeSummary,
        }
      );

    return res.data;
  };

export const sendAnswer =
  async (
    sessionId,
    answer
  ) => {

    const res =
      await API.post(
        "/reply",
        {
          sessionId,
          answer,
        }
      );

    return res.data;
  };

export const finishInterview =
  async (sessionId) => {

    const res =
      await API.post(
        "/finish",
        {
          sessionId,
        }
      );

    return res.data;
  };