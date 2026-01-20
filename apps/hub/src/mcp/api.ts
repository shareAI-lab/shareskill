// ShareSkill API Client

import { API_BASE_URL } from '@shareskill/shared';
import type {
  SkillListItem,
  SkillDetail,
  SkillPackage,
  SearchResponse,
  SkillResponse,
  PackageResponse,
} from './types.js';

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'ShareSkill-MCP/0.1.0',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function searchSkills(
  query: string,
  options?: { category?: string; limit?: number }
): Promise<SkillListItem[]> {
  const params = new URLSearchParams({ q: query });
  if (options?.category) params.set('category', options.category);
  if (options?.limit) params.set('limit', String(options.limit));

  const response = await apiRequest<SearchResponse>(`/search?${params}`);

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Search failed');
  }

  return response.data.items;
}

export async function getSkillDetail(skillKey: string): Promise<SkillDetail> {
  const encoded = encodeURIComponent(skillKey);
  const response = await apiRequest<SkillResponse>(`/skill/${encoded}`);

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to get skill detail');
  }

  return response.data;
}

export async function getSkillResource(skillKey: string, resourcePath: string): Promise<string> {
  const encoded = encodeURIComponent(skillKey);
  const url = `${API_BASE_URL}/skill/${encoded}/resource/${resourcePath}`;

  const response = await fetch(url, {
    headers: { 'User-Agent': 'ShareSkill-MCP/0.1.0' },
  });

  if (!response.ok) {
    throw new Error(`Failed to get resource: ${response.status}`);
  }

  return response.text();
}

export async function getSkillPackage(skillKey: string): Promise<SkillPackage> {
  const encoded = encodeURIComponent(skillKey);
  const response = await apiRequest<PackageResponse>(`/skill/${encoded}/package`);

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to get skill package');
  }

  return response.data;
}
