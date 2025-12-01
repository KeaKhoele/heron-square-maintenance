import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';
import imageCompression from 'browser-image-compression';

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB in bytes

export interface ImageUploadResult {
  url: string;
  fileName: string;
}

/**
 * Validate image file before upload
 * @param file - The file to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return {
      isValid: false,
      error: 'File must be an image (JPG, PNG, etc.)',
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `Image size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
    };
  }

  return { isValid: true };
};

/**
 * Upload an issue photo to Firebase Storage (compresses and adds metadata).
 * Mirrors the requested helper signature.
 */
export const uploadIssuePhoto = async (
  file: File | null,
  issueId: string,
  user?: { uid?: string },
  onProgress?: (progress: number) => void
): Promise<ImageUploadResult | null> => {
  if (!file) return null;

  // Validate file type & size
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Image size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }

  // Compress image
  const compressionOptions = {
    maxSizeMB: 2.5,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: file.type,
  };

  let compressedFile: File;
  try {
    compressedFile = await imageCompression(file, compressionOptions);
    console.log('Image compressed:', {
      originalSize: (file.size / (1024 * 1024)).toFixed(2) + 'MB',
      compressedSize: (compressedFile.size / (1024 * 1024)).toFixed(2) + 'MB',
    });
  } catch (compressionError) {
    console.warn('Image compression failed, using original file:', compressionError);
    compressedFile = file;
  }

  const storageRef = ref(storage, `photos/${issueId}/${compressedFile.name}`);

  const uploadTask = uploadBytesResumable(
    storageRef,
    compressedFile,
    {
      customMetadata: {
        creator: user?.uid || 'unknown',
      },
    }
  );

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(progress);
      },
      (error) => {
        console.error('Upload error:', error);
        reject(new Error(`Failed to upload image: ${error.message}`));
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            url: downloadURL,
            fileName: uploadTask.snapshot.ref.fullPath,
          });
        } catch (error) {
          console.error('Error getting image URL:', error);
          reject(new Error('Failed to get image URL'));
        }
      }
    );
  });
};

