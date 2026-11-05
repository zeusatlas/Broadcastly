import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';

import { ValidationError } from '../../common/errors/app_error';
import { env } from '../../config/env';

import { detectImportFileType, ImportFileError } from './import_file';
import type { UploadedSpreadsheet } from './member_import_service';

const FIELD = 'file';
const fileError = (message: string) => new ValidationError({ [FIELD]: [message] }, message);

// Held in memory only until its real type is checked; the service then writes it to private storage.
export function spreadsheetUpload() {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: env.MEMBER_IMPORT_MAX_BYTES, files: 1, fields: 4 },
  }).single(FIELD);
  const maxMegabytes = Math.round((env.MEMBER_IMPORT_MAX_BYTES / (1024 * 1024)) * 10) / 10;

  return (req: Request, res: Response, next: NextFunction) => {
    upload(req, res, (error: unknown) => {
      if (error instanceof multer.MulterError) {
        return next(
          fileError(
            error.code === 'LIMIT_FILE_SIZE'
              ? `The file must be ${maxMegabytes} MB or smaller.`
              : 'Send one .csv or .xlsx file in the form field "file".',
          ),
        );
      }
      if (error) return next(error);
      if (!req.file) return next(fileError('Choose a .csv or .xlsx file to upload.'));

      try {
        const spreadsheet: UploadedSpreadsheet = {
          buffer: req.file.buffer,
          fileName: req.file.originalname,
          fileType: detectImportFileType(req.file.buffer, req.file.originalname),
        };
        res.locals.spreadsheet = spreadsheet;
      } catch (caught) {
        return next(caught instanceof ImportFileError ? fileError(caught.message) : caught);
      }
      return next();
    });
  };
}
