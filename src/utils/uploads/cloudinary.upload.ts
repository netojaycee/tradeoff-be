import axios from 'axios';
import FormData from 'form-data';
import { InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';

/**
 * Cloudinary Image Upload Utility
 * Uploads images to Cloudinary cloud storage
 * Credentials from environment variables
 */

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

// interface UploadResponse {
//   secure_url: string;
//   public_id: string;
//   width: number;
//   height: number;
//   format: string;
// }

/**
 * Get Cloudinary configuration from environment
 */
function getCloudinaryConfig(): CloudinaryConfig {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new InternalServerErrorException(
      'Cloudinary credentials not configured in environment variables',
    );
  }

  return { cloudName, apiKey, apiSecret };
}

/**
 * Upload a single image to Cloudinary
 * @param filePath - Local file path or URL
 * @param folder - Cloudinary folder path (e.g., 'products', 'categories')
 * @returns Upload response with secure URL
 */
export async function uploadToCloudinary(
  filePath: string,
  folder: string = 'tradeoff',
): Promise<string> {
  try {
    const config = getCloudinaryConfig();
    // const { cloudName, apiKey, apiSecret } = config;
    const { cloudName, apiKey } = config;

    // Create upload URL
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    // Create form data
    const formData = new FormData();

    // If it's a file path, read the file
    if (fs.existsSync(filePath)) {
      formData.append('file', fs.createReadStream(filePath));
    } else {
      // Assume it's a URL
      formData.append('file', filePath);
    }

    formData.append('api_key', apiKey);
    formData.append('folder', `${folder}/${new Date().getFullYear()}`); // Organize by year
    formData.append('resource_type', 'auto');
    formData.append('quality', 'auto');

    // Send request
    const response = await axios.post(uploadUrl, formData, {
      headers: formData.getHeaders(),
      timeout: 30000,
    });

    if (!response.data || !response.data.secure_url) {
      throw new InternalServerErrorException(
        'Invalid response from Cloudinary',
      );
    }

    return response.data.secure_url;
  } catch (error) {
    if (error instanceof InternalServerErrorException) {
      throw error;
    }

    console.error('Cloudinary upload error:', error);
    throw new InternalServerErrorException(
      `Failed to upload image to Cloudinary: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
  }
}

/**
 * Upload multiple images to Cloudinary
 * @param filePaths - Array of file paths or URLs
 * @param folder - Cloudinary folder path
 * @returns Array of secure URLs
 */
export async function uploadMultipleToCloudinary(
  filePaths: string[],
  folder: string = 'tradeoff',
): Promise<string[]> {
  try {
    if (!filePaths || filePaths.length === 0) {
      return [];
    }

    const uploadPromises = filePaths.map((filePath) =>
      uploadToCloudinary(filePath, folder).catch((error) => {
        console.error(`Failed to upload ${filePath}:`, error);
        return null;
      }),
    );

    const results = await Promise.all(uploadPromises);

    // Filter out null values (failed uploads)
    return results.filter((url) => url !== null);
  } catch (error) {
    console.error('Error uploading multiple images:', error);
    throw new InternalServerErrorException('Failed to upload multiple images');
  }
}

/**
 * Delete image from Cloudinary
 * @param publicId - Cloudinary public ID of the image
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    const config = getCloudinaryConfig();
    const { cloudName, apiKey } = config;
    // const { cloudName, apiKey, apiSecret } = config;

    const deleteUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`;

    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('api_key', apiKey);

    await axios.post(deleteUrl, formData, {
      headers: formData.getHeaders(),
      timeout: 30000,
    });
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    // Don't throw - deletion failure shouldn't break the flow
  }
}

/**
 * Upload image from Base64 string
 * @param base64String - Base64 encoded image
 * @param fileName - Original file name
 * @param folder - Cloudinary folder path
 * @returns Secure URL
 */
export async function uploadBase64ToCloudinary(
  base64String: string,
  fileName: string,
  folder: string = 'tradeoff',
): Promise<string> {
  try {
    const config = getCloudinaryConfig();
    const { cloudName, apiKey } = config;

    // const { cloudName, apiKey, apiSecret } = config;

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    const formData = new FormData();
    formData.append('file', `data:image/jpeg;base64,${base64String}`);
    formData.append('api_key', apiKey);
    formData.append('folder', `${folder}/${new Date().getFullYear()}`);
    formData.append('public_id', fileName.replace(/\.[^/.]+$/, '')); // Remove extension
    formData.append('quality', 'auto');

    const response = await axios.post(uploadUrl, formData, {
      headers: formData.getHeaders(),
      timeout: 30000,
    });

    if (!response.data || !response.data.secure_url) {
      throw new InternalServerErrorException(
        'Invalid response from Cloudinary',
      );
    }

    return response.data.secure_url;
  } catch (error) {
    console.error('Base64 upload error:', error);
    throw new InternalServerErrorException(
      `Failed to upload base64 image to Cloudinary: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
  }
}
