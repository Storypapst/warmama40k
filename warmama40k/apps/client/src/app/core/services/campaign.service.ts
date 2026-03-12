import { Injectable, signal, computed } from '@angular/core';
import Dexie from 'dexie';
import { LLMService } from './llm.service';
import { SettingsService } from './settings.service';

export interface CampaignBattle {
  id: string;
  missionName: string;
  winner: string;
  player1Name: string;
  player1Score: number;
  player2Name: string;
  player2Score: number;
  storyIntro: string;
  storyOutro: string;
  playedAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  player1Name: string;
  player2Name: string;
  battles: CampaignBattle[];
  status: 'active' | 'completed';
  createdAt: string;
}

class CampaignDB extends Dexie {
  campaigns!: Dexie.Table<Campaign, string>;

  constructor() {
    super('warmama40k_campaigns');
    this.version(1).stores({
      campaigns: 'id, status',
    });
  }
}

/** Static story intros for different campaign stages */
const STORY_INTROS: string[] = [
  'Die Sonne geht auf ueber dem Schlachtfeld. Beide Armeen stehen bereit. Heute wird Geschichte geschrieben!',
  'Dunkle Wolken ziehen auf. Die Scouts melden feindliche Bewegungen. Es ist Zeit zu kaempfen!',
  'Nach dem letzten Kampf haben sich beide Seiten neu formiert. Diesmal geht es um alles!',
  'Eine geheime Nachricht wurde abgefangen. Der Feind plant einen Angriff. Seid bereit!',
  'Die Generaele studieren die Karte. Der naechste Kampf wird entscheidend sein.',
  'Verstaerkung ist eingetroffen! Mit frischen Truppen geht es in die naechste Schlacht.',
  'Ein alter Tempel wurde entdeckt. Beide Seiten wollen seine Macht fuer sich nutzen.',
  'Der Boden bebt. Schwere Fahrzeuge rollen heran. Die finale Konfrontation beginnt!',
];

const STORY_OUTROS_VICTORY: string[] = [
  'Ein glorreiches Sieg! Die Krieger feiern ihren Triumph.',
  'Der Feind zieht sich zurueck. Heute gehoert das Schlachtfeld den Siegern!',
  'Die Banner wehen stolz im Wind. Ein hart erkaueffter aber verdienter Sieg.',
  'Mit einem letzten Angriff wurde der Feind in die Flucht geschlagen. Sieg!',
];

const STORY_OUTROS_DEFEAT: string[] = [
  'Trotz tapferem Kampf mussten sich die Krieger zurueckziehen. Aber sie werden wiederkommen!',
  'Eine schmerzhafte Niederlage. Aber jede Niederlage macht staerker fuer den naechsten Kampf.',
  'Der Feind war diesmal zu stark. Zeit, neue Strategien zu planen!',
];

const CAMPAIGN_NAMES: string[] = [
  'Der Kreuzzug der Sterne',
  'Krieg um Sector Primus',
  'Die Verteidigung von Armageddon',
  'Operation Sturmschild',
  'Die Jagd nach dem Artefakt',
  'Schicksalsschlacht im Warp',
  'Die Chroniken von Nova Terra',
  'Kampagne des ewigen Krieges',
];

@Injectable({ providedIn: 'root' })
export class CampaignService {
  private db = new CampaignDB();

  readonly activeCampaign = signal<Campaign | null>(null);
  readonly allCampaigns = signal<Campaign[]>([]);

  readonly campaignScore = computed(() => {
    const c = this.activeCampaign();
    if (!c) return { player1: 0, player2: 0 };
    let p1 = 0, p2 = 0;
    for (const b of c.battles) {
      if (b.winner === c.player1Name) p1++;
      else if (b.winner === c.player2Name) p2++;
    }
    return { player1: p1, player2: p2 };
  });

  readonly campaignLeader = computed(() => {
    const score = this.campaignScore();
    const c = this.activeCampaign();
    if (!c) return '';
    if (score.player1 > score.player2) return c.player1Name;
    if (score.player2 > score.player1) return c.player2Name;
    return 'Gleichstand';
  });

  constructor(
    private llm: LLMService,
    private settingsService: SettingsService,
  ) {
    this.loadCampaigns();
  }

  private async loadCampaigns(): Promise<void> {
    try {
      const all = await this.db.campaigns.toArray();
      this.allCampaigns.set(all);
      const active = all.find((c) => c.status === 'active');
      if (active) this.activeCampaign.set(active);
    } catch {
      // DB error, start fresh
    }
  }

  async createCampaign(player1Name: string, player2Name: string, name?: string): Promise<Campaign> {
    const campaign: Campaign = {
      id: crypto.randomUUID(),
      name: name ?? CAMPAIGN_NAMES[Math.floor(Math.random() * CAMPAIGN_NAMES.length)],
      player1Name,
      player2Name,
      battles: [],
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    await this.db.campaigns.put(campaign);
    this.activeCampaign.set(campaign);
    this.allCampaigns.update((all) => [...all, campaign]);
    return campaign;
  }

  async addBattleResult(
    missionName: string,
    winnerName: string,
    player1Score: number,
    player2Score: number,
  ): Promise<void> {
    const campaign = this.activeCampaign();
    if (!campaign) return;

    const storyIntro = await this.generateStoryIntro(campaign);
    const storyOutro = await this.generateStoryOutro(campaign, winnerName);

    const battle: CampaignBattle = {
      id: crypto.randomUUID(),
      missionName,
      winner: winnerName,
      player1Name: campaign.player1Name,
      player1Score,
      player2Name: campaign.player2Name,
      player2Score,
      storyIntro,
      storyOutro,
      playedAt: new Date().toISOString(),
    };

    const updated = {
      ...campaign,
      battles: [...campaign.battles, battle],
    };
    await this.db.campaigns.put(updated);
    this.activeCampaign.set(updated);
    this.allCampaigns.update((all) =>
      all.map((c) => (c.id === updated.id ? updated : c)),
    );
  }

  async endCampaign(): Promise<void> {
    const campaign = this.activeCampaign();
    if (!campaign) return;
    const updated = { ...campaign, status: 'completed' as const };
    await this.db.campaigns.put(updated);
    this.activeCampaign.set(null);
    this.allCampaigns.update((all) =>
      all.map((c) => (c.id === updated.id ? updated : c)),
    );
  }

  async loadCampaign(id: string): Promise<void> {
    const campaign = await this.db.campaigns.get(id);
    if (campaign) this.activeCampaign.set(campaign);
  }

  private async generateStoryIntro(campaign: Campaign): Promise<string> {
    if (!this.settingsService.hasApiKey()) {
      return STORY_INTROS[Math.floor(Math.random() * STORY_INTROS.length)];
    }

    try {
      const battleNum = campaign.battles.length + 1;
      const response = await this.llm.chat([
        {
          role: 'system',
          content: 'Du bist ein epischer Geschichtenerzaehler fuer ein Warhammer 40.000 Spiel zwischen zwei Kindern. Schreibe eine kurze, spannende Einleitung (2-3 Saetze) fuer die naechste Schlacht. Dramatisch aber kinderfreundlich!',
        },
        {
          role: 'user',
          content: `Kampagne: "${campaign.name}". Schlacht ${battleNum}. ${campaign.player1Name} gegen ${campaign.player2Name}. Bisheriger Stand: ${this.campaignScore().player1}:${this.campaignScore().player2}. Schreibe eine epische Einleitung!`,
        },
      ], 150);

      return response.text || STORY_INTROS[Math.floor(Math.random() * STORY_INTROS.length)];
    } catch {
      return STORY_INTROS[Math.floor(Math.random() * STORY_INTROS.length)];
    }
  }

  private async generateStoryOutro(campaign: Campaign, winner: string): Promise<string> {
    if (!this.settingsService.hasApiKey()) {
      const pool = winner ? STORY_OUTROS_VICTORY : STORY_OUTROS_DEFEAT;
      return pool[Math.floor(Math.random() * pool.length)];
    }

    try {
      const response = await this.llm.chat([
        {
          role: 'system',
          content: 'Du bist ein epischer Geschichtenerzaehler fuer ein Warhammer 40.000 Spiel zwischen zwei Kindern. Schreibe ein kurzes, dramatisches Ende (2-3 Saetze) fuer diese Schlacht. Sei ermutigend fuer beide Seiten!',
        },
        {
          role: 'user',
          content: `Kampagne: "${campaign.name}". ${winner} hat gewonnen! Schreibe ein episches Ende fuer diese Schlacht.`,
        },
      ], 150);

      return response.text || STORY_OUTROS_VICTORY[0];
    } catch {
      return STORY_OUTROS_VICTORY[0];
    }
  }
}
