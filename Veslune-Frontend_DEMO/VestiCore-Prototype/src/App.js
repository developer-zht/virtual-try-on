// =====================================================
// 全局状态 Context (简化版)
// =====================================================
const { useState, useEffect, useRef, useCallback, createContext, useContext } = React;
const AppContext = createContext();

// 从 window 取出各页面组件
const PageWelcome = window.PageWelcome;
const PageHome = window.PageHome;
const PageScan = window.PageScan;
const PageProfile = window.PageProfile;
const PageSettings = window.PageSettings;
const PageResult = window.PageResult;
const PageWorkshop = window.PageWorkshop;
const PageProfileDetail = window.PageProfileDetail;
const PageWardrobe = window.PageWardrobe;
const PagePreference = window.PagePreference;
const PageNewHome = window.PageNewHome;

// =====================================================
// 主应用: 管理页面切换
// =====================================================
function App() {
    const [step, setStep] = useState(1);
    const [direction, setDirection] = useState(1);
    const [prevStep, setPrevStep] = useState(1);
    const [animating, setAnimating] = useState(false);
    // 用于子页面（9/10/11）返回时的来源追踪
    const [returnStep, setReturnStep] = useState(8);

    const goTo = (target, dir) => {
        if (animating || target === step) return;
        const validSteps = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12];
        if (!validSteps.includes(target)) return;
        setAnimating(true);
        setDirection(dir);
        setPrevStep(step);
        setStep(target);
        setTimeout(() => setAnimating(false), 400);
    };

    const next = () => goTo(step + 1, 1);
    const back = () => {
        // 如果当前在子页面（9/10/11），返回来源页面
        if (step === 9 || step === 10 || step === 11) {
            goTo(returnStep, -1);
        } else {
            goTo(step - 1, -1);
        }
    };
    const jumpTo = (target) => {
        if (target === 9 || target === 10 || target === 11) {
            setReturnStep(step);
        }
        goTo(target, 1);
    };

    // Tag 1 的 onNext → 跳转到个人主页 (step 8)
    const handleWelcomeNext = () => {
        goTo(8, 1);
    };

    // Tag 8 (个人主页) 的 onNext → 跳转到 Tag 2 (扫描)
    const handleHomeNext = () => {
        goTo(2, 1);
    };

    // Tag 7 的保存 → 跳转到新首页
    const handleWorkshopSave = () => {
        // 模拟保存当前搭配
        const wsOutfit = {
            id: 'o_' + Date.now(),
            name: '自由搭配_' + new Date().toISOString().slice(5, 10).replace('-', ''),
            date: new Date().toISOString().slice(0, 10),
            occasion: '通勤',
            weather: '☀️ 26°C',
            feel: '舒适',
            garments: ['🧥 卡其色风衣', '👔 白色衬衫', '👖 深灰西裤'],
            tags: ['#简约', '#通勤', '#卡其色'],
            tip: '自由搭配组合，展现独特风格。',
            source: 'Tag7 自由搭配'
        };
        const saved = window.SavedOutfits || [];
        saved.unshift(wsOutfit);
        window.SavedOutfits = saved;
        window.TodayOutfit = {
            name: wsOutfit.name,
            garments: ['卡其色风衣', '白色衬衫', '深灰西裤'],
            tags: ['简约', '通勤', '卡其色'],
            tip: wsOutfit.tip,
            weather: '☀️ 26°C',
            occasion: '通勤'
        };
        setTimeout(() => {
            goTo(12, 1);
        }, 1500);
    };

    const renderPage = () => {
        switch (step) {
            case 1:
                return <PageWelcome onNext={handleWelcomeNext} />;
            case 2:
                return <PageScan onNext={next} onBack={back} />;
            case 3:
                return <PageProfile onNext={next} onBack={back} />;
            case 4:
                return <PageSettings onNext={next} onBack={back} />;
            case 5:
                return <PageResult onNext={next} onBack={back}
                    onJumpTo={jumpTo} />;
            case 7:
                return <PageWorkshop onBack={back}
                    onSave={handleWorkshopSave} />;
            case 8:
                return <PageHome onNext={handleHomeNext}
                    onJumpTo={jumpTo} />;
            case 9:
                return <PageProfileDetail onBack={back} />;
            case 10:
                return <PageWardrobe onBack={back} />;
            case 11:
                return <PagePreference onBack={back}
                    onJumpTo={jumpTo} />;
            case 12:
                return <PageNewHome onBack={back}
                    onJumpTo={jumpTo} />;
            default:
                return null;
        }
    };

    const renderPrevPage = () => {
        if (step === prevStep) return null;
        switch (prevStep) {
            case 1:
                return <PageWelcome onNext={handleWelcomeNext} />;
            case 2:
                return <PageScan onNext={next} onBack={back} />;
            case 3:
                return <PageProfile onNext={next} onBack={back} />;
            case 4:
                return <PageSettings onNext={next} onBack={back} />;
            case 5:
                return <PageResult onNext={next} onBack={back}
                    onJumpTo={jumpTo} />;
            case 7:
                return <PageWorkshop onBack={back}
                    onSave={handleWorkshopSave} />;
            case 8:
                return <PageHome onNext={handleHomeNext}
                    onJumpTo={jumpTo} />;
            case 9:
                return <PageProfileDetail onBack={back} />;
            case 10:
                return <PageWardrobe onBack={back} />;
            case 11:
                return <PagePreference onBack={back}
                    onJumpTo={jumpTo} />;
            case 12:
                return <PageNewHome onBack={back}
                    onJumpTo={jumpTo} />;
            default:
                return null;
        }
    };

    const isForward = direction === 1;
    const enterClass = isForward ? 'page-enter-forward' : 'page-enter-back';
    const enterActive = isForward ? 'page-enter-forward-active' : 'page-enter-back-active';
    const exitClass = isForward ? 'page-exit-forward' : 'page-exit-back';
    const exitActive = isForward ? 'page-exit-forward-active' : 'page-exit-back-active';

    return (
        <div className="page-wrapper">
            <div key={`curr-${step}`}
                className={`page-slot ${animating ? enterClass : enterActive}`}
                style={{ zIndex: 10 }}>
                {renderPage()}
            </div>
            {prevStep !== step &&
                <div key={`prev-${prevStep}`}
                    className={`page-slot ${animating ? exitClass : exitActive}`}
                    style={{ zIndex: 5, pointerEvents: 'none' }}>
                    {renderPrevPage()}
                </div>
            }
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
