import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { open, unlink } from 'node:fs/promises';
import path from 'node:path';

import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';

import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { ValidationError } from '../errors/app_error';

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const EXTENSION: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

// The file's own first bytes, so a renamed or mislabelled file cannot pass as an image.
export function detectImageType(head: Buffer): string | null {
  if (head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image/jpeg';
  if (head.toString('ascii', 0, 4) === 'RIFF' && head.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

const imageError = (field: string, message: string) =>
  new ValidationError({ [field]: [message] }, message);

// Saves one image under UPLOADS_DIR/<folder> with a random name, then checks its real type.
// Server disk is a stopgap (owner's choice): files are lost if the server is rebuilt.
export function imageUpload(folder: string, field: string) {
  const directory = path.resolve(env.UPLOADS_DIR, folder);
  mkdirSync(directory, { recursive: true });

  const upload = multer({
    storage: multer.diskStorage({
      destination: directory,
      filename: (_req, file, done) => done(null, `${randomUUID()}.${EXTENSION[file.mimetype]}`),
    }),
    limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 0 },
    fileFilter: (_req, file, done) =>
      file.mimetype in EXTENSION
        ? done(null, true)
        : done(imageError(field, 'Upload a PNG, JPEG or WebP image.')),
  }).single(field);

  return (req: Request, res: Response, next: NextFunction) => {
    upload(req, res, async (error: unknown) => {
      if (error instanceof multer.MulterError) {
        return next(
          imageError(
            field,
            error.code === 'LIMIT_FILE_SIZE'
              ? 'The image must be 2 MB or smaller.'
              : 'Send one image in the form field.',
          ),
        );
      }
      if (error) return next(error);
      if (!req.file) return next(imageError(field, 'Choose an image to upload.'));

      const handle = await open(req.file.path, 'r');
      const head = Buffer.alloc(12);
      await handle.read(head, 0, 12, 0);
      await handle.close();
      if (detectImageType(head) !== req.file.mimetype) {
        await removeUpload(req.file.path);
        return next(imageError(field, 'This file is not a valid PNG, JPEG or WebP image.'));
      }
      return next();
    });
  };
}

// Stored paths are relative to UPLOADS_DIR, e.g. "organisation-logos/<uuid>.png".
export const toStoredPath = (absolute: string) =>
  path.relative(path.resolve(env.UPLOADS_DIR), absolute).split(path.sep).join('/');

export const publicUploadUrl = (stored: string | null) =>
  stored ? `${env.PUBLIC_BASE_URL.replace(/\/$/, '')}/uploads/${stored}` : null;

export async function removeUpload(absoluteOrStored: string) {
  const target = path.isAbsolute(absoluteOrStored)
    ? absoluteOrStored
    : path.resolve(env.UPLOADS_DIR, absoluteOrStored);
  await unlink(target).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') logger.warn({ err: error }, 'Could not remove an uploaded file.');
  });
}
