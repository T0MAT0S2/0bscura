export const STYLES = {
    PANEL: "bg-white/90 border border-stone-200 backdrop-blur shadow-sm rounded-lg",
    INPUT: "bg-white border border-stone-300 text-stone-800 rounded focus:outline-none focus:border-stone-600 focus:ring-2 focus:ring-stone-600/10 transition-all",
    BTN: "bg-stone-50 border border-stone-300 text-stone-700 hover:bg-stone-100 active:translate-y-[1px] shadow-sm transition-all rounded px-4 py-2 font-medium",
    BTN_PRIMARY: "bg-stone-700 border border-stone-700 text-white hover:bg-stone-800 active:translate-y-[1px] shadow-sm transition-all rounded px-4 py-2 font-medium",
    BTN_DANGER: "bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 active:translate-y-[1px] shadow-sm transition-all rounded px-4 py-2 font-medium",
};

export const BASE_SKILLS: Record<string, number> = { 
    "관찰력": 25, "자료조사": 20, "듣기": 20, "도약": 20, "말재주": 5, "매혹": 15, 
    "변장": 5, "설득": 10, "손놀림": 10, "수영": 20, "승마": 5, "심리학": 10, 
    "위협": 15, "은밀행동": 20, "추적": 10, "투척": 20, "근접전(격투)": 25, 
    "사격(권총)": 20, "사격(소총/산탄총)": 25, "회피": 0, 
    "기계수리": 10, "열쇠공": 1, "전기수리": 10, "자동차 운전": 20, "중장비 조작": 1, 
    "고고학": 1, "역사": 5, "오컬트": 5, "의료": 1, "인류학": 1, "자연": 10, 
    "정신분석": 1, "크툴루 신화": 0, "회계": 5, "모국어": 0, 
    "예술/공예": 5, "과학": 1, "생존술": 10, "응급처치": 30, "오르기": 20, 
    "재력": 0, "항법": 10 
};

export const ATTRIBUTE_MAPPING: Record<string, string> = { 
    'STR': '근력', 'CON': '건강', 'SIZ': '크기', 'DEX': '민첩', 'APP': '외모', 
    'INT': '지능', 'POW': '정신력', 'EDU': '교육', 'MOV': '이동력', 'LUCK': '행운' 
};