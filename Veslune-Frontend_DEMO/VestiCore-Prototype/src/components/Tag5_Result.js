// =====================================================
// 页面组件: Tag 5 - 结果页
// =====================================================
window.PageResult = function PageResult({ onNext, onBack, onSwitchStyle, outfitData }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const outfits = outfitData || [
        { id: 1, garments: ['🧥 卡其色风衣', '👔 白色衬衫', '👖 深灰九分裤'], tip: '卡其色风衣搭配白色衬衫，通勤得体又不失时尚感。九分裤露出脚踝，视觉上更显高。',
            tags: ['☀️ 26°C', '🏢 通勤', '🎨 简约风'] },
        { id: 2, garments: ['🧥 黑色皮衣', '👕 格纹衬衫', '👖 黑色牛仔裤'], tip: '皮衣搭配格纹衬衫，街头感十足。黑色牛仔裤收紧腿部线条，整体显瘦显高。',
            tags: ['☀️ 22°C', '🎸 约会', '🕶️ 街头'] },
        { id: 3, garments: ['🧥 米色风衣', '👚 针织衫', '👗 半身裙'], tip: '米色风衣搭配同色系针织衫，温柔知性。A字半身裙修饰胯部，适合梨形身材。',
            tags: ['☀️ 24°C', '🌸 出游', '✨ 温柔'] }
    ];
    const current = outfits[currentIndex];
    const nextOutfit = () => { if (currentIndex < outfits.length - 1) { setCurrentIndex(currentIndex + 1); } else
        { setCurrentIndex(0); } };

    const handleSwitchStyle = () => {
        if (onSwitchStyle) onSwitchStyle();
    };

    return (
        <div className="page-slot">
            <div className="nav-bar">
                <div className="nav-left"
                    onClick={onBack}>
                    <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg> 返回
                </div>
                <div className="nav-title">今日穿搭提案</div>
                <div className="nav-right">
                    <span>⭐ 收藏</span>
                    <span style={{ marginLeft: 6 }}
                        onClick={handleSwitchStyle}>❌ 换一组</span>
                </div>
            </div>
            <div className="context-chips">{
                current.tags.map((t, i) => <span key={i}
                    className="chip">{t}</span>)
            }
            </div>
            <div className="big-image"
                style={{ background: '#F1F2F6', fontSize: 48 }}>
                👗 虚拟试穿效果
                <span style={{ fontSize: 13, color: 'var(--text-light)' }}>当前第 {currentIndex + 1} / {outfits
                    .length} 套</span>
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
            <div className="garment-strip">{
                current.garments.map((g, i) => <div key={i}
                    className="strip-item">
                    <div className="thumb">{g.split(' ')[0]}</div>
                    <div className="name">{g.split(' ').slice(1).join(' ')}</div>
                </div>)
            }
            </div>
            <button className="btn-primary"
                onClick={onNext}
                style={{ marginTop: 'auto' }}>
                👗 今日就穿这件
            </button>
            <div className="api-hint">
                <span>📡</span>
                <span><span className="method">POST</span>
                <span className="path">/v1/tryon (异步)</span></span>
                <span style={{ marginLeft: 'auto', color: 'var(--text-light)', fontSize: 10 }}>+POST /v1/tips/generate
                </span>
            </div>
        </div>
    );
};
