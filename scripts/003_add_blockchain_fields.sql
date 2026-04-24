-- Migration: Add blockchain fields to rooms table
-- Description: Adds columns for storing Stellar transaction hash, metadata hash, and submission timestamp
-- Date: 2026-02-22

-- Add stellar_tx_hash column to store the Stellar transaction hash
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS stellar_tx_hash TEXT NULL;

-- Add metadata_hash column to store the computed SHA-256 hash of group metadata
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS metadata_hash TEXT NULL;

-- Add blockchain_submitted_at column to track when the blockchain transaction was submitted
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS blockchain_submitted_at TIMESTAMPTZ NULL;

-- Create index on stellar_tx_hash for efficient lookups
CREATE INDEX IF NOT EXISTS idx_rooms_stellar_tx_hash ON rooms(stellar_tx_hash);

-- Add comment to document the purpose of these fields
COMMENT ON COLUMN rooms.stellar_tx_hash IS 'Stellar blockchain transaction hash containing the group metadata hash';
COMMENT ON COLUMN rooms.metadata_hash IS 'SHA-256 hash of the group metadata for verification purposes';
COMMENT ON COLUMN rooms.blockchain_submitted_at IS 'Timestamp when the metadata was submitted to the Stellar blockchain';
