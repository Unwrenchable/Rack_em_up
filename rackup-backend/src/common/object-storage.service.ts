import { Injectable, Logger } from '@nestjs/common';
import { createHash, createHmac, randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';

export type ObjectStorageBackend = 'local' | 's3';

export type PutObjectResult = {
  backend: ObjectStorageBackend;
  /** Public or app-relative URL */
  url: string;
  key: string;
  bucket?: string;
};

/**
 * Unified object storage: local disk (default) or S3-compatible (AWS / R2 / MinIO).
 *
 * Env:
 *   STORAGE_BACKEND=local|s3          (default local)
 *   UPLOAD_DIR=./uploads/hall-photos
 *   S3_BUCKET=
 *   S3_REGION=us-east-1
 *   S3_ACCESS_KEY_ID=
 *   S3_SECRET_ACCESS_KEY=
 *   S3_ENDPOINT=                      (optional custom endpoint, e.g. R2/MinIO)
 *   S3_PUBLIC_BASE_URL=               (optional CDN / public base for returned URLs)
 *   S3_FORCE_PATH_STYLE=true|false
 */
@Injectable()
export class ObjectStorageService {
  private readonly logger = new Logger(ObjectStorageService.name);
  private readonly localRoot =
    process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads', 'hall-photos');

  backend(): ObjectStorageBackend {
    const b = (process.env.STORAGE_BACKEND ?? 'local').toLowerCase();
    if (b === 's3' && process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID) {
      return 's3';
    }
    return 'local';
  }

  /**
   * Store image bytes under prefix/key. Returns a URL the app can serve or link.
   */
  async putImage(input: {
    prefix: string;
    filename: string;
    body: Buffer;
    contentType: string;
  }): Promise<PutObjectResult> {
    const key = `${input.prefix.replace(/^\/+|\/+$/g, '')}/${input.filename}`;
    if (this.backend() === 's3') {
      try {
        return await this.putS3(key, input.body, input.contentType);
      } catch (e) {
        this.logger.warn(
          `S3 put failed, falling back to local: ${e instanceof Error ? e.message : e}`,
        );
      }
    }
    return this.putLocal(key, input.body);
  }

  async putDataUrl(prefix: string, dataUrl: string): Promise<PutObjectResult> {
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
    const hash = createHash('sha1').update(b64.slice(0, 200)).digest('hex').slice(0, 8);
    const filename = `${Date.now()}-${hash}-${randomUUID().slice(0, 8)}.${ext}`;
    return this.putImage({
      prefix,
      filename,
      body: Buffer.from(b64, 'base64'),
      contentType: mime,
    });
  }

  private async putLocal(key: string, body: Buffer): Promise<PutObjectResult> {
    const filePath = path.join(this.localRoot, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, body);
    // Served via /uploads static mount — hall-photos is under UPLOAD_DIR parent handling
    const publicPath = `/uploads/hall-photos/${key.replace(/\\/g, '/')}`;
    this.logger.log(`local put ${publicPath}`);
    return { backend: 'local', url: publicPath, key };
  }

  /**
   * Minimal SigV4 PUT Object without AWS SDK (keeps deps light).
   */
  private async putS3(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<PutObjectResult> {
    const bucket = process.env.S3_BUCKET!;
    const region = process.env.S3_REGION ?? 'us-east-1';
    const accessKey = process.env.S3_ACCESS_KEY_ID!;
    const secretKey = process.env.S3_SECRET_ACCESS_KEY!;
    const endpoint = process.env.S3_ENDPOINT?.replace(/\/$/, '');
    const pathStyle = (process.env.S3_FORCE_PATH_STYLE ?? 'true').toLowerCase() !== 'false';

    const host = endpoint
      ? new URL(endpoint).host
      : `${bucket}.s3.${region}.amazonaws.com`;
    const canonicalUri = pathStyle
      ? `/${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`
      : `/${key.split('/').map(encodeURIComponent).join('/')}`;
    const url = endpoint
      ? `${endpoint}${canonicalUri}`
      : pathStyle
        ? `https://s3.${region}.amazonaws.com${canonicalUri}`
        : `https://${host}/${key.split('/').map(encodeURIComponent).join('/')}`;

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = createHash('sha256').update(body).digest('hex');

    const headers: Record<string, string> = {
      host: endpoint ? new URL(endpoint).host : pathStyle ? `s3.${region}.amazonaws.com` : host,
      'content-type': contentType,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    };

    const signedHeaders = Object.keys(headers)
      .map((k) => k.toLowerCase())
      .sort()
      .join(';');
    const canonicalHeaders = Object.keys(headers)
      .map((k) => k.toLowerCase())
      .sort()
      .map((k) => `${k}:${headers[k].trim()}\n`)
      .join('');

    const canonicalRequest = [
      'PUT',
      canonicalUri,
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    const signingKey = this.getSignatureKey(secretKey, dateStamp, region, 's3');
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
    const authorization =
      `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        ...headers,
        Authorization: authorization,
        'Content-Length': String(body.length),
      },
      body,
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`S3 PUT ${res.status}: ${text.slice(0, 200)}`);
    }

    const publicBase = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, '');
    const publicUrl = publicBase
      ? `${publicBase}/${key}`
      : pathStyle && endpoint
        ? `${endpoint}/${bucket}/${key}`
        : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

    this.logger.log(`s3 put s3://${bucket}/${key}`);
    return { backend: 's3', url: publicUrl, key, bucket };
  }

  private getSignatureKey(
    key: string,
    dateStamp: string,
    regionName: string,
    serviceName: string,
  ): Buffer {
    const kDate = createHmac('sha256', `AWS4${key}`).update(dateStamp).digest();
    const kRegion = createHmac('sha256', kDate).update(regionName).digest();
    const kService = createHmac('sha256', kRegion).update(serviceName).digest();
    return createHmac('sha256', kService).update('aws4_request').digest();
  }
}
