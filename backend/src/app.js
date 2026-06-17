import express from "express";
import cors from "cors";

import interviewRoutes from "./routes/interviewRoutes.js";

import {
  memoryProfilerMiddleware,
  getMemoryReport,
} from "./profiling/memoryProfiler.js";

const app = express();

app.use(cors());
app.use(express.json());

// Memory profiler — must come before routes
app.use(memoryProfilerMiddleware);

// Application routes
app.use("/api/interview", interviewRoutes);

// Live memory report endpoint
app.get("/debug/memory", (_req, res) => {
  res.json(getMemoryReport());
});

export default app;