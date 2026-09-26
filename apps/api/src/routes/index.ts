import { Router, type IRouter } from "express";

import aiRouter from "./ai";
import creatorRouter from "./creator";
import falRouter from "./fal";

const router: IRouter = Router();

router.use("/creator", creatorRouter);
router.use("/ai", aiRouter);
router.use("/fal", falRouter);

export default router;
