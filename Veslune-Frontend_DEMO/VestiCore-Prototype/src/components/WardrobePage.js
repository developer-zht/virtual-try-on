// =====================================================
// 电子衣柜页
// =====================================================
window.PageWardrobe = function PageWardrobe({ onBack }) {
    const [activeCat, setActiveCat] = useState('全部');
    const [toastMsg, setToastMsg] = useState(null);

    const wardrobeData = window.WardrobeData || [
        { id: 1, name: '卡其色风衣', icon: '🧥', cat: '外套', color: '卡其', season: '春秋',
            tags: ['#通勤', '#经典款', '#风衣'] },
        { id: 2, name: '白色衬衫', icon: '👔', cat: '上衣', color: '白', season: '四季',
            tags: ['#通勤', '#百搭', '#衬衫'] },
        { id: 3, name: '深灰西裤', icon: '👖', cat: '下装', color: '深灰', season: '四季',
            tags: ['#通勤', '#直筒', '#西裤'] },
        { id: 4, name: '黑色皮衣', icon: '🧥', cat: '外套', color: '黑', season: '秋冬',
            tags: ['#街头', '#机车', '#皮衣'] },
        { id: 5, name: '格纹衬衫', icon: '👕', cat: '上衣', color: '蓝格', season: '春秋',
            tags: ['#休闲', '#格纹', '#衬衫'] },
        { id: 6, name: '米色长裙', icon: '👗', cat: '裙装', color: '米色', season: '春夏',
            tags: ['#温柔', '#百搭', '#半身裙'] },
        { id: 7, name: '棕色乐福鞋', icon: '👞', cat: '鞋履', color: '棕', season: '四季',
            tags: ['#通勤', '#乐福鞋', '#皮鞋'] },
        { id: 8, name: '白色运动鞋', icon: '👟', cat: '鞋履', color: '白', season: '四季',
            tags: ['#运动', '#百搭', '#板鞋'] },
        { id: 9, name: '牛仔外套', icon: '🧥', cat: '外套', color: '牛仔蓝', season: '春秋',
            tags: ['#休闲', '#经典', '#牛仔'] },
        { id: 10, name: '针织开衫', icon: '🧶', cat: '外套', color: '米白', season: '春秋',
            tags: ['#温柔', '#针织', '#开衫'] },
        { id: 11, name: '百褶裙', icon: '👗', cat: '裙装', color: '黑', season: '四季',
            tags: ['#学院', '#百褶', '#短裙'] },
        { id: 12, name: '束脚运动裤', icon: '👖', cat: '下装', color: '灰', season: '春秋',
            tags: ['#运动', '#休闲', '#卫裤'] },
        { id: 13, name: '黑色短T', icon: '👕', cat: '上衣', color: '黑', season: '夏',
            tags: ['#简约', '#基础款', '#T恤'] },
        { id: 14, name: '高腰阔腿裤', icon: '👖', cat: '下装', color: '黑', season: '四季',
            tags: ['#显高', '#阔腿', '#通勤'] },
        { id: 15, name: '碎花连衣裙', icon: '👗', cat: '裙装', color: '碎花', season: '春夏',
            tags: ['#约会', '#甜美', '#连衣裙'] },
        { id: 16, name: '羊羔毛外套', icon: '🧥', cat: '外套', color: '米白', season: '冬',
            tags: ['#保暖', '#可爱', '#冬季'] },
    ];

    const cats = ['全部', '外套', '上衣', '下装', '裙装', '鞋履'];
    const filteredItems = activeCat === '全部'
        ? wardrobeData
        : wardrobeData.filter(i => i.cat === activeCat);

    const catCounts = {};
    cats.forEach(c => {
        catCounts[c] = c === '全部' ? wardrobeData.length : wardrobeData.filter(i => i.cat === c).length;
    });

    return (
        <div className="page-slot wardrobe-page">
            <div className="nav-bar">
                <div className="nav-left" onClick={onBack}>
                    <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg> 返回
                </div>
                <div className="nav-title">👗 电子衣柜</div>
                <div className="nav-right" style={{ fontSize: 12, color: 'var(--text-light)' }}>
                    {wardrobeData.length} 件
                </div>
            </div>

            {/* 统计卡片 */}
            <div className="wardrobe-stats">
                <div className="wardrobe-stat-item">
                    <span className="wardrobe-stat-num">{wardrobeData.length}</span>
                    <span className="wardrobe-stat-label">总衣物</span>
                </div>
                <div className="wardrobe-stat-divider"></div>
                {cats.slice(1).map(c => (
                    <div key={c} className="wardrobe-stat-item">
                        <span className="wardrobe-stat-num">{catCounts[c]}</span>
                        <span className="wardrobe-stat-label">{c}</span>
                    </div>
                ))}
            </div>

            {/* 主体：左侧分类 + 右侧列表 */}
            <div className="wardrobe-main">
                <div className="wardrobe-sidebar">
                    {cats.map(c => (
                        <div key={c}
                            className={`wardrobe-cat-item ${activeCat === c ? 'active' : ''}`}
                            onClick={() => setActiveCat(c)}>
                            <span className="wardrobe-cat-icon">
                                {c === '全部' ? '📦' : c === '外套' ? '🧥' : c === '上衣' ? '👔' : c === '下装' ? '👖' : c === '裙装' ? '👗' : '👟'}
                            </span>
                            <span className="wardrobe-cat-label">{c}</span>
                            <span className="wardrobe-cat-count">{catCounts[c]}</span>
                        </div>
                    ))}
                </div>

                <div className="wardrobe-content">
                    <div className="wardrobe-content-header">
                        <span>{activeCat}</span>
                        <span className="wardrobe-content-count">{filteredItems.length} 件</span>
                    </div>
                    <div className="wardrobe-grid">
                        {filteredItems.map(item => (
                            <div key={item.id} className="wardrobe-card">
                                <div className="wardrobe-card-img">
                                    <span className="wardrobe-card-icon">{item.icon}</span>
                                    <span className="wardrobe-card-season">{item.season}</span>
                                </div>
                                <div className="wardrobe-card-body">
                                    <div className="wardrobe-card-name">{item.name}</div>
                                    <div className="wardrobe-card-meta">
                                        <span className="wardrobe-color-dot"
                                            style={{
                                                background: item.color === '白' ? '#F8F9FA' :
                                                    item.color === '黑' ? '#2D3436' :
                                                    item.color === '深灰' ? '#636E72' :
                                                    item.color === '卡其' ? '#D4A574' :
                                                    item.color === '米色' ? '#F5DEB3' :
                                                    item.color === '米白' ? '#FAF0E6' :
                                                    item.color === '棕' ? '#8B4513' :
                                                    item.color === '灰' ? '#B2BEC3' :
                                                    item.color === '牛仔蓝' ? '#5B7FA5' :
                                                    item.color === '蓝格' ? '#6C8EBF' :
                                                    item.color === '碎花' ? 'linear-gradient(135deg, #FFB6C1, #DDA0DD)' :
                                                    '#ddd',
                                                border: item.color === '白' ? '1px solid #eee' : 'none'
                                            }}></span>
                                        <span className="wardrobe-card-color">{item.color}</span>
                                    </div>
                                    <div className="wardrobe-card-tags">
                                        {item.tags.map((t, i) => (
                                            <span key={i} className="wardrobe-tag">{t}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {filteredItems.length === 0 && (
                        <div className="wardrobe-empty">
                            <span style={{ fontSize: 40 }}>📭</span>
                            <span>该分类暂无衣物</span>
                            <span style={{ fontSize: 12, color: 'var(--text-light)' }}>去拍照识别添加衣物吧</span>
                        </div>
                    )}
                </div>
            </div>

            {toastMsg && <div className="toast">{toastMsg}</div>}
        </div>
    );
};
