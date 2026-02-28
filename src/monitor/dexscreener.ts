/**
 * DexScreener API monitor — free, no key required
 * Tracks token prices as proxy for trading bot activity
 */

import axios from 'axios';

const BASE = 'https://api.dexscreener.com';

export interface DexTokenData {
  symbol: string;
  priceUsd: number;
  change24h: number;         // %
  volume24h: number;         // USD
  liquidity?: number;        // USD
  pairAddress?: string;
  dex?: string;
}

/**
 * Known token mints for seeded agents
 * These tokens are directly related to the agent ecosystems
 */
export const AGENT_TOKEN_MAP: Record<string, string> = {
  // BonkBot — BONK token
  'BonkBot': 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  // Drift Keeper Bot — DRIFT token
  'Drift Keeper Bot': 'DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7',
  // Jito MEV Bot — JTO token
  'Jito MEV Bot': 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwjx2ZEPnxR9',
  // Eliza (ai16z) — ai16z token
  'Eliza (ai16z)': 'HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC',
  // Solana Agent Kit — no native token, track JUP as proxy (Jupiter integration)
  'Solana Agent Kit': 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
};

async function fetchJSON(url: string): Promise<any> {
  const res = await axios.get(url, {
    headers: { 'User-Agent': 'AgentPass-Monitor/1.0' },
  });
  return res.data;
}

/**
 * Fetch token data by mint address
 */
export async function fetchTokenData(mintAddress: string): Promise<DexTokenData | null> {
  try {
    const data = await fetchJSON(`${BASE}/latest/dex/tokens/${mintAddress}`);
    if (!data.pairs || data.pairs.length === 0) return null;

    // Pick the pair with highest liquidity on Solana
    const solanaPairs = data.pairs.filter((p: any) => p.chainId === 'solana');
    if (solanaPairs.length === 0) return null;

    const best = solanaPairs.sort((a: any, b: any) =>
      (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0)
    )[0];

    return {
      symbol: best.baseToken?.symbol ?? 'UNKNOWN',
      priceUsd: parseFloat(best.priceUsd ?? '0'),
      change24h: best.priceChange?.h24 ?? 0,
      volume24h: best.volume?.h24 ?? 0,
      liquidity: best.liquidity?.usd,
      pairAddress: best.pairAddress,
      dex: best.dexId,
    };
  } catch (err: any) {
    console.warn(`⚠️  DexScreener fetch failed for ${mintAddress}: ${err.message}`);
    return null;
  }
}

/**
 * Fetch token data for an agent by name
 */
export async function fetchAgentTokenData(agentName: string): Promise<DexTokenData | null> {
  const mint = AGENT_TOKEN_MAP[agentName];
  if (!mint) return null;
  return fetchTokenData(mint);
}

/**
 * Compute a live score delta based on token activity (-2..+2)
 */
export function computeDexScore(token: DexTokenData): number {
  let score = 0;

  // Volume signal: high volume = more active ecosystem
  if (token.volume24h >= 10_000_000) score += 2;
  else if (token.volume24h >= 1_000_000) score += 1;
  else if (token.volume24h < 10_000) score -= 1;

  // Price change signal (extreme drops are a bad sign)
  if (token.change24h <= -30) score -= 2;
  else if (token.change24h <= -15) score -= 1;
  else if (token.change24h >= 20) score += 1;

  return score;
}
