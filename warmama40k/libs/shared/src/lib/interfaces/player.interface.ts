export interface Player {
  id: string;
  name: string;
  avatarUrl?: string;
  ownedUnits: OwnedUnit[];
}

export interface OwnedUnit {
  unitId: string;
  selectedModelCount: number;
  selectedWeapons: string[];
  photoUrl?: string;
  nickname?: string;
}
