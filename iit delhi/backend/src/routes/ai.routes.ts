import { Router } from "express";
import { ExplainScreenService } from "../services/ai/explain-screen.service";
import { EntityExtractorService } from "../services/ai/nlp/entity-extractor.service";
import { AmbiguityResolverService } from "../services/ai/nlp/ambiguity-resolver.service";
import { PolicyService } from "../services/ai/policy/policy.service";

const router = Router();

// 1. Explain This Screen
router.get("/explain-screen", (req, res) => {
  const screen = (req.query.screen as string) || "dashboard";
  const lang = (req.query.lang as string) || "hi";
  const result = ExplainScreenService.getExplanation(screen, lang);
  res.json({ success: true, data: result });
});

router.post("/explain-screen", (req, res) => {
  const { screen = "dashboard", lang = "hi" } = req.body;
  const result = ExplainScreenService.getExplanation(screen, lang);
  res.json({ success: true, data: result });
});

// 2. Multilingual NLP Entity Extraction & Ambiguity Resolution
router.post("/nlp/parse", (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ success: false, code: "INVALID_INPUT", message: "Text query is required." });
  }

  const entities = EntityExtractorService.extract(text);
  const ambiguity = AmbiguityResolverService.checkAmbiguity(text, entities);

  res.json({
    success: true,
    data: {
      rawText: text,
      entities,
      ambiguity,
    },
  });
});

// 3. AI Policy Firewall & Prompt Injection Check
router.post("/policy/validate", (req, res) => {
  const { prompt, actionType, amount, recipientUpi } = req.body;
  if (!prompt && !actionType) {
    return res.status(400).json({ success: false, code: "INVALID_INPUT", message: "Prompt or actionType is required." });
  }

  // Detect malicious prompt injections
  const isMalicious = /ignore\s+(all\s+)?(previous\s+)?instructions|transfer\s+without\s+confirmation|bypass\s+security|direct\s+debit|hack/i.test(prompt || "");

  const effectiveType = isMalicious ? "UNAUTHORIZED_INJECTION" : (actionType || "NAVIGATE");
  const result = PolicyService.evaluate(effectiveType, {
    prompt,
    amount: amount ? Number(amount) : undefined,
    recipientUpi,
  });

  res.json({
    success: true,
    data: {
      ...result,
      isInjectionBlocked: isMalicious,
    },
  });
});

export default router;
