import { useState, useRef } from 'react';
import { X, Pencil, Check, Upload, Trash2, ChevronLeft, ImageIcon } from 'lucide-react';
import { Product, Language, PhotoFile } from '../types';

interface InfoModalProps {
  isOpen: boolean;
  product: Product;
  onClose: () => void;
  onUpdate: (productId: string, updates: Partial<Product>) => void;
  hideDescription?: boolean;
}

const languageTabs: { key: Language; label: string }[] = [
  { key: 'en', label: 'EN' },
  { key: 'sv', label: 'SE' },
  { key: 'zh', label: 'ZH' },
];

export function InfoModal({ isOpen, product, onClose, onUpdate, hideDescription = false }: InfoModalProps) {
  const [descLang, setDescLang] = useState<Language>('en');
  const [isDescEditing, setIsDescEditing] = useState(false);
  const [isPhotosEditing, setIsPhotosEditing] = useState(false);
  const [draftDescriptions, setDraftDescriptions] = useState({ ...product.descriptions });
  const [draftPhotos, setDraftPhotos] = useState<PhotoFile[]>([...product.photos]);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoFile | null>(null);
  const [addedPhotoUrls, setAddedPhotoUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDescEdit = () => {
    setDraftDescriptions({ ...product.descriptions });
    setIsDescEditing(true);
  };

  const handleDescSave = () => {
    onUpdate(product.id, { descriptions: draftDescriptions });
    setIsDescEditing(false);
  };

  const handleDescCancel = () => {
    setDraftDescriptions({ ...product.descriptions });
    setIsDescEditing(false);
  };

  const handlePhotosEdit = () => {
    setDraftPhotos([...product.photos]);
    setAddedPhotoUrls([]);
    setIsPhotosEditing(true);
  };

  const handlePhotosSave = () => {
    onUpdate(product.id, { photos: draftPhotos });
    setAddedPhotoUrls([]);
    setIsPhotosEditing(false);
  };

  const handlePhotosCancel = () => {
    addedPhotoUrls.forEach(url => URL.revokeObjectURL(url));
    setDraftPhotos([...product.photos]);
    setAddedPhotoUrls([]);
    setIsPhotosEditing(false);
  };

  const handlePhotoUpload = (files: FileList) => {
    const newPhotos: PhotoFile[] = Array.from(files).map(file => ({
      id: crypto.randomUUID(),
      file,
      url: URL.createObjectURL(file),
    }));
    const newUrls = newPhotos.map(p => p.url);
    setAddedPhotoUrls(prev => [...prev, ...newUrls]);
    setDraftPhotos(prev => [...prev, ...newPhotos]);
  };

  const handlePhotoDraftDelete = (photoId: string) => {
    const photo = draftPhotos.find(p => p.id === photoId);
    if (photo && addedPhotoUrls.includes(photo.url)) {
      URL.revokeObjectURL(photo.url);
      setAddedPhotoUrls(prev => prev.filter(u => u !== photo.url));
    }
    setDraftPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  const handleClose = () => {
    if (isPhotosEditing) {
      addedPhotoUrls.forEach(url => URL.revokeObjectURL(url));
    }
    setIsDescEditing(false);
    setIsPhotosEditing(false);
    setSelectedPhoto(null);
    onClose();
  };

  const displayPhotos = isPhotosEditing ? draftPhotos : product.photos;
  const displayDescriptions = isDescEditing ? draftDescriptions : product.descriptions;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[85vh] overflow-hidden animate-scale-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Product Info</h3>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(85vh-60px)]">
          {!hideDescription && (
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Description
              </span>
              {!isDescEditing ? (
                <button
                  onClick={handleDescEdit}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-all"
                >
                  <Pencil size={12} />
                  Edit
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleDescSave}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-all"
                  >
                    <Check size={12} />
                    Save
                  </button>
                  <button
                    onClick={handleDescCancel}
                    className="px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-all"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-1 mb-3">
              {languageTabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setDescLang(tab.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    descLang === tab.key
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {isDescEditing ? (
              <textarea
                value={draftDescriptions[descLang]}
                onChange={e =>
                  setDraftDescriptions(prev => ({
                    ...prev,
                    [descLang]: e.target.value,
                  }))
                }
                className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                rows={4}
                placeholder="Enter description..."
                autoFocus
              />
            ) : (
              <div className="px-3 py-2.5 text-sm text-slate-700 bg-slate-50 rounded-lg min-h-[60px]">
                {displayDescriptions[descLang] || (
                  <span className="text-slate-400 italic">No description</span>
                )}
              </div>
            )}
          </div>
          )}

          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Photos
                {displayPhotos.length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded-full font-semibold">
                    {displayPhotos.length}
                  </span>
                )}
              </span>
              {!isPhotosEditing ? (
                <button
                  onClick={handlePhotosEdit}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-all"
                >
                  <Pencil size={12} />
                  Edit
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-md transition-all"
                  >
                    <Upload size={12} />
                    Upload
                  </button>
                  <button
                    onClick={handlePhotosSave}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-all"
                  >
                    <Check size={12} />
                    Save
                  </button>
                  <button
                    onClick={handlePhotosCancel}
                    className="px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-all"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg"
              multiple
              onChange={e => {
                if (e.target.files && e.target.files.length > 0) {
                  handlePhotoUpload(e.target.files);
                  e.target.value = '';
                }
              }}
              className="hidden"
            />

            {selectedPhoto ? (
              <div className="flex flex-col items-center animate-fade-in">
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="self-start flex items-center gap-1.5 mb-3 text-sm text-primary-600 hover:text-primary-700 transition-colors"
                >
                  <ChevronLeft size={16} />
                  Back
                </button>
                <div className="rounded-xl overflow-hidden bg-slate-100">
                  <img
                    src={selectedPhoto.url}
                    alt={selectedPhoto.file.name}
                    className="max-w-full max-h-64 object-contain"
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">{selectedPhoto.file.name}</p>
              </div>
            ) : displayPhotos.length > 0 ? (
              <div className="grid grid-cols-4 gap-2.5">
                {displayPhotos.map(photo => (
                  <div key={photo.id} className="relative group animate-fade-in">
                    <div className="aspect-square rounded-lg overflow-hidden bg-slate-100 cursor-pointer transition-all hover:ring-2 hover:ring-primary-300 hover:ring-offset-1">
                      <img
                        src={photo.url}
                        alt={photo.file.name}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        onClick={() => setSelectedPhoto(photo)}
                      />
                    </div>
                    {isPhotosEditing && (
                      <button
                        onClick={() => handlePhotoDraftDelete(photo.id)}
                        className="absolute top-1.5 right-1.5 p-1 bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-red-600 active:scale-95"
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="p-3 bg-slate-100 rounded-full mb-3">
                  <ImageIcon size={20} className="text-slate-400" />
                </div>
                <p className="text-sm text-slate-500">No photos</p>
                {isPhotosEditing && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Upload your first photo
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
