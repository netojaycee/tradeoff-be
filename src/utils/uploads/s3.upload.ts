import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * AWS S3 Image Upload Utility
 * Uploads images to AWS S3 bucket
 * Credentials from environment variables
 */

interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
}

/**
 * Get AWS S3 configuration from environment
 */
function getS3Config(): S3Config {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'us-east-1';
  const bucket = process.env.AWS_S3_BUCKET;

  if (!accessKeyId || !secretAccessKey || !bucket) {
    throw new InternalServerErrorException(
      'AWS S3 credentials not configured in environment variables',
    );
  }

  return { accessKeyId, secretAccessKey, region, bucket };
}

/**
 * Create S3 client instance
 */
function createS3Client(): S3Client {
  const config = getS3Config();

  return new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

/**
 * Upload a single image to AWS S3
 * @param fileBuffer - File buffer or file path
 * @param fileName - Original file name with extension
 * @param folder - S3 folder path (e.g., 'products', 'categories')
 * @returns S3 object URL
 */
export async function uploadToS3(
  fileBuffer: Buffer | string,
  fileName: string,
  folder: string = 'tradeoff',
): Promise<string> {
  try {
    const config = getS3Config();
    const client = createS3Client();

    // If string, read file
    let buffer: Buffer;
    if (typeof fileBuffer === 'string') {
      if (!fs.existsSync(fileBuffer)) {
        throw new InternalServerErrorException(`File not found: ${fileBuffer}`);
      }
      buffer = fs.readFileSync(fileBuffer);
    } else {
      buffer = fileBuffer;
    }

    // Generate S3 key with folder and timestamp
    const timestamp = new Date().getTime();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const s3Key = `${folder}/${new Date().getFullYear()}/${timestamp}-${cleanFileName}`;

    // Determine MIME type
    const mimeType = getMimeType(fileName);

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: config.bucket,
      Key: s3Key,
      Body: buffer,
      ContentType: mimeType,
      ACL: 'public-read',
    });

    await client.send(command);

    // Construct public URL
    const s3Url = `https://${config.bucket}.s3.${config.region}.amazonaws.com/${s3Key}`;
    return s3Url;
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new InternalServerErrorException(
      `Failed to upload image to S3: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
  }
}

/**
 * Upload multiple images to AWS S3
 * @param files - Array of file buffers or paths
 * @param fileNames - Array of file names
 * @param folder - S3 folder path
 * @returns Array of S3 URLs
 */
export async function uploadMultipleToS3(
  files: (Buffer | string)[],
  fileNames: string[],
  folder: string = 'tradeoff',
): Promise<string[]> {
  try {
    if (!files || files.length === 0) {
      return [];
    }

    const uploadPromises = files.map((file, idx) =>
      uploadToS3(file, fileNames[idx] || `image-${idx}`, folder).catch(
        (error) => {
          console.error(`Failed to upload ${fileNames[idx]}:`, error);
          return null;
        },
      ),
    );

    const results = await Promise.all(uploadPromises);

    // Filter out null values (failed uploads)
    return results.filter((url) => url !== null);
  } catch (error) {
    console.error('Error uploading multiple images to S3:', error);
    throw new InternalServerErrorException(
      'Failed to upload multiple images to S3',
    );
  }
}

/**
 * Delete image from AWS S3
 * @param s3Url - Full S3 URL of the image
 */
export async function deleteFromS3(s3Url: string): Promise<void> {
  try {
    const config = getS3Config();
    const client = createS3Client();

    // Extract key from URL
    const urlParts = s3Url.split(
      `${config.bucket}.s3.${config.region}.amazonaws.com/`,
    );
    if (urlParts.length < 2) {
      throw new InternalServerErrorException('Invalid S3 URL format');
    }

    const s3Key = urlParts[1];

    const command = new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: s3Key,
    });

    await client.send(command);
  } catch (error) {
    console.error('Error deleting image from S3:', error);
    // Don't throw - deletion failure shouldn't break the flow
  }
}

/**
 * Upload image from Base64 string to S3
 * @param base64String - Base64 encoded image
 * @param fileName - Original file name
 * @param folder - S3 folder path
 * @returns S3 URL
 */
export async function uploadBase64ToS3(
  base64String: string,
  fileName: string,
  folder: string = 'tradeoff',
): Promise<string> {
  try {
    // Convert base64 to buffer
    const buffer = Buffer.from(base64String, 'base64');

    return await uploadToS3(buffer, fileName, folder);
  } catch (error) {
    console.error('Base64 S3 upload error:', error);
    throw new InternalServerErrorException(
      `Failed to upload base64 image to S3: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
  }
}

/**
 * Determine MIME type from file name
 */
function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();

  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  };

  return mimeTypes[ext] || 'image/jpeg';
}
