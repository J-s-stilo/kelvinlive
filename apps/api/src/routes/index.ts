import { Router, type IRouter } from "express";

import aiRouter from "./ai";
import creatorRouter from "./creator";
import lucyRouter from "./lucy";

const router: IRouter = Router();

router.use("/creator", creatorRouter);
router.use("/ai", aiRouter);
router.use("/lucy", lucyRouter);

export default router;
