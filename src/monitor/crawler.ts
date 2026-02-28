/**
 * Agent Registry Crawler
 * Polls GitHub + DexScreener every 30 min and updates live data in registry
 */

import { SAPRegistry } from '../agent-protocol/registry';
import { AgentLiveData } from '../agent-protocol/types';
import { fetchGitHubStats, computeGitHubScore } from './github';
import { fetchAgentTokenData, computeDexScore } from './dexscreener';

const CRAWL_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export interface CrawlResult {
  agentId: string;
  agentName: string;
  sources: string[];
  liveScore: number;
  updatedAt: string;
  error?: string;
}

export interface CrawlerStatus {
  running: boolean;
  lastRun?: string;
  nextRun?: string;
  totalCrawled: number;
  lastResults: CrawlResult[];
}

export class AgentCrawler {
  private registry: SAPRegistry;
  private status: CrawlerStatus = {
    running: false,
    totalCrawled: 0,
    lastResults: [],
  };
  private timer?: NodeJS.Timeout;

  constructor(registry: SAPRegistry) {
    this.registry = registry;
  }

  /**
   * Start the crawler loop
   */
  start(): void {
    if (this.status.running) return;
    this.status.running = true;

    console.log('🕵️  Agent crawler started (interval: 30 min)');

    // Run immediately, then on interval
    this.runCycle().catch(err => console.error('Crawler error:', err));

    this.timer = setInterval(() => {
      this.runCycle().catch(err => console.error('Crawler error:', err));
    }, CRAWL_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.status.running = false;
    console.log('🛑 Agent crawler stopped');
  }

  getStatus(): CrawlerStatus {
    return {
      ...this.status,
      nextRun: this.status.lastRun
        ? new Date(new Date(this.status.lastRun).getTime() + CRAWL_INTERVAL_MS).toISOString()
        : undefined,
    };
  }

  /**
   * One full crawl cycle — walks all agents with github/token data
   */
  async runCycle(): Promise<void> {
    const agents = this.registry.listAgents();
    const results: CrawlResult[] = [];
    const now = new Date().toISOString();

    console.log(`\n🔄 Crawler cycle started — ${agents.length} agents`);

    for (const agent of agents) {
      const result: CrawlResult = {
        agentId: agent.id,
        agentName: agent.name,
        sources: [],
        liveScore: 0,
        updatedAt: now,
      };

      const liveData: AgentLiveData = {
        lastCrawledAt: now,
        crawlSource: [],
      };

      // ── GitHub ──────────────────────────────────────────────────────
      if (agent.github) {
        try {
          const ghStats = await fetchGitHubStats(agent.github);
          if (ghStats) {
            liveData.githubStars = ghStats.stars;
            liveData.githubForks = ghStats.forks;
            liveData.githubCommits30d = ghStats.commits30d;
            liveData.githubLastPush = ghStats.lastPush;
            liveData.githubRelease = ghStats.latestRelease;
            liveData.crawlSource.push('github');
            result.sources.push('github');
            result.liveScore += computeGitHubScore(ghStats);

            console.log(`  ✅ ${agent.name} — GitHub: ★${ghStats.stars.toLocaleString()} | ${ghStats.commits30d} commits/30d`);
          }
        } catch (err: any) {
          console.warn(`  ⚠️  ${agent.name} GitHub error: ${err.message}`);
        }

        // Small delay to be polite to GitHub API
        await sleep(300);
      }

      // ── DexScreener ─────────────────────────────────────────────────
      try {
        const tokenData = await fetchAgentTokenData(agent.name);
        if (tokenData) {
          liveData.tokenSymbol = tokenData.symbol;
          liveData.tokenPrice = tokenData.priceUsd;
          liveData.tokenChange24h = tokenData.change24h;
          liveData.tokenVolume24h = tokenData.volume24h;
          liveData.crawlSource.push('dexscreener');
          result.sources.push('dexscreener');
          result.liveScore += computeDexScore(tokenData);

          console.log(`  ✅ ${agent.name} — Token: $${tokenData.priceUsd.toFixed(6)} | vol $${(tokenData.volume24h / 1e6).toFixed(2)}M`);
        }
      } catch (err: any) {
        console.warn(`  ⚠️  ${agent.name} DexScreener error: ${err.message}`);
      }

      // Clamp liveScore to -10..+10
      result.liveScore = Math.max(-10, Math.min(10, result.liveScore));
      liveData.liveScore = result.liveScore;

      // Write live data back to registry agent
      const profile = this.registry.getAgent(agent.id);
      if (profile) {
        (profile as any).liveData = liveData;
      }

      if (result.sources.length > 0) {
        results.push(result);
      }
    }

    this.status.lastRun = now;
    this.status.totalCrawled += results.length;
    this.status.lastResults = results;

    console.log(`✅ Crawler cycle done — ${results.length} agents updated\n`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
