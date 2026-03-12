import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  imports: [RouterModule, MatToolbarModule, MatIconModule, MatButtonModule],
  selector: 'app-root',
  template: `
    <div class="app-shell">
      <mat-toolbar color="primary" class="app-toolbar">
        <button mat-icon-button routerLink="/">
          <mat-icon>shield</mat-icon>
        </button>
        <span class="app-title">WarMama40K</span>
        <span class="spacer"></span>
        <button mat-icon-button routerLink="/overview" routerLinkActive="active-link">
          <mat-icon>people</mat-icon>
        </button>
        <button mat-icon-button routerLink="/units" routerLinkActive="active-link">
          <mat-icon>menu_book</mat-icon>
        </button>
        <button mat-icon-button routerLink="/game" routerLinkActive="active-link">
          <mat-icon>sports_esports</mat-icon>
        </button>
        <button mat-icon-button routerLink="/campaign" routerLinkActive="active-link">
          <mat-icon>auto_stories</mat-icon>
        </button>
        <button mat-icon-button routerLink="/settings" routerLinkActive="active-link">
          <mat-icon>settings</mat-icon>
        </button>
      </mat-toolbar>
      <main class="app-content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: `
    .app-shell {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 100vh;
      min-height: 100dvh;
    }
    .app-toolbar {
      position: sticky;
      top: 0;
      z-index: 100;
      padding-top: env(safe-area-inset-top);
      flex-shrink: 0;
    }
    .app-title {
      margin-left: 8px;
      font-weight: 700;
      letter-spacing: 1px;
    }
    .spacer {
      flex: 1 1 auto;
    }
    .app-content {
      flex: 1;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      padding: 16px;
      padding-left: calc(16px + env(safe-area-inset-left));
      padding-right: calc(16px + env(safe-area-inset-right));
      padding-bottom: calc(16px + env(safe-area-inset-bottom));
    }
    .active-link {
      color: #c9a84c;
    }

    /* iPad landscape: wider content */
    @media (min-width: 1024px) {
      .app-content {
        max-width: 960px;
        margin: 0 auto;
        width: 100%;
      }
    }
  `,
})
export class App {}
