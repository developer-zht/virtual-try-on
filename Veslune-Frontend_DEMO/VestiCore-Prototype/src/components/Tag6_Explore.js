// =====================================================
// 页面组件: Tag 6 - 探索/换风格页
// =====================================================
window.PageExplore = function PageExplore({ onNext, onBack, onSelectOutfit }) {
    const [activeTag, setActiveTag] = useState(0);
    const [selectedItem, setSelectedItem] = useState(null);
    const tags = [
        { name: '简约通勤', icon: '✨', reasons: ['宜通勤', '26°C刚好', '简约不简单'],
        desc: '卡其色+白色清爽组合，适合办公室环境。' },
        { name: '复古街头', icon: '🕶️', reasons: ['宜约会', '有态度', '复古回潮'],
        desc: '皮衣+格纹裤+马丁靴，复古又街头，适合周末出街。' },
        { name: '甜酷混搭', icon: '💅', reasons: ['宜出游', '个性十足', '甜酷风'],
        desc: '短外套+工装裤+厚底鞋，甜酷风格，回头率超高。' },
        { name: '运动休闲', icon: '🏃', reasons: ['宜运动', '舒适自在', '活力满满'],
        desc: '卫衣+束脚运动裤+运动鞋，舒适自在，活力一整天。' }
    ];
    const tagItems = [
        ['🧥 风衣', '👔 衬衫', '👖 西裤'],
        ['🧥 皮衣', '👕 格纹衫', '👖 牛仔裤'],
        ['🧥 短外套', '👚 背心', '👖 工装裤'],
        ['👕 卫衣', '👖 运动裤', '👟 运动鞋']
    ];
    const current = tags[activeTag];
    const items = tagItems[activeTag] || [];

    const handleTryOn = (item) => {
        setSelectedItem(item);
        setTimeout(() => { alert(`✨ 模拟试穿: ${item}\n调用 POST /v1/tryon 生成虚拟试穿效果`); }, 300);
    };

    return (
        <div className="page-slot">
            <div className="nav-bar">
                <div className="nav-left"
                    onClick={onBack}>
                    <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg> 返回
                </div>
                <div className="nav-title">换换风格</div>
                <div className="nav-right">⚙️ 筛选</div>
            </div>
            <div className="sub-header">试试这些不同风格的搭配方案 ✨</div>
            <div className="context-chips"
                style={{ paddingBottom: 8 }}>
                <span className="chip">☀️ 26°C</span>
                <span className="chip">🏢 通勤</span>
                <span className="chip">🎨 简约风</span>
            </div>
            <div className="tag-scroll">{
                tags.map((t, i) => <span key={i}
                    className={`tag-pill ${activeTag === i ? 'active' : ''}`}
                    onClick={() => setActiveTag(i)}>
                    {t.icon} {t.name}
                </span>)
            }
            </div>
            <div className={`reason-expand ${activeTag !== null ? 'open' : ''}`}>
                <div className="tags">{
                    current.reasons.map((r, i) => <span key={i}>{r}</span>)
                }
                </div>
                <div className="desc">{current.desc}</div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)', margin: '4px 0 6px' }}>
                推荐单品
            </div>
            <div className="explore-grid">{
                items.map((item, i) => <div key={i}
                    className="explore-item"
                    onClick={() => handleTryOn(item)}>
                    <div className="thumb">{item.split(' ')[0]}</div>
                    <div className="ename">{item.split(' ').slice(1).join(' ')}</div>
                    <button className="tryon-btn"
                        onClick={(e) => { e.stopPropagation();
                            handleTryOn(item); }}>👗 试穿</button>
                </div>)
            }
            </div>
            <button className="btn-primary"
                onClick={() => { if (onSelectOutfit) onSelectOutfit(current); } }
                style={{ marginTop: 'auto' }}>
                💡 用这套搭配今天的我
            </button>
            <div className="api-hint">
                <span>📡</span>
                <span><span className="method">POST</span>
                <span className="path">/v1/outfits/recommend</span></span>
                <span style={{ marginLeft: 'auto', color: 'var(--text-light)', fontSize: 10 }}>+POST /v1/tryon
                (试穿)</span>
            </div>
        </div>
    );
};
