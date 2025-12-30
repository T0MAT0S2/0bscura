import React, { useState, useEffect, useRef } from 'react';
import { STYLES } from '../constants';

interface SystemModalProps {
    isOpen: boolean;
    type: 'alert' | 'confirm' | 'prompt';
    title: string;
    message: string;
    onClose: () => void;
    onConfirm: (val?: string) => void;
    defaultValue?: string;
}

const SystemModal: React.FC<SystemModalProps> = ({ isOpen, type, title, message, onClose, onConfirm, defaultValue }) => {
    const [inputValue, setInputValue] = useState(defaultValue || '');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && type === 'prompt') {
            setInputValue(defaultValue || '');
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, type, defaultValue]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (type === 'prompt') onConfirm(inputValue);
        else onConfirm();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
            <div className={`w-full max-w-sm ${STYLES.PANEL} p-6 shadow-2xl scale-100`}>
                <h3 className="text-lg font-bold font-title mb-2 text-stone-800">{title}</h3>
                <p className="text-stone-600 mb-4 whitespace-pre-wrap">{message}</p>
                {type === 'prompt' && (
                    <input ref={inputRef} type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} className={`w-full mb-4 px-3 py-2 ${STYLES.INPUT}`} onKeyDown={e => e.key === 'Enter' && handleConfirm()} />
                )}
                <div className="flex justify-end gap-2">
                    {type !== 'alert' && <button onClick={onClose} className={STYLES.BTN}>취소</button>}
                    <button onClick={handleConfirm} className={type === 'confirm' ? STYLES.BTN_DANGER : STYLES.BTN_PRIMARY}>확인</button>
                </div>
            </div>
        </div>
    );
};

export default SystemModal;