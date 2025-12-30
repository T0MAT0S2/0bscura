import React from 'react';
import { Message } from '../types';

interface ChatMessageItemProps {
    msg: Message;
    userId: string;
    isKeeper: boolean;
    onEdit: (msg: Message) => void;
    onDelete: (msgId: string) => void;
    onReRoll?: (skillName: string) => void;
}

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

const ChatMessageItem: React.FC<ChatMessageItemProps> = React.memo(({ msg, userId, isKeeper, onEdit, onDelete, onReRoll }) => {
    const { type, text, sender, skillName, skillValue, hardValue, extremeValue, roll, resultText, resultClass, allRolls, results, style } = msg;
    
    const isMine = msg.uid === userId;
    const canDelete = isKeeper; 
    const canEdit = isMine && ['vn-chat', 'ic-chat', 'ooc-chat', 'desc', 'html'].includes(type);

    const Controls = () => (
        <div className="absolute right-2 top-1 hidden group-hover:flex gap-1 bg-white/80 rounded px-1 shadow-sm z-10 backdrop-blur">
            {canEdit && <button onClick={(e) => { e.stopPropagation(); onEdit(msg); }} className="text-xs text-stone-400 hover:text-stone-600 p-1" title="수정"><i className="fa-solid fa-pen"></i></button>}
            {canDelete && <button onClick={(e) => { e.stopPropagation(); onDelete(msg.id); }} className="text-xs text-stone-400 hover:text-red-600 p-1" title="삭제"><i className="fa-solid fa-trash"></i></button>}
        </div>
    );

    const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="relative group">{children}<Controls/></div>;

    if (type === 'html') return <Wrapper><div dangerouslySetInnerHTML={{ __html: text || '' }} /></Wrapper>;

    if (type === 'check-box') {
        const handleClick = () => {
            const skill = text?.replace(/판정/g, '').replace(/[✷*\[\]]/g, '').trim();
            if (skill && onReRoll) onReRoll(skill);
        };
        return (
            <Wrapper>
                <div onClick={handleClick} className="cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all" title="클릭하여 판정">
                    <div style={{textAlign:'center'}}>
                        <span style={{
                            textDecoration:'none', fontStyle:'normal', textAlign:'center', display:'inline-block', 
                            color:'#FFFFFF', letterSpacing:'-1px', borderRadius:'20px', padding:'5px 25px', 
                            margin: '4px 0', backgroundImage:`linear-gradient(135deg, ${style?.start || '#B39EFB'}, ${style?.end || '#381A93'})`
                        }}>
                            ✷&nbsp; {text} &nbsp;✷
                        </span>
                    </div>
                </div>
            </Wrapper>
        );
    }

    if (type === 'ooc-dice' || type === 'dice') {
        return <Wrapper><em className="text-xs text-center block my-1 text-stone-500"><strong className="text-stone-700">{sender}</strong> 님이 {text}</em></Wrapper>;
    }

    if (type === 'ooc-chat') {
        return <Wrapper><div className="text-xs mb-1"><strong className="font-semibold text-stone-800">{sender}:</strong> <span className="text-stone-600 leading-relaxed ml-1">{text}</span></div></Wrapper>;
    }

    if (type === 'vn-chat' || type === 'ic-chat') {
        if (sender === '나레이션') {
            return <Wrapper><div className="text-center font-bold my-4 text-lg leading-relaxed text-stone-800 shadow-white drop-shadow-sm font-title">{renderTextWithHighlights(text)}</div></Wrapper>;
        }
        return (
            <Wrapper>
                <div className="my-2 font-title">
                    <strong className="font-semibold text-stone-900">{sender}:</strong>
                    <span className="leading-relaxed text-stone-800 ml-1">{renderTextWithHighlights(text)}</span>
                </div>
            </Wrapper>
        );
    }

    if (type === 'desc') {
        if (text?.startsWith('/img ')) return <Wrapper><img src={text.substring(5)} className="w-full object-cover max-h-[250px] rounded-lg border border-stone-200 my-2" alt="Scene" /></Wrapper>;
        if (text?.startsWith('/title ')) return <Wrapper><h2 className="font-title text-xl font-bold text-center my-4 py-2 px-4 bg-stone-700 text-white rounded">{text.substring(7)}</h2></Wrapper>;
        return <Wrapper><div className="text-stone-500 italic pl-2 border-l-2 border-stone-200 my-1 font-title">{renderTextWithHighlights(text)}</div></Wrapper>;
    }

    if (type === 'skill') {
        return (
            <Wrapper>
                <div className="border-2 border-stone-700 rounded-md my-2 text-sm overflow-hidden shadow-sm bg-white select-none">
                    <div className="font-bold text-center py-1 px-2 font-title bg-stone-700 text-white">{skillName}</div>
                    <div className="grid grid-cols-[auto_1fr] divide-y divide-stone-200 pointer-events-none">
                        <div className="p-2 font-semibold bg-stone-100 text-stone-600">기준치</div>
                        <div className="p-2 flex justify-end items-center text-right font-mono">{skillValue} / {hardValue} / {extremeValue}</div>
                        <div className="p-2 font-semibold bg-stone-100 text-stone-600">굴림</div>
                        <div className="p-2 flex justify-end items-center font-mono text-lg font-bold">{roll}</div>
                        <div className="p-2 font-semibold bg-stone-100 text-stone-600">결과</div>
                        <div className={`p-2 text-right font-bold ${resultClass === 'failure' || resultClass === 'fumble' ? 'text-red-600' : 'text-green-700'}`}>{resultText}</div>
                    </div>
                </div>
            </Wrapper>
        );
    }

    if (type === 'bns_pnl_skill' && results) {
        const order = ['p2', 'p1', 'p0', 'n1', 'n2'];
        const resultsArray = Object.entries(results).sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0])).map(([level, res]: [string, any]) => ({ level, ...res }));
        const levelMap: Record<string, string> = {p2:'+2',p1:'+1',p0:'0',n1:'-1',n2:'-2'};
        const gridClass = "grid grid-cols-[4.5rem_1fr]";
        return (
            <Wrapper>
                <div className="border-2 border-purple-800 rounded-md my-2 text-sm overflow-hidden shadow-sm bg-white select-none">
                    <div className="font-bold text-center py-1 px-2 font-title bg-purple-800 text-white">{skillName} (B/P)</div>
                    <div className={`${gridClass} divide-y divide-stone-200 border-b border-stone-200 pointer-events-none`}>
                        <div className="p-2 font-semibold bg-stone-100 text-stone-600 border-r border-stone-200 flex items-center justify-center">기준치</div>
                        <div className="p-2 flex justify-end items-center text-right font-mono">{skillValue} / {hardValue} / {extremeValue}</div>
                        <div className="p-2 font-semibold bg-stone-100 text-stone-600 border-r border-stone-200 flex items-center justify-center">굴림</div>
                        <div className="p-2 flex justify-end items-center font-mono text-lg font-bold space-x-2">{allRolls?.map((r, i) => <span key={i} className={i > 0 ? 'text-purple-700' : ''}>{r}</span>)}</div>
                    </div>
                    <div className="divide-y divide-stone-200 pointer-events-none">
                        {resultsArray.map((res: any) => (
                            <div key={res.level} className={gridClass}>
                                <div className="p-2 font-semibold text-center bg-stone-100 text-stone-600 flex items-center justify-center border-r border-stone-200">{levelMap[res.level]}</div>
                                <div className={`p-2 text-right font-semibold ${res.class === 'failure' ? 'text-red-600' : 'text-green-700'}`}>{res.text} ({res.roll})</div>
                            </div>
                        ))}
                    </div>
                </div>
            </Wrapper>
        );
    }
    return <div>Unknown type</div>;
});

export default ChatMessageItem;