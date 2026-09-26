import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { errorResponse } from '../utils/response.js';
import { commitInventoryImport, validateInventoryFile } from '../services/inventoryImport.js';
import { emitDashboardUpdate } from '../sockets/index.js';
import { processLowStockAlerts } from '../services/emailService.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

function fileFromRequest(req: Express.Request) {
  return (req as Express.Request & { file?: Express.Multer.File }).file;
}

router.post('/import/inventory/validate', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    const file = fileFromRequest(req);
    if (!file) return res.status(400).json(errorResponse('Select a CSV or XLSX file to continue.', 'MISSING_FILE'));
    let validation;
    try {
      validation = await validateInventoryFile(file.buffer, file.originalname);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to parse the uploaded file.';
      return res.status(400).json(errorResponse(message, 'INVALID_IMPORT_FILE'));
    }
    if (validation.missingHeaders.length) {
      return res.status(200).json({ ...validation, headerError: `Missing columns: ${validation.missingHeaders.join(', ')}` });
    }
    return res.json(validation);
  } catch (error) {
    next(error);
  }
});

router.post('/import/inventory', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    const file = fileFromRequest(req);
    if (!file) return res.status(400).json(errorResponse('Select a CSV or XLSX file to continue.', 'MISSING_FILE'));
    let validation;
    try {
      validation = await validateInventoryFile(file.buffer, file.originalname);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to parse the uploaded file.';
      return res.status(400).json(errorResponse(message, 'INVALID_IMPORT_FILE'));
    }
    if (validation.missingHeaders.length || validation.invalidRows > 0) {
      return res.status(422).json({
        ...errorResponse('Import blocked. Correct all invalid rows and upload the corrected file.', 'IMPORT_VALIDATION_FAILED'),
        summary: validation,
      });
    }
    const imported = await commitInventoryImport(validation, req.user!.id);
    emitDashboardUpdate({ type: 'stock.imported', totalRows: validation.totalRows });
    void processLowStockAlerts(imported.affectedStock).catch((error: unknown) => {
      console.error('StockSense low-stock email failed:', error instanceof Error ? error.message : 'unknown error');
    });
    return res.json({ success: true, ...imported, totalRows: validation.totalRows });
  } catch (error) {
    next(error);
  }
});

export default router;