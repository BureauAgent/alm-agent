// Solana Agent Protocol (SAP) - Type Definitions

export interface AgentCapability {
  name: string;
  description: string;
  version: string;
  enabled: boolean;
}

export interface AgentProfile {
  id: string;
  name: string;
  description: string;
  version: string;
  
  // Solana identity
  publicKey?: string;

  // External metadata
  website?: string;
  github?: string;
  twitter?: string;
  category?: 'framework' | 'trading' | 'defi' | 'nft' | 'analytics' | 'utility' | 'other';
  tags?: string[];
  isExternal?: boolean; // true = зарегистрирован извне, не наш агент
  
  // Capabilities
  capabilities: AgentCapability[];
  
  // Reputation & Stats
  reputation: number; // 0-100 score
  tasksCompleted: number;
  successRate: number; // 0-100%
  
  // Metadata
  createdAt: Date;
  lastActive: Date;
  
  // Pricing (for marketplace)
  pricing?: {
    pricePerTask?: number; // in lamports
    currency: 'SOL' | 'USDC';
  };

  // Live monitoring data (updated by crawler)
  liveData?: AgentLiveData;
}

export interface AgentLiveData {
  // GitHub
  githubStars?: number;
  githubForks?: number;
  githubCommits30d?: number;
  githubLastPush?: string;    // ISO date
  githubRelease?: string;     // latest tag
  // DexScreener / price
  tokenPrice?: number;
  tokenChange24h?: number;
  tokenVolume24h?: number;
  tokenSymbol?: string;
  // Meta
  lastCrawledAt: string;      // ISO date
  crawlSource: string[];      // ['github', 'dexscreener']
  liveScore?: number;         // computed live reputation delta (-10..+10)
}

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  category: 'defi' | 'nft' | 'analytics' | 'trading' | 'utility';
  
  // NFT metadata (if tokenized)
  nftMint?: string;
  owner?: string;
  
  // Execution
  handler: string; // Function name or module path
  parameters: SkillParameter[];
  
  // Marketplace
  price?: number; // in lamports
  royalty?: number; // percentage for creator
  
  // Stats
  usageCount: number;
  rating: number; // 0-5 stars
}

export interface SkillParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'address';
  description: string;
  required: boolean;
  default?: any;
}

export interface AgentTask {
  id: string;
  agentId: string;
  skillId: string;
  
  // Task details
  description: string;
  parameters: Record<string, any>;
  
  // Status
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  
  // Payment
  payment?: {
    amount: number;
    currency: 'SOL' | 'USDC';
    payer: string;
    signature?: string;
  };
  
  // Timestamps
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface AgentRegistry {
  agents: Map<string, AgentProfile>;
  skills: Map<string, AgentSkill>;
  tasks: Map<string, AgentTask>;
}

export interface AgentMessage {
  from: string; // Agent ID
  to: string; // Agent ID or 'broadcast'
  type: 'request' | 'response' | 'notification';
  data: any;
  timestamp: Date;
}

// OpenClaw Skill Interface
export interface OpenClawSkill {
  name: string;
  description: string;
  version: string;
  author: string;
  
  // Skill metadata
  capabilities: string[];
  dependencies?: string[];
  
  // Entry point
  execute: (params: any) => Promise<any>;
  
  // Configuration
  config?: Record<string, any>;
}
