// Profile photo helper - strictly uses backend/uploaded photo with no hardcoded fallback
export function getPhotoForPerson(_name?: string, existingPhoto?: string): string | undefined {
  if (existingPhoto && typeof existingPhoto === 'string' && existingPhoto.trim().length > 0) {
    return existingPhoto.trim();
  }
  return undefined;
}
