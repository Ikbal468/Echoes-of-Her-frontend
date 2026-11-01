import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface IncidentRecord {
  id: number;
  triggerDescription: string;
  location: string;
  intensity: number;
  reflectedDurationSeconds: number;
  committed: boolean;
  createdAt: string;
  vow?: {
    id: number;
    title: string;
    content: string;
  };
}

export interface CreateIncidentPayload {
  triggerDescription: string;
  location?: string;
  intensity: number;
  vowId?: number;
  reflectedDurationSeconds?: number;
}

export interface CreateIncidentResponse {
  success: boolean;
  data: IncidentRecord;
  anchorVow: string;
}

export interface MetricsResponse {
  totalDefended: number;
  history: IncidentRecord[];
}

@Injectable({ providedIn: 'root' })
export class IncidentsApiService {
  private http = inject(HttpClient);
  readonly rootUrl = environment.apiUrl.replace(/\/$/, '');
  readonly baseUrl = `${this.rootUrl}/incidents`;

  ping(): Observable<{ status: string }> {
    return this.http.get<{ status: string }>(`${this.rootUrl}/health`);
  }

  create(payload: CreateIncidentPayload): Observable<CreateIncidentResponse> {
    return this.http.post<CreateIncidentResponse>(this.baseUrl, payload);
  }

  affirm(id: number, reflectedDurationSeconds: number): Observable<IncidentRecord> {
    return this.http.patch<IncidentRecord>(`${this.baseUrl}/${id}/affirm`, {
      reflectedDurationSeconds,
    });
  }

  findAll(): Observable<IncidentRecord[]> {
    return this.http.get<IncidentRecord[]>(this.baseUrl);
  }

  metrics(): Observable<MetricsResponse> {
    return this.http.get<MetricsResponse>(`${this.baseUrl}/metrics`);
  }
}
