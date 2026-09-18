import express from "express";
import cors from "cors";

import router from "./routes/index";

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
  });
});

app.use("/api", router);

const port = Number(process.env.PORT ?? 3001);

app.listen(port, "0.0.0.0", () => {
  console.log(`API server running on port ${port}`);
});
