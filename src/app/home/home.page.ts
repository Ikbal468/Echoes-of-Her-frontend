import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonSpinner } from '@ionic/angular';
import { IncidentsApiService, IncidentRecord } from '../services/incidents-api.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [CommonModule, FormsModule, IonContent, IonSpinner],
})
export class HomePage implements OnInit, OnDestroy {
  private api = inject(IncidentsApiService);
  private cdr = inject(ChangeDetectorRef);

  currentSegment: 'record' | 'ledger' = 'record';

  // Server health & wake-up status
  serverStatus: 'checking' | 'awake' | 'sleeping' | 'waking' = 'checking';
  wakeSeconds = 0;
  private wakePollInterval: ReturnType<typeof setInterval> | null = null;

  // Form State
  triggerDescription = '';
  location = '';
  intensity = 3;
  submitting = false;
  errorMessage = '';

  // Active Intervention State
  isInterventionActive = false;
  activeVowText = '';
  currentIncidentId: number | null = null;
  cooldownTimer = 10;
  readonly totalCooldown = 10;
  secondsElapsed = 0;
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  // Ledger / Metrics State
  totalDefended = 0;
  history: IncidentRecord[] = [];
  loadingLedger = false;

  get cooldownProgress(): number {
    return (this.totalCooldown - this.cooldownTimer) / this.totalCooldown;
  }

  get strokeDashoffset(): number {
    const circumference = 2 * Math.PI * 45; // r = 45 -> ~282.74
    return circumference * (1 - this.cooldownProgress);
  }

  ngOnInit() {
    this.checkServerHealth();
    this.fetchMetrics();
  }

  checkServerHealth() {
    this.api.ping().subscribe({
      next: () => {
        this.serverStatus = 'awake';
        this.stopWakePolling();
        this.cdr.detectChanges();
      },
      error: () => {
        // If it was already waking, don't revert to sleeping
        if (this.serverStatus !== 'waking') {
          this.serverStatus = 'sleeping';
        }
        this.cdr.detectChanges();
      },
    });
  }

  wakeUpServer() {
    if (this.serverStatus === 'waking') return;

    this.serverStatus = 'waking';
    this.wakeSeconds = 0;
    this.errorMessage = '';
    this.cdr.detectChanges();

    // Trigger initial wake request (Render wakes up on incoming HTTP request)
    this.api.ping().subscribe({
      next: () => {
        this.onServerAwake();
      },
      error: () => {
        // Expected while cold starting; polling will handle it
      },
    });

    // Poll every 3 seconds until server responds
    this.stopWakePolling();
    this.wakePollInterval = setInterval(() => {
      this.wakeSeconds += 3;
      this.cdr.detectChanges();

      this.api.ping().subscribe({
        next: () => {
          this.onServerAwake();
        },
        error: () => {
          // Timeout after ~60s
          if (this.wakeSeconds >= 60) {
            this.stopWakePolling();
            this.serverStatus = 'sleeping';
            this.errorMessage = 'Server is taking longer than usual to wake. Try tapping again.';
            this.cdr.detectChanges();
          }
        },
      });
    }, 3000);
  }

  private onServerAwake() {
    this.stopWakePolling();
    this.serverStatus = 'awake';
    this.errorMessage = '';
    this.fetchMetrics();
    this.cdr.detectChanges();
  }

  private stopWakePolling() {
    if (this.wakePollInterval) {
      clearInterval(this.wakePollInterval);
      this.wakePollInterval = null;
    }
  }

  fetchMetrics() {
    this.loadingLedger = true;
    this.cdr.detectChanges();
    this.api.metrics().subscribe({
      next: (res) => {
        this.totalDefended = res.totalDefended;
        this.history = res.history;
        this.loadingLedger = false;
        this.serverStatus = 'awake';
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingLedger = false;
        this.cdr.detectChanges();
      },
    });
  }

  submitIncident() {
    const desc = this.triggerDescription ? this.triggerDescription.trim() : '';
    if (!desc || this.submitting) return;

    this.submitting = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.api
      .create({
        triggerDescription: desc,
        location: this.location ? this.location.trim() : undefined,
        intensity: this.intensity,
        reflectedDurationSeconds: 0,
      })
      .subscribe({
        next: (res) => {
          this.submitting = false;
          this.currentIncidentId = res.data.id;
          this.activeVowText = res.anchorVow;
          this.serverStatus = 'awake';
          this.startIntervention();
        },
        error: (err) => {
          console.error('Failed to submit incident:', err);
          this.submitting = false;
          this.serverStatus = 'sleeping';
          this.errorMessage = 'Server might be asleep. Tap "Wake Up Server" above or try again.';
          this.cdr.detectChanges();
        },
      });
  }

  startIntervention() {
    this.clearTimer();
    this.isInterventionActive = true;
    this.cooldownTimer = this.totalCooldown;
    this.secondsElapsed = 0;
    this.cdr.detectChanges();

    this.timerInterval = setInterval(() => {
      this.secondsElapsed++;
      if (this.cooldownTimer > 0) {
        this.cooldownTimer--;
      }
      this.cdr.detectChanges();
    }, 1000);
  }

  acknowledgeAndUphold() {
    if (this.cooldownTimer > 0) return;

    const incidentId = this.currentIncidentId;
    const duration = this.secondsElapsed;

    this.clearTimer();

    if (incidentId) {
      this.api.affirm(incidentId, duration).subscribe({
        next: () => this.fetchMetrics(),
        error: () => this.fetchMetrics(),
      });
    }

    // Reset input fields completely for next trigger
    this.isInterventionActive = false;
    this.currentIncidentId = null;
    this.triggerDescription = '';
    this.location = '';
    this.intensity = 3;
    this.currentSegment = 'record';
    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    this.clearTimer();
    this.stopWakePolling();
  }

  private clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}
