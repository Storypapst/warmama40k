import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { WelcomeComponent } from './welcome.component';
import { PlayerService, LocalPlayer } from '../../core/services/player.service';
import { signal } from '@angular/core';

describe('WelcomeComponent', () => {
  let component: WelcomeComponent;
  let fixture: ComponentFixture<WelcomeComponent>;
  let router: Router;
  let mockPlayerService: {
    ensureLoaded: ReturnType<typeof vi.fn>;
    hasPlayers: ReturnType<typeof vi.fn>;
    players: ReturnType<typeof signal<LocalPlayer[]>>;
    clearAll: ReturnType<typeof vi.fn>;
    createPlayer: ReturnType<typeof vi.fn>;
  };

  const playersWithUnits: LocalPlayer[] = [
    { id: 'p1', name: 'Alice', ownedUnits: [
      { id: 'ou1', unitId: 'u1', unitName: 'Boyz', faction: 'Orks', selectedModelCount: 10, selectedWeapons: [], points: 90 },
    ]},
    { id: 'p2', name: 'Bob', ownedUnits: [] },
  ];

  const playersWithoutUnits: LocalPlayer[] = [
    { id: 'p1', name: 'Alice', ownedUnits: [] },
    { id: 'p2', name: 'Bob', ownedUnits: [] },
  ];

  function setup(players: LocalPlayer[], hasPlayers = true) {
    mockPlayerService = {
      ensureLoaded: vi.fn().mockResolvedValue(undefined),
      hasPlayers: vi.fn().mockReturnValue(hasPlayers),
      players: signal(players),
      clearAll: vi.fn().mockResolvedValue(undefined),
      createPlayer: vi.fn().mockImplementation(async (name: string) => {
        const p = { id: `new-${name}`, name, ownedUnits: [] };
        return p;
      }),
    };

    TestBed.configureTestingModule({
      imports: [WelcomeComponent],
      providers: [
        provideRouter([]),
        provideAnimationsAsync(),
        { provide: PlayerService, useValue: mockPlayerService },
      ],
    });

    fixture = TestBed.createComponent(WelcomeComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  }

  describe('button layout for existing players', () => {
    beforeEach(async () => {
      setup(playersWithUnits);
      // Manually resolve loading
      component.loading.set(false);
      fixture.detectChanges();
    });

    it('should show "Neu anfangen" button with refresh icon', () => {
      const html = fixture.nativeElement.innerHTML;
      expect(html).toContain('refresh');
      expect(html).toContain('Neu anfangen');
    });

    it('should show "Weiter" button', () => {
      const html = fixture.nativeElement.innerHTML;
      expect(html).toContain('Weiter');
    });

    it('should have existing-actions class for space-between layout', () => {
      const actions = fixture.nativeElement.querySelector('.existing-actions');
      expect(actions).not.toBeNull();
    });
  });

  describe('continueWithExisting navigation', () => {
    it('should navigate to squad-setup when player has units', () => {
      setup(playersWithUnits);
      component.loading.set(false);
      fixture.detectChanges();

      component.continueWithExisting();

      expect(router.navigate).toHaveBeenCalledWith(['/squad-setup', 'p1']);
    });

    it('should navigate to collection when player has no units', () => {
      setup(playersWithoutUnits);
      component.loading.set(false);
      fixture.detectChanges();

      component.continueWithExisting();

      expect(router.navigate).toHaveBeenCalledWith(['/collection', 'p1']);
    });
  });

  describe('new player setup', () => {
    it('should not allow start with empty names', () => {
      setup([], false);
      component.loading.set(false);
      fixture.detectChanges();

      expect(component.canStart()).toBe(false);
    });

    it('should allow start with 2 valid names', () => {
      setup([], false);
      component.loading.set(false);
      component.playerNames = ['Alice', 'Bob'];
      fixture.detectChanges();

      expect(component.canStart()).toBe(true);
    });

    it('should add/remove player slots', () => {
      setup([], false);
      component.loading.set(false);

      expect(component.playerNames.length).toBe(2);
      component.addPlayerSlot();
      expect(component.playerNames.length).toBe(3);
      component.removePlayerSlot(2);
      expect(component.playerNames.length).toBe(2);
    });
  });
});
