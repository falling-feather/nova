/** Photos live in saves as data URLs: PNG in older saves, WebP (or JPEG where
 * a browser cannot write WebP) since the painted objects. The stored picture
 * is for showing only; its features were read from full-quality pixels. */
const PHOTO = /^data:image\/(?:png|webp|jpeg);base64,/;
export function isPhotoData(value: unknown): value is string {
  return typeof value === "string" && PHOTO.test(value);
}
