import { Router, type IRouter } from "express";

import aiRouter from "./ai";
import creatorRouter from "./creator";

const router: IRouter = Router();

router.use("/creator", creatorRouter);
router.use("/ai", aiRouter);

export default router;
