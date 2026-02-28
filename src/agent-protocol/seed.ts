/**
 * Real Solana AI Agents — pre-seeded into AgentPass registry
 * Sources: GitHub, official docs, community tracking
 */

export interface SeedAgent {
  name: string;
  description: string;
  version: string;
  category: 'framework' | 'trading' | 'defi' | 'nft' | 'analytics' | 'utility' | 'other';
  website?: string;
  github?: string;
  twitter?: string;
  tags: string[];
  capabilities: string[];
  reputation: number;
  tasksCompleted: number;
  successRate: number;
}

export const REAL_SOLANA_AGENTS: SeedAgent[] = [
  {
    name: 'Solana Agent Kit',
    description:
      'Open-source toolkit by Sendai for building AI agents on Solana. Supports 60+ on-chain actions: token swaps via Jupiter, NFT minting via Metaplex, DeFi interactions, wallet management, and more. The most widely adopted Solana agent framework.',
    version: '1.0.0',
    category: 'framework',
    website: 'https://www.solanaagentkit.xyz',
    github: 'https://github.com/sendaifun/solana-agent-kit',
    twitter: 'https://twitter.com/sendaifun',
    tags: ['framework', 'open-source', 'sendai', 'jupiter', 'metaplex', 'defi'],
    capabilities: ['Token Swaps', 'NFT Minting', 'Wallet Management', 'DeFi', 'Staking'],
    reputation: 91,
    tasksCompleted: 48200,
    successRate: 97.4,
  },
  {
    name: 'GOAT SDK',
    description:
      'Great Onchain Agent Toolkit by Crossmint. Framework for connecting AI agents to any blockchain. Supports Solana natively with plugins for token transfers, DeFi protocols, and smart contract interactions. Used by Coinbase, OpenAI integrations.',
    version: '0.4.0',
    category: 'framework',
    website: 'https://ohmygoat.dev',
    github: 'https://github.com/goat-sdk/goat',
    twitter: 'https://twitter.com/crossmint',
    tags: ['framework', 'crossmint', 'multi-chain', 'open-source', 'plugins'],
    capabilities: ['Token Transfers', 'On-chain Actions', 'DeFi Plugins', 'Multi-chain'],
    reputation: 87,
    tasksCompleted: 31500,
    successRate: 95.1,
  },
  {
    name: 'Eliza (ai16z)',
    description:
      'Most popular open-source AI agent framework. Used by thousands of projects to deploy Twitter/Discord/Telegram agents with Solana wallet capabilities. Supports GPT-4, Claude, Llama. Has native Solana plugin for on-chain interactions.',
    version: '0.1.9',
    category: 'framework',
    website: 'https://elizaos.ai',
    github: 'https://github.com/ai16z/eliza',
    twitter: 'https://twitter.com/ai16zdao',
    tags: ['framework', 'ai16z', 'open-source', 'twitter-bot', 'multi-model'],
    capabilities: ['Social Media', 'On-chain Actions', 'Multi-Agent', 'NLP', 'Memory'],
    reputation: 94,
    tasksCompleted: 210000,
    successRate: 93.2,
  },
  {
    name: 'BonkBot',
    description:
      'Telegram trading bot for Solana with 300k+ active users. Executes token swaps, limit orders, and copy trading directly from Telegram. Real-time price tracking and portfolio management. One of the highest-volume bots on Solana.',
    version: '3.1.0',
    category: 'trading',
    website: 'https://t.me/bonkbot_bot',
    twitter: 'https://twitter.com/bonkbot_io',
    tags: ['trading', 'telegram', 'swap', 'popular', 'copy-trade'],
    capabilities: ['Token Swaps', 'Limit Orders', 'Copy Trading', 'Portfolio Tracking'],
    reputation: 89,
    tasksCompleted: 5800000,
    successRate: 96.8,
  },
  {
    name: 'Trojan Bot',
    description:
      'Advanced trading bot on Solana with sniper, copy trade, and DCA features. Supports Raydium, Jupiter, Pump.fun. Known for ultra-fast execution (<200ms) and MEV protection. Popular for meme coin trading and token launches.',
    version: '2.0.0',
    category: 'trading',
    website: 'https://t.me/paris_trojanbot',
    twitter: 'https://twitter.com/TrojanOnSolana',
    tags: ['trading', 'sniper', 'mev', 'pump.fun', 'raydium', 'dca'],
    capabilities: ['Sniping', 'Copy Trade', 'DCA', 'MEV Protection', 'Multi-DEX'],
    reputation: 85,
    tasksCompleted: 2100000,
    successRate: 94.5,
  },
  {
    name: 'Drift Keeper Bot',
    description:
      'Open-source keeper bot for Drift Protocol — the leading Solana perpetuals DEX. Handles liquidations, order fulfillment, and funding rate settlements. Runs 24/7 on-chain keeping the protocol healthy. Source available on GitHub.',
    version: '2.3.1',
    category: 'defi',
    website: 'https://drift.trade',
    github: 'https://github.com/drift-labs/keeper-bots-v2',
    twitter: 'https://twitter.com/DriftProtocol',
    tags: ['defi', 'perps', 'keeper', 'liquidation', 'open-source', 'drift'],
    capabilities: ['Liquidation', 'Order Filling', 'Funding Rate', 'On-chain Keeper'],
    reputation: 88,
    tasksCompleted: 940000,
    successRate: 99.1,
  },
  {
    name: 'AgentiPy',
    description:
      'Python SDK for building AI agents on Solana. Wraps Solana Agent Kit functionality for Python developers. Supports LangChain, AutoGen integration. Active development with growing community of Python ML engineers building Solana agents.',
    version: '0.2.1',
    category: 'framework',
    website: 'https://pypi.org/project/agentipy',
    github: 'https://github.com/niceberginc/agentipy',
    tags: ['framework', 'python', 'langchain', 'autogen', 'open-source', 'ml'],
    capabilities: ['Token Swaps', 'NFT Operations', 'Wallet Management', 'LangChain', 'AutoGen'],
    reputation: 72,
    tasksCompleted: 12400,
    successRate: 91.3,
  },
  {
    name: 'Photon Sol',
    description:
      'High-performance Solana trading terminal with built-in bot automation. Supports new token sniping, limit orders, auto-sell on pump.fun and Raydium. 100k+ traders. Advanced analytics with wallet tracking and alpha detection.',
    version: '4.0.0',
    category: 'trading',
    website: 'https://photon-sol.tinyastro.io',
    twitter: 'https://twitter.com/PhotonSol',
    tags: ['trading', 'sniper', 'terminal', 'analytics', 'pump.fun'],
    capabilities: ['Sniping', 'Limit Orders', 'Auto-Sell', 'Wallet Tracking', 'Analytics'],
    reputation: 83,
    tasksCompleted: 3400000,
    successRate: 93.7,
  },
  {
    name: 'Jito MEV Bot',
    description:
      'Reference MEV bot implementation for Jito-Solana. Executes arbitrage between Serum, Raydium, Orca, Lifinity using Jito bundles for atomic execution. Open-source template used by most Solana MEV operators. Processes millions in daily volume.',
    version: '1.2.0',
    category: 'defi',
    website: 'https://jito.network',
    github: 'https://github.com/jito-labs/mev-bot',
    twitter: 'https://twitter.com/jito_labs',
    tags: ['mev', 'arbitrage', 'jito', 'open-source', 'atomic', 'bundles'],
    capabilities: ['Arbitrage', 'MEV Extraction', 'Bundle Execution', 'Multi-DEX'],
    reputation: 86,
    tasksCompleted: 1800000,
    successRate: 78.2,
  },
  {
    name: 'Axiom Trading Bot',
    description:
      'Solana trading bot with advanced copy-trading and sniper features. Integrates with most Solana DEXs. Features smart wallet tracking to follow top traders automatically. Growing user base of 80k+ traders on Telegram.',
    version: '2.1.0',
    category: 'trading',
    website: 'https://axiom.trade',
    twitter: 'https://twitter.com/AxiomTrade',
    tags: ['trading', 'copy-trade', 'telegram', 'sniper', 'dex'],
    capabilities: ['Copy Trading', 'Sniping', 'Smart Money Tracking', 'Multi-DEX'],
    reputation: 81,
    tasksCompleted: 1200000,
    successRate: 92.4,
  },
];
