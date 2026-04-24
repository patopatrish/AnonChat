import { createHash } from "crypto";
import { GroupMetadata } from "@/types/blockchain";

/**
 * Computes a deterministic SHA-256 hash of group metadata
 * Uses canonical JSON serialization (sorted keys) to ensure consistency
 * 
 * @param metadata - The group metadata to hash
 * @returns Hex-encoded SHA-256 hash string (64 characters)
 */
export function computeHash(metadata: GroupMetadata): string {
  // Create canonical JSON by sorting keys
  const canonical = JSON.stringify(metadata, Object.keys(metadata).sort());
  
  // Compute SHA-256 hash
  const hash = createHash("sha256");
  hash.update(canonical);
  
  return hash.digest("hex");
}

/**
 * Verifies that a metadata object matches an expected hash
 * 
 * @param metadata - The group metadata to verify
 * @param expectedHash - The expected hash value
 * @returns True if the computed hash matches the expected hash
 */
export function verifyHash(metadata: GroupMetadata, expectedHash: string): boolean {
  const computedHash = computeHash(metadata);
  return computedHash === expectedHash;
}
