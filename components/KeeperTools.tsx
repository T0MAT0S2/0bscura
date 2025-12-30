import React, { useState } from 'react';
import { STYLES } from '../constants';
import { Session } from '../types';
import { compressImage } from '../utils/helpers';

interface KeeperToolsProps {
    session: Session;
    onClose: () => void;
    updateScene: (updates: any) => Promise<void>;
    showModal: (type: 'alert' | 'confirm', title: string, message: string, onConfirm?: () => void) => void;
}

const KeeperTools: React.FC<KeeperToolsProps> = ({ session, onClose, updateScene, showModal }) => {
    const [activeTab, setActiveTab] = useState<'maps'|'handouts'|'bgm'>('maps');
    const [newMapName, setNewMapName] = useState('');
    const [mapFile, setMapFile] = useState<File | null>(null);
    const [newHoName, setNewHoName] = useState('');
    const [hoFile, setHoFile] = useState<File | null>(null);
    const [newBgmName, setNewBgmName] = useState('');
    const [newBgmUrl, setNewBgmUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const handleAddMap = async () => {
        if (mapFile) {
            setIsUploading(true);
            try {
                const base64 = await compressImage(mapFile, 600, 0.6);
                const newMaps = [...(session.scene.maps || []), { name: newMapName || '새 배경', url: base64 }];
                await updateScene({ maps: newMaps });
                setNewMapName(''); setMapFile(null);
            } catch(e: any) {
                showModal('alert', '오류', "업로드 실패: " + e.message + "\n(1MB 제한 초과 가능성)");
            } finally {
                setIsUploading(false);
            }
        }
    };
    const handleDeleteMap = async (idx: number) => {
        showModal('confirm', '삭제 확인', "정말 삭제하시겠습니까?", async () => {
            const newMaps = [...(session.scene.maps || [])];
            newMaps.splice(idx, 1);
            await updateScene({ maps: newMaps });
        });
    };

    const handleAddHandout = async () => {
        if (hoFile) {
            setIsUploading(true);
            try {
                const base64 = await compressImage(hoFile, 600, 0.6);
                const newHos = [...(session.scene.handouts || []), { name: newHoName || '새 자료', url: base64 }];
                await updateScene({ handouts: newHos });
                setNewHoName(''); setHoFile(null);
            } catch(e: any) {
                showModal('alert', '오류', "업로드 실패: " + e.message + "\n(1MB 제한 초과 가능성)");
            } finally {
                setIsUploading(false);
            }
        }
    };
    const handleDeleteHandout = async (idx: number) => {
        showModal('confirm', '삭제 확인', "정말 삭제하시겠습니까?", async () => {
            const newHos = [...(session.scene.handouts || [])];
            newHos.splice(idx, 1);
            await updateScene({ handouts: newHos });
        });
    };

    const handleAddBgm = async () => {
        if (newBgmName && newBgmUrl) {
            const newBgms = [...(session.scene.bgms || []), { name: newBgmName, url: newBgmUrl }];
            await updateScene({ bgms: newBgms });
            setNewBgmName(''); setNewBgmUrl('');
        }
    };
    const handleDeleteBgm = async (idx: number) => {
        showModal('confirm', '삭제 확인', "정말 삭제하시겠습니까?", async () => {
            const newBgms = [...(session.scene.bgms || [])];
            newBgms.splice(idx, 1);
            await updateScene({ bgms: newBgms });
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4">
            <div className={`w-full max-w-lg flex flex-col max-h-[80vh] ${STYLES.PANEL} overflow-hidden`}>
                <div className="flex items-center justify-between p-4 border-b border-stone-200 bg-white">
                    <h2 className="text-lg font-bold font-title text-stone-800">세션 설정</h2>
                    <button onClick={onClose} className="text-stone-500 hover:text-stone-800">✕</button>
                </div>
                <div className="flex bg-stone-100 border-b border-stone-200">
                    {(['maps', 'handouts', 'bgm'] as const).map((tab) => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 font-title font-bold text-stone-600 hover:bg-white hover:text-stone-800 transition-colors ${activeTab === tab ? 'bg-white text-stone-800 border-b-2 border-stone-800' : ''}`}>
                            {{maps: '배경', handouts: '자료', bgm: 'BGM'}[tab]}
                        </button>
                    ))}
                </div>
                <div className="p-6 overflow-y-auto flex-grow bg-stone-50">
                    {activeTab === 'maps' && (
                        <div>
                            <div className="mb-4">
                                <label className="block text-sm font-bold mb-2 text-stone-700">배경 추가</label>
                                <div className="flex gap-2 items-center mb-2">
                                    <input type="text" value={newMapName} onChange={e => setNewMapName(e.target.value)} placeholder="이름 (예: 서재)" className={`flex-grow px-3 py-2 ${STYLES.INPUT}`} />
                                    <label className={`cursor-pointer ${STYLES.BTN_PRIMARY} flex items-center shrink-0`}>
                                        {mapFile ? '선택됨' : '파일'}
                                        <input type="file" accept="image/*" className="hidden" onChange={e => setMapFile(e.target.files?.[0] || null)} />
                                    </label>
                                </div>
                                {mapFile && <div className="text-xs text-stone-500 mb-2 truncate">{mapFile.name}</div>}
                                <button onClick={handleAddMap} disabled={isUploading} className={`w-full ${STYLES.BTN}`}>{isUploading ? '업로드 중...' : '목록에 추가'}</button>
                            </div>
                            <div className="space-y-2 mt-2">
                                {session.scene.maps?.map((m, i) => (
                                    <div key={i} className="flex justify-between items-center p-3 bg-white border border-stone-200 rounded shadow-sm">
                                        <div className="flex items-center overflow-hidden">
                                            <img src={m.url} className="w-10 h-10 object-cover rounded mr-3 bg-stone-200 cursor-zoom-in shrink-0 border border-stone-300" onClick={() => setPreviewImage(m.url)} title="미리보기" />
                                            <span className="font-medium truncate mr-2">{m.name}</span>
                                        </div>
                                        <div className="flex gap-1 shrink-0">
                                            <button onClick={() => updateScene({ mapUrl: m.url })} className="text-xs bg-stone-100 hover:bg-stone-200 px-2 py-1 rounded border border-stone-300">적용</button>
                                            <button onClick={() => handleDeleteMap(i)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1">🗑️</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {activeTab === 'handouts' && (
                        <div>
                            <div className="mb-4">
                                <label className="block text-sm font-bold mb-2 text-stone-700">자료 추가</label>
                                <div className="flex gap-2 items-center mb-2">
                                    <input type="text" value={newHoName} onChange={e => setNewHoName(e.target.value)} placeholder="이름" className={`flex-grow px-3 py-2 ${STYLES.INPUT}`} />
                                    <label className={`cursor-pointer ${STYLES.BTN_PRIMARY} flex items-center shrink-0`}>
                                        {hoFile ? '선택됨' : '파일'}
                                        <input type="file" accept="image/*" className="hidden" onChange={e => setHoFile(e.target.files?.[0] || null)} />
                                    </label>
                                </div>
                                {hoFile && <div className="text-xs text-stone-500 mb-2 truncate">{hoFile.name}</div>}
                                <button onClick={handleAddHandout} disabled={isUploading} className={`w-full ${STYLES.BTN}`}>{isUploading ? '업로드 중...' : '목록에 추가'}</button>
                            </div>
                            <div className="space-y-2 mt-2">
                                {session.scene.handouts?.map((h, i) => (
                                    <div key={i} className="flex justify-between items-center p-3 bg-white border border-stone-200 rounded shadow-sm">
                                        <div className="flex items-center overflow-hidden">
                                            <img src={h.url} className="w-10 h-10 object-cover rounded mr-3 bg-stone-200 cursor-zoom-in shrink-0 border border-stone-300" onClick={() => setPreviewImage(h.url)} title="미리보기" />
                                            <span className="font-medium truncate mr-2">{h.name}</span>
                                        </div>
                                        <div className="flex gap-1 shrink-0">
                                            <button onClick={() => updateScene({ activeHandout: h.url })} className="text-xs bg-stone-100 hover:bg-stone-200 px-2 py-1 rounded border border-stone-300">전송</button>
                                            <button onClick={() => handleDeleteHandout(i)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1">🗑️</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {activeTab === 'bgm' && (
                        <div>
                            <div className="mb-4">
                                <label className="block text-sm font-bold mb-2 text-stone-700">BGM 추가</label>
                                <input type="text" value={newBgmName} onChange={e => setNewBgmName(e.target.value)} placeholder="제목" className={`w-full px-3 py-2 mb-2 ${STYLES.INPUT}`} />
                                <div className="flex gap-2">
                                    <input type="text" value={newBgmUrl} onChange={e => setNewBgmUrl(e.target.value)} placeholder="YouTube URL" className={`flex-grow px-3 py-2 ${STYLES.INPUT}`} />
                                    <button onClick={handleAddBgm} className={STYLES.BTN_PRIMARY}>추가</button>
                                </div>
                            </div>
                            <div className="space-y-2 mt-2">
                                {session.scene.bgms?.map((b, i) => (
                                    <div key={i} className="flex justify-between items-center p-3 bg-white border border-stone-200 rounded shadow-sm">
                                        <span className="font-medium truncate mr-2">{b.name}</span>
                                        <div className="flex gap-1 shrink-0">
                                            <button onClick={() => updateScene({ bgmUrl: b.url })} className="text-xs bg-stone-700 text-white hover:bg-stone-800 px-2 py-1 rounded">재생</button>
                                            <button onClick={() => handleDeleteBgm(i)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1">🗑️</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                {previewImage && (
                    <div className="absolute inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer" onClick={() => setPreviewImage(null)}>
                        <img src={previewImage} className="max-w-full max-h-full rounded shadow-2xl object-contain" />
                    </div>
                )}
            </div>
        </div>
    );
};

export default KeeperTools;