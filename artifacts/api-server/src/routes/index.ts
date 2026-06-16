import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import draftsRouter from "./drafts";
import creatorsRouter from "./creators";
import transcribeRouter from "./transcribe";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profileRouter);
router.use(draftsRouter);
router.use(creatorsRouter);
router.use(transcribeRouter);

export default router;
