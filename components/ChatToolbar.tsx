import React, { useState, useRef } from 'react';
import { STYLES } from '../constants';
import { compressImage } from '../utils/helpers';

interface ChatToolbarProps {
    onSendHtml: (html: string) => void;
    onDiceRoll: (dice: string) => void;
    onImageUpload: (base64: string) => void;
    onSendBox: (data: { text: string; start: string; end: string }) => void;
    onInsertText: (text: string) => void;
    isKeeper: boolean;
}

// IntroInput 컴포넌트를 외부로 분리하여 리렌더링 시 언마운트 방지
const IntroInput = ({ 
    label, 
    value, 
    onChange, 
    colorValue, 
    onColorChange, 
    placeholder,
    className
}: { 
    label: string, 
    value: string, 
    onChange: (val: string) => void, 
    colorValue?: string, 
    onColorChange?: (val: string) => void, 
    placeholder?: string,
    className?: string
}) => (
    <div className={`mb-2 ${className || ''}`}>
        <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-bold text-stone-500">{label}</label>
        </div>
        <div className="flex gap-2">
            <input 
                type="text" 
                value={value} 
                onChange={e => onChange(e.target.value)} 
                className={`flex-grow px-2 py-1.5 text-sm ${STYLES.INPUT}`} 
                placeholder={placeholder}
            />
            {colorValue && onColorChange && (
                <input 
                    type="color" 
                    value={colorValue} 
                    onChange={e => onColorChange(e.target.value)} 
                    className="w-8 h-8 p-0 border-0 rounded cursor-pointer shrink-0 border border-stone-200" 
                    title="색상 변경"
                />
            )}
        </div>
    </div>
);


const ChatToolbar: React.FC<ChatToolbarProps> = ({ onSendHtml, onDiceRoll, onImageUpload, onSendBox, onInsertText, isKeeper }) => {
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const fileInputTopRef = useRef<HTMLInputElement>(null);
    const fileInputBottomRef = useRef<HTMLInputElement>(null);

    const [gradText, setGradText] = useState('헤더 텍스트');
    const [gradStart, setGradStart] = useState('#B39EFB');
    const [gradEnd, setGradEnd] = useState('#381A93');
    const [divColor, setDivColor] = useState('#B39EFB');
    const [bullText, setBullText] = useState('');
    const [bullColor, setBullColor] = useState('#333333');
    const [chapTitle, setChapTitle] = useState('CHAPTER 00');
    const [chapSub, setChapSub] = useState('도입');
    const [chapColor, setChapColor] = useState('#355C9F');
    const [handoutTitle, setHandoutTitle] = useState('');
    const [handoutContent, setHandoutContent] = useState('');
    
    // Advanced Intro State
    const [introData, setIntroData] = useState({
        topImg: '',
        bottomImg: '',
        
        scenType: 'CoC 7th edition fanmade scenario',
        scenTypeColor: '#333333',
        
        titleMain: '',
        titleMainColor: '#5D5D5D',
        
        titleSub: '',
        titleSubColor: '#8C8C8C',
        
        writerLabel: 'Written by',
        writerName: '',
        writerLabelColor: '#5D5D5D',
        writerNameColor: '#8C8C8C',
        
        desc: '',
        descColor: '#BDBDBD',
        
        kpcLabel: 'KPC',
        kpcName: '',
        pcLabel: 'PC',
        pcName: '',
        charLabelColor: '#5D5D5D',
        charNameColor: '#8C8C8C',
        
        dateLabel: 'Date',
        dateValue: new Date().toISOString().slice(0,10).replace(/-/g, '.'),
        dateLabelColor: '#5D5D5D',
        dateValueColor: '#5D5D5D'
    });

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && onImageUpload) {
            try {
                const base64 = await compressImage(file, 600, 0.6);
                onImageUpload(base64);
            } catch (error) { alert("이미지 업로드 실패"); }
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleIntroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'topImg' | 'bottomImg') => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const base64 = await compressImage(file, 600, 0.6);
                setIntroData(prev => ({ ...prev, [field]: base64 }));
            } catch (error) { alert("이미지 업로드 실패"); }
        }
        if (e.target) e.target.value = '';
    };

    const Button = ({ label, onClick, className = '' }: any) => (
        <button onClick={onClick} className={`px-2 py-1 text-xs rounded border border-stone-200 hover:bg-stone-100 bg-white text-stone-600 whitespace-nowrap ${className}`}>{label}</button>
    );

    const updateIntro = (key: string, val: string) => setIntroData(prev => ({ ...prev, [key]: val }));

    const generateIntroHtml = () => {
        let html = `<div style="font-family: 'ChosunIlboMyungjo', serif; text-align: center; padding: 20px 10px; background: #fff; max-width: 500px; margin: 0 auto; line-height: 1.6;">`;
        
        if (introData.topImg) html += `<img src="${introData.topImg}" style="width:100%; border-radius:2px; margin-bottom:20px; display:block;">`;
        
        if (introData.scenType) html += `<div style="color:${introData.scenTypeColor}; font-size:10px; margin-bottom:5px;">${introData.scenType}</div>`;
        
        if (introData.titleMain) html += `<div style="color:${introData.titleMainColor}; font-size:26px; font-weight:700; font-family:'Times New Roman', serif; font-style:italic; line-height:1.2;">${introData.titleMain}</div>`;
        
        if (introData.titleSub) html += `<div style="color:${introData.titleSubColor}; font-size:11px; margin-bottom:15px; margin-top:5px;">${introData.titleSub}</div>`;
        
        if (introData.writerLabel || introData.writerName) {
            html += `<div style="font-size:11px; margin-bottom:20px;">`;
            if (introData.writerLabel) html += `<span style="color:${introData.writerLabelColor}; margin-right:4px;">${introData.writerLabel}</span>`;
            if (introData.writerName) html += `<span style="color:${introData.writerNameColor};">${introData.writerName}</span>`;
            html += `</div>`;
        }
        
        if (introData.desc) {
            html += `<div style="color:${introData.descColor}; font-size:12px; font-style:italic; margin-bottom:20px; white-space: pre-wrap;">${introData.desc.replace(/\n/g, '<br>')}</div>`;
        }
        
        if (introData.kpcName || introData.pcName) {
            html += `<div style="font-size:11px; margin-bottom:5px;">`;
            if (introData.kpcName) {
                 html += `<span style="color:${introData.charLabelColor}; margin-right:4px;">${introData.kpcLabel}</span>`;
                 html += `<span style="color:${introData.charNameColor}; margin-right:12px;">${introData.kpcName}</span>`;
            }
            if (introData.pcName) {
                 html += `<span style="color:${introData.charLabelColor}; margin-right:4px;">${introData.pcLabel}</span>`;
                 html += `<span style="color:${introData.charNameColor};">${introData.pcName}</span>`;
            }
            html += `</div>`;
        }
    
        if (introData.dateLabel || introData.dateValue) {
            html += `<div style="font-size:11px; margin-bottom:20px;">`;
            if (introData.dateLabel) html += `<span style="color:${introData.dateLabelColor}; margin-right:4px;">${introData.dateLabel}</span>`;
            if (introData.dateValue) html += `<span style="color:${introData.dateValueColor};">${introData.dateValue}</span>`;
            html += `</div>`;
        }
    
        if (introData.bottomImg) html += `<img src="${introData.bottomImg}" style="width:100%; border-radius:2px; display:block;">`;
    
        html += `</div>`;
        onSendHtml(html);
        setActiveModal(null);
    };

    return (
        <div className="flex flex-col gap-1 p-2 bg-stone-50 border-t border-stone-200">
            <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
            <div className="flex flex-wrap gap-2 justify-center mb-1">
                <Button label="이미지 업로드" onClick={() => fileInputRef.current?.click()} />
                {isKeeper && (
                    <>
                        <Button label="인트로" onClick={() => setActiveModal('intro')} />
                        <Button label="챕터" onClick={() => setActiveModal('chapter')} />
                        <Button label="핸드아웃" onClick={() => setActiveModal('handout')} />
                        <Button label="판정박스" onClick={() => setActiveModal('gradient')} />
                        <Button label="✷구분선" onClick={() => setActiveModal('divider')} />
                        <Button label="키워드" onClick={() => setActiveModal('bullet')} />
                    </>
                )}
            </div>
            <div className="flex gap-1 justify-center overflow-x-auto pb-1 hide-scrollbar">
                {['1d3', '1d4', '1d6', '1d8', '1d10', '1d12', '1d20', '1d100'].map(d => (
                    <button key={d} onClick={() => onDiceRoll(d)} className="px-1.5 py-1 text-xs rounded bg-stone-200 hover:bg-stone-300 text-stone-700 min-w-[32px] whitespace-nowrap">{d}</button>
                ))}
            </div>
            {activeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setActiveModal(null)}>
                    <div className={`w-full max-w-sm p-6 ${STYLES.PANEL} m-4 max-h-[90vh] flex flex-col`} onClick={e => e.stopPropagation()}>
                        <div className="overflow-y-auto pr-2 flex-grow">
                            {activeModal === 'gradient' && (
                                <>
                                    <h3 className="font-bold mb-4">판정박스</h3>
                                    <input type="text" value={gradText} onChange={e => setGradText(e.target.value)} className={`w-full mb-3 p-2 ${STYLES.INPUT}`} placeholder="텍스트" />
                                    <div className="flex gap-2 mb-3">
                                        <input type="color" value={gradStart} onChange={e => setGradStart(e.target.value)} className="flex-1 h-8 cursor-pointer" />
                                        <input type="color" value={gradEnd} onChange={e => setGradEnd(e.target.value)} className="flex-1 h-8 cursor-pointer" />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setActiveModal(null)} className={STYLES.BTN}>취소</button>
                                        <button onClick={() => { if(onSendBox) onSendBox({ text: gradText, start: gradStart, end: gradEnd }); setActiveModal(null); }} className={STYLES.BTN_PRIMARY}>확인</button>
                                    </div>
                                </>
                            )}
                            {activeModal === 'chapter' && (
                                <>
                                    <h3 className="font-bold mb-4">챕터</h3>
                                    <input type="text" value={chapTitle} onChange={e => setChapTitle(e.target.value)} className={`w-full mb-3 p-2 ${STYLES.INPUT}`} placeholder="CHAPTER 00" />
                                    <input type="text" value={chapSub} onChange={e => setChapSub(e.target.value)} className={`w-full mb-3 p-2 ${STYLES.INPUT}`} placeholder="부제목 (예: 도입)" />
                                    <input type="color" value={chapColor} onChange={e => setChapColor(e.target.value)} className="w-full h-8 cursor-pointer mb-4" />
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setActiveModal(null)} className={STYLES.BTN}>취소</button>
                                        <button onClick={() => { 
                                            const html = `<div style="margin: 20px 0; font-family: 'ChosunIlboMyungjo', serif;"><div style="text-decoration:none; color: #cbddee; background-color:${chapColor}; text-align:center; display:block; padding:2px; box-shadow: 0px 8px 0px 15px ${chapColor}; font-size:12px; font-style: normal;">─────── ${chapTitle} ───────</div><div style="text-decoration:none; color: white; background-color:${chapColor}; text-align:center; display:block; padding:2px; box-shadow: 0px 8px 0px 15px ${chapColor}; font-style: normal;">${chapSub}</div></div><br>`;
                                            onSendHtml(html); 
                                            setActiveModal(null); 
                                        }} className={STYLES.BTN_PRIMARY}>확인</button>
                                    </div>
                                </>
                            )}
                             {activeModal === 'handout' && (
                                <>
                                    <h3 className="font-bold mb-4">핸드아웃</h3>
                                    <input type="text" value={handoutTitle} onChange={e => setHandoutTitle(e.target.value)} className={`w-full mb-3 p-2 ${STYLES.INPUT}`} placeholder="핸드아웃 명" />
                                    <textarea value={handoutContent} onChange={e => setHandoutContent(e.target.value)} className={`w-full mb-3 p-2 ${STYLES.INPUT}`} placeholder="내용" rows={3} />
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setActiveModal(null)} className={STYLES.BTN}>취소</button>
                                        <button onClick={() => { 
                                            const html = `<div style="text-decoration:none; color: black; font-weight: bold; padding: 8px 12px; margin: 5px 5px 7px 5px; background: #ffffff; line-height: 150%; border: 2px solid black; box-shadow: -4px 4px 0px black; display: inline-block;"><strong>🔎 ${handoutTitle} │　</strong> ${handoutContent}</div>`;
                                            onSendHtml(html); 
                                            setActiveModal(null); 
                                        }} className={STYLES.BTN_PRIMARY}>확인</button>
                                    </div>
                                </>
                            )}
                            {activeModal === 'divider' && (
                                <>
                                    <h3 className="font-bold mb-4">구분선</h3>
                                    <input type="color" value={divColor} onChange={e => setDivColor(e.target.value)} className="w-full h-8 cursor-pointer mb-4" />
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setActiveModal(null)} className={STYLES.BTN}>취소</button>
                                        <button onClick={() => { const html = `<div style="text-align:center; font-style: normal; text-decoration:none; margin: 4px 0;"><span style="color:${divColor};">───────</span><span style="color: ${divColor};">✷</span><span style="color:${divColor};">───────</span></div>`; onSendHtml(html); setActiveModal(null); }} className={STYLES.BTN_PRIMARY}>확인</button>
                                    </div>
                                </>
                            )}
                            {activeModal === 'bullet' && (
                                <>
                                    <h3 className="font-bold mb-4">키워드 삽입</h3>
                                    <p className="text-xs text-stone-500 mb-2">입력창 커서 위치에 키워드 태그를 삽입합니다.</p>
                                    <input type="text" value={bullText} onChange={e => setBullText(e.target.value)} className={`w-full mb-3 p-2 ${STYLES.INPUT}`} placeholder="키워드 내용" onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            if (bullText.trim()) onInsertText(`[${bullText.trim()}:${bullColor}]`);
                                            setBullText('');
                                            setActiveModal(null);
                                        }
                                    }}/>
                                    <div className="flex gap-2 items-center mb-4">
                                        <span className="text-sm font-bold text-stone-600">색상:</span>
                                        <input type="color" value={bullColor} onChange={e => setBullColor(e.target.value)} className="h-8 w-16 cursor-pointer" />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setActiveModal(null)} className={STYLES.BTN}>취소</button>
                                        <button onClick={() => { 
                                            if (bullText.trim()) onInsertText(`[${bullText.trim()}:${bullColor}]`);
                                            setBullText('');
                                            setActiveModal(null); 
                                        }} className={STYLES.BTN_PRIMARY}>입력</button>
                                    </div>
                                </>
                            )}
                            {activeModal === 'intro' && (
                                <div>
                                    <h3 className="font-bold mb-4">인트로 생성</h3>
                                    <input type="file" ref={fileInputTopRef} className="hidden" accept="image/*" onChange={(e) => handleIntroImageUpload(e, 'topImg')} />
                                    <input type="file" ref={fileInputBottomRef} className="hidden" accept="image/*" onChange={(e) => handleIntroImageUpload(e, 'bottomImg')} />

                                    <div className="flex gap-2 items-end mb-1">
                                        <IntroInput 
                                            label="상단 이미지" 
                                            value={introData.topImg} 
                                            onChange={(val) => updateIntro('topImg', val)} 
                                            placeholder="URL 입력"
                                            className="flex-grow mb-0"
                                        />
                                        <div className="mb-2">
                                            <button onClick={() => fileInputTopRef.current?.click()} className={STYLES.BTN}>파일</button>
                                        </div>
                                    </div>
                                    
                                    <IntroInput 
                                        label="시나리오 타입" 
                                        value={introData.scenType} 
                                        onChange={(val) => updateIntro('scenType', val)}
                                        colorValue={introData.scenTypeColor}
                                        onColorChange={(val) => updateIntro('scenTypeColor', val)}
                                    />
                                    <IntroInput 
                                        label="메인 제목 (영문)" 
                                        value={introData.titleMain} 
                                        onChange={(val) => updateIntro('titleMain', val)}
                                        colorValue={introData.titleMainColor}
                                        onColorChange={(val) => updateIntro('titleMainColor', val)}
                                    />
                                    <IntroInput 
                                        label="서브 제목 (한글)" 
                                        value={introData.titleSub} 
                                        onChange={(val) => updateIntro('titleSub', val)}
                                        colorValue={introData.titleSubColor}
                                        onColorChange={(val) => updateIntro('titleSubColor', val)}
                                    />
                                    
                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                        <div>
                                            <label className="text-xs font-bold text-stone-500">Writer Label</label>
                                            <div className="flex gap-1">
                                                <input type="text" value={introData.writerLabel} onChange={e => updateIntro('writerLabel', e.target.value)} className={`w-full p-1.5 text-sm ${STYLES.INPUT}`} />
                                                <input type="color" value={introData.writerLabelColor} onChange={e => updateIntro('writerLabelColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer shrink-0 border border-stone-200" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-stone-500">Writer Name</label>
                                            <div className="flex gap-1">
                                                <input type="text" value={introData.writerName} onChange={e => updateIntro('writerName', e.target.value)} className={`w-full p-1.5 text-sm ${STYLES.INPUT}`} />
                                                <input type="color" value={introData.writerNameColor} onChange={e => updateIntro('writerNameColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer shrink-0 border border-stone-200" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-2">
                                        <div className="flex justify-between mb-1">
                                            <label className="text-xs font-bold text-stone-500">설명 문구</label>
                                            <input type="color" value={introData.descColor} onChange={e => updateIntro('descColor', e.target.value)} className="w-4 h-4 cursor-pointer" title="설명 색상" />
                                        </div>
                                        <textarea value={introData.desc} onChange={e => updateIntro('desc', e.target.value)} className={`w-full p-2 text-sm ${STYLES.INPUT}`} rows={3} placeholder="설명..." />
                                    </div>

                                    <div className="mb-2 border-t border-stone-200 pt-2">
                                        <div className="flex justify-between mb-1">
                                            <label className="text-xs font-bold text-stone-500">캐릭터</label>
                                            <div className="flex gap-1">
                                                <input type="color" value={introData.charLabelColor} onChange={e => updateIntro('charLabelColor', e.target.value)} className="w-4 h-4 cursor-pointer" title="라벨 색상" />
                                                <input type="color" value={introData.charNameColor} onChange={e => updateIntro('charNameColor', e.target.value)} className="w-4 h-4 cursor-pointer" title="이름 색상" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <input type="text" value={introData.kpcLabel} onChange={e => updateIntro('kpcLabel', e.target.value)} className={`p-1.5 text-xs ${STYLES.INPUT}`} placeholder="KPC Label" />
                                            <input type="text" value={introData.kpcName} onChange={e => updateIntro('kpcName', e.target.value)} className={`p-1.5 text-xs ${STYLES.INPUT}`} placeholder="KPC Name" />
                                            <input type="text" value={introData.pcLabel} onChange={e => updateIntro('pcLabel', e.target.value)} className={`p-1.5 text-xs ${STYLES.INPUT}`} placeholder="PC Label" />
                                            <input type="text" value={introData.pcName} onChange={e => updateIntro('pcName', e.target.value)} className={`p-1.5 text-xs ${STYLES.INPUT}`} placeholder="PC Name" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                        <div>
                                            <label className="text-xs font-bold text-stone-500">Date Label</label>
                                            <div className="flex gap-1">
                                                <input type="text" value={introData.dateLabel} onChange={e => updateIntro('dateLabel', e.target.value)} className={`w-full p-1.5 text-sm ${STYLES.INPUT}`} />
                                                <input type="color" value={introData.dateLabelColor} onChange={e => updateIntro('dateLabelColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer shrink-0 border border-stone-200" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-stone-500">Date Value</label>
                                            <div className="flex gap-1">
                                                <input type="text" value={introData.dateValue} onChange={e => updateIntro('dateValue', e.target.value)} className={`w-full p-1.5 text-sm ${STYLES.INPUT}`} />
                                                <input type="color" value={introData.dateValueColor} onChange={e => updateIntro('dateValueColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer shrink-0 border border-stone-200" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 items-end mb-1">
                                        <IntroInput 
                                            label="하단 이미지" 
                                            value={introData.bottomImg} 
                                            onChange={(val) => updateIntro('bottomImg', val)} 
                                            placeholder="URL 입력"
                                            className="flex-grow mb-0"
                                        />
                                        <div className="mb-2">
                                            <button onClick={() => fileInputBottomRef.current?.click()} className={STYLES.BTN}>파일</button>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2 mt-4">
                                        <button onClick={() => setActiveModal(null)} className={STYLES.BTN}>취소</button>
                                        <button onClick={generateIntroHtml} className={STYLES.BTN_PRIMARY}>생성 및 전송</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatToolbar;