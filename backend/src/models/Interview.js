import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  role: String,
  content: String,
});

const interviewSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
    },

    resumeSummary: String,

    messages: [messageSchema],

    questionCount: {
      type: Number,
      default: 0,
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    completed: {
      type: Boolean,
      default: false,
    },

    score: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "Interview",
  interviewSchema
);