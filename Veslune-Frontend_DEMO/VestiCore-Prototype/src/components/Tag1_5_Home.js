// =====================================================
// Tag 1.5 - 个人主页（登录后首页）
// =====================================================
window.PageHome = function PageHome({ onNext, onJumpTo }) {
    const [showMenu, setShowMenu] = useState(false);
    const [toastMsg, setToastMsg] = useState(null);
    const todayOutfit = window.TodayOutfit || null;

    const avatarMenuItems = [
        { label: '个人档案', icon: '📋', step: 9, color: '#6C5CE7' },
        { label: '个人穿搭偏好', icon: '💝', step: 11, color: '#FF6B6B' },
        { label: '电子衣柜', icon: '👗', step: 10, color: '#FDCB6E' }
    ];

    const handleMenuClick = (step) => {
        setShowMenu(false);
        setTimeout(() => {
            if (onJumpTo) onJumpTo(step);
        }, 200);
    };

    return (
        <div className="page-slot home-page">
            {/* 顶部栏 */}
            <div className="nav-bar home-nav">
                <div className="home-avatar-wrap"
                    onClick={() => setShowMenu(!showMenu)}>
                    <div className="home-avatar">
                        <span>👤</span>
                    </div>
                    <span className="home-avatar-label">我的</span>
                </div>
                <div className="nav-title"
                    style={{ flex: 1, textAlign: 'center' }}>VestiCore</div>
                <div style={{ width: 60 }}></div>
            </div>

            {/* 头像弹出菜单 */}
            {showMenu &&
                <>
                    <div className="avatar-menu-backdrop"
                        onClick={() => setShowMenu(false)}></div>
                    <div className="avatar-menu">
                        {avatarMenuItems.map((item, i) => (
                            <div key={i}
                                className="avatar-menu-item"
                                onClick={() => handleMenuClick(item.step)}>
                                <div className="avatar-menu-icon"
                                    style={{ background: item.color }}>
                                    {item.icon}
                                </div>
                                <span className="avatar-menu-label">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </>
            }

            {/* 主体内容 */}
            <div className="home-body">
                {todayOutfit ? (
                    <>
                        <div className="home-outfit-header">
                            <span className="home-date-badge">📅 今日穿搭</span>
                            <span className="home-weather-tag">{todayOutfit.weather || '☀️ 26°C'}</span>
                        </div>
                        <div className="home-outfit-image">
                            <div className="home-outfit-visual">
                                <span style={{ fontSize: 56 }}>👗</span>
                                <span className="home-outfit-label">今日推荐穿搭</span>
                            </div>
                        </div>
                        <div className="home-outfit-info">
                            <div className="home-outfit-name">{todayOutfit.name || '今日穿搭方案'}</div>
                            <div className="home-outfit-tags">
                                {(todayOutfit.tags || ['简约', '通勤']).map((t, i) => (
                                    <span key={i} className="home-tag-pill">{t}</span>
                                ))}
                            </div>
                        </div>
                        <div className="home-garment-list">
                            {(todayOutfit.garments || ['卡其色风衣', '白色衬衫', '深灰西裤']).map((g, i) => (
                                <div key={i} className="home-garment-item">
                                    <span className="home-garment-icon">
                                        {['🧥', '👔', '👖', '👗', '👟'][i % 5]}
                                    </span>
                                    <span className="home-garment-name">{g}</span>
                                </div>
                            ))}
                        </div>
                        <div className="home-tips-card">
                            <span className="home-tips-icon">💡</span>
                            <span className="home-tips-text">{todayOutfit.tip || '卡其色风衣搭配白色衬衫，通勤得体又不失时尚感。'}</span>
                        </div>
                        <div className="home-outfit-actions">
                            <button className="btn-primary home-action-btn"
                                onClick={() => { if (onJumpTo) onJumpTo(7); }}>
                                ✨ 自由搭配
                            </button>
                            <button className="btn-secondary home-action-btn"
                                onClick={() => { if (onJumpTo) onJumpTo(2); }}>
                                🔄 重新推荐
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="welcome-illustration"
                            style={{ marginTop: 20 }}>🧥</div>
                        <div className="welcome-title">早上好，今天穿什么？</div>
                        <div className="welcome-sub">
                            探索你的数字衣橱，让 VestiCore 为你推荐<br/>最合适的今日穿搭方案。
                        </div>
                        <button className="btn-primary"
                            onClick={onNext}
                            style={{ maxWidth: 280, margin: '0 auto' }}>
                            🚀 开始探索我的衣橱
                        </button>
                        <div style={{ fontSize: 12, color: 'var(--text-light)', textAlign: 'center',
                                marginTop: 16 }}>
                            第二步：上传衣物，完善个人档案
                        </div>
                    </>
                )}
            </div>

            {toastMsg && <div className="toast">{toastMsg}</div>}
        </div>
    );
};
