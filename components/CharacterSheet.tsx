import React, { useState, useEffect, useRef } from 'react';
import { STYLES, BASE_SKILLS, ATTRIBUTE_MAPPING } from '../constants';
import { Character, Stats, Vitals } from '../types';
import { compressImage } from '../utils/helpers';

interface CharacterSheetProps {
    character: Character;
    sessionId: string;
    userId: string;
    onClose: () => void;
    onSkillRoll: (name: string, val: number) => void;
    onBnPRoll: (name: string, val: number) => void;
    updateCharacter: (id: string, updates: any) => Promise<void>;
    onLog: (text: string) => Promise<void>;
    showModal: (type: 'alert' | 'confirm', title: string, message: string, onConfirm?: () => void) => void;
    isPopout?: boolean;
}

const CharacterSheet: React.FC<CharacterSheetProps> = ({ character, sessionId, userId, onClose, onSkillRoll, onBnPRoll, updateCharacter, onLog, showModal, isPopout }) => {
    const isOwner = character.owner === userId;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [position, setPosition] = useState({ x: 20, y: 50 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });

    const [newSkillName, setNewSkillName] = useState('');
    const [newSkillVal, setNewSkillVal] = useState('');

    const stats = character.stats || { STR: 0, CON: 0, SIZ: 0, DEX: 0, APP: 0, INT: 0, POW: 0, EDU: 0, MOV: 0 };
    const vitals = character.vitals || { HP: 0, MP: 0, SAN: 0, LUCK: 0 };

    useEffect(() => {
        if (!isPopout && window.innerWidth > 800) {
            setPosition(prev => {
                const maxX = window.innerWidth - 100;
                const maxY = window.innerHeight - 50;
                if (prev.x === 20 && prev.y === 50) {
                     return { x: Math.max(0, (window.innerWidth - 800) / 2), y: 40 };
                }
                return { x: Math.min(prev.x, maxX), y: Math.min(prev.y, maxY) };
            });
        }
    }, [isPopout]);

    useEffect(() => {
        const { STR=0, SIZ=0, DEX=0 } = stats;
        let db = '0', build = 0, mov = 8;
        const total = STR + SIZ;
        if (total < 65) { db = '-2'; build = -2; }
        else if (total < 85) { db = '-1'; build = -1; }
        else if (total < 125) { db = '0'; build = 0; }
        else if (total < 165) { db = '1d4'; build = 1; }
        else if (total < 205) { db = '1d6'; build = 2; }
        else { const extra = Math.ceil((total - 204) / 80); db = `${1+extra}d6`; build = 2+extra; }
        
        if (DEX < SIZ && STR < SIZ) mov = 7;
        else if (DEX > SIZ && STR > SIZ) mov = 9;
        
        if (character.age >= 40) mov -= 1;
        if (character.age >= 50) mov -= 1;
        if (character.age >= 60) mov -= 1;
        if (character.age >= 70) mov -= 1;
        if (character.age >= 80) mov -= 1;

        if (character.derived?.damage_bonus !== db || character.derived?.build !== build) handleUpdate('derived', { damage_bonus: db, build });
        if (stats.MOV !== mov) handleUpdate('stats.MOV', mov);
    }, [stats.STR, stats.SIZ, stats.DEX, character.age]);

    useEffect(() => {
        if (isPopout) return;
        const handleMouseMove = (e: MouseEvent) => { 
            if (isDragging) {
                let newX = e.clientX - dragStartRef.current.x;
                let newY = e.clientY - dragStartRef.current.y;
                
                newX = Math.max(0, newX);
                newX = Math.min(window.innerWidth - 100, newX);
                newY = Math.max(0, newY);
                newY = Math.min(window.innerHeight - 50, newY);

                setPosition({ x: newX, y: newY }); 
            }
        };
        const handleMouseUp = () => setIsDragging(false);
        if (isDragging) { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); }
        return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
    }, [isDragging, isPopout]);

    const handleMouseDown = (e: React.MouseEvent) => { if(!isPopout) { setIsDragging(true); dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y }; } };
    const handleUpdate = async (path: string, value: any) => { if (!isOwner) return; await updateCharacter(character.id, { [path]: value }); };
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const base64 = await compressImage(e.target.files[0], 300, 0.6);
            handleUpdate('portraitUrl', base64);
        }
    };

    const handleLuckGen = () => {
        if (!isOwner) return;
        const r1 = Math.floor(Math.random() * 6) + 1;
        const r2 = Math.floor(Math.random() * 6) + 1;
        const r3 = Math.floor(Math.random() * 6) + 1;
        const total = (r1 + r2 + r3) * 5;
        handleUpdate('vitals.LUCK', total);
        onLog(`행운 생성 (3d6 × 5): [${r1}, ${r2}, ${r3}] × 5 = ${total}`);
    };

    const handleAddSkill = () => {
        if (!newSkillName.trim()) return;
        const name = newSkillName.trim();
        
        if (BASE_SKILLS.hasOwnProperty(name) || (character.skills && character.skills.hasOwnProperty(name))) {
            showModal('alert', '오류', '이미 존재하는 기능치입니다.');
            return;
        }

        const initialVal = parseInt(newSkillVal) || 0;
        handleUpdate(`skills.${name}`, initialVal);
        setNewSkillName('');
        setNewSkillVal('');
    };

    const handleDeleteSkill = (name: string) => {
        showModal('confirm', '삭제 확인', `'${name}' 기능치를 삭제하시겠습니까?`, () => {
            const updatedSkills = { ...character.skills };
            delete updatedSkills[name];
            handleUpdate('skills', updatedSkills);
        });
    };

    const RollButton = ({ onClick }: { onClick: (e: React.MouseEvent) => void }) => <button onClick={(e) => { e.stopPropagation(); onClick(e); }} className="p-1 hover:bg-emerald-50 rounded text-emerald-600 transition-colors flex items-center" title="일반 판정"><span className="material-symbols-outlined text-[18px]">casino</span></button>;
    const BnPButton = ({ onClick }: { onClick: (e: React.MouseEvent) => void }) => <button onClick={(e) => { e.stopPropagation(); onClick(e); }} className="p-1 hover:bg-purple-50 rounded text-purple-600 transition-colors flex items-center" title="보너스/페널티"><span className="material-symbols-outlined text-[18px]">casino</span></button>;
    const REFRESH_ICON = <i className="fa-solid fa-rotate"></i>;

    const maxHP = Math.floor(((stats.CON || 0) + (stats.SIZ || 0)) / 10);
    const maxMP = Math.floor((stats.POW || 0) / 5);
    const skills = { ...BASE_SKILLS, ...(character.skills || {}) };
    if (!skills['회피']) skills['회피'] = Math.floor((stats.DEX || 0) / 2);
    if (!skills['모국어']) skills['모국어'] = stats.EDU || 0;
    const sortedSkillNames = Object.keys(skills).sort((a, b) => a.localeCompare(b, 'ko'));

    const containerStyle = isPopout 
        ? { position: 'fixed' as const, inset: 0, width: '100%', height: '100%', borderRadius: 0, border: 'none' } 
        : { left: position.x, top: position.y, maxHeight: '85vh' };

    return (
        <div className={`fixed z-[60] w-full max-w-[50rem] flex flex-col ${STYLES.PANEL} shadow-2xl border-stone-300 bg-[#f8f7f5]`} style={containerStyle}>
            <div className="flex justify-between items-center p-3 border-b border-stone-300 cursor-move bg-[#e7e5e4] rounded-t-lg select-none" onMouseDown={handleMouseDown} style={isPopout ? { cursor: 'default', borderRadius: 0 } : {}}>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-stone-700 rounded-full flex items-center justify-center text-white text-xs font-bold font-title">CoC</div>
                    <span className="font-title font-bold text-stone-800 tracking-wide">{character.name || 'Character Sheet'}</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); isPopout ? window.close() : onClose(); }} className="text-stone-500 hover:text-red-600">✕</button>
            </div>
            <div className="overflow-y-auto p-4 space-y-4 scrollbar-thin bg-[#f8f7f5] flex-grow">
                <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 bg-white p-4 rounded border border-stone-200 shadow-sm">
                    <div className="flex flex-col items-center gap-2 w-full sm:w-28">
                        {character.portraitUrl ? <img src={character.portraitUrl} className="w-24 h-24 object-cover rounded border border-stone-300 shadow-inner" /> : <div className="w-24 h-24 bg-stone-100 rounded border border-stone-300 flex items-center justify-center text-stone-300 text-4xl">?</div>}
                        {isOwner && <><input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageUpload} /><button onClick={() => fileInputRef.current?.click()} className="text-[10px] bg-stone-200 px-2 py-1 rounded hover:bg-stone-300 text-stone-600">사진 변경</button></>}
                    </div>
                    <div className="flex-grow grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="col-span-2"><span className="block text-xs text-stone-400 font-bold mb-0.5">이름</span><input type="text" value={character.name} onChange={(e) => handleUpdate('name', e.target.value)} disabled={!isOwner} className="w-full border-b border-stone-300 bg-transparent py-0.5 font-bold"/></div>
                        <div className="col-span-2"><span className="block text-xs text-stone-400 font-bold mb-0.5">플레이어</span><input type="text" value={character.player_name} onChange={(e) => handleUpdate('player_name', e.target.value)} disabled={!isOwner} className="w-full border-b border-stone-300 bg-transparent py-0.5"/></div>
                        <div><span className="text-xs text-stone-400 font-bold">나이</span><input type="number" value={character.age} onChange={(e) => handleUpdate('age', parseInt(e.target.value))} disabled={!isOwner} className="w-full border-b border-stone-300 bg-transparent"/></div>
                        <div><span className="text-xs text-stone-400 font-bold">이동력</span><input type="number" value={stats.MOV || 8} disabled className="w-full border-b border-stone-300 bg-transparent text-center font-bold text-stone-600"/></div>
                        <div className="col-span-2 flex gap-4 text-xs mt-1 text-stone-500"><span>피해: <b>{character.derived?.damage_bonus}</b></span><span>체구: <b>{character.derived?.build}</b></span></div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-white p-3 rounded border border-stone-200 shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-center mb-1"><span className="font-title font-bold text-lg text-stone-700">체력</span></div>
                        <div className="flex items-end justify-center text-xl font-mono"><input type="number" value={vitals.HP} onChange={e => handleUpdate('vitals.HP', parseInt(e.target.value))} disabled={!isOwner} className="w-12 text-center border-b-2 border-stone-800 bg-transparent outline-none"/> / {maxHP}</div>
                    </div>
                    <div className="bg-white p-3 rounded border border-stone-200 shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-center mb-1"><span className="font-title font-bold text-lg text-stone-700">이성</span><RollButton onClick={() => onSkillRoll('이성', vitals.SAN)} /></div>
                        <div className="flex items-end justify-center text-xl font-mono"><input type="number" value={vitals.SAN} onChange={e => handleUpdate('vitals.SAN', parseInt(e.target.value))} disabled={!isOwner} className="w-12 text-center border-b-2 border-stone-800 bg-transparent outline-none"/></div>
                    </div>
                    <div className="bg-white p-3 rounded border border-stone-200 shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-center"><span className="font-title font-bold text-lg text-stone-700">마력</span><RollButton onClick={() => onSkillRoll('마력', vitals.MP)} /></div>
                        <div className="text-lg font-mono text-center"><input type="number" value={vitals.MP} onChange={e => handleUpdate('vitals.MP', parseInt(e.target.value))} disabled={!isOwner} className="w-10 text-center border-b-2 border-stone-800 bg-transparent outline-none"/> / {maxMP}</div>
                    </div>
                </div>
                <div className="bg-white p-3 rounded border border-stone-200 shadow-sm">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {Object.entries(ATTRIBUTE_MAPPING).filter(([k]) => k !== 'MOV').map(([key, label]) => {
                            const val = (key === 'LUCK') ? vitals.LUCK : stats[key];
                            const path = (key === 'LUCK') ? 'vitals.LUCK' : `stats.${key}`;
                            return (
                                <div key={key} className="flex flex-col items-center bg-stone-50 p-2 rounded border border-stone-100">
                                    <div className="text-[10px] font-bold text-stone-500 mb-1">{label}</div>
                                    <div className="flex items-center w-full gap-2">
                                        <input type="number" value={val} onChange={e => { handleUpdate(path, parseInt(e.target.value)); if(key === 'POW') handleUpdate('vitals.initialSAN', parseInt(e.target.value)); }} disabled={!isOwner} className="flex-1 w-full text-center text-sm font-bold bg-white border border-stone-200 rounded py-0.5 min-w-0"/>
                                        <div className="flex gap-1 shrink-0">
                                            {key === 'LUCK' && isOwner && <button onClick={handleLuckGen} className="p-1 hover:bg-blue-50 rounded text-blue-600 transition-colors" title="3d6*5 자동 생성">{REFRESH_ICON}</button>}
                                            <RollButton onClick={() => onSkillRoll(label, val)} />
                                            <BnPButton onClick={() => onBnPRoll(label, val)} />
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
                <div className="bg-white p-4 rounded border border-stone-200 shadow-sm">
                    <div className="flex justify-between items-center mb-2 border-b border-stone-100 pb-1">
                        <h3 className="font-title font-bold text-stone-700">기능</h3>
                    </div>
                    {isOwner && (
                        <div className="flex gap-2 mb-3 bg-stone-50 p-2 rounded border border-stone-100 items-center">
                            <input type="text" placeholder="새 기능치 이름" value={newSkillName} onChange={e => setNewSkillName(e.target.value)} className={`flex-[2] ${STYLES.INPUT} px-2 py-1 text-sm`} onKeyDown={e => e.key === 'Enter' && handleAddSkill()}/>
                            <input type="number" placeholder="초기값" value={newSkillVal} onChange={e => setNewSkillVal(e.target.value)} className={`w-20 ${STYLES.INPUT} px-2 py-1 text-sm`} onKeyDown={e => e.key === 'Enter' && handleAddSkill()}/>
                            <button onClick={handleAddSkill} className="bg-stone-700 text-white px-3 rounded text-xs whitespace-nowrap hover:bg-stone-800 transition-colors h-8">추가</button>
                        </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1">
                        {sortedSkillNames.map(name => {
                            const isCustom = !BASE_SKILLS.hasOwnProperty(name);
                            return (
                                <div key={name} className="flex justify-between items-center text-sm py-0.5 border-b border-stone-50 hover:bg-stone-50 px-1">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        {isOwner && isCustom && (
                                            <button onClick={() => handleDeleteSkill(name)} className="text-red-300 hover:text-red-600 mr-1 shrink-0 font-bold" title="삭제">×</button>
                                        )}
                                        <span className="truncate" title={name}>{name}</span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <input type="number" value={skills[name]} onChange={e => handleUpdate(`skills.${name}`, parseInt(e.target.value))} disabled={!isOwner} className="w-9 text-center border border-stone-200 rounded p-0.5 text-xs bg-white" />
                                        <div className="flex"><RollButton onClick={() => onSkillRoll(name, skills[name])} /><BnPButton onClick={() => onBnPRoll(name, skills[name])} /></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CharacterSheet;