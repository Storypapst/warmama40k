import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./features/onboarding/welcome.component').then(
        (m) => m.WelcomeComponent,
      ),
  },
  {
    path: 'collection/:playerId',
    loadComponent: () =>
      import('./features/onboarding/collection.component').then(
        (m) => m.CollectionComponent,
      ),
  },
  {
    path: 'squad-setup/:playerId',
    loadComponent: () =>
      import('./features/squad-manager/squad-manager.component').then(
        (m) => m.SquadManagerComponent,
      ),
  },
  {
    path: 'overview',
    loadComponent: () =>
      import('./features/onboarding/overview.component').then(
        (m) => m.OverviewComponent,
      ),
  },
  {
    path: 'army-builder',
    loadComponent: () =>
      import('./features/army-builder/army-builder.component').then(
        (m) => m.ArmyBuilderComponent,
      ),
  },
  {
    path: 'game-setup',
    loadComponent: () =>
      import('./features/game-assistant/game-setup.component').then(
        (m) => m.GameSetupComponent,
      ),
  },
  {
    path: 'game',
    loadComponent: () =>
      import('./features/game-assistant/game-assistant.component').then(
        (m) => m.GameAssistantComponent,
      ),
  },
  {
    path: 'combat',
    loadComponent: () =>
      import('./features/game-assistant/combat-resolver.component').then(
        (m) => m.CombatResolverComponent,
      ),
  },
  {
    path: 'units',
    loadComponent: () =>
      import('./features/unit-browser/unit-browser.component').then(
        (m) => m.UnitBrowserComponent,
      ),
  },
  {
    path: 'units/:faction',
    loadComponent: () =>
      import('./features/unit-browser/faction-units.component').then(
        (m) => m.FactionUnitsComponent,
      ),
  },
  {
    path: 'unit/:id',
    loadComponent: () =>
      import('./features/unit-browser/unit-detail.component').then(
        (m) => m.UnitDetailComponent,
      ),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings.component').then(
        (m) => m.SettingsComponent,
      ),
  },
  {
    path: 'missions',
    loadComponent: () =>
      import('./features/settings/mission-generator.component').then(
        (m) => m.MissionGeneratorComponent,
      ),
  },
  {
    path: 'campaign',
    loadComponent: () =>
      import('./features/campaign/campaign.component').then(
        (m) => m.CampaignComponent,
      ),
  },
  {
    path: 'game-summary',
    loadComponent: () =>
      import('./features/game-assistant/game-summary.component').then(
        (m) => m.GameSummaryComponent,
      ),
  },
];
