import { Injectable, Logger } from '@nestjs/common';
import { ObjectStorageService } from '../../common/object-storage.service';

/**
 * Hall photo storage via ObjectStorageService (local or S3).
 * Accepts data-URL base64 or https /uploads URLs (passed through).
 */
@Injectable()
export class HallPhotoStorageService {
  private readonly logger = new Logger(HallPhotoStorageService.name);

  constructor(private readonly storage: ObjectStorageService) {}

  async resolvePhotoUrl(input: {
    hallId: string;
    photoUrl?: string;
    photoBase64?: string;
  }): Promise<string> {
    if (input.photoBase64 && input.photoBase64.startsWith('data:')) {
      const put = await this.storage.putDataUrl(input.hallId, input.photoBase64);
      this.logger.log(`hall photo via ${put.backend}: ${put.url}`);
      return put.url;
    }
    if (
      input.photoUrl &&
      (input.photoUrl.startsWith('http://') ||
        input.photoUrl.startsWith('https://') ||
        input.photoUrl.startsWith('/uploads/'))
    ) {
      return input.photoUrl;
    }
    if (input.photoUrl) {
      return input.photoUrl;
    }
    throw new Error('photoUrl or photoBase64 required');
  }
}
