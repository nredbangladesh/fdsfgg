import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

export const uploadToImgBB = async (imageFile: File | Blob): Promise<string> => {
  const apiKey = '571d9db3ad6fd4060e6cc8a1916f7062';
  const formData = new FormData();
  formData.append('image', imageFile);

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload image to ImgBB');
  }

  const data = await response.json();
  if (data.success) {
    // Return the display_url as requested
    return data.data.display_url || data.data.url;
  } else {
    throw new Error(data.error?.message || 'Failed to upload image');
  }
};

export const uploadPhotoWithAdminCopy = async (
  imageFile: File | Blob,
  context: string
): Promise<{ clientUrl: string; adminUrl: string }> => {
  // Upload twice to get two different URLs
  const clientUrl = await uploadToImgBB(imageFile);
  const adminUrl = await uploadToImgBB(imageFile);

  // Log the admin copy to a dedicated admin collection
  try {
    if (auth.currentUser) {
      await addDoc(collection(db, 'admin_photo_logs'), {
        userId: auth.currentUser.uid,
        clientUrl,
        adminUrl,
        context,
        status: 'active', // can be 'edited' or 'deleted' by client later
        uploadedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Failed to log admin photo', error);
  }

  return { clientUrl, adminUrl };
};
