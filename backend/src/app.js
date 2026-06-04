import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import interviewRoutes from "./routes/interviewRoutes.js";

const app = express();

app.use(cors());

app.use(express.json());

app.use(
  "/api/interview",
  interviewRoutes
);

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);

const frontendPath = path.join(
  __dirname,
  "../../frontend/dist"
);

app.use(
  express.static(frontendPath)
);

app.get("*", (req, res) => {
  res.sendFile(
    path.join(
      frontendPath,
      "index.html"
    )
  );
});

export default app;