const mongoose = require("mongoose");

const repositorySchema = new mongoose.Schema(
  {
    owner: {
      type: String,
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    fullName: {
      type: String,
      required: true,
    },

    githubUrl: {
      type: String,
      required: true,
    },

    defaultBranch: {
      type: String,
      default: "main",
    },

    status: {
      type: String,
      enum: ["pending", "indexing", "ready", "failed"],
      default: "pending",
    },

    files: [
      {
        path: {
          type: String,
        },
        type: {
          type: String,
        },
        size: {
          type: Number,
        },
        content:{
          type:String,
        }
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Repository", repositorySchema);