import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
    uid: string;
    displayName: string | null;
    email: string | null;
}

export interface Stats {
    STR: number;
    CON: number;
    SIZ: number;
    DEX: number;
    APP: number;
    INT: number;
    POW: number;
    EDU: number;
    MOV: number;
    [key: string]: number;
}

export interface Vitals {
    HP: number;
    MP: number;
    SAN: number;
    initialSAN: number;
    LUCK: number;
    temporaryInsanity: boolean;
    indefiniteInsanity: boolean;
    majorWound: boolean;
    dying: boolean;
    pulpHp: boolean;
}

export interface Derived {
    damage_bonus: string;
    build: number;
}

export interface Backstory {
    personalDescription: string;
    traits: string;
    ideology: string;
    injuries: string;
    people: string;
    phobias: string;
    locations: string;
    possessions: string;
    encounters: string;
    gear: string;
    cash: string;
    spending: string;
    assets: string;
    memo: string;
}

export interface Character {
    id: string;
    name: string;
    owner: string;
    portraitUrl: string;
    player_name: string;
    age: number;
    sex: string;
    height: string;
    family: string;
    stats: Stats;
    vitals: Vitals;
    derived: Derived;
    skills: Record<string, number>;
    weapons: any[];
    talents: any[];
    backstory: Backstory;
    mentalCondition: string;
    sessionId?: string;
}

export interface Session {
    id: string;
    name: string;
    keeperId: string;
    keeperName: string;
    createdAt: Timestamp;
    scene: Scene;
}

export interface Scene {
    mapUrl: string;
    maps: Array<{ name: string; url: string }>;
    bgmUrl: string;
    bgms: Array<{ name: string; url: string }>;
    activeHandout: string | null;
    handouts: Array<{ name: string; url: string }>;
}

export interface Message {
    id: string;
    type: 'vn-chat' | 'ic-chat' | 'ooc-chat' | 'desc' | 'html' | 'check-box' | 'ooc-dice' | 'dice' | 'skill' | 'bns_pnl_skill';
    text?: string;
    sender: string;
    uid: string;
    sessionId: string;
    timestamp: Timestamp;
    characterId?: string;
    portraitUrl?: string;
    
    // Skill Roll specific
    skillName?: string;
    skillValue?: number;
    hardValue?: number;
    extremeValue?: number;
    roll?: number;
    resultText?: string;
    resultClass?: string;

    // BnP Roll
    allRolls?: number[];
    results?: any;

    // Checkbox
    style?: { start: string; end: string };
}

export interface JoinedSession {
    id: string;
    name: string;
    keeperName: string;
    lastAccess: Timestamp;
}