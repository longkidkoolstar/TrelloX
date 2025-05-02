import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './config';
import { getCurrentUser } from './auth';

// Upload an image to Firebase Storage
export const uploadImage = async (file: File): Promise<string> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) throw new Error('User must be logged in to upload an image');

    // Create a reference to the file in Firebase Storage
    // Format: board-backgrounds/{userId}/{timestamp}-{filename}
    const timestamp = new Date().getTime();
    const storageRef = ref(storage, `board-backgrounds/${currentUser.uid}/${timestamp}-${file.name}`);

    // Set metadata including content type
    const metadata = {
      contentType: file.type,
      customMetadata: {
        'uploadedBy': currentUser.uid,
        'uploadedAt': new Date().toISOString()
      }
    };

    // Upload the file with metadata
    const snapshot = await uploadBytes(storageRef, file, metadata);

    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

// Check if a URL is a valid image URL
export const isValidImageUrl = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok) return false;

    const contentType = response.headers.get('content-type');
    return contentType ? contentType.startsWith('image/') : false;
  } catch (error) {
    console.error('Error validating image URL:', error);
    return false;
  }
};
