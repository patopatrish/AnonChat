import { logBlockchainOperation } from "./logger";

export interface StellarConfig {
  network: "testnet" | "mainnet";
  sourceSecret: string;
  horizonUrl: string;
  transactionTimeout: number;
}

/**
 * Loads Stellar configuration from environment variables
 * 
 * @returns StellarConfig object or null if configuration is incomplete
 */
export function loadStellarConfig(): StellarConfig | null {
  const network = process.env.STELLAR_NETWORK as "testnet" | "mainnet" | undefined;
  const sourceSecret = process.env.STELLAR_SOURCE_SECRET;
  const horizonUrl = process.env.STELLAR_HORIZON_URL;
  const transactionTimeout = parseInt(
    process.env.STELLAR_TRANSACTION_TIMEOUT || "30000",
    10
  );

  // Validate required configuration
  if (!network || !sourceSecret || !horizonUrl) {
    return null;
  }

  // Validate network value
  if (network !== "testnet" && network !== "mainnet") {
    logBlockchainOperation("warn", "Invalid STELLAR_NETWORK value", {
      network,
      message: "STELLAR_NETWORK must be 'testnet' or 'mainnet'",
    });
    return null;
  }

  return {
    network,
    sourceSecret,
    horizonUrl,
    transactionTimeout,
  };
}

/**
 * Checks if Stellar configuration is properly set up
 * 
 * @returns True if all required configuration is present
 */
export function isConfigured(): boolean {
  const config = loadStellarConfig();
  
  if (!config) {
    logBlockchainOperation("warn", "Stellar configuration incomplete", {
      message: "Missing required environment variables: STELLAR_NETWORK, STELLAR_SOURCE_SECRET, or STELLAR_HORIZON_URL",
      configured: false,
    });
    return false;
  }

  return true;
}

/**
 * Gets the Stellar explorer URL for a transaction
 * 
 * @param txHash - Transaction hash
 * @param network - Network type (testnet or mainnet)
 * @returns Explorer URL
 */
export function getExplorerUrl(txHash: string, network: "testnet" | "mainnet"): string {
  const baseUrl = network === "testnet" 
    ? "https://stellar.expert/explorer/testnet/tx"
    : "https://stellar.expert/explorer/public/tx";
  
  return `${baseUrl}/${txHash}`;
}
