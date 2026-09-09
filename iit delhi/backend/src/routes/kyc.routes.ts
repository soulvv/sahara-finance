import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  uploadDocumentMiddleware,
  verifyDocumentHandler,
} from "../controllers/kyc.controller";
import { sendError } from "../utils/response";

const router = Router();

// All KYC endpoints require active JWT authentication
router.use(authMiddleware);

// Middleware wrapper to catch Multer errors cleanly
function handleUpload(req: Request, res: Response, next: NextFunction) {
  uploadDocumentMiddleware(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return sendError(
            res,
            400,
            "FILE_TOO_LARGE",
            "File is too large. Maximum allowed size is 5MB."
          );
        }
        return sendError(res, 400, "UPLOAD_ERROR", err.message);
      }
      if (err.message && err.message.startsWith("INVALID_FILE_TYPE")) {
        return sendError(
          res,
          400,
          "INVALID_FILE_TYPE",
          "Unsupported file format. Please upload a JPG, PNG, WEBP, or PDF."
        );
      }
      return sendError(res, 400, "UPLOAD_ERROR", err.message || "Failed to process upload.");
    }
    next();
  });
}

router.post("/verify-document", handleUpload, verifyDocumentHandler);

export default router;
