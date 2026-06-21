import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import draftsRouter from "./drafts";
import creatorsRouter from "./creators";
import transcribeRouter from "./transcribe";
import generateRouter from "./generate";
import analyseVoiceRouter from "./analyse-voice";
import orgsRouter from "./orgs";
import feedRouter from "./feed";
import voiceProfileRouter from "./voice-profile";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profileRouter);
router.use(draftsRouter);
router.use(creatorsRouter);
router.use(transcribeRouter);
router.use(generateRouter);
router.use(analyseVoiceRouter);
router.use(orgsRouter);
router.use(feedRouter);
router.use(voiceProfileRouter);

export default router;
