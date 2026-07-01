// =====================================================
// 个人穿搭偏好页（保存的历史穿搭记录）
// =====================================================
window.PagePreference = function PagePreference({ onBack, onJumpTo }) {
    const [toastMsg, setToastMsg] = useState(null);
    const savedOutfits = window.SavedOutfits || [];

    const sampleOutfits = [
        {
            id: 'o1', name: '简约通勤风_0629', date: '2026-06-29',
            occasion: '通勤', weather: '☀️ 晴 26°C', feel: '舒适',
            garments: ['🧥 卡其色风衣', '👔 白色衬衫', '👖 深灰西裤', '👞 棕色乐福鞋'],
            tags: ['#简约', '#通勤', '#卡其色', '#风衣'],
            tip: '卡其色风衣搭配白色衬衫，通勤得体又不失时尚感。九分裤露出脚踝，视觉上更显高。',
            source: 'Tag5 穿搭结果'
        },
        {
            id: 'o2', name: '甜酷混搭_0630', date: '2026-06-30',
            occasion: '约会', weather: '⛅ 多云 22°C', feel: '凉爽',
            garments: ['🧥 黑色皮衣', '👕 格纹衬衫', '👖 束脚运动裤', '👟 白色运动鞋'],
            tags: ['#街头', '#甜酷', '#黑色系', '#皮衣'],
            tip: '皮衣搭配格纹衬衫，街头感十足。黑色牛仔裤收紧腿部线条，整体显瘦显高。',
            source: 'Tag7 自由搭配'
        },
        {
            id: 'o3', name: '温柔知性风_0628', date: '2026-06-28',
            occasion: '出游', weather: '☀️ 晴 24°C', feel: '舒适',
            garments: ['🧶 针织开衫', '👗 米色长裙', '👟 白色运动鞋'],
            tags: ['#温柔', '#知性', '#米色系', '#约会'],
            tip: '针织开衫搭配米色长裙，温柔知性。整体同色系搭配，视觉延伸更显高挑。',
            source: 'Tag5 穿搭结果'
        }
    ];

    const displayOutfits = savedOutfits.length > 0 ? savedOutfits : sampleOutfits;

    const deleteOutfit = (id) => {
        const updated = displayOutfits.filter(o => o.id !== id);
        window.SavedOutfits = updated;
        setToastMsg('🗑️ 穿搭记录已删除');
        setTimeout(() => setToastMsg(null), 2000);
    };

    const applyOutfit = (outfit) => {
        window.TodayOutfit = {
            name: outfit.name,
            garments: outfit.garments.map(g => g.replace(/^[^\s]+\s/, '')),
            tags: outfit.tags.map(t => t.replace('#', '')),
            tip: outfit.tip,
            weather: outfit.weather,
            occasion: outfit.occasion
        };
        setToastMsg('✅ 已应用该穿搭为今日选择');
        setTimeout(() => setToastMsg(null), 1500);
    };

    return (
        <div className="page-slot preference-page">
            <div className="nav-bar">
                <div className="nav-left" onClick={onBack}>
                    <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg> 返回
                </div>
                <div className="nav-title">💝 穿搭偏好</div>
                <div className="nav-right" style={{ fontSize: 12, color: 'var(--text-light)' }}>
                    {displayOutfits.length} 套
                </div>
            </div>

            {/* 风格统计 */}
            <div className="pref-stats-row">
                <div className="pref-stat-card">
                    <span className="pref-stat-icon">🎯</span>
                    <span className="pref-stat-num">{displayOutfits.length}</span>
                    <span className="pref-stat-label">保存穿搭</span>
                </div>
                <div className="pref-stat-card">
                    <span className="pref-stat-icon">🏷️</span>
                    <span className="pref-stat-num">
                        {new Set(displayOutfits.flatMap(o => o.tags)).size}
                    </span>
                    <span className="pref-stat-label">偏好标签</span>
                </div>
                <div className="pref-stat-card">
                    <span className="pref-stat-icon">📅</span>
                    <span className="pref-stat-num">
                        {new Set(displayOutfits.map(o => o.occasion)).size}
                    </span>
                    <span className="pref-stat-label">场合类型</span>
                </div>
            </div>

            {/* 穿搭列表 */}
            <div className="pref-list">
                {displayOutfits.map((outfit, idx) => (
                    <div key={outfit.id || idx} className="pref-outfit-card">
                        <div className="pref-outfit-header">
                            <div className="pref-outfit-title">
                                <span className="pref-outfit-icon">
                                    {outfit.source.includes('Tag5') ? '🤖' : '✂️'}
                                </span>
                                <div>
                                    <div className="pref-outfit-name">{outfit.name}</div>
                                    <div className="pref-outfit-meta">
                                        <span>{outfit.date}</span>
                                        <span className="pref-dot">·</span>
                                        <span>{outfit.occasion}</span>
                                        <span className="pref-dot">·</span>
                                        <span>{outfit.weather}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="pref-outfit-actions">
                                <span className="pref-action-btn"
                                    onClick={() => applyOutfit(outfit)}
                                    title="应用为今日穿搭">📌</span>
                                <span className="pref-action-btn"
                                    onClick={() => deleteOutfit(outfit.id)}
                                    title="删除">🗑️</span>
                            </div>
                        </div>

                        <div className="pref-garments-row">
                            {outfit.garments.map((g, i) => (
                                <div key={i} className="pref-garment-chip">
                                    <span className="pref-garment-emoji">{g.split(' ')[0]}</span>
                                    <span className="pref-garment-name">{g.split(' ').slice(1).join(' ')}</span>
                                </div>
                            ))}
                        </div>

                        <div className="pref-tags-row">
                            {outfit.tags.map((t, i) => (
                                <span key={i} className="pref-tag-pill">{t.replace('#', '')}</span>
                            ))}
                            <span className="pref-source-badge">{outfit.source}</span>
                        </div>

                        <div className="pref-tip">
                            <span>💡</span>
                            <span>{outfit.tip}</span>
                        </div>

                        <div className="pref-status-row">
                            <div className="pref-status-item">
                                <span className="pref-status-dot"
                                    style={{ background: outfit.occasion === '通勤' ? '#6C5CE7' :
                                        outfit.occasion === '约会' ? '#FF6B6B' :
                                        outfit.occasion === '出游' ? '#00D2D3' : '#FDCB6E' }}>
                                </span>
                                <span>场合：{outfit.occasion}</span>
                            </div>
                            <div className="pref-status-item">
                                <span>体感：{outfit.feel || '舒适'}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {displayOutfits.length === 0 && (
                <div className="wardrobe-empty" style={{ marginTop: 40 }}>
                    <span style={{ fontSize: 40 }}>📭</span>
                    <span>暂无保存的穿搭</span>
                    <span style={{ fontSize: 12, color: 'var(--text-light)' }}>
                        完成穿搭推荐后保存即可查看
                    </span>
                </div>
            )}

            {toastMsg && <div className="toast">{toastMsg}</div>}
        </div>
    );
};
