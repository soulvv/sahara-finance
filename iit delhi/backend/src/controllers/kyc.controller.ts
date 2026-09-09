import { Request, Response, NextFunction } from "express";
import multer, { MulterError } from "multer";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { kycService } from "../services/kyc.service";
import { sendError, sendSuccess } from "../utils/response";

// Configure secure in-memory storage for MVP document verification
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const multerUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB maximum file size
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "INVALID_FILE_TYPE: Only JPG, PNG, WEBP images and PDF documents are supported."
        )
      );
    }
  },
}).single("file");

/**
 * Safe Multer middleware wrapper that catches oversized or invalid file errors cleanly.
 */
export function uploadDocumentMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  multerUpload(req, res, (err: any) => {
    if (err instanceof MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        sendError(
          res,
          400,
          "FILE_TOO_LARGE",
          "File size exceeds the 5MB limit. Please upload a smaller image."
        );
        return;
      }
      sendError(res, 400, "UPLOAD_ERROR", err.message);
      return;
    }
    if (err) {
      sendError(
        res,
        400,
        "INVALID_FILE_TYPE",
        err.message || "Invalid file format. Please upload a JPG, PNG, or PDF."
      );
      return;
    }
    next();
  });
}

export async function verifyDocumentHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 401, "UNAUTHORIZED", "Please log in to continue.");
      return;
    }

    const documentType = (req.body.documentType || "AADHAAR").toUpperCase();

    const fileBuffer = req.file?.buffer;
    const fileName = req.file?.originalname;

    const result = await kycService.verifyDocument(
      userId,
      documentType,
      fileBuffer,
      fileName,
      req.ip,
      req.headers["user-agent"]
    );

    sendSuccess(res, result);
  } catch (error: any) {
    if (error.status && error.code) {
      sendError(res, error.status, error.code, error.message);
      return;
    }
    next(error);
  }
}
