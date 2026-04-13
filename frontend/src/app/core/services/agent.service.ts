import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AgentConfig, ForgeRequest, ForgeResponse } from '../models/agent.model';

interface BackendAgent {
  token_id?: number;
  tokenId?: number;
  agent_type?: 'content' | 'trading';
  agentType?: 'content' | 'trading';
  specialization: string;
  personality_prompt?: string;
  personalityPrompt?: string;
  style_parameters?: Record<string, unknown>;
  styleParameters?: Record<string, unknown>;
  skill_scores?: number[];
  skillScores?: number[];
  level: number;
  total_earnings?: number;
  totalEarnings?: number;
  jobs_completed?: number;
  jobsCompleted?: number;
  reputation_score?: number;
  reputationScore?: number;
  traits?: string[];
  tba_wallet_address?: string;
  tbaWalletAddress?: string;
  metadata_uri?: string;
  metadataURI?: string;
  owner_address?: string;
  ownerAddress?: string;
}

interface BackendForgeResponse {
  tokenId: number;
  dna: BackendAgent;
  tbaWallet?: string | null;
  nftVisualUrl?: string;
  txHash?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AgentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly backendBase = environment.apiUrl.replace(/\/api\/?$/, '');

  private resolveMetadataUri(url: string): string {
    if (!url) return url;
    if (/^(https?:|data:|ipfs:)/i.test(url)) {
      if (url === 'ipfs://placeholder') {
        return 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&w=900&q=80';
      }
      return url;
    }
    return `${this.backendBase}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  private mapAgent(item: BackendAgent): AgentConfig {
    return {
      tokenId: Number(item.tokenId ?? item.token_id ?? 0),
      agentType: (item.agentType ?? item.agent_type ?? 'content') as 'content' | 'trading',
      specialization: item.specialization,
      personalityPrompt: item.personalityPrompt ?? item.personality_prompt ?? '',
      styleParameters: item.styleParameters ?? item.style_parameters ?? {},
      skillScores: item.skillScores ?? item.skill_scores ?? [50, 50, 50, 50, 50],
      level: Number(item.level ?? 1),
      totalEarnings: Number(item.totalEarnings ?? item.total_earnings ?? 0),
      jobsCompleted: Number(item.jobsCompleted ?? item.jobs_completed ?? 0),
      reputationScore: Number(item.reputationScore ?? item.reputation_score ?? 50),
      traits: item.traits ?? [],
      tbaWalletAddress: item.tbaWalletAddress ?? item.tba_wallet_address ?? '',
      metadataURI: this.resolveMetadataUri(item.metadataURI ?? item.metadata_uri ?? ''),
      ownerAddress: item.ownerAddress ?? item.owner_address ?? ''
    };
  }

  forgeAgent(request: ForgeRequest): Observable<ForgeResponse> {
    return this.http
      .post<BackendForgeResponse>(`${this.apiUrl}/agents/forge`, {
        owner_address: request.ownerAddress,
        agent_type: request.agentType,
        specialization: request.specialization
      })
      .pipe(
        map((res) => ({
          tokenId: res.tokenId,
          dna: this.mapAgent(res.dna),
          tbaWallet: res.tbaWallet ?? '',
          nftVisualUrl: res.nftVisualUrl ?? '',
          txHash: res.txHash ?? ''
        }))
      );
  }

  previewForge(request: ForgeRequest): Observable<unknown> {
    return this.http.post<unknown>(`${this.apiUrl}/agents/forge/preview`, {
      owner_address: request.ownerAddress,
      agent_type: request.agentType,
      specialization: request.specialization
    });
  }

  getAgent(tokenId: number): Observable<AgentConfig> {
    return this.http.get<BackendAgent>(`${this.apiUrl}/agents/${tokenId}`).pipe(map((item) => this.mapAgent(item)));
  }

  getMyAgents(ownerAddress: string): Observable<AgentConfig[]> {
    return this.http
      .get<BackendAgent[]>(`${this.apiUrl}/agents/owner/${ownerAddress}`)
      .pipe(map((items) => items.map((item) => this.mapAgent(item))));
  }

  getAgentMemory(tokenId: number): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.apiUrl}/agents/${tokenId}/memory`);
  }

  getEvolutionHistory(tokenId: number): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.apiUrl}/agents/${tokenId}/evolution`);
  }

  getContentSpecializations(): string[] {
    return [
      'cyberpunk_image_gen',
      'anime_art',
      'photorealistic_portraits',
      'abstract_art',
      'lofi_aesthetic'
    ];
  }

  getTradingSpecializations(): string[] {
    return [
      'momentum_trader',
      'mean_reversion',
      'trend_following',
      'scalping',
      'swing_trader',
      'options_strategy',
      'futures_strategy'
    ];
  }

  getLeaderboard(): Observable<AgentConfig[]> {
    return this.http
      .get<BackendAgent[]>(`${this.apiUrl}/agents/leaderboard/global`)
      .pipe(map((items) => items.map((item) => this.mapAgent(item))));
  }
}
