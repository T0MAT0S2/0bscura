import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { query, where, onSnapshot, serverTimestamp, getDoc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { getPublicCollection, getPublicDoc, getPrivateCollection, getPrivateDoc } from '../services/firebase';
import { STYLES } from '../constants';
import { Session, JoinedSession } from '../types';

interface LobbyScreenProps {
    user: User;
    onJoin: (sessionId: string) => void;
    onLogout: () => void;
    showModal: (type: 'alert' | 'confirm' | 'prompt', title: string, message: string, onConfirm?: (val?: string) => void, defaultValue?: string) => void;
}

const LobbyScreen: React.FC<LobbyScreenProps> = ({ user, onJoin, onLogout, showModal }) => {
    const [mySessions, setMySessions] = useState<Session[]>([]);
    const [joinedSessions, setJoinedSessions] = useState<JoinedSession[]>([]);
    const [newSessionName, setNewSessionName] = useState('');
    const [joinId, setJoinId] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [activeTab, setActiveTab] = useState<'recent' | 'my'>('recent');

    useEffect(() => {
        if (!user) return;
        const q = query(getPublicCollection('sessions'), where('keeperId', '==', user.uid));
        
        const unsub = onSnapshot(q, (snapshot) => {
            const sessions: Session[] = [];
            snapshot.forEach(doc => sessions.push({ id: doc.id, ...doc.data() } as Session));
            sessions.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setMySessions(sessions);
        });
        return () => unsub();
    }, [user]);

    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(getPrivateCollection(user.uid, 'joined_sessions'), (snapshot) => {
            const sessions: JoinedSession[] = [];
            snapshot.forEach(doc => sessions.push({ ...doc.data() } as JoinedSession));
            sessions.sort((a, b) => (b.lastAccess?.seconds || 0) - (a.lastAccess?.seconds || 0));
            setJoinedSessions(sessions);

            sessions.forEach(async (s) => {
                try {
                    const publicSnap = await getDoc(getPublicDoc('sessions', s.id));
                    if (!publicSnap.exists()) {
                        await deleteDoc(getPrivateDoc(user.uid, 'joined_sessions', s.id));
                    } else {
                        const pubData = publicSnap.data();
                        if (pubData.name !== s.name) {
                            await setDoc(getPrivateDoc(user.uid, 'joined_sessions', s.id), { name: pubData.name }, { merge: true });
                        }
                    }
                } catch(e) {}
            });
        });
        return () => unsub();
    }, [user]);

    const recordJoin = async (sid: string, sName: string, kName: string) => {
        await setDoc(getPrivateDoc(user.uid, 'joined_sessions', sid), {
            id: sid,
            name: sName || '이름 없음',
            keeperName: kName || 'Unknown',
            lastAccess: serverTimestamp()
        }, { merge: true });
    };

    const handleCreate = async () => {
        if (!newSessionName.trim()) return;
        setIsCreating(true);
        try {
            const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
            const sName = newSessionName;
            
            await setDoc(getPublicDoc('sessions', newId), {
                id: newId,
                name: sName,
                keeperId: user.uid,
                keeperName: user.displayName || 'Keeper',
                createdAt: serverTimestamp(),
                scene: { mapUrl: '', maps: [], bgmUrl: '', bgms: [], activeHandout: null, handouts: [] }
            });
            
            await recordJoin(newId, sName, user.displayName || 'Me');
            onJoin(newId);
        } catch (e: any) {
            console.error("Create failed", e);
            showModal('alert', '오류', "세션 생성 실패: " + e.message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleJoinSubmit = async () => {
        if (!joinId.trim()) return;
        const sid = joinId.trim().toUpperCase();
        const snap = await getDoc(getPublicDoc('sessions', sid));
        if (snap.exists()) {
            const data = snap.data();
            await recordJoin(sid, data.name, data.keeperName);
            onJoin(sid);
        } else {
            showModal('alert', '오류', "존재하지 않는 세션 ID입니다.");
        }
    };

    const handleDelete = async (sid: string, e: React.MouseEvent) => {
        e.stopPropagation();
        showModal('confirm', '삭제 확인', "정말 이 세션을 삭제하시겠습니까? 복구할 수 없습니다.", async () => {
            try {
                await deleteDoc(getPublicDoc('sessions', sid));
            } catch (err: any) {
                showModal('alert', '오류', "삭제 실패: " + err.message);
            }
        });
    };

    const handleEditName = async (sid: string, currentName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        showModal('prompt', '이름 변경', "세션 이름을 변경하세요:", async (newName) => {
            if(newName && newName.trim() !== "") {
                try {
                    await updateDoc(getPublicDoc('sessions', sid), { name: newName.trim() });
                    await setDoc(getPrivateDoc(user.uid, 'joined_sessions', sid), { name: newName.trim() }, { merge: true });
                } catch(err: any) {
                    showModal('alert', '오류', "이름 변경 실패: " + err.message);
                }
            }
        }, currentName);
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 h-full flex flex-col">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-title font-bold text-stone-800">Obscura 로비</h1>
                    <p className="text-stone-500">환영합니다, <span className="font-bold text-stone-700">{user.displayName || '게스트'}</span>님</p>
                </div>
                <button onClick={onLogout} className="text-xs text-stone-400 hover:text-stone-600 underline">로그아웃</button>
            </header>

            <div className="flex gap-4 mb-6 border-b border-stone-300">
                <button onClick={() => setActiveTab('recent')} className={`pb-2 px-4 font-bold transition-colors ${activeTab === 'recent' ? 'text-stone-800 border-b-2 border-stone-800' : 'text-stone-400 hover:text-stone-600'}`}>최근 접속</button>
                <button onClick={() => setActiveTab('my')} className={`pb-2 px-4 font-bold transition-colors ${activeTab === 'my' ? 'text-stone-800 border-b-2 border-stone-800' : 'text-stone-400 hover:text-stone-600'}`}>내가 만든 세션</button>
            </div>

            <div className="flex-grow overflow-y-auto">
                <div className={`p-4 mb-6 ${STYLES.PANEL} flex flex-col md:flex-row gap-4 items-end bg-stone-50`}>
                    <div className="flex-grow w-full md:w-auto">
                        <label className="block text-xs font-bold text-stone-500 mb-1">ID로 바로 접속</label>
                        <div className="flex gap-2">
                            <input type="text" placeholder="세션 ID (6자리)" value={joinId} onChange={e => setJoinId(e.target.value.toUpperCase())} className={`flex-grow px-3 py-2 uppercase font-mono ${STYLES.INPUT}`} onKeyDown={e => e.key === 'Enter' && handleJoinSubmit()} />
                            <button onClick={handleJoinSubmit} className={STYLES.BTN_PRIMARY}>접속</button>
                        </div>
                    </div>
                    <div className="hidden md:block w-px h-12 bg-stone-300 mx-2"></div>
                    <div className="flex-grow w-full md:w-auto">
                        <label className="block text-xs font-bold text-stone-500 mb-1">새 세션 만들기</label>
                        <div className="flex gap-2">
                            <input type="text" placeholder="시나리오 제목 등..." value={newSessionName} onChange={e => setNewSessionName(e.target.value)} className={`flex-grow px-3 py-2 ${STYLES.INPUT}`} onKeyDown={e => e.key === 'Enter' && handleCreate()} />
                            <button onClick={handleCreate} disabled={isCreating || !newSessionName} className={STYLES.BTN_PRIMARY}>{isCreating ? '...' : '+ 생성'}</button>
                        </div>
                    </div>
                </div>

                {activeTab === 'my' ? (
                    <div className="space-y-4">
                        {mySessions.length === 0 ? <div className="text-center py-10 text-stone-400">생성된 세션이 없습니다.</div> : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {mySessions.map(session => (
                                    <div key={session.id} onClick={() => onJoin(session.id)} className={`p-4 ${STYLES.PANEL} cursor-pointer hover:border-stone-400 transition-all group relative`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-lg font-title truncate pr-8 flex items-center gap-2">
                                                {session.name}
                                                <button onClick={(e) => handleEditName(session.id, session.name, e)} className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-stone-600 text-xs transition-opacity" title="이름 변경">✏️</button>
                                            </h3>
                                            <span className="text-xs bg-stone-200 px-2 py-1 rounded font-mono text-stone-600">{session.id}</span>
                                        </div>
                                        <div className="text-xs text-stone-500">생성일: {session.createdAt?.toDate().toLocaleDateString()}</div>
                                        <button onClick={(e) => handleDelete(session.id, e)} className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-red-500 hover:text-red-700 font-bold px-2 py-1 bg-red-50 rounded">삭제</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {joinedSessions.length === 0 ? <div className="text-center py-10 text-stone-400">참여한 세션 기록이 없습니다.</div> : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {joinedSessions.map(session => (
                                    <div key={session.id} onClick={() => onJoin(session.id)} className={`p-4 ${STYLES.PANEL} cursor-pointer hover:border-stone-400 transition-all`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-lg font-title truncate pr-2">{session.name}</h3>
                                            <span className="text-xs bg-stone-200 px-2 py-1 rounded font-mono text-stone-600 shrink-0">{session.id}</span>
                                        </div>
                                        <div className="flex justify-between items-end mt-2">
                                            <div className="text-xs text-stone-500">
                                                <div>키퍼: {session.keeperName}</div>
                                                <div className="mt-1 text-stone-400">최근 접속: {session.lastAccess?.toDate().toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LobbyScreen;