import { Character, Vitals, Stats, Derived, Backstory } from "../types";
import { BASE_SKILLS, ATTRIBUTE_MAPPING } from "../constants";

export const getNewCharacterTemplate = (name: string, userId: string, playerName: string): Omit<Character, 'id'> => {
    const initial = 50;
    return {
        name: name || "이름 없는 탐사자",
        owner: userId, 
        portraitUrl: "",
        player_name: playerName || "",
        age: 25, sex: "", height: "", family: "0",
        stats: { STR: 50, CON: 50, SIZ: 50, DEX: initial, APP: 50, INT: 50, POW: initial, EDU: initial, MOV: 8 } as Stats,
        vitals: { 
            HP: 10, MP: 10, SAN: initial, initialSAN: initial, LUCK: 50, 
            temporaryInsanity: false, indefiniteInsanity: false,
            majorWound: false, dying: false, pulpHp: false
        } as Vitals,
        derived: { damage_bonus: "0", build: 0 } as Derived,
        skills: { "크툴루 신화": 0, "회피": Math.floor(initial / 2), "모국어": initial },
        weapons: [], talents: [],
        expressions: { '기본': '' },
        backstory: {
            personalDescription: "", traits: "", ideology: "", injuries: "", people: "",
            phobias: "", locations: "", possessions: "", encounters: "", gear: "",
            cash: "", spending: "", assets: "", memo: ""
        } as Backstory,
        mentalCondition: "평상심"
    } as any; // Cast to avoid strict typing issues with unknown fields
};

export const compressImage = (file: File, maxWidth = 600, quality = 0.6): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const elem = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
                elem.width = width;
                elem.height = height;
                const ctx = elem.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                resolve(elem.toDataURL('image/jpeg', quality));
            };
            img.onerror = error => reject(error);
        };
        reader.onerror = error => reject(error);
    });
};

export const playNotificationSound = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
        console.error("Audio play failed", e);
    }
};

export const getCharacterSkillValue = (char: Character, skillName: string): { val: number, name: string } | null => {
    if (!char || !char.stats) return null;
    const statKey = Object.keys(ATTRIBUTE_MAPPING).find(key => ATTRIBUTE_MAPPING[key] === skillName);
    if (statKey) return { val: char.stats[statKey], name: skillName };
    if (skillName === '체력') return { val: char.stats.CON, name: '건강(체력)' };
    if (skillName === '아이디어') return { val: char.stats.INT, name: '지능(아이디어)' };
    if (['이성', 'SAN', 'san'].includes(skillName)) return { val: char.vitals.SAN, name: '이성' };
    if (['행운', '운', 'LUCK', 'luck'].includes(skillName)) return { val: char.vitals.LUCK, name: '행운' };
    const charSkills = { ...BASE_SKILLS, ...(char.skills || {}) };
    
    if (charSkills['회피'] === undefined || charSkills['회피'] === 0) charSkills['회피'] = Math.floor((char.stats.DEX || 0) / 2);
    if (charSkills['모국어'] === undefined || charSkills['모국어'] === 0) charSkills['모국어'] = char.stats.EDU || 0;
    
    if (charSkills[skillName] !== undefined) {
        return { val: charSkills[skillName], name: skillName };
    }
    return null;
};