import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

interface NavLink {
  label: string;
  path: string;
  icon: string;
}

const COLLAPSE_STORAGE_KEY = 'pgrtc_sidebar_collapsed';

@Component({
  selector: 'app-nav',
  imports: [
    MatButtonModule,
    MatMenuModule,
    MatDialogModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.scss',
})
export class NavComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  protected readonly collapsed = signal(readCollapsed());
  protected readonly mobileOpen = signal(false);
  protected readonly currentUser = this.auth.currentUser;

  protected readonly links: NavLink[] = [
    { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { label: 'Centros', path: '/centers', icon: 'local_hospital' },
    { label: 'Insumos', path: '/supplies', icon: 'inventory_2' },
    { label: 'Inventario', path: '/inventory', icon: 'assignment' },
    { label: 'Redistribución', path: '/redistribution', icon: 'swap_horiz' },
  ];

  protected readonly userLabel = computed(() => {
    const user = this.currentUser();
    if (!user) {
      return '';
    }
    return user.role ? `${user.fullName} · ${user.role}` : user.fullName;
  });

  protected toggleCollapsed(): void {
    const next = !this.collapsed();
    this.collapsed.set(next);
    try {
      localStorage.setItem(COLLAPSE_STORAGE_KEY, String(next));
    } catch {
      // Ignore storage failures (private mode, quota, etc.).
    }
  }

  protected toggleMobile(): void {
    this.mobileOpen.update((open) => !open);
  }

  protected closeMobile(): void {
    this.mobileOpen.set(false);
  }

  protected confirmLogout(): void {
    this.closeMobile();
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '440px',
      maxWidth: '95vw',
      data: {
        title: 'Cerrar sesión',
        message: '¿Seguro que quieres cerrar sesión?',
        confirmText: 'Cerrar sesión',
        cancelText: 'Cancelar',
        danger: true,
      },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.auth.logout();
      }
    });
  }

  protected goTo(path: string): void {
    this.closeMobile();
    void this.router.navigate([path]);
  }
}

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}
