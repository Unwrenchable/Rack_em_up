import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * Local hall photo storage under UPLOAD_DIR (default: ./uploads/hall-photos).
 * Accepts data-URL base64 or https URLs (passed through).
 */
@Injectable()
export class HallPhotoStorageService {
  private readonly logger = new Logger(HallPhotoStorageService.name);
  private readonly root =
    process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads', 'hall-photos');

  async resolvePhotoUrl(input: {
    hallId: string;
    photoUrl?: string;
    photoBase64?: string;
  }): Promise<string> {
    if (input.photoBase64 && input.photoBase64.startsWith('data:')) {
      return this.saveDataUrl(input.hallId, input.photoBase64);
    }
    if (input.photoUrl && (input.photoUrl.startsWith('http://') || input.photoUrl.startsWith('https://') || input.photoUrl.startsWith('/uploads/'))) {
      return input.photoUrl;
    }
    if (input.photoUrl) {
      // Treat as opaque remote URL string
      return input.photoUrl;
    }
    throw new Error('photoUrl or photoBase64 required');
  }

  private async saveDataUrl(hallId: string, dataUrl: string): Promise<string> {
    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
    if (!match) throw new Error('Invalid data URL');

    const mime = match[1];
    const b64 = match[2];
    const ext = mime.includes('png')
      ? 'png'
      : mime.includes('webp')
        ? 'webp'
        : mime.includes('gif')
          ? 'gif'
          : 'jpg';

    const dir = path.join(this.root, hallId);
    await fs.mkdir(dir, { recursive: true });

    const hash = createHash('sha1').update(b64.slice(0, 200)).digest('hex').slice(0, 8);
    const name = `${Date.now()}-${hash}-${randomUUID().slice(0, 8)}.${ext}`;
    const filePath = path.join(dir, name);
    await fs.writeFile(filePath, Buffer.from(b64, 'base64'));

    // Served via static /uploads mount in main.ts
    const publicPath = `/uploads/hall-photos/${hallId}/${name}`;
    this.logger.log(`stored hall photo ${publicPath}`);
    return publicPath;
  }
}
