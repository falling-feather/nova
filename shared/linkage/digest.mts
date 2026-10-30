import { sha256 } from '@noble/hashes/sha2.js';

/** The same SHA-256 verification works on localhost, HTTPS and HTTP classroom LANs. */
export function sha256Hex(bytes: Uint8Array): string {
  return Array.from(sha256(bytes), value => value.toString(16).padStart(2, '0')).join('');
}
