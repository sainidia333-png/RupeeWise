
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/authRoutes");
const authMiddleware = require("./middleware/authMiddleware");
const stockRoutes = require("./routes/stockRoutes");
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/stocks", stockRoutes);
app.get("/", (req, res) => {
  res.send("Welcome to RupeeWise API!");
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "RupeeWise backend is running!"
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully!");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
  }
}
app.get("/api/protected", authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: "You have accessed a protected route!",
    userId: req.user.userId
  });
});
startServer();
