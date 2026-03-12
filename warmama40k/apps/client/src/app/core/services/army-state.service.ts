import { Injectable, signal } from '@angular/core';
import type { BalanceResult } from '@warmama40k/shared';

@Injectable({ providedIn: 'root' })
export class ArmyStateService {
  readonly currentResult = signal<BalanceResult | null>(null);
  readonly targetPoints = signal(500);

  setResult(result: BalanceResult, targetPoints: number): void {
    this.currentResult.set(result);
    this.targetPoints.set(targetPoints);
  }

  clear(): void {
    this.currentResult.set(null);
  }
}
