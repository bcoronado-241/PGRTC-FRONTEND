import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { Router, RouterLink } from '@angular/router';
import { DashboardData } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { errorMessage } from '../../core/services/http.util';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-dashboard',
  imports: [
    MatButtonModule,
    MatCardModule,
    RouterLink,
    EmptyStateComponent,
    LoadingSpinnerComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly service = inject(DashboardService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly currentUser = this.auth.currentUser;
  protected readonly data = signal<DashboardData | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly totalCenters = computed(() => {
    const byStatus = this.data()?.centersByStatus;
    if (!byStatus) {
      return 0;
    }
    return byStatus.total || byStatus.red + byStatus.yellow + byStatus.green;
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.get().subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(errorMessage(err, 'No se pudo cargar el tablero.'));
        this.loading.set(false);
      },
    });
  }

  protected barWidth(value: number): string {
    const total = this.totalCenters();
    if (total <= 0) {
      return '0%';
    }
    return `${Math.round((value / total) * 100)}%`;
  }

  protected openCenters(status?: 'red' | 'yellow' | 'green'): void {
    this.router.navigate(['/centers'], {
      queryParams: status ? { status } : {},
    });
  }
}
