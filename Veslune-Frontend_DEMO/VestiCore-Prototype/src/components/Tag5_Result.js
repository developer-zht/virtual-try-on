// =====================================================
// 页面组件: Tag 5 - 穿搭结果页
// =====================================================
window.PageResult = function PageResult({ onNext, onBack, onJumpTo }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [outfitName, setOutfitName] = useState('');
    const [toastMsg, setToastMsg] = useState(null);

    const outfits = [
        { id: 1, garments: ['🧥 卡其色风衣', '👔 白色衬衫', '👖 深灰西裤', '👞 棕色乐福鞋'],
            garmentsRaw: ['卡其色风衣', '白色衬衫', '深灰西裤', '棕色乐福鞋'],
            tip: '卡其色风衣搭配白色衬衫，通勤得体又不失时尚感。九分裤露出脚踝，视觉上更显高。',
            tags: ['☀️ 26°C', '🏢 通勤', '🎨 简约风'], tagsRaw: ['简约', '通勤', '卡其色'] },
        { id: 2, garments: ['🧥 黑色皮衣', '👕 格纹衬衫', '👖 束脚运动裤', '👟 白色运动鞋'],
            garmentsRaw: ['黑色皮衣', '格纹衬衫', '束脚运动裤', '白色运动鞋'],
            tip: '皮衣搭配格纹衬衫，街头感十足。黑色牛仔裤收紧腿部线条，整体显瘦显高。',
            tags: ['☀️ 22°C', '🎸 约会', '🕶️ 街头'], tagsRaw: ['街头', '约会', '黑色系'] },
        { id: 3, garments: ['🧶 针织开衫', '👗 米色长裙', '👟 白色运动鞋'],
            garmentsRaw: ['针织开衫', '米色长裙', '白色运动鞋'],
            tip: '针织开衫搭配米色长裙，温柔知性。整体同色系搭配，视觉延伸更显高挑。',
            tags: ['☀️ 24°C', '🌸 出游', '✨ 温柔'], tagsRaw: ['温柔', '出游', '米色系'] }
    ];

    const current = outfits[currentIndex];

    const nextOutfit = () => {
        if (currentIndex < outfits.length - 1) { setCurrentIndex(currentIndex + 1); }
        else { setCurrentIndex(0); }
    };

    // 保存穿搭（满意）
    const handleSaveOutfit = () => {
        const date = new Date();
        const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
        const defaultName = `${(current.tagsRaw[0] || '穿搭')}_${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
        setOutfitName(defaultName);
        setShowSaveModal(true);
    };

    const confirmSave = () => {
        const name = outfitName.trim() || `${current.tagsRaw[0]}_${Date.now()}`;
        const date = new Date();
        const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
        const newOutfit = {
            id: 'o_' + Date.now(),
            name: name,
            date: dateStr,
            occasion: current.tagsRaw[1] || '通勤',
            weather: current.tags[0] || '☀️ 26°C',
            feel: '舒适',
            garments: current.garments,
            tags: current.tagsRaw.map(t => '#' + t),
            tip: current.tip,
            source: 'Tag5 穿搭结果'
        };
        const saved = window.SavedOutfits || [];
        saved.unshift(newOutfit);
        window.SavedOutfits = saved;

        // 设置今日穿搭
        window.TodayOutfit = {
            name: name,
            garments: current.garmentsRaw,
            tags: current.tagsRaw,
            tip: current.tip,
            weather: current.tags[0],
            occasion: current.tagsRaw[1] || '通勤'
        };

        setShowSaveModal(false);
        setToastMsg('🎉 穿搭已保存！已设为今日穿搭偏好');
        setTimeout(() => {
            setToastMsg(null);
            if (onJumpTo) onJumpTo(12);
        }, 1000);
    };

    // 不满意，换一套 → 跳转 Tag 7 自由搭配
    const handleSwitchToWorkshop = () => {
        if (onJumpTo) onJumpTo(7);
    };

    return (
        <div className="page-slot">
            <div className="nav-bar">
                <div className="nav-left" onClick={onBack}>
                    <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg> 返回
                </div>
                <div className="nav-title">今日穿搭提案</div>
                <div className="nav-right">
                    <span onClick={handleSwitchToWorkshop}>✂️ 自由搭配</span>
                </div>
            </div>

            <div className="context-chips">
                {current.tags.map((t, i) => <span key={i} className="chip">{t}</span>)}
            </div>

            <div className="big-image" style={{ background: '#F1F2F6', fontSize: 48 }}>
                👗 虚拟试穿效果
                <span style={{ fontSize: 13, color: 'var(--text-light)' }}>
                    当前第 {currentIndex + 1} / {outfits.length} 套
                </span>
            </div>

            <div className="recommend-meta">
                <span style={{ fontSize: 14, fontWeight: 500 }}>当前推荐</span>
                <span style={{ fontSize: 13, color: 'var(--primary)', cursor: 'pointer' }}
                    onClick={nextOutfit}>⟳ 换一套</span>
            </div>

            <div className="tips-card">
                <span className="icon">💡</span>
                <div className="content">{current.tip}</div>
            </div>

            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)', margin: '4px 0 6px' }}>
                搭配清单
            </div>
            <div className="garment-strip">
                {current.garments.map((g, i) => <div key={i} className="strip-item">
                    <div className="thumb">{g.split(' ')[0]}</div>
                    <div className="name">{g.split(' ').slice(1).join(' ')}</div>
                </div>)}
            </div>

            {/* 按钮组 */}
            <div className="result-btn-group">
                <button className="result-btn-save"
                    onClick={handleSaveOutfit}>
                    <span className="result-btn-icon">✅</span>
                    <div className="result-btn-text">
                        <span className="result-btn-title">满意，保存穿搭</span>
                        <span className="result-btn-sub">设为今日穿搭偏好</span>
                    </div>
                </button>
                <button className="result-btn-reject"
                    onClick={handleSwitchToWorkshop}>
                    <span className="result-btn-icon">✂️</span>
                    <div className="result-btn-text">
                        <span className="result-btn-title">不满意，自由搭配</span>
                        <span className="result-btn-sub">亲手搭配更个性</span>
                    </div>
                </button>
            </div>

            <div className="api-hint">
                <span>📡</span>
                <span><span className="method">POST</span>
                <span className="path">/v1/tryon (异步)</span></span>
                <span style={{ marginLeft: 'auto', color: 'var(--text-light)', fontSize: 10 }}>
                    +POST /v1/user/save_outfit
                </span>
            </div>

            {/* 保存命名 Modal */}
            {showSaveModal &&
                <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
                    <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
                        <div className="handle"></div>
                        <div className="m-title">📝 给这套穿搭取个名字吧</div>
                        <input className="m-input"
                            value={outfitName}
                            onChange={(e) => setOutfitName(e.target.value)}
                            placeholder="输入穿搭名称" />
                        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>🏷️ 生成的推荐Tag</div>
                        <div className="m-tags">
                            {current.tagsRaw.map((t, i) => (
                                <span key={i} className="mtag">#{t}</span>
                            ))}
                        </div>
                        <div className="m-actions">
                            <button className="cancel" onClick={() => setShowSaveModal(false)}>取消</button>
                            <button className="confirm" onClick={confirmSave}>✅ 确认保存</button>
                        </div>
                    </div>
                </div>
            }

            {toastMsg && <div className="toast">{toastMsg}</div>}
        </div>
    );
};
