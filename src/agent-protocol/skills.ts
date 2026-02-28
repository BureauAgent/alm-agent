import { SAPRegistry } from './registry';
import { AgentSkill, SkillParameter } from './types';
import { SolanaAgent } from '../solana/agent';

/**
 * Skill Manager
 * Manages agent skills and their execution
 */
export class SkillManager {
  private registry: SAPRegistry;
  private solanaAgent: SolanaAgent;
  private skillHandlers: Map<string, Function> = new Map();

  constructor(registry: SAPRegistry, solanaAgent: SolanaAgent) {
    this.registry = registry;
    this.solanaAgent = solanaAgent;
    this.initializeBuiltInSkills();
  }

  /**
   * Initialize built-in skills
   */
  private async initializeBuiltInSkills() {
    // Skill 1: Balance Checker
    await this.registerBuiltInSkill({
      name: 'Balance Checker',
      description: 'Check SOL and SPL token balances for any wallet',
      category: 'analytics',
      handler: 'checkBalance',
      parameters: [
        {
          name: 'address',
          type: 'address',
          description: 'Solana wallet address',
          required: true
        }
      ]
    }, async (params: any) => {
      const info = await this.solanaAgent.getWalletInfo(params.address);
      return this.solanaAgent.formatWalletInfoForAI(info);
    });

    // Skill 2: Price Monitor
    await this.registerBuiltInSkill({
      name: 'Price Monitor',
      description: 'Get real-time prices for popular Solana tokens',
      category: 'analytics',
      handler: 'getPrices',
      parameters: []
    }, async () => {
      const prices = await this.solanaAgent.getPopularTokens();
      return prices.map(p => {
        const change = p.priceChange24h !== undefined ? ` (${p.priceChange24h >= 0 ? '+' : ''}${p.priceChange24h.toFixed(2)}%)` : '';
        return `${p.symbol}: $${p.price.toFixed(4)}${change}`;
      }).join('\n');
    });

    // Skill 3: Transaction Analyzer
    await this.registerBuiltInSkill({
      name: 'Transaction Analyzer',
      description: 'Analyze recent transactions for a wallet',
      category: 'analytics',
      handler: 'analyzeTransactions',
      parameters: [
        {
          name: 'address',
          type: 'address',
          description: 'Solana wallet address',
          required: true
        },
        {
          name: 'limit',
          type: 'number',
          description: 'Number of transactions to analyze',
          required: false,
          default: 10
        }
      ]
    }, async (params: any) => {
      const limit = params.limit || 10;
      const transactions = await this.solanaAgent.getRecentTransactions(params.address, limit);
      return this.solanaAgent.formatTransactionsForAI(transactions);
    });

    // Skill 4: Network Status
    await this.registerBuiltInSkill({
      name: 'Network Status',
      description: 'Check Solana network health and status',
      category: 'utility',
      handler: 'networkStatus',
      parameters: []
    }, async () => {
      const status = await this.solanaAgent.getNetworkStatus();
      return `Solana Network:\n- Current Slot: ${status.slot}\n- Block Time: ${new Date(status.blockTime * 1000).toLocaleString()}`;
    });

    console.log(`✅ Initialized ${this.skillHandlers.size} built-in skills`);
  }

  /**
   * Register a built-in skill
   */
  private async registerBuiltInSkill(
    skillData: Omit<AgentSkill, 'id' | 'usageCount' | 'rating'>,
    handler: Function
  ) {
    const skillId = await this.registry.registerSkill(skillData);
    this.skillHandlers.set(skillId, handler);
    return skillId;
  }

  /**
   * Register a custom skill
   */
  async registerSkill(
    name: string,
    description: string,
    category: AgentSkill['category'],
    parameters: SkillParameter[],
    handler: Function,
    price?: number
  ): Promise<string> {
    const skillId = await this.registry.registerSkill({
      name,
      description,
      category,
      handler: 'custom',
      parameters,
      price
    });

    this.skillHandlers.set(skillId, handler);
    
    console.log(`✅ Custom skill registered: ${name}`);
    return skillId;
  }

  /**
   * Execute a skill
   */
  async executeSkill(skillId: string, parameters: Record<string, any>): Promise<any> {
    const skill = this.registry.getSkill(skillId);
    if (!skill) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    const handler = this.skillHandlers.get(skillId);
    if (!handler) {
      throw new Error(`Handler not found for skill: ${skill.name}`);
    }

    // Validate parameters
    for (const param of skill.parameters) {
      if (param.required && !(param.name in parameters)) {
        throw new Error(`Missing required parameter: ${param.name}`);
      }
    }

    // Execute skill
    console.log(`🔧 Executing skill: ${skill.name}`);
    const result = await handler(parameters);
    
    // Update skill usage
    const updatedSkill = this.registry.getSkill(skillId);
    if (updatedSkill) {
      updatedSkill.usageCount++;
    }

    return result;
  }

  /**
   * List all available skills
   */
  listSkills(): AgentSkill[] {
    return this.registry.listSkills();
  }

  /**
   * Get skill by ID
   */
  getSkill(skillId: string): AgentSkill | undefined {
    return this.registry.getSkill(skillId);
  }

  /**
   * Search skills by name or category
   */
  searchSkills(query: string): AgentSkill[] {
    const skills = this.listSkills();
    const lowerQuery = query.toLowerCase();
    
    return skills.filter(skill =>
      skill.name.toLowerCase().includes(lowerQuery) ||
      skill.description.toLowerCase().includes(lowerQuery) ||
      skill.category.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get skills summary for display
   */
  getSummary(): string {
    const skills = this.listSkills();
    const categories = [...new Set(skills.map(s => s.category))];
    
    let summary = `\n**Available Skills (${skills.length})**\n`;
    summary += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
    
    for (const category of categories) {
      const categorySkills = skills.filter(s => s.category === category);
      summary += `**${category.toUpperCase()}** (${categorySkills.length})\n`;
      
      for (const skill of categorySkills) {
        summary += `  - ${skill.name}\n`;
        summary += `     ${skill.description}\n`;
        summary += `     Used ${skill.usageCount} times`;
        if (skill.price) {
          summary += ` | Price: ${skill.price} lamports`;
        }
        summary += '\n\n';
      }
    }
    
    summary += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    return summary;
  }

  /**
   * Export skills for OpenClaw
   */
  exportForOpenClaw(): any[] {
    return this.listSkills().map(skill => ({
      name: skill.name.toLowerCase().replace(/\s+/g, '-'),
      description: skill.description,
      category: skill.category,
      parameters: skill.parameters.map(p => ({
        name: p.name,
        type: p.type,
        description: p.description,
        required: p.required
      })),
      handler: skill.id // Reference to skill ID for execution
    }));
  }
}
