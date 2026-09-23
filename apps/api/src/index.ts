import express from "express";
import cors from "cors";
import path from "path";
import { clerkMiddleware } from "@clerk/express";

import router from "./routes/index.js";

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(express.json({ limit: "20mb" }));

// Clerk authentication middleware.
app.use(clerkMiddleware());

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
  });
});

app.use("/api", router);

// Serve the built frontend.
const frontendDist = path.resolve(process.cwd(), "dist");

app.use(express.static(frontendDist));

// SPA fallback.
// Express 5 does not accept app.get("*").
app.use((_req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

const port = Number(process.env.PORT ?? 3001);

app.listen(port, "0.0.0.0", () => {
  console.log(`KelvinLive server running on port ${port}`);
});
