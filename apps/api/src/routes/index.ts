import { Router, type IRouter } from "express";

import aiRouter from "./ai";
import creatorRouter from "./creator";
import decartRouter from "./decart";

const router: IRouter = Router();

router.use("/creator", creatorRouter);
router.use("/ai", aiRouter);
router.use("/decart", decartRouter);

export default router;
