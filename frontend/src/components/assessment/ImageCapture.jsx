/**
 * ImageCapture.jsx — Soil image upload/capture component
 *
 * Allows the user to either:
 *   a) Select an image from their phone's gallery
 *   b) Take a photo using the phone's camera (capture="environment")
 *
 * Shows a preview thumbnail and quality feedback once an image is selected.
 */

import { useRef, useState } from 'react';
import { Camera, Upload, X, CheckCircle, AlertTriangle } from 'lucide-react';

// Instructions shown above the capture button
const TIPS = [
  'Select a representative area of soil',
  'Remove large stones, leaves, or debris',
  'Capture under natural lighting — avoid shadows',
  'Hold phone close and keep it steady',
  'Avoid using camera filters',
];

export default function ImageCapture({ onImageSelected, imageFile, quality }) {
  const fileInputRef    = useRef(null);
  const cameraInputRef  = useRef(null);
  const [preview, setPreview] = useState(null);

  const handleFile = (file) => {
    if (!file) return;

    // Validate file type client-side before sending
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      alert('Please select a JPEG or PNG image.');
      return;
    }

    // Validate size (max 10 MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be smaller than 10 MB. Please compress or resize it.');
      return;
    }

    // Generate preview URL
    const url = URL.createObjectURL(file);
    setPreview(url);
    onImageSelected(file);
  };

  const handleRemove = () => {
    setPreview(null);
    onImageSelected(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Tips section */}
      <div className="bg-blue-50 rounded-xl p-4">
        <p className="text-sm font-semibold text-blue-800 mb-2">📸 Tips for a good soil photo:</p>
        <ul className="space-y-1">
          {TIPS.map((tip, i) => (
            <li key={i} className="text-xs text-blue-700 flex items-start gap-1.5">
              <span className="text-blue-400 mt-0.5">•</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* Image preview or upload area */}
      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Soil sample preview"
            className="w-full h-56 object-cover rounded-xl border-2 border-green-300"
          />
          {/* Quality badge overlay */}
          {quality && (
            <div className={`absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold
              ${quality === 'good'     ? 'bg-green-500 text-white' :
                quality === 'moderate' ? 'bg-amber-500 text-white' :
                                          'bg-red-500 text-white'}`}>
              {quality === 'good' ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
              {quality.charAt(0).toUpperCase() + quality.slice(1)} quality
            </div>
          )}
          {/* Remove button */}
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
            aria-label="Remove image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50
                        hover:border-green-400 hover:bg-green-50 transition-colors">
          <div className="w-14 h-14 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
            <Camera className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-sm font-semibold text-gray-700 mb-1">Add a soil photo</p>
          <p className="text-xs text-gray-500 mb-4">JPEG or PNG, max 10 MB</p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {/* Take photo (camera) */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="btn-primary text-sm px-5 py-2.5"
            >
              <Camera className="w-4 h-4" />
              Take Photo
            </button>
            {/* Select from gallery */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary text-sm px-5 py-2.5"
            >
              <Upload className="w-4 h-4" />
              Choose File
            </button>
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png"
        capture="environment"   // Opens rear camera on mobile
        className="hidden"
        onChange={(e) => handleFile(e.target.files[0])}
        aria-label="Take soil photo"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(e) => handleFile(e.target.files[0])}
        aria-label="Select soil image from gallery"
      />
    </div>
  );
}
