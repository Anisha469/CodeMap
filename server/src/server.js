const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const repositoryRoutes = require("./routes/repositoryRoutes");

const app = express();

// Connect to MongoDB
connectDB();

// Log every incoming request
app.use((req, res, next) => {
  console.log("REQUEST:", req.method, req.url);
  next();
});

app.use(cors());
app.use(express.json());

app.use("/api/repositories", repositoryRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "CodeMap API is running"
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`CodeMap server running on port ${PORT}`);
});