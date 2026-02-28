import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { 
  AgentProfile, 
  AgentSkill, 
  AgentTask, 
  AgentRegistry,
  AgentCapability 
} from './types';
import * as crypto from 'crypto';

/**
 * Solana Agent Protocol (SAP) Registry
 * Manages agent profiles, skills, and task coordination
 */
export class SAPRegistry {
  private registry: AgentRegistry;
  private connection: Connection;
  private localAgentId: string;

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.registry = {
      agents: new Map(),
      skills: new Map(),
      tasks: new Map()
    };
    this.localAgentId = this.generateAgentId();
  }

  /**
   * Generate unique agent ID
   */
  private generateAgentId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Register a new agent in the protocol
   */
  async registerAgent(profile: Omit<AgentProfile, 'id' | 'createdAt' | 'lastActive'>): Promise<string> {
    const agentId = this.generateAgentId();
    
    const fullProfile: AgentProfile = {
      ...profile,
      id: agentId,
      createdAt: new Date(),
      lastActive: new Date(),
      reputation: 0,
      tasksCompleted: 0,
      successRate: 100
    };

    this.registry.agents.set(agentId, fullProfile);
    
    console.log(`✅ Agent registered: ${agentId}`);
    console.log(`   Name: ${profile.name}`);
    console.log(`   Capabilities: ${profile.capabilities.map(c => c.name).join(', ')}`);

    return agentId;
  }

  /**
   * Get local agent ID
   */
  getLocalAgentId(): string {
    return this.localAgentId;
  }

  /**
   * Get agent profile by ID
   */
  getAgent(agentId: string): AgentProfile | undefined {
    return this.registry.agents.get(agentId);
  }

  /**
   * List all registered agents
   */
  listAgents(): AgentProfile[] {
    return Array.from(this.registry.agents.values());
  }

  /**
   * Search agents by capability
   */
  findAgentsByCapability(capabilityName: string): AgentProfile[] {
    return this.listAgents().filter(agent =>
      agent.capabilities.some(cap => 
        cap.name.toLowerCase().includes(capabilityName.toLowerCase()) && cap.enabled
      )
    );
  }

  /**
   * Register an external / pre-seeded agent (preserves reputation & stats)
   */
  async registerExternalAgent(
    profile: Omit<AgentProfile, 'id' | 'createdAt' | 'lastActive'>
  ): Promise<string> {
    const agentId = this.generateAgentId();

    const fullProfile: AgentProfile = {
      ...profile,
      id: agentId,
      createdAt: new Date(),
      lastActive: new Date(),
    };

    this.registry.agents.set(agentId, fullProfile);
    return agentId;
  }

  /**
   * Update agent reputation
   */
  updateReputation(agentId: string, taskSuccess: boolean): void {
    const agent = this.registry.agents.get(agentId);
    if (!agent) return;

    agent.tasksCompleted++;
    
    if (taskSuccess) {
      agent.reputation = Math.min(100, agent.reputation + 1);
    } else {
      agent.reputation = Math.max(0, agent.reputation - 2);
    }

    agent.successRate = (agent.reputation / agent.tasksCompleted) * 100;
    agent.lastActive = new Date();
  }

  /**
   * Register a skill in the protocol
   */
  async registerSkill(skill: Omit<AgentSkill, 'id' | 'usageCount' | 'rating'>): Promise<string> {
    const skillId = this.generateAgentId();
    
    const fullSkill: AgentSkill = {
      ...skill,
      id: skillId,
      usageCount: 0,
      rating: 0
    };

    this.registry.skills.set(skillId, fullSkill);
    
    console.log(`✅ Skill registered: ${skillId}`);
    console.log(`   Name: ${skill.name}`);
    console.log(`   Category: ${skill.category}`);

    return skillId;
  }

  /**
   * Get skill by ID
   */
  getSkill(skillId: string): AgentSkill | undefined {
    return this.registry.skills.get(skillId);
  }

  /**
   * List all skills
   */
  listSkills(): AgentSkill[] {
    return Array.from(this.registry.skills.values());
  }

  /**
   * Search skills by category
   */
  findSkillsByCategory(category: string): AgentSkill[] {
    return this.listSkills().filter(skill => skill.category === category);
  }

  /**
   * Create a task for an agent
   */
  async createTask(
    agentId: string,
    skillId: string,
    description: string,
    parameters: Record<string, any>
  ): Promise<string> {
    const taskId = this.generateAgentId();
    
    const task: AgentTask = {
      id: taskId,
      agentId,
      skillId,
      description,
      parameters,
      status: 'pending',
      createdAt: new Date()
    };

    this.registry.tasks.set(taskId, task);
    
    console.log(`📋 Task created: ${taskId}`);
    console.log(`   Agent: ${agentId}`);
    console.log(`   Skill: ${skillId}`);

    return taskId;
  }

  /**
   * Update task status
   */
  updateTaskStatus(
    taskId: string,
    status: AgentTask['status'],
    result?: any,
    error?: string
  ): void {
    const task = this.registry.tasks.get(taskId);
    if (!task) return;

    task.status = status;
    
    if (status === 'running' && !task.startedAt) {
      task.startedAt = new Date();
    }
    
    if (status === 'completed' || status === 'failed') {
      task.completedAt = new Date();
      task.result = result;
      task.error = error;

      // Update agent reputation
      this.updateReputation(task.agentId, status === 'completed');
      
      // Update skill usage
      const skill = this.registry.skills.get(task.skillId);
      if (skill) {
        skill.usageCount++;
      }
    }
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): AgentTask | undefined {
    return this.registry.tasks.get(taskId);
  }

  /**
   * List tasks by agent
   */
  listTasksByAgent(agentId: string): AgentTask[] {
    return Array.from(this.registry.tasks.values()).filter(
      task => task.agentId === agentId
    );
  }

  /**
   * Get registry statistics
   */
  getStats() {
    const agents = this.listAgents();
    const skills = this.listSkills();
    const tasks = Array.from(this.registry.tasks.values());

    return {
      totalAgents: agents.length,
      totalSkills: skills.length,
      totalTasks: tasks.length,
      activeTasks: tasks.filter(t => t.status === 'running').length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      averageReputation: agents.reduce((sum, a) => sum + a.reputation, 0) / (agents.length || 1),
      topAgents: agents
        .sort((a, b) => b.reputation - a.reputation)
        .slice(0, 5)
        .map(a => ({ id: a.id, name: a.name, reputation: a.reputation }))
    };
  }

  /**
   * Export registry data (for persistence)
   */
  exportData(): string {
    return JSON.stringify({
      agents: Array.from(this.registry.agents.entries()),
      skills: Array.from(this.registry.skills.entries()),
      tasks: Array.from(this.registry.tasks.entries())
    });
  }

  /**
   * Import registry data (from persistence)
   */
  importData(data: string): void {
    try {
      const parsed = JSON.parse(data);
      
      this.registry.agents = new Map(parsed.agents);
      this.registry.skills = new Map(parsed.skills);
      this.registry.tasks = new Map(parsed.tasks);
      
      console.log('✅ Registry data imported successfully');
    } catch (error) {
      console.error('❌ Failed to import registry data:', error);
    }
  }
}
