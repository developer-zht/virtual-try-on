// =====================================================
// 完成穿搭后的新用户首页
// =====================================================
window.PageNewHome = function PageNewHome({ onJumpTo, onBack }) {
    const [toastMsg, setToastMsg] = useState(null);
    const todayOutfit = window.TodayOutfit || {
        name: '今日穿搭方案',
        garments: ['卡其色风衣', '白色衬衫', '深灰西裤'],
        tags: ['简约', '通勤'],
        tip: '卡其色风衣搭配白色衬衫，通勤得体又不失时尚感。',
        weather: '☀️ 26°C',
        occasion: '通勤'
    };

    const [showMenu, setShowMenu] = useState(false);

    const avatarMenuItems = [
        { label: '个人档案', icon: '📋', step: 9, color: '#6C5CE7' },
        { label: '个人穿搭偏好', icon: '💝', step: 11, color: '#FF6B6B' },
        { label: '电子衣柜', icon: '👗', step: 10, color: '#FDCB6E' }
    ];

    const handleMenuClick = (step) => {
        setShowMenu(false);
        setTimeout(() => { if (onJumpTo) onJumpTo(step); }, 200);
    };

    const handleModify = () => {
        if (onJumpTo) onJumpTo(7);
    };

    const handleReroll = () => {
        if (onJumpTo) onJumpTo(5);
    };

    return (
        <div className="page-slot new-home-page">
            {/* 顶部栏 */}
            <div className="nav-bar home-nav">
                <div className="home-avatar-wrap"
                    onClick={() => setShowMenu(!showMenu)}>
                    <div className="home-avatar">
                        <span>👤</span>
                    </div>
                    <span className="home-avatar-label">我的</span>
                </div>
                <div className="nav-title" style={{ flex: 1, textAlign: 'center' }}>
                    VestiCore
                </div>
                <div style={{ width: 60 }}></div>
            </div>

            {/* 头像弹出菜单 */}
            {showMenu &&
                <>
                    <div className="avatar-menu-backdrop"
                        onClick={() => setShowMenu(false)}></div>
                    <div className="avatar-menu">
                        {avatarMenuItems.map((item, i) => (
                            <div key={i} className="avatar-menu-item"
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
                {/* 日期和天气 */}
                <div className="nh-header-row">
                    <div className="nh-date-card">
                        <span className="nh-date-icon">📅</span>
                        <div>
                            <div className="nh-date-text">今日穿搭</div>
                            <div className="nh-date-sub">已为你准备好</div>
                        </div>
                    </div>
                    <div className="nh-weather-card">
                        <span className="nh-weather-icon">
                            {todayOutfit.weather.includes('雨') ? '🌧️' :
                                todayOutfit.weather.includes('多云') ? '⛅' : '☀️'}
                        </span>
                        <div>
                            <div className="nh-weather-text">{todayOutfit.weather}</div>
                            <div className="nh-weather-sub">{todayOutfit.occasion}</div>
                        </div>
                    </div>
                </div>

                {/* 今日穿搭大图 */}
                <div className="nh-outfit-visual">
                    <div className="nh-outfit-glow"></div>
                    <div className="nh-outfit-frame">
                        <span style={{ fontSize: 56 }}>👗</span>
                        <span className="nh-outfit-label">今日推荐穿搭</span>
                    </div>
                </div>

                {/* 穿搭名称和标签 */}
                <div className="nh-outfit-info">
                    <div className="nh-outfit-title">{todayOutfit.name}</div>
                    <div className="nh-outfit-tags-row">
                        {(todayOutfit.tags || []).map((t, i) => (
                            <span key={i} className="nh-tag">{t}</span>
                        ))}
                    </div>
                </div>

                {/* 单品清单 */}
                <div className="nh-garments-section">
                    <div className="nh-section-title">🧥 搭配清单</div>
                    <div className="nh-garments-row">
                        {(todayOutfit.garments || []).map((g, i) => (
                            <div key={i} className="nh-garment-card">
                                <span className="nh-garment-emoji">
                                    {['🧥', '👔', '👖', '👗', '👞', '👟'][i % 6]}
                                </span>
                                <span className="nh-garment-text">{g}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tips */}
                <div className="nh-tips-card">
                    <span className="nh-tips-emoji">💡</span>
                    <span className="nh-tips-text">{todayOutfit.tip}</span>
                </div>

                {/* 操作按钮 */}
                <div className="nh-actions">
                    <button className="btn-primary nh-action-primary"
                        onClick={handleReroll}>
                        🔄 换一种风格
                    </button>
                    <button className="nh-action-secondary"
                        onClick={handleModify}>
                        ✂️ 自由搭配修改
                    </button>
                </div>

                <div className="nh-bottom-hint">
                    <span>✨ 每天都为你推荐最适合的穿搭</span>
                </div>
            </div>

            {toastMsg && <div className="toast">{toastMsg}</div>}
        </div>
    );
};
