import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, User, ChevronRight, Check, X } from 'lucide-react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { useAppStore } from '../store';
import Cropper from 'react-easy-crop';
import { uploadToImgBB } from '../lib/imgbb';

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: any
): Promise<Blob | null> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas is empty'));
        return;
      }
      resolve(blob);
    }, 'image/jpeg');
  });
};

export default function ProfileSetup() {
  const navigate = useNavigate();
  const { userProfile } = useAppStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    academicClass: '',
    session: '',
    bloodGroup: '',
    relationshipStatus: '',
    address: '',
    skills: ''
  });

  const [photoFile, setPhotoFile] = useState<Blob | null>(null);
  const [originalPhotoFile, setOriginalPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [photoError, setPhotoError] = useState('');

  useEffect(() => {
    if (userProfile?.onboardingCompleted) {
      navigate('/');
    }
  }, [userProfile, navigate]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setPhotoError('');
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        setPhotoError('Photo size must be less than 4MB');
        return;
      }
      setOriginalPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
        setIsCropping(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCropSave = async () => {
    if (photoPreview && croppedAreaPixels) {
      try {
        const croppedBlob = await getCroppedImg(photoPreview, croppedAreaPixels);
        if (croppedBlob) {
          setPhotoFile(croppedBlob);
          
          const reader = new FileReader();
          reader.onloadend = () => {
            setPhotoPreview(reader.result as string);
            setIsCropping(false);
          };
          reader.readAsDataURL(croppedBlob);
        }
      } catch (e) {
        console.error(e);
        setPhotoError('Failed to crop image');
      }
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (auth.currentUser) {
        let finalPhotoUrl = userProfile?.photoUrl || '';
        let finalOriginalPhotoUrl = userProfile?.originalPhotoUrl || '';
        
        if (photoFile) {
          finalPhotoUrl = await uploadToImgBB(photoFile);
        }
        if (originalPhotoFile) {
          finalOriginalPhotoUrl = await uploadToImgBB(originalPhotoFile);
        }

        const now = new Date().toISOString();
        const updateData: any = {
          academicClass: formData.academicClass,
          session: formData.session,
          bloodGroup: formData.bloodGroup,
          relationshipStatus: formData.relationshipStatus,
          address: formData.address,
          skills: formData.skills,
          onboardingCompleted: true,
          updatedAt: now
        };

        if (photoFile) {
          updateData.photoUrl = finalPhotoUrl;
          updateData.photoUpdatedAt = now;
        }

        if (originalPhotoFile) {
          updateData.originalPhotoUrl = finalOriginalPhotoUrl;
          updateData.originalPhotoUploadedAt = now;
          updateData.photoHistory = arrayUnion({
            url: finalOriginalPhotoUrl,
            uploadedAt: now,
            type: 'original'
          });
        }

        await updateDoc(doc(db, 'users', auth.currentUser.uid), updateData);
      }
      navigate('/');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser?.uid}`);
    } finally {
      setLoading(false);
    }
  };

  const isStep1Valid = formData.academicClass && formData.session && formData.bloodGroup && formData.relationshipStatus;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 text-center relative">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {step === 1 ? 'Complete Your Profile' : 'Add a Profile Photo'}
          </h2>
          <div className="flex justify-center gap-2 mt-4">
            <div className={`h-1.5 w-12 rounded-full ${step >= 1 ? 'bg-[#1CB0F6]' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
            <div className={`h-1.5 w-12 rounded-full ${step >= 2 ? 'bg-[#1CB0F6]' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Class / Grade *</label>
                <input 
                  type="text" 
                  placeholder="e.g. 10th, Freshman"
                  value={formData.academicClass}
                  onChange={e => setFormData({...formData, academicClass: e.target.value})}
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-[#1CB0F6] focus:ring-1 focus:ring-[#1CB0F6]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Session / Year *</label>
                <input 
                  type="text" 
                  placeholder="e.g. 2023-2024"
                  value={formData.session}
                  onChange={e => setFormData({...formData, session: e.target.value})}
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-[#1CB0F6] focus:ring-1 focus:ring-[#1CB0F6]"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Blood Group *</label>
                  <select 
                    value={formData.bloodGroup}
                    onChange={e => setFormData({...formData, bloodGroup: e.target.value})}
                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-[#1CB0F6] focus:ring-1 focus:ring-[#1CB0F6]"
                  >
                    <option value="" disabled>Select</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Relationship *</label>
                  <select 
                    value={formData.relationshipStatus}
                    onChange={e => setFormData({...formData, relationshipStatus: e.target.value})}
                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-[#1CB0F6] focus:ring-1 focus:ring-[#1CB0F6]"
                  >
                    <option value="" disabled>Select</option>
                    {['Single', 'In a relationship', 'Complicated', 'Married', 'Prefer not to say'].map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Address</label>
                <input 
                  type="text" 
                  placeholder="City, State"
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-[#1CB0F6] focus:ring-1 focus:ring-[#1CB0F6]"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Skills</label>
                <input 
                  type="text" 
                  placeholder="e.g. Coding, Design, Debating"
                  value={formData.skills}
                  onChange={e => setFormData({...formData, skills: e.target.value})}
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-[#1CB0F6] focus:ring-1 focus:ring-[#1CB0F6]"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="text-center">
              {isCropping ? (
                <div className="flex flex-col h-full">
                  <div className="relative w-full h-64 bg-black rounded-2xl overflow-hidden mb-6">
                    <Cropper
                      image={photoPreview!}
                      crop={crop}
                      zoom={zoom}
                      aspect={1}
                      onCropChange={setCrop}
                      onCropComplete={onCropComplete}
                      onZoomChange={setZoom}
                    />
                  </div>
                  <div className="mb-6 text-left">
                    <label className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-2 block">Zoom</label>
                    <input
                      type="range"
                      value={zoom}
                      min={1}
                      max={3}
                      step={0.1}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="w-full accent-[#1CB0F6]"
                    />
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => { setIsCropping(false); setPhotoPreview(null); setPhotoFile(null); setOriginalPhotoFile(null); }}
                      className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCropSave}
                      className="flex-1 py-3 rounded-xl font-bold text-white bg-[#1CB0F6] hover:bg-[#1899D6] shadow-lg shadow-[#1CB0F6]/30 transition-all"
                    >
                      Apply Crop
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-center mb-6 relative">
                    <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-400 relative overflow-hidden">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-10 h-10" />
                      )}
                    </div>
                    {photoPreview && (
                      <button
                        onClick={() => { setPhotoPreview(null); setPhotoFile(null); setOriginalPhotoFile(null); }}
                        className="absolute top-0 right-1/3 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md"
                        title="Remove photo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  {photoError && (
                    <div className="text-red-500 text-sm mb-4 font-medium">{photoError}</div>
                  )}

                  <label className="block border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-8 mb-6 bg-gray-50 dark:bg-gray-800/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                    <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Tap to upload a photo</p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">JPEG or PNG, max 4MB</p>
                  </label>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-800">
          {step === 1 ? (
            <button 
              onClick={() => setStep(2)}
              disabled={!isStep1Valid}
              className={`w-full py-3.5 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${isStep1Valid ? 'bg-[#1CB0F6] text-white hover:bg-[#1899D6] shadow-lg shadow-[#1CB0F6]/30' : 'bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600'}`}
            >
              Next <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            !isCropping && (
              <div className="flex gap-3">
                <button 
                  onClick={() => setStep(1)}
                  className="py-3.5 px-6 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-all"
                >
                  Back
                </button>
                <button 
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 py-3.5 rounded-xl font-bold text-lg flex items-center justify-center gap-2 bg-[#1CB0F6] text-white hover:bg-[#1899D6] shadow-lg shadow-[#1CB0F6]/30 transition-all disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (
                    <><Check className="w-5 h-5" /> Save Profile</>
                  )}
                </button>
              </div>
            )
          )}
          
          {step === 1 && (
            <button 
              onClick={() => auth.signOut()}
              className="w-full mt-4 text-sm text-gray-500 font-bold hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Log Out
            </button>
          )}
        </div>

      </div>
    </div>
  );
}


