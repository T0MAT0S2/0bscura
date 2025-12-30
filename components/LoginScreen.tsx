import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../services/firebase';
import { STYLES } from '../constants';

const LoginScreen: React.FC = () => {
    const [isSignup, setIsSignup] = useState(false);
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [nickname, setNickname] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const virtualEmail = `${loginId}@obscura.vtt`;

        try {
            if (isSignup) {
                if (!nickname.trim()) throw new Error("닉네임을 입력해주세요.");
                if (/\s/.test(loginId)) throw new Error("아이디에 공백을 사용할 수 없습니다.");
                
                const cred = await createUserWithEmailAndPassword(auth, virtualEmail, password);
                await updateProfile(cred.user, { displayName: nickname });
            } else {
                await signInWithEmailAndPassword(auth, virtualEmail, password);
            }
        } catch (err: any) {
            let msg = err.message;
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') msg = "아이디 또는 비밀번호가 올바르지 않습니다.";
            else if (err.code === 'auth/email-already-in-use') msg = "이미 사용 중인 아이디입니다.";
            else if (err.code === 'auth/weak-password') msg = "비밀번호는 6자 이상이어야 합니다.";
            else if (err.code === 'auth/invalid-email') msg = "아이디 형식이 올바르지 않습니다.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-full items-center justify-center p-4 bg-stone-200">
            <div className={`w-full max-w-md p-8 ${STYLES.PANEL} flex flex-col items-center`}>
                <h1 className="text-4xl font-title font-bold mb-2">Obscura</h1>
                <p className="text-stone-500 mb-8 font-title">CoC 7th Edition Virtual Tabletop</p>
                
                <form onSubmit={handleSubmit} className="w-full space-y-4">
                    {isSignup && (
                        <input type="text" placeholder="닉네임 (표시 이름)" value={nickname} onChange={e => setNickname(e.target.value)} className={`w-full px-4 py-3 text-lg ${STYLES.INPUT}`} required />
                    )}
                    <input type="text" placeholder="아이디" value={loginId} onChange={e => setLoginId(e.target.value.trim())} className={`w-full px-4 py-3 text-lg ${STYLES.INPUT}`} required />
                    <input type="password" placeholder="비밀번호" value={password} onChange={e => setPassword(e.target.value)} className={`w-full px-4 py-3 text-lg ${STYLES.INPUT}`} required />
                    
                    {error && <p className="text-red-600 text-sm font-bold text-center">{error}</p>}
                    
                    <button type="submit" disabled={loading} className={`w-full py-3 text-lg ${STYLES.BTN_PRIMARY}`}>
                        {loading ? '처리 중...' : (isSignup ? '회원가입' : '로그인')}
                    </button>
                </form>

                <div className="mt-6 text-sm text-stone-500">
                    {isSignup ? "이미 계정이 있으신가요? " : "계정이 없으신가요? "}
                    <button onClick={() => { setIsSignup(!isSignup); setError(''); }} className="font-bold text-stone-800 underline">
                        {isSignup ? "로그인" : "회원가입"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;