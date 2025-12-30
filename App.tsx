import React, { useState, useEffect } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, getPublicDoc } from './services/firebase';
import LoginScreen from './components/LoginScreen';
import LobbyScreen from './components/LobbyScreen';
import SessionScreen from './components/SessionScreen';
import CharacterSheet from './components/CharacterSheet';
import SystemModal from './components/SystemModal';
import { PopoutCharacterSheetWrapper } from './components/SessionScreen'; // Extract wrapper to its own file or keep in SessionScreen if tightly coupled, moving to SessionScreen for now.

// Types
type ViewState = 'loading' | 'login' | 'lobby' | 'session' | 'char-sheet';

interface PopoutParams {
    sessionId: string;
    charId: string;
}

interface ModalConfig {
    isOpen: boolean;
    type: 'alert' | 'confirm' | 'prompt';
    title: string;
    message: string;
    onConfirm: (value?: string) => void;
    defaultValue?: string;
}

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [view, setView] = useState<ViewState>('loading');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [popoutParams, setPopoutParams] = useState<PopoutParams | null>(null);
    const [loadError, setLoadError] = useState<string>('');
    
    const [modalConfig, setModalConfig] = useState<ModalConfig>({
        isOpen: false,
        type: 'alert',
        title: '',
        message: '',
        onConfirm: () => {},
        defaultValue: ''
    });

    const showModal = (type: 'alert' | 'confirm' | 'prompt', title: string, message: string, onConfirm: (val?: string) => void = () => {}, defaultValue: string = '') => {
        setModalConfig({ isOpen: true, type, title, message, onConfirm, defaultValue });
    };

    const closeModal = () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }));
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('view') === 'char' && params.get('sessionId') && params.get('charId')) {
            setPopoutParams({ 
                sessionId: params.get('sessionId')!, 
                charId: params.get('charId')! 
            });
        }

        const unsub = onAuthStateChanged(auth, (u) => {
            if (u) {
                setUser(u);
                const params = new URLSearchParams(window.location.search);
                if (params.get('view') === 'char') {
                    setView('char-sheet');
                } else {
                    setView('lobby');
                }
            } else {
                setUser(null);
                setView('login');
            }
        });

        return () => unsub();
    }, []);

    const handleLogout = async () => {
        await signOut(auth);
        setView('login');
    };

    const handleJoinSession = (sid: string) => {
        setSessionId(sid);
        setView('session');
    };

    const handleExitSession = () => {
        setSessionId(null);
        setView('lobby');
    };

    if (view === 'loading') return <div className="flex h-screen items-center justify-center bg-stone-100 text-stone-500 animate-pulse font-title">로딩 중...</div>;

    return (
        <div className="h-[100dvh] w-full bg-stone-100 text-stone-800 relative">
            {view === 'login' && <LoginScreen />}
            {view === 'lobby' && user && (
                <LobbyScreen 
                    user={user} 
                    onJoin={handleJoinSession} 
                    onLogout={handleLogout} 
                    showModal={showModal} 
                />
            )}
            {view === 'session' && sessionId && user && (
                <SessionScreen 
                    sessionId={sessionId} 
                    user={user} 
                    onExit={handleExitSession}
                    showModal={showModal}
                />
            )}
            {view === 'char-sheet' && popoutParams && user && (
                <PopoutCharacterSheetWrapper 
                    sessionId={popoutParams.sessionId}
                    charId={popoutParams.charId}
                    user={user}
                />
            )}
            
            <SystemModal 
                isOpen={modalConfig.isOpen} 
                type={modalConfig.type} 
                title={modalConfig.title} 
                message={modalConfig.message} 
                onClose={closeModal} 
                onConfirm={modalConfig.onConfirm} 
                defaultValue={modalConfig.defaultValue} 
            />
        </div>
    );
};

export default App;