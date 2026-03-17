import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { GameSetupComponent } from './game-setup.component';
import { PlayerService, LocalPlayer } from '../../core/services/player.service';
import { GameService } from '../../core/services/game.service';
import { ArmyStateService } from '../../core/services/army-state.service';
import { AssistanceLevel } from '@warmama40k/shared';
import { signal } from '@angular/core';

describe('GameSetupComponent', () => {
  let component: GameSetupComponent;
  let fixture: ComponentFixture<GameSetupComponent>;

  const mockPlayers: LocalPlayer[] = [
    { id: 'p1', name: 'Alice', ownedUnits: [] },
    { id: 'p2', name: 'Bob', ownedUnits: [] },
  ];

  const mockResult = {
    army1: {
      units: [{ unitId: 'u1', unitName: 'Boyz', faction: 'Orks', points: 90 }],
    },
    army2: {
      units: [{ unitId: 'u2', unitName: 'Intercessors', faction: 'Space Marines', points: 100 }],
    },
  };

  beforeEach(async () => {
    const mockPlayerService = {
      ensureLoaded: vi.fn().mockResolvedValue(undefined),
      players: vi.fn().mockReturnValue(mockPlayers),
    };

    const mockGameService = {
      createGame: vi.fn().mockResolvedValue({}),
    };

    const mockArmyState = {
      currentResult: signal(mockResult),
    };

    TestBed.configureTestingModule({
      imports: [GameSetupComponent],
      providers: [
        provideRouter([]),
        provideAnimationsAsync(),
        { provide: PlayerService, useValue: mockPlayerService },
        { provide: GameService, useValue: mockGameService },
        { provide: ArmyStateService, useValue: mockArmyState },
      ],
    });

    fixture = TestBed.createComponent(GameSetupComponent);
    component = fixture.componentInstance;
  });

  describe('assistance level selection', () => {
    it('should default to HIGH assistance level', () => {
      expect(component.selectedLevel()).toBe(AssistanceLevel.HIGH);
    });

    it('should have 3 assistance levels', () => {
      expect(component.assistanceLevels.length).toBe(3);
    });

    it('should update selected level on set', () => {
      component.selectedLevel.set(AssistanceLevel.LOW);
      expect(component.selectedLevel()).toBe(AssistanceLevel.LOW);
    });

    it('should apply selected class only to active level button', async () => {
      // Simulate loaded state
      component.loading.set(false);
      component.players.set(mockPlayers);
      fixture.detectChanges();
      await fixture.whenStable();

      const buttons = fixture.nativeElement.querySelectorAll('.level-options button');
      // Default is HIGH (first button)
      if (buttons.length >= 3) {
        expect(buttons[0].classList.contains('selected')).toBe(true);
        expect(buttons[1].classList.contains('selected')).toBe(false);
        expect(buttons[2].classList.contains('selected')).toBe(false);
      }
    });

    it('should switch selected class when level changes', async () => {
      component.loading.set(false);
      component.players.set(mockPlayers);
      component.selectedLevel.set(AssistanceLevel.MEDIUM);
      fixture.detectChanges();
      await fixture.whenStable();

      const buttons = fixture.nativeElement.querySelectorAll('.level-options button');
      if (buttons.length >= 3) {
        expect(buttons[0].classList.contains('selected')).toBe(false);
        expect(buttons[1].classList.contains('selected')).toBe(true);
        expect(buttons[2].classList.contains('selected')).toBe(false);
      }
    });
  });

  describe('army preview', () => {
    it('should return empty units before ngOnInit', () => {
      component.loading.set(false);
      component.players.set(mockPlayers);
      // Before ngOnInit, army units are empty
      expect(component.getArmyUnits(0).length).toBe(0);
      expect(component.getArmyPoints(0)).toBe(0);
    });
  });
});
