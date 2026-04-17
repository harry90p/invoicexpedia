import { Router, type IRouter } from "express";
import healthRouter from "./health";
import invoicesRouter from "./invoices";
import clientsRouter from "./clients";
import reportsRouter from "./reports";
import settingsRouter from "./settings";
import tourSuggestionsRouter from "./tour-suggestions";
import citySearchRouter from "./city-search";
import creditNotesRouter from "./credit-notes";

const router: IRouter = Router();

router.use(healthRouter);
router.use(invoicesRouter);
router.use(clientsRouter);
router.use(reportsRouter);
router.use(settingsRouter);
router.use(tourSuggestionsRouter);
router.use(citySearchRouter);
router.use(creditNotesRouter);

export default router;
