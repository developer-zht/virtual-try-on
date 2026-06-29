// =====================================================
// 全局状态 Context (简化版)
// =====================================================
const { useState, useEffect, useRef, useCallback, createContext, useContext } = React;
const AppContext = createContext();

// 从 window 取出各 Tag 组件（由 src/components/TagX_*.js 挂载到 window）
const PageWelcome = window.PageWelcome;
const PageScan = window.PageScan;
const PageProfile = window.PageProfile;
const PageSettings = window.PageSettings;
const PageResult = window.PageResult;
const PageExplore = window.PageExplore;
const PageWorkshop = window.PageWorkshop;

// =====================================================
// 主应用: 管理页面切换
// =====================================================
function App() {
    const [step, setStep] = useState(1);
    const [direction, setDirection] = useState(1);
    const [prevStep, setPrevStep] = useState(1);
    const [animating, setAnimating] = useState(false);
    const [selectedOutfit, setSelectedOutfit] = useState(null);

    const goTo = (target, dir) => {
        if (animating || target === step) return;
        if (target < 1 || target > 7) return;
        setAnimating(true);
        setDirection(dir);
        setPrevStep(step);
        setStep(target);
        setTimeout(() => setAnimating(false), 400);
    };

    const next = () => goTo(step + 1, 1);
    const back = () => goTo(step - 1, -1);
    const jumpTo = (target) => goTo(target, 1);

    const renderPage = () => {
        const props = { onNext: next, onBack: back };
        switch (step) {
            case 1:
                return <PageWelcome {...props} />;
            case 2:
                return <PageScan {...props} />;
            case 3:
                return <PageProfile {...props} />;
            case 4:
                return <PageSettings {...props} />;
            case 5:
                return <PageResult {...props}
                    onSwitchStyle={() => jumpTo(6)} />;
            case 6:
                return <PageExplore {...props}
                    onSelectOutfit={(outfit) => { setSelectedOutfit(outfit);
                        jumpTo(7); }} />;
            case 7:
                return <PageWorkshop {...props}
                    onSave={() => { setTimeout(() => { alert('✅ 穿搭已保存！后续将优先推荐该风格。'); }, 300); }} />;
            default:
                return null;
        }
    };

    const renderPrevPage = () => {
        if (step === prevStep) return null;
        const props = { onNext: next, onBack: back };
        switch (prevStep) {
            case 1:
                return <PageWelcome {...props} />;
            case 2:
                return <PageScan {...props} />;
            case 3:
                return <PageProfile {...props} />;
            case 4:
                return <PageSettings {...props} />;
            case 5:
                return <PageResult {...props}
                    onSwitchStyle={() => jumpTo(6)} />;
            case 6:
                return <PageExplore {...props}
                    onSelectOutfit={(outfit) => { setSelectedOutfit(outfit);
                        jumpTo(7); }} />;
            case 7:
                return <PageWorkshop {...props} />;
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
