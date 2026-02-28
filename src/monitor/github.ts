/**
 * GitHub API monitor — tracks open-source Solana agents
 * Free tier: 5000 req/hour with token, 60 req/hour without
 */

import axios from 'axios';

const BASE = 'https://api.github.com';

export interface GitHubStats {
  repo: string;
  stars: number;
  forks: number;
  openIssues: number;
  lastPush: string;        // ISO date
  latestRelease?: string;  // tag name
  commits30d: number;
}

function axiosHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'AgentPass-Monitor/1.0',
  };
  if (process.env.GITHUB_TOKEN) {
    h['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return h;
}

async function fetchJSON(url: string): Promise<any> {
  const res = await axios.get(url, { headers: axiosHeaders() });
  return res.data;
}

/**
 * Parse owner/repo from full GitHub URL or short "owner/repo"
 */
export function parseGitHubRepo(githubUrl: string): string | null {
  try {
    const cleaned = githubUrl
      .replace('https://github.com/', '')
      .replace('http://github.com/', '')
      .replace(/\/$/, '');
    const parts = cleaned.split('/');
    if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch core repo metadata
 */
async function fetchRepoInfo(repo: string): Promise<{ stars: number; forks: number; openIssues: number; lastPush: string }> {
  const data = await fetchJSON(`${BASE}/repos/${repo}`);
  return {
    stars: data.stargazers_count ?? 0,
    forks: data.forks_count ?? 0,
    openIssues: data.open_issues_count ?? 0,
    lastPush: data.pushed_at ?? new Date().toISOString(),
  };
}

/**
 * Fetch latest release tag
 */
async function fetchLatestRelease(repo: string): Promise<string | undefined> {
  try {
    const data = await fetchJSON(`${BASE}/repos/${repo}/releases/latest`);
    return data.tag_name;
  } catch {
    return undefined;
  }
}

/**
 * Count commits in the last 30 days
 */
async function fetchCommits30d(repo: string): Promise<number> {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    // GitHub paginates — we fetch up to 100, enough for a score signal
    const data = await fetchJSON(`${BASE}/repos/${repo}/commits?since=${since}&per_page=100`);
    return Array.isArray(data) ? data.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Full stats for one repo
 */
export async function fetchGitHubStats(githubUrl: string): Promise<GitHubStats | null> {
  const repo = parseGitHubRepo(githubUrl);
  if (!repo) return null;

  try {
    const [info, release, commits30d] = await Promise.all([
      fetchRepoInfo(repo),
      fetchLatestRelease(repo),
      fetchCommits30d(repo),
    ]);

    return {
      repo,
      stars: info.stars,
      forks: info.forks,
      openIssues: info.openIssues,
      lastPush: info.lastPush,
      latestRelease: release,
      commits30d,
    };
  } catch (err: any) {
    console.warn(`⚠️  GitHub fetch failed for ${repo}: ${err.message}`);
    return null;
  }
}

/**
 * Compute a reputation bonus/delta based on GitHub stats (+0..+8)
 */
export function computeGitHubScore(stats: GitHubStats): number {
  let score = 0;

  // Stars
  if (stats.stars >= 10000) score += 6;
  else if (stats.stars >= 5000) score += 5;
  else if (stats.stars >= 2000) score += 4;
  else if (stats.stars >= 500) score += 2;
  else if (stats.stars >= 100) score += 1;

  // Recent commits (30d)
  if (stats.commits30d >= 20) score += 2;
  else if (stats.commits30d >= 5) score += 1;

  // Recent push (within 7 days)
  const daysSincePush = (Date.now() - new Date(stats.lastPush).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSincePush <= 7) score += 2;
  else if (daysSincePush <= 30) score += 1;

  return score;
}
