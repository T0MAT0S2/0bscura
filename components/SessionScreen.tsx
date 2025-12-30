import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { query, where, onSnapshot, serverTimestamp, setDoc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { getPublicCollection, getPublicDoc, getPrivateDoc } from '../services/firebase';
import { STYLES } from '../constants';
import { Session, Character, Message } from '../types';
import { getNewCharacterTemplate, getCharacterSkillValue, playNotificationSound } from '../utils/helpers';
import ChatMessageItem from './ChatMessageItem';
import ChatToolbar from './ChatToolbar';
import KeeperTools from './KeeperTools';
import CharacterSheet from './CharacterSheet';
import YoutubePlayer from './YoutubePlayer';

interface SessionScreenProps {
    sessionId: string;
    user: User;
    onExit: () => void;
    showModal: (type: 'alert' | 'confirm' | 'prompt', title: string, message: string, onConfirm?: (val?: string) => void, defaultValue?: string) => void;
}

export const PopoutCharacterSheetWrapper: React.FC<{ sessionId: string, charId: string, user: User }> = ({ sessionId, charId, user }) => {
    const [character, setCharacter] = useState<Character | null>(null);
    
    useEffect(() => {
        if (!charId) return;
        const unsub = onSnapshot(getPublicDoc('characters', charId), (docSnap) => {
            if (docSnap.exists()) setCharacter({ id: docSnap.id, ...docSnap.data() } as Character);
        });
        return () => unsub();
    }, [charId]);

    const sendChatMessage = async (msgData: any) => {
        await addDoc(getPublicCollection('chat'), { ...msgData, sessionId, uid: user.uid, timestamp: serverTimestamp() });
    };

    const handleSkillRoll = async (charName: string, skillName: string, val: number) => {
        const roll = Math.floor(Math.random() * 100) + 1;
        let resultText = "실패", resultClass = "failure";
        if (roll <= val) {
            if (roll <= 1) { resultText = "대성공"; resultClass = "success-critical"; }
            else if (roll <= Math.floor(val / 5)) { resultText = "극단적 성공"; resultClass = "success-extreme"; }
            else if (roll <= Math.floor(val / 2)) { resultText = "어려운 성공"; resultClass = "success-hard"; }
            else { resultText = "성공"; resultClass = "success-regular"; }
        } else if (roll >= 96) { resultText = "대실패"; resultClass = "fumble"; }
        await sendChatMessage({ type: 'skill', sender: charName, skillName, skillValue: val, hardValue: Math.floor(val/2), extremeValue: Math.floor(val/5), roll, resultText, resultClass });
    };

    const handleBnPRoll = async (charName: string, skillName: string, val: number) => {
        const rolls = [Math.floor(Math.random()*100)+1, Math.floor(Math.random()*100)+1, Math.floor(Math.random()*100)+1];
        const evalRoll = (r: number) => (r <= val) ? { roll: r, text: r <= 1 ? "대성공" : (r <= Math.floor(val/5) ? "극단적 성공" : (r <= Math.floor(val/2) ? "어려운 성공" : "성공")), class: "success-regular" } : { roll: r, text: r >= 96 ? "대실패" : "실패", class: "failure" };
        const results = { p2: evalRoll(Math.min(rolls[0], rolls[1], rolls[2])), p1: evalRoll(Math.min(rolls[0], rolls[1])), p0: evalRoll(rolls[0]), n1: evalRoll(Math.max(rolls[0], rolls[1])), n2: evalRoll(Math.max(rolls[0], rolls[1], rolls[2])) };
        await sendChatMessage({ type: 'bns_pnl_skill', sender: charName, skillName, skillValue: val, hardValue: Math.floor(val/2), extremeValue: Math.floor(val/5), allRolls: rolls, results });
    };

    if (!character) return <div className="flex h-screen items-center justify-center">Loading Character...</div>;

    return (
        <CharacterSheet 
            character={character} 
            sessionId={sessionId} 
            userId={user.uid} 
            onClose={() => {}} 
            onSkillRoll={(name, val) => handleSkillRoll(character.name, name, val)} 
            onBnPRoll={(name, val) => handleBnPRoll(character.name, name, val)} 
            updateCharacter={async (id, updates) => {
                await updateDoc(getPublicDoc('characters', id), updates);
            }} 
            onLog={async (text) => { await sendChatMessage({ type: 'dice', sender: character.name, text }) }}
            showModal={() => {}} // Popout usually doesn't show modals, simple implementation
            isPopout={true}
        />
    );
};

const renderTextWithHighlights = (rawText?: string) => {
    if (!rawText) return null;
    const parts = rawText.split(/(\[[^\]]+\])/g);
    return parts.map((part, i) => {
        if (part.startsWith('[') && part.endsWith(']')) {
            let content = part.slice(1, -1);
            let color = '#333333'; 

            if (content.includes(':')) {
                const lastColonIndex = content.lastIndexOf(':');
                const potentialColor = content.substring(lastColonIndex + 1);
                if (potentialColor.startsWith('#') || /^[a-z]+$/i.test(potentialColor)) {
                    color = potentialColor;
                    content = content.substring(0, lastColonIndex);
                }
            }

            return (
                <span key={i} style={{
                    fontWeight: 'bold',
                    color: color,
                    display: 'inline',
                    margin: '0 1px'
                }}>
                    {content}
                </span>
            );
        }
        return part.split('\n').map((line, j) => (
            <React.Fragment key={`${i}-${j}`}>
                {j > 0 && <br/>}
                {line}
            </React.Fragment>
        ));
    });
};

const SessionScreen: React.FC<SessionScreenProps> = ({ sessionId, user, onExit, showModal }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    
    const [chatInput, setChatInput] = useState('');
    const [oocInput, setOocInput] = useState('');
    const [activeTab, setActiveTab] = useState<'log' | 'ooc'>('log');
    const [actingCharId, setActingCharId] = useState(''); 
    const [editingCharId, setEditingCharId] = useState<string | null>(null); 
    const [showKeeperTools, setShowKeeperTools] = useState(false);
    const [showHandout, setShowHandout] = useState(false);
    const [showCharCreation, setShowCharCreation] = useState(false);
    const [newCharName, setNewCharName] = useState('');
    const [mobileTab, setMobileTab] = useState<'chars' | 'map' | 'chat'>('map');
    const [showCharSheet, setShowCharSheet] = useState(true);
    const [copyFeedback, setCopyFeedback] = useState(false);
    
    const [unreadOoc, setUnreadOoc] = useState(false);
    const activeTabRef = useRef(activeTab);

    const logEndRef = useRef<HTMLDivElement>(null);
    const oocEndRef = useRef<HTMLDivElement>(null);
    
    const isFirstLoad = useRef(true);

    useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

    useEffect(() => {
        if(sessionId && user) {
            setDoc(getPrivateDoc(user.uid, 'joined_sessions', sessionId), { lastAccess: serverTimestamp() }, { merge: true });
        }
    }, [sessionId, user]);

    useEffect(() => {
        if (!sessionId || !user) return;

        const unsubSession = onSnapshot(getPublicDoc('sessions', sessionId), (docSnap) => {
            if (docSnap.exists()) setSession({ id: docSnap.id, ...docSnap.data() } as Session);
            else { 
                showModal('alert', '알림', '세션이 종료되었거나 존재하지 않습니다.'); 
                onExit(); 
            }
        }, (err) => console.error(err));

        const charQuery = query(getPublicCollection('characters'), where('sessionId', '==', sessionId));
        const unsubChars = onSnapshot(charQuery, (snapshot) => {
            const chars: Character[] = [];
            snapshot.forEach((doc) => chars.push({ id: doc.id, ...doc.data() } as Character));
            setCharacters(chars);
            
            if (isFirstLoad.current) {
                const myChar = chars.find(c => c.owner === user.uid);
                if (myChar) setActingCharId(myChar.id);
            }
        }, (err) => console.error(err));

        const chatQ = query(getPublicCollection('chat'), where('sessionId', '==', sessionId));
        
        const unsubChat = onSnapshot(chatQ, (snapshot) => {
            const msgs: Message[] = [];
            snapshot.forEach((doc) => msgs.push({ id: doc.id, ...doc.data() } as Message));
            msgs.sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
            setMessages(msgs.slice(-100));

            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    if (isFirstLoad.current) return;
                    const data = change.doc.data();
                    const isOoc = ['ooc-chat', 'ooc-dice'].includes(data.type);
                    if (isOoc && data.sender !== user.displayName && activeTabRef.current !== 'ooc') {
                        setUnreadOoc(true);
                        playNotificationSound();
                    }
                }
            });
            isFirstLoad.current = false;
        }, (err) => console.error(err));

        return () => { unsubSession(); unsubChars(); unsubChat(); };
    }, [sessionId, user, onExit, showModal]);

    useEffect(() => {
        if (activeTab === 'log') logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        else oocEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, activeTab]);

    useEffect(() => {
        if (session?.scene?.activeHandout) {
            setShowHandout(true);
        } else {
            setShowHandout(false);
        }
    }, [session?.scene?.activeHandout]);

    const isKeeper = session?.keeperId === user?.uid;

    const sendChatMessage = async (msgData: any) => {
        await addDoc(getPublicCollection('chat'), { ...msgData, sessionId, uid: user.uid, timestamp: serverTimestamp() });
    };

    const updateScene = async (updates: any) => {
        const firestoreUpdates: any = {};
        for (const [key, value] of Object.entries(updates)) firestoreUpdates[`scene.${key}`] = value;
        await updateDoc(getPublicDoc('sessions', sessionId), firestoreUpdates);
    };

    const handleSkillRoll = async (charName: string, skillName: string, val: number) => {
        const roll = Math.floor(Math.random() * 100) + 1;
        let resultText = "실패", resultClass = "failure";
        if (roll <= val) {
            if (roll <= 1) { resultText = "대성공"; resultClass = "success-critical"; }
            else if (roll <= Math.floor(val / 5)) { resultText = "극단적 성공"; resultClass = "success-extreme"; }
            else if (roll <= Math.floor(val / 2)) { resultText = "어려운 성공"; resultClass = "success-hard"; }
            else { resultText = "성공"; resultClass = "success-regular"; }
        } else if (roll >= 96) { resultText = "대실패"; resultClass = "fumble"; }
        await sendChatMessage({ type: 'skill', sender: charName, skillName, skillValue: val, hardValue: Math.floor(val/2), extremeValue: Math.floor(val/5), roll, resultText, resultClass });
    };

    const handleReRoll = async (skillName: string) => {
        const actingChar = characters.find(c => c.id === actingCharId);
        if (!actingChar) {
            showModal('alert', '알림', '판정을 수행할 캐릭터를 먼저 선택해주세요.');
            return;
        }
        
        const skillData = getCharacterSkillValue(actingChar, skillName);
        if (skillData) {
            await handleSkillRoll(actingChar.name, skillData.name, skillData.val);
        } else {
                showModal('alert', '알림', `'${actingChar.name}'에게 '${skillName}' 기능이 없습니다.`);
        }
    };

    const handleSendMessage = async (textOverride?: string) => {
        let text = textOverride || chatInput.trim();
        if (!text) return;
        
        const actingChar = characters.find(c => c.id === actingCharId);

        const shorthandRegex = /^(\d+)[dD](\d+)(?:\s*([+-])\s*(\d+))?$/;
        if (shorthandRegex.test(text)) {
            text = '/r ' + text;
        }

        if (actingChar) {
            let skillQuery: string | null = null;
            if (text.startsWith('/r ') || text.startsWith('/R ')) {
                skillQuery = text.substring(3).trim();
            } else if (text.endsWith(' 판정')) {
                skillQuery = text.substring(0, text.length - 3).trim();
            } else {
                skillQuery = text;
            }

            if (skillQuery) {
                const skillData = getCharacterSkillValue(actingChar, skillQuery);
                if (skillData) {
                    await handleSkillRoll(actingChar.name, skillData.name, skillData.val);
                    if (!textOverride) setChatInput('');
                    return; 
                }
            }
        }

        if (!isKeeper && (text.startsWith('/desc') || text.startsWith('/title') || text.startsWith('/img') || text.startsWith('/html'))) {
            return;
        }

        let msg = { type: 'vn-chat', text, sender: actingChar ? actingChar.name : '나레이션', characterId: actingChar?.id || null, portraitUrl: actingChar?.portraitUrl || null };

        if (text.startsWith('/r ') || text.startsWith('/R ')) {
            const expr = text.substring(3).trim();
            const match = expr.match(/^(\d+)[dD](\d+)(?:\s*([+-])\s*(\d+))?$/);
            
            if (match) {
                const count = parseInt(match[1]);
                const faces = parseInt(match[2]);
                const op = match[3];        
                const mod = match[4] ? parseInt(match[4]) : 0;

                if (count > 100) {
                    showModal('alert', '오류', "주사위는 한 번에 100개까지만 굴릴 수 있습니다.");
                    if (!textOverride) setChatInput('');
                    return;
                }

                const rolls = []; 
                let sum = 0;
                for(let i=0; i<count; i++) { 
                    const r = Math.floor(Math.random() * faces) + 1; 
                    rolls.push(r); 
                    sum += r; 
                }
                
                let total = sum;
                let calcStr = `[${rolls.join(', ')}]`;
                
                if (op && mod) {
                    if (op === '+') total += mod;
                    else if (op === '-') total -= mod;
                    calcStr += ` ${op} ${mod}`;
                }

                const detailText = (count > 1 || mod) ? ` ${calcStr}` : ` (${rolls[0]})`;
                
                await sendChatMessage({ 
                    type: 'dice', 
                    sender: actingChar?.name || '익명', 
                    text: `${expr} 굴림: ${total}${detailText}` 
                });
            }
            if (!textOverride) setChatInput('');
            return;
        } else if (text.startsWith('/')) {
            msg = { ...msg, type: text.startsWith('/html ') ? 'html' : 'desc', text: text.startsWith('/html ') ? text.substring(6) : text };
        }
        
        await sendChatMessage(msg);
        if (!textOverride) setChatInput('');
    };

    const handleSendBox = async (boxData: any) => {
        const actingChar = characters.find(c => c.id === actingCharId);
        await sendChatMessage({ 
            type: 'check-box', 
            text: boxData.text, 
            style: { start: boxData.start, end: boxData.end },
            sender: actingChar ? actingChar.name : '나레이션' 
        });
    };

    const handleSendImage = async (base64: string) => { 
        await sendChatMessage({ type: 'desc', text: `/img ${base64}`, sender: 'System' }); 
    };
    const handleSendOoc = async () => { if (oocInput.trim()) { await sendChatMessage({ type: 'ooc-chat', text: oocInput.trim(), sender: user.displayName || '익명' }); setOocInput(''); }};
    
    const handleBnPRoll = async (charName: string, skillName: string, val: number) => {
        const rolls = [Math.floor(Math.random()*100)+1, Math.floor(Math.random()*100)+1, Math.floor(Math.random()*100)+1];
        const evalRoll = (r: number) => (r <= val) ? { roll: r, text: r <= 1 ? "대성공" : (r <= Math.floor(val/5) ? "극단적 성공" : (r <= Math.floor(val/2) ? "어려운 성공" : "성공")), class: "success-regular" } : { roll: r, text: r >= 96 ? "대실패" : "실패", class: "failure" };
        const results = { p2: evalRoll(Math.min(rolls[0], rolls[1], rolls[2])), p1: evalRoll(Math.min(rolls[0], rolls[1])), p0: evalRoll(rolls[0]), n1: evalRoll(Math.max(rolls[0], rolls[1])), n2: evalRoll(Math.max(rolls[0], rolls[1], rolls[2])) };
        await sendChatMessage({ type: 'bns_pnl_skill', sender: charName, skillName, skillValue: val, hardValue: Math.floor(val/2), extremeValue: Math.floor(val/5), allRolls: rolls, results });
    };

    const handleCreateCharacter = async () => {
        if (!newCharName.trim()) return;
        const tmpl = getNewCharacterTemplate(newCharName, user.uid, user.displayName || '');
        tmpl.sessionId = sessionId;
        const ref = await addDoc(getPublicCollection('characters'), tmpl);
        setEditingCharId(ref.id); setShowCharCreation(false); setNewCharName('');
    };

    const handleDeleteCharacter = async (charId: string) => {
        showModal('confirm', '삭제 확인', '정말 이 캐릭터를 삭제하시겠습니까? 복구할 수 없습니다.', async () => {
            await deleteDoc(getPublicDoc('characters', charId));
            if (editingCharId === charId) setEditingCharId(null);
        });
    };

    const handleRenameSession = async () => {
        if (!isKeeper || !session) return;
        showModal('prompt', '이름 변경', "세션 이름을 변경하세요:", async (newName) => {
            if (newName && newName.trim() !== "") {
                await updateDoc(getPublicDoc('sessions', sessionId), { name: newName.trim() });
            }
        }, session.name);
    };

    const handleDeleteSession = async () => {
        if (!isKeeper) return;
        showModal('confirm', '삭제 확인', "정말 이 세션을 삭제하시겠습니까? 모든 데이터가 사라집니다.", async () => {
            await deleteDoc(getPublicDoc('sessions', sessionId));
        });
    };

    const handleExportLog = () => {
        const exportMessages = messages.filter(m => !['ooc-chat', 'ooc-dice'].includes(m.type));
        if (!exportMessages.length) {
            showModal('alert', '알림', "저장할 로그가 없습니다.");
            return;
        }
        alert("로그 내보내기 기능이 실행되었습니다."); 
    };

    const editingCharacter = characters.find(c => c.id === editingCharId);

    const handleCopySessionId = () => {
        const tempInput = document.createElement("input");
        tempInput.value = sessionId;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
        
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
    };

    const handleDeleteMsg = async (msgId: string) => {
        showModal('confirm', '삭제 확인', '정말 이 메시지를 삭제하시겠습니까?', async () => {
            await deleteDoc(getPublicDoc('chat', msgId));
        });
    };

    const handleEditMsg = async (msg: Message) => {
        if (!['vn-chat', 'ic-chat', 'ooc-chat', 'desc', 'html', 'check-box'].includes(msg.type)) return;
        showModal('prompt', '메시지 수정', '내용을 수정하세요:', async (newText) => {
            if (newText !== undefined && newText !== null && newText.trim() !== '') {
                await updateDoc(getPublicDoc('chat', msg.id), { text: newText });
            }
        }, msg.text || '');
    };

    return (
        <div className="h-full flex flex-col relative">
            <header className={`flex items-center justify-between p-3 border-b border-stone-200 bg-white/90 backdrop-blur z-20 shadow-sm shrink-0`}>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-700">{session?.name}</span>
                        {isKeeper && (
                            <button onClick={handleRenameSession} className="text-stone-400 hover:text-stone-600 text-xs" title="이름 변경">✏️</button>
                        )}
                        <button 
                            onClick={handleCopySessionId} 
                            className={`text-xs px-2 py-0.5 rounded font-mono flex items-center gap-1 transition-all ${copyFeedback ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
                            title="클릭하여 방 코드 복사"
                        >
                            {copyFeedback ? (
                                <><span>복사됨!</span> <i className="fa-solid fa-check"></i></>
                            ) : (
                                <><span>#{sessionId}</span> <i className="fa-regular fa-copy"></i></>
                            )}
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleExportLog} className="text-sm text-stone-500 hover:text-stone-800 flex items-center gap-1 mr-2" title="로그 저장">
                        <span className="hidden sm:inline">로그 저장</span> 💾
                    </button>
                    {isKeeper && (
                        <button onClick={handleDeleteSession} className="text-sm text-red-400 hover:text-red-600 flex items-center gap-1 mr-2" title="세션 삭제">
                            <span className="hidden sm:inline">삭제</span> 🗑️
                        </button>
                    )}
                    <button onClick={onExit} className="text-sm text-stone-500 hover:text-stone-800 flex items-center gap-1"><span className="hidden sm:inline">나가기</span> 🚪</button>
                </div>
            </header>

            <main className="flex-grow flex relative overflow-hidden">
                <aside className={`flex-col ${STYLES.PANEL} overflow-hidden m-0 lg:m-4 shrink-0 border-0 lg:border rounded-none lg:rounded-lg transition-all duration-300 ${mobileTab === 'chars' ? 'flex w-full absolute inset-0 z-30' : 'hidden lg:flex'} ${showCharSheet ? 'lg:w-80' : 'lg:w-10'}`}>
                    {showCharSheet ? (
                        <>
                            <div className="p-4 border-b border-stone-200 flex justify-between items-center bg-stone-50/50">
                                <h3 className="font-title font-bold text-lg text-stone-700">캐릭터시트</h3>
                                <button onClick={() => setShowCharSheet(false)} className="text-stone-400 hover:text-stone-600"><i className="fa-solid fa-chevron-left"></i></button>
                            </div>
                            <div className="p-4 overflow-y-auto flex-grow bg-white pb-24 lg:pb-4">
                                <div className="space-y-2 pb-4">
                                    {characters.map(char => {
                                        const stats = char.stats || { CON: 0, SIZ: 0, POW: 0 };
                                        const vitals = char.vitals || { HP: 0, MP: 0, SAN: 0 };
                                        const maxHP = Math.floor(((stats.CON || 0) + (stats.SIZ || 0)) / 10);
                                        const maxMP = Math.floor((stats.POW || 0) / 5);
                                        return (
                                            <div key={char.id} className={`p-3 rounded border cursor-pointer hover:bg-stone-50 transition-colors bg-white border-stone-200 shadow-sm`} onClick={() => setEditingCharId(char.id)}>
                                                <div className="font-title font-bold text-stone-800 flex justify-between items-center">
                                                    <span>{char.name}</span>
                                                    <div className="flex gap-1">
                                                        {char.owner === user.uid && <span className="text-[10px] bg-stone-100 px-1 rounded text-stone-500 flex items-center">ME</span>}
                                                        {(char.owner === user.uid || isKeeper) && (
                                                            <div className="flex items-center gap-1">
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); window.open(`?view=char&sessionId=${sessionId}&charId=${char.id}`, '_blank', 'width=800,height=900,menubar=no,toolbar=no'); }}
                                                                    className="text-stone-400 hover:text-stone-600 px-1"
                                                                    title="새 창으로 열기"
                                                                >
                                                                    <i className="fa-solid fa-arrow-up-right-from-square text-xs"></i>
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); handleDeleteCharacter(char.id); }}
                                                                    className="text-stone-400 hover:text-red-600 px-1"
                                                                    title="캐릭터 삭제"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-stone-500 mb-2">{char.player_name}</div>
                                                <div className="grid grid-cols-3 gap-1 text-xs text-center">
                                                    <div className="bg-stone-100 rounded p-1">HP <b>{vitals.HP}</b>/{maxHP}</div>
                                                    <div className="bg-stone-100 rounded p-1">MP <b>{vitals.MP}</b>/{maxMP}</div>
                                                    <div className="bg-stone-100 rounded p-1">SAN <b>{vitals.SAN}</b></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <button onClick={() => setShowCharCreation(true)} className={`w-full text-sm mt-4 ${STYLES.BTN_PRIMARY} py-3 shadow-md`}>+ 새 캐릭터</button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center py-4 bg-stone-50/50 cursor-pointer hover:bg-stone-100" onClick={() => setShowCharSheet(true)}>
                            <button className="text-stone-400 hover:text-stone-600"><i className="fa-solid fa-chevron-right"></i></button>
                        </div>
                    )}
                </aside>

                <div className={`flex-grow flex-col ${STYLES.PANEL} m-0 lg:m-4 overflow-hidden relative border-0 lg:border rounded-none lg:rounded-lg ${mobileTab === 'map' ? 'flex w-full' : 'hidden lg:flex'}`}>
                    <div className="relative flex-grow bg-stone-200 overflow-hidden">
                        {session?.scene.mapUrl && <div className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-500" style={{ backgroundImage: `url(${session.scene.mapUrl})` }} />}
                        <div className="absolute inset-0 pointer-events-none flex flex-col justify-end items-center z-10 pb-20 lg:pb-8">
                            <div className="w-11/12 max-w-4xl pointer-events-auto">
                                {(() => {
                                    const lastVn = [...messages].reverse().find(m => m.type === 'vn-chat');
                                    if (!lastVn) return null;
                                    return (
                                        <div className="animate-[fadeIn_0.3s_ease-out] relative">
                                            {lastVn.portraitUrl && (
                                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-0 pointer-events-none">
                                                    <img 
                                                        src={lastVn.portraitUrl} 
                                                        className="h-[55vh] sm:h-[65vh] object-contain object-bottom drop-shadow-2xl transition-all duration-300" 
                                                        alt="portrait" 
                                                    />
                                                </div>
                                            )}
                                            <div className="relative z-10 bg-stone-900/90 backdrop-blur text-stone-100 p-4 sm:p-6 rounded-xl shadow-2xl border border-stone-700">
                                                {lastVn.sender !== '나레이션' && <div className="absolute -top-4 left-6 bg-stone-800 px-4 py-1 rounded text-stone-300 font-title font-bold border border-stone-600">{lastVn.sender}</div>}
                                                <p className="text-base sm:text-lg leading-relaxed mt-2 whitespace-pre-wrap">{renderTextWithHighlights(lastVn.text)}</p>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                    {isKeeper && (
                        <div className="p-2 border-t border-stone-200 bg-stone-50 flex items-center gap-4 overflow-x-auto shrink-0 pb-20 lg:pb-2">
                            <div className="flex items-center gap-2"><span className="text-xs font-bold text-stone-500 uppercase">Map</span><select className={`text-xs p-1 rounded border border-stone-300 w-24 sm:w-32 custom-select`} value={session?.scene.mapUrl} onChange={(e) => updateScene({ mapUrl: e.target.value })}><option value="">(None)</option>{session?.scene.maps?.map(m => <option key={m.url} value={m.url}>{m.name}</option>)}</select></div>
                            <div className="flex items-center gap-2"><span className="text-xs font-bold text-stone-500 uppercase">Handout</span><select className={`text-xs p-1 rounded border border-stone-300 w-24 sm:w-32 custom-select`} value={session?.scene.activeHandout || ''} onChange={(e) => updateScene({ activeHandout: e.target.value })}><option value="">(Close)</option>{session?.scene.handouts?.map(h => <option key={h.url} value={h.url}>{h.name}</option>)}</select></div>
                            <div className="flex items-center gap-2"><span className="text-xs font-bold text-stone-500 uppercase">BGM</span><select className={`text-xs p-1 rounded border border-stone-300 w-24 sm:w-32 custom-select`} value={session?.scene.bgmUrl} onChange={(e) => updateScene({ bgmUrl: e.target.value })}><option value="">(Stop)</option>{session?.scene.bgms?.map(b => <option key={b.url} value={b.url}>{b.name}</option>)}</select></div>
                            <button onClick={() => setShowKeeperTools(true)} className="text-xs px-2 py-1 bg-stone-700 text-white rounded hover:bg-stone-800 flex items-center gap-1 shrink-0"><span>⚙️ 설정</span></button>
                        </div>
                    )}
                </div>

                <aside className={`flex-col ${STYLES.PANEL} overflow-hidden m-0 lg:m-4 lg:w-96 shrink-0 border-0 lg:border rounded-none lg:rounded-lg ${mobileTab === 'chat' ? 'flex w-full absolute inset-0 z-30' : 'hidden lg:flex'}`}>
                    <div className="flex border-b border-stone-200 bg-stone-50 shrink-0">
                        <button onClick={() => setActiveTab('log')} className={`flex-1 py-3 text-sm font-bold font-title transition-colors ${activeTab === 'log' ? 'bg-white text-stone-800 border-t-2 border-t-stone-600' : 'text-stone-500 hover:bg-stone-100'}`}>Log</button>
                        <button onClick={() => { setActiveTab('ooc'); setUnreadOoc(false); }} className={`flex-1 py-3 text-sm font-bold font-title transition-colors flex items-center justify-center gap-1 ${activeTab === 'ooc' ? 'bg-white text-stone-800 border-t-2 border-t-stone-600' : 'text-stone-500 hover:bg-stone-100'}`}>
                            Talk
                            {unreadOoc && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse border border-white"></span>}
                        </button>
                    </div>
                    <div className="flex-grow overflow-y-auto p-4 bg-stone-50/30">
                        {activeTab === 'log' ? (
                            <div className="space-y-3">{messages.filter(m => !['ooc-chat', 'ooc-dice'].includes(m.type)).map(msg => <ChatMessageItem key={msg.id} msg={msg} userId={user.uid} isKeeper={isKeeper} onReRoll={handleReRoll} onEdit={handleEditMsg} onDelete={handleDeleteMsg} />)}<div ref={logEndRef} /></div>
                        ) : (
                            <div className="space-y-2">{messages.filter(m => ['ooc-chat', 'ooc-dice'].includes(m.type)).map(msg => <ChatMessageItem key={msg.id} msg={msg} userId={user.uid} isKeeper={isKeeper} onEdit={handleEditMsg} onDelete={handleDeleteMsg} />)}<div ref={oocEndRef} /></div>
                        )}
                    </div>
                    <div className="bg-white border-t border-stone-200 shrink-0 pb-20 lg:pb-0">
                        {activeTab === 'log' ? (
                            <>
                                <div className="p-3">
                                    <select className="w-full mb-2 p-1 text-sm border border-stone-300 rounded text-stone-600 custom-select" value={actingCharId} onChange={(e) => setActingCharId(e.target.value)}><option value="">/desc</option>{characters.filter(c => c.owner === user.uid).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                                    <div className="flex gap-2">
                                        <textarea value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="대화 또는 묘사..." className={`flex-grow resize-none ${STYLES.INPUT} px-3 py-2 text-sm`} rows={1} onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} />
                                        <button onClick={() => handleSendMessage()} className={STYLES.BTN_PRIMARY}>전송</button>
                                    </div>
                                </div>
                                <ChatToolbar 
                                    onSendHtml={(html) => handleSendMessage('/html ' + html)} 
                                    onDiceRoll={(dice) => handleSendMessage('/r ' + dice)} 
                                    onImageUpload={handleSendImage} 
                                    onSendBox={handleSendBox} 
                                    onInsertText={(text) => setChatInput(prev => prev + text)}
                                    isKeeper={isKeeper} 
                                />
                            </>
                        ) : (
                            <div className="flex gap-2 p-3">
                                <input type="text" value={oocInput} onChange={(e) => setOocInput(e.target.value)} placeholder="잡담 입력..." className={`flex-grow ${STYLES.INPUT} px-3 py-2 text-sm`} onKeyDown={(e) => e.key === 'Enter' && handleSendOoc()} />
                                <button onClick={handleSendOoc} className={STYLES.BTN_PRIMARY}>전송</button>
                            </div>
                        )}
                    </div>
                </aside>
            </main>

            <nav className="lg:hidden flex border-t border-stone-200 bg-white text-xs shrink-0 z-50 fixed bottom-0 w-full shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pb-safe">
                <button onClick={() => setMobileTab('chars')} className={`flex-1 py-3 flex flex-col items-center justify-center ${mobileTab === 'chars' ? 'text-stone-900 bg-stone-50 font-bold' : 'text-stone-400'}`}><span className="text-xl mb-1">👥</span>캐릭터</button>
                <button onClick={() => setMobileTab('map')} className={`flex-1 py-3 flex flex-col items-center justify-center ${mobileTab === 'map' ? 'text-stone-900 bg-stone-50 font-bold' : 'text-stone-400'}`}><span className="text-xl mb-1">🗺️</span>맵</button>
                <button onClick={() => setMobileTab('chat')} className={`flex-1 py-3 flex flex-col items-center justify-center ${mobileTab === 'chat' ? 'text-stone-900 bg-stone-50 font-bold' : 'text-stone-400'}`}><span className="text-xl mb-1 relative">
                    💬
                    {unreadOoc && <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-white"></span>}
                </span>채팅</button>
            </nav>

            {session?.scene.bgmUrl && <YoutubePlayer url={session.scene.bgmUrl} />}
            {showKeeperTools && session && <KeeperTools session={session} onClose={() => setShowKeeperTools(false)} updateScene={updateScene} showModal={showModal} />}
            {showHandout && session?.scene.activeHandout && <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-8 cursor-pointer" onClick={() => setShowHandout(false)}><img src={session.scene.activeHandout} alt="Handout" className="max-w-full max-h-full shadow-2xl rounded" /></div>}
            {showCharCreation && (
                <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className={`w-full max-w-sm ${STYLES.PANEL} p-6`}>
                        <h3 className="text-lg font-bold mb-4 font-title">새 캐릭터 생성</h3>
                        <input type="text" placeholder="캐릭터 이름" value={newCharName} onChange={(e) => setNewCharName(e.target.value)} className={`w-full px-4 py-2 ${STYLES.INPUT} mb-4`} autoFocus />
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setShowCharCreation(false)} className={STYLES.BTN}>취소</button>
                            <button onClick={handleCreateCharacter} className={STYLES.BTN_PRIMARY}>생성</button>
                        </div>
                    </div>
                </div>
            )}
            {editingCharacter && sessionId && (
                <CharacterSheet 
                    character={editingCharacter} 
                    sessionId={sessionId} 
                    userId={user.uid} 
                    onClose={() => setEditingCharId(null)} 
                    onSkillRoll={(name, val) => handleSkillRoll(editingCharacter.name, name, val)} 
                    onBnPRoll={(name, val) => handleBnPRoll(editingCharacter.name, name, val)} 
                    updateCharacter={async (id, updates) => {
                        await updateDoc(getPublicDoc('characters', id), updates);
                    }} 
                    onLog={async (text) => { await sendChatMessage({ type: 'dice', sender: editingCharacter.name, text }) }}
                    showModal={showModal}
                />
            )}
        </div>
    );
};

export default SessionScreen;