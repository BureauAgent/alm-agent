/**
 * Solana Agent Protocol (SAP)
 * A decentralized protocol for AI agent coordination on Solana
 */

export * from './types';
export * from './registry';
export * from './profile';
export * from './skills';

import { SAPRegistry } from './registry';
import { AgentProfileManager } from './profile';
import { SkillManager } from './skills';
import { SolanaAgent } from '../solana/agent';
import { REAL_SOLANA_AGENTS, SeedAgent } from './seed';
import { AgentCapability } from './types';

/**
 * Main SAP Protocol Manager
 * Orchestrates all agent protocol functionality
 */
export class SAPProtocol {
  public registry: SAPRegistry;
  public profileManager: AgentProfileManager;
  public skillManager: SkillManager;
  
  private initialized: boolean = false;

  constructor(rpcUrl: string, solanaAgent: SolanaAgent) {
    this.registry = new SAPRegistry(rpcUrl);
    this.profileManager = new AgentProfileManager(this.registry);
    this.skillManager = new SkillManager(this.registry, solanaAgent);
  }

  /**
   * Initialize the protocol
   */
  async initialize(config: {
    agentName: string;
    agentDescription: string;
    agentVersion: string;
  }): Promise<void> {
    if (this.initialized) {
      console.log('⚠️  SAP Protocol already initialized');
      return;
    }

    console.log('🚀 Initializing Solana Agent Protocol...');
    
    // Register agent
    const agentId = await this.profileManager.initialize({
      name: config.agentName,
      description: config.agentDescription,
      version: config.agentVersion
    });

    console.log(`✅ SAP Protocol initialized`);
    console.log(`   Agent ID: ${agentId}`);
    console.log(`   Skills: ${this.skillManager.listSkills().length}`);
    
    // Seed real Solana agents into registry
    await this.seedRealAgents();

    this.initialized = true;
  }

  /**
   * Seed the registry with known real-world Solana agents
   */
  async seedRealAgents(): Promise<void> {
    console.log('🌱 Seeding real Solana agents...');
    for (const seed of REAL_SOLANA_AGENTS) {
      const capabilities: AgentCapability[] = seed.capabilities.map(name => ({
        name,
        description: name,
        version: seed.version,
        enabled: true,
      }));

      await this.registry.registerExternalAgent({
        name: seed.name,
        description: seed.description,
        version: seed.version,
        category: seed.category,
        website: seed.website,
        github: seed.github,
        twitter: seed.twitter,
        tags: seed.tags,
        isExternal: true,
        capabilities,
        reputation: seed.reputation,
        tasksCompleted: seed.tasksCompleted,
        successRate: seed.successRate,
      });
    }
    console.log(`✅ Seeded ${REAL_SOLANA_AGENTS.length} real Solana agents`);
  }

  /**
   * Register an external agent via open API
   */
  async registerExternalAgent(data: {
    name: string;
    description: string;
    version?: string;
    category?: 'framework' | 'trading' | 'defi' | 'nft' | 'analytics' | 'utility' | 'other';
    website?: string;
    github?: string;
    twitter?: string;
    tags?: string[];
    capabilities?: string[];
  }): Promise<string> {
    const capabilities: AgentCapability[] = (data.capabilities || []).map(name => ({
      name,
      description: name,
      version: data.version || '1.0.0',
      enabled: true,
    }));

    const id = await this.registry.registerExternalAgent({
      name: data.name,
      description: data.description,
      version: data.version || '1.0.0',
      category: data.category ?? 'other',
      website: data.website,
      github: data.github,
      twitter: data.twitter,
      tags: data.tags || [],
      isExternal: true,
      capabilities,
      reputation: 0,
      tasksCompleted: 0,
      successRate: 100,
    });
    return id;
  }

  /**
   * Record a completed task and update reputation
   */
  async recordTask(description: string, skillName: string, success: boolean): Promise<void> {
    if (!this.initialized) return;

    const profile = this.profileManager.getProfile();
    if (!profile) return;

    // Find skill by name (case-insensitive)
    const skills = this.skillManager.listSkills();
    const skill = skills.find(s => s.name.toLowerCase() === skillName.toLowerCase());
    if (!skill) return;

    // Create task and immediately complete it
    const taskId = await this.registry.createTask(
      profile.id,
      skill.id,
      description,
      { query: description }
    );

    this.registry.updateTaskStatus(
      taskId,
      success ? 'completed' : 'failed',
      success ? { description } : undefined,
      success ? undefined : 'Command failed'
    );
  }

  /**
   * Check if protocol is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get protocol statistics
   */
  getStats() {
    return this.registry.getStats();
  }

  /**
   * Get full protocol summary
   */
  getSummary(): string {
    if (!this.initialized) {
      return 'SAP Protocol not initialized';
    }

    const stats = this.getStats();
    const profile = this.profileManager.getProfile();
    
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌟 SOLANA AGENT PROTOCOL (SAP)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${this.profileManager.getSummary()}

${this.skillManager.getSummary()}

**Protocol Statistics:**
  📊 Total Agents: ${stats.totalAgents}
  🔧 Total Skills: ${stats.totalSkills}
  📋 Total Tasks: ${stats.totalTasks}
  ⚡ Active Tasks: ${stats.activeTasks}
  ✅ Completed Tasks: ${stats.completedTasks}
  ⭐ Average Reputation: ${stats.averageReputation.toFixed(1)}/100

**Top Agents:**
${stats.topAgents.map((a, i) => `  ${i + 1}. ${a.name} (${a.reputation}/100)`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🦞 OpenClaw Integration Ready
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();
  }

  /**
   * Export protocol data for OpenClaw
   */
  exportForOpenClaw(): any {
    const profile = this.profileManager.exportForOpenClaw();
    const skills = this.skillManager.exportForOpenClaw();
    const stats = this.getStats();
    
    return {
      protocol: 'Solana Agent Protocol',
      version: '1.0.0',
      agent: profile,
      skills,
      stats: {
        totalSkills: stats.totalSkills,
        totalTasks: stats.totalTasks,
        reputation: stats.averageReputation
      }
    };
  }

  /**
   * Create OpenClaw skill manifest
   */
  createOpenClawManifest(): string {
    const manifest = this.exportForOpenClaw();
    
    const openclawSkill = `
// OpenClaw Skill: ${manifest.agent?.name || 'Solana Agent'}
// Generated by Solana Agent Protocol (SAP)

export default {
  name: "${manifest.agent?.name || 'solana-agent'}",
  version: "${manifest.version}",
  description: "${manifest.agent?.description || 'Solana blockchain AI agent'}",
  author: "Solana Agent Protocol",
  
  capabilities: ${JSON.stringify(manifest.agent?.capabilities || [], null, 2)},
  
  async execute(params) {
    // Connect to SAP endpoint
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: params.message })
    });
    
    const result = await response.json();
    return result.response;
  },
  
  // Available skills
  skills: ${JSON.stringify(manifest.skills, null, 2)},
  
  // Protocol stats
  stats: ${JSON.stringify(manifest.stats, null, 2)}
};
    `.trim();
    
    return openclawSkill;
  }
}
