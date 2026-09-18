import { Router, type IRouter } from "express";

import creatorRouter from "./creator";

const router: IRouter = Router();

router.use("/creator", creatorRouter);

export default router;
