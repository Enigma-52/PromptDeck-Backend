import express from "express";
import dotenv from "dotenv";
import defaultPgDao from "./dao/index.js";
import testRoutes from "./routes/test.js";

dotenv.config();

const app = express();

await defaultPgDao.initialize();

// JSON parser
app.use(express.json());

// Routes
app.use('/api/test', testRoutes);

// GET example
app.get("/", (req, res) => {
  res.json({ message: "server running" });
});

// POST example
app.post("/echo", (req, res) => {
  res.json({ received: req.body });
});

// Basic error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "internal server error" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
});
