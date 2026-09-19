import express from "express";
import cors from "cors";
import path from "path";

import router from "./routes/index";

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(express.json({ limit: "20mb" }));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
  });
});

app.use("/api", router);

// Serve the built frontend.
const frontendDist = path.resolve(process.cwd(), "dist");

app.use(express.static(frontendDist));

app.get("*", (_req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

const port = Number(process.env.PORT ?? 3001);

app.listen(port, "0.0.0.0", () => {
  console.log(`KelvinLive server running on port ${port}`);
});
