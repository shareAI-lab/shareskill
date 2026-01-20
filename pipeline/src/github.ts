// GitHub Token Pool with rotation, rate limit handling, and validation
import { Octokit } from 'octokit';
import { config } from './config.js';

interface TokenState {
  token: string;
  octokit: Octokit;
  remaining: number;
  resetAt: number;
  valid: boolean;
  lastUsed: number;
}

class GitHubTokenPool {
  private tokens: TokenState[] = [];

  constructor(tokenStrings: string[]) {
    for (const token of tokenStrings) {
      this.tokens.push({
        token,
        octokit: new Octokit({ auth: token }),
        remaining: 5000,
        resetAt: 0,
        valid: true,
        lastUsed: 0,
      });
    }
  }

  async initialize(): Promise<void> {
    console.log(`Validating ${this.tokens.length} GitHub token(s)...`);

    const validationPromises = this.tokens.map(async (state, index) => {
      try {
        const { data } = await state.octokit.rest.rateLimit.get();
        state.remaining = data.resources.core.remaining;
        state.resetAt = data.resources.core.reset * 1000;
        state.valid = true;
        console.log(`  Token #${index + 1} (***${state.token.slice(-4)}): valid, ${state.remaining} remaining`);
      } catch (error: any) {
        state.valid = false;
        console.warn(`  Token #${index + 1} (***${state.token.slice(-4)}): invalid - ${error.message}`);
      }
    });

    await Promise.all(validationPromises);

    const validCount = this.tokens.filter((t) => t.valid).length;
    if (validCount === 0) {
      throw new Error('No valid GitHub tokens available');
    }

    console.log(`Token pool initialized: ${validCount}/${this.tokens.length} valid\n`);
  }

  private getBestToken(): TokenState {
    const now = Date.now();
    const validTokens = this.tokens.filter((t) => t.valid);

    if (validTokens.length === 0) {
      throw new Error('All GitHub tokens are invalid');
    }

    // Reset tokens that have passed their reset time
    for (const token of validTokens) {
      if (token.remaining <= 0 && now > token.resetAt) {
        token.remaining = 5000;
      }
    }

    // Find token with most remaining quota
    const availableTokens = validTokens.filter((t) => t.remaining > 0);

    if (availableTokens.length > 0) {
      // Sort by remaining (desc), then by lastUsed (asc) for round-robin
      availableTokens.sort((a, b) => {
        if (b.remaining !== a.remaining) return b.remaining - a.remaining;
        return a.lastUsed - b.lastUsed;
      });
      return availableTokens[0];
    }

    // All tokens exhausted, find the one that resets soonest
    const minResetTime = Math.min(...validTokens.map((t) => t.resetAt));
    const waitMs = Math.max(0, minResetTime - now + 1000);

    if (waitMs > 0 && waitMs < 60000) {
      console.warn(`All tokens exhausted. Waiting ${Math.ceil(waitMs / 1000)}s for reset...`);
    }

    return validTokens.find((t) => t.resetAt === minResetTime) || validTokens[0];
  }

  getOctokit(): Octokit {
    const best = this.getBestToken();
    best.lastUsed = Date.now();
    best.remaining = Math.max(0, best.remaining - 1);
    return best.octokit;
  }

  getToken(): string {
    return this.getBestToken().token;
  }

  updateRateLimit(token: string, remaining: number, resetAt: number): void {
    const state = this.tokens.find((t) => t.token === token);
    if (state) {
      state.remaining = remaining;
      state.resetAt = resetAt * 1000;
    }
  }

  markInvalid(token: string): void {
    const state = this.tokens.find((t) => t.token === token);
    if (state) {
      state.valid = false;
      console.warn(`Token ***${token.slice(-4)} marked as invalid`);
    }
  }

  get validCount(): number {
    return this.tokens.filter((t) => t.valid).length;
  }

  get totalRemaining(): number {
    return this.tokens.filter((t) => t.valid).reduce((sum, t) => sum + Math.max(0, t.remaining), 0);
  }
}

// Singleton instance
let tokenPool: GitHubTokenPool | null = null;

export async function getTokenPool(): Promise<GitHubTokenPool> {
  if (!tokenPool) {
    if (config.githubTokens.length === 0) {
      throw new Error('GITHUB_TOKENS environment variable is required');
    }
    tokenPool = new GitHubTokenPool(config.githubTokens);
    await tokenPool.initialize();
  }
  return tokenPool;
}

export { GitHubTokenPool };
