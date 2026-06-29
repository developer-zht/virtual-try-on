// =====================================================
// 页面组件: Tag 7 - 核心工坊 (拖拽+AI换衣)
// =====================================================
window.PageWorkshop = function PageWorkshop({ onBack, onSave }) {
    const [activeCat, setActiveCat] = useState('全部');
    const [dragItem, setDragItem] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [progressVal, setProgressVal] = useState(0);
    const [progressText, setProgressText] = useState('🧵 正在分析您的身材数据...');
    const [tipIndex, setTipIndex] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [toastMsg, setToastMsg] = useState(null);
    const [dropZoneContent, setDropZoneContent] = useState('👗 拖拽衣物到此处换装');
    const dropRef = useRef(null);

    const tips = [
        '💡 "简约通勤风，衬衫塞进高腰裤更显腿长哦！"',
        '💡 "卡其色风衣+白色内搭，经典永不过时。"',
        '💡 "乐福鞋搭配九分裤，露出脚踝更显瘦。"',
        '💡 "试试把外套披在肩上，瞬间提升时尚感！"'
    ];

    const wardrobe = {
        '全部': [
            { id: 1, name: '卡其色风衣', icon: '🧥', cat: '外套' },
            { id: 2, name: '白色衬衫', icon: '👔', cat: '上衣' },
            { id: 3, name: '深灰西裤', icon: '👖', cat: '下装' },
            { id: 4, name: '黑色皮衣', icon: '🧥', cat: '外套' },
            { id: 5, name: '格纹衬衫', icon: '👕', cat: '上衣' },
            { id: 6, name: '米色长裙', icon: '👗', cat: '裙装' },
            { id: 7, name: '棕色乐福鞋', icon: '👟', cat: '鞋履' },
            { id: 8, name: '白色运动鞋', icon: '👟', cat: '鞋履' },
            { id: 9, name: '牛仔外套', icon: '🧥', cat: '外套' },
            { id: 10, name: '针织开衫', icon: '🧥', cat: '外套' },
            { id: 11, name: '百褶裙', icon: '👗', cat: '裙装' },
            { id: 12, name: '束脚运动裤', icon: '👖', cat: '下装' },
        ]
    };
    const cats = ['全部', '外套', '上衣', '下装', '裙装', '鞋履'];
    const items = activeCat === '全部' ? wardrobe['全部'] : wardrobe['全部'].filter(i => i.cat === activeCat);

    // 模拟AI换衣进度
    const startTryOn = () => {
        setIsLoading(true);
        setProgressVal(0);
        setProgressText('🧵 正在分析您的身材数据...');
        setDropZoneContent('⏳ 换装中...');
        let p = 0;
        const steps = [
            { end: 20, text: '🧵 正在分析您的身材数据...' },
            { end: 45, text: '👗 匹配衣物版型与垂感...' },
            { end: 70, text: '🎨 优化色彩搭配与层次...' },
            { end: 90, text: '✨ 渲染上身效果细节...' },
            { end: 100, text: '💫 即将呈现完美穿搭！' }
        ];
        const interval = setInterval(() => {
            p += Math.random() * 4 + 1;
            if (p > 100) p = 100;
            setProgressVal(p);
            for (let s of steps) {
                if (p >= s.end) setProgressText(s.text);
            }
            // Tips轮播
            setTipIndex(Math.floor(p / 25) % tips.length);
            if (p >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    setIsLoading(false);
                    setDropZoneContent('✅ 换装完成！');
                    setToastMsg('🎉 换装成功！新造型已呈现');
                    setTimeout(() => setToastMsg(null), 2500);
                }, 400);
            }
        }, 300);
    };

    // 拖拽逻辑
    const handleDragStart = (e, item) => {
        setIsDragging(true);
        setDragItem(item);
        e.dataTransfer.setData('text/plain', JSON.stringify(item));
        e.dataTransfer.effectAllowed = 'copy';
        // 创建自定义拖拽图像（绝对定位到屏幕外，避免影响布局和被overflow裁切）
        const ghost = document.createElement('div');
        ghost.textContent = item.icon;
        ghost.style.cssText = 'position:absolute;top:-1000px;left:-1000px;' +
            'width:60px;height:60px;display:flex;align-items:center;justify-content:center;' +
            'font-size:40px;background:#fff;border-radius:12px;padding:0;' +
            'box-shadow:0 12px 40px rgba(0,0,0,0.2);border:2px solid var(--primary);' +
            'pointer-events:none;z-index:9999;';
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, 30, 30);
        // 延迟移除ghost，确保浏览器已捕获拖拽图像
        setTimeout(() => { if (ghost.parentNode) ghost.parentNode.removeChild(ghost); }, 0);
    };

    const handleDragEnd = () => {
        setIsDragging(false);
        setDragItem(null);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        if (dropRef.current) dropRef.current.style.borderColor = 'var(--primary)';
    };

    const handleDragLeave = () => {
        if (dropRef.current) dropRef.current.style.borderColor = '#D0D0D0';
    };

    const handleDrop = (e) => {
        e.preventDefault();
        if (dropRef.current) dropRef.current.style.borderColor = '#D0D0D0';
        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            if (data && data.id) {
                setDropZoneContent(`🧥 ${data.icon} ${data.name}`);
                startTryOn();
            }
        } catch (err) { console.log('drop error'); }
    };

    const handleSave = () => {
        setShowModal(true);
    };

    const confirmSave = () => {
        setShowModal(false);
        setToastMsg('🎉 穿搭已保存！已生成专属Tag，下次优先推荐该风格。');
        setTimeout(() => setToastMsg(null), 2800);
        if (onSave) onSave();
    };

    return (
        <div className="page-slot">
            <div className="nav-bar">
                <div className="nav-left"
                    onClick={onBack}>
                    <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg> 返回
                </div>
                <div className="nav-title">✨ 自由搭配工坊</div>
                <div className="nav-right">
                    <span>💡 推荐理由</span>
                    <span style={{ marginLeft: 6 }}
                        onClick={handleSave}>💾 保存穿搭</span>
                </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-gray)', padding: '0 0 8px', display: 'flex',
                    gap: 6, alignItems: 'center' }}>
                🏷️ 当前风格：简约通勤 · 基于Tag6偏好
                <span style={{ color: 'var(--primary)', cursor: 'pointer', fontSize: 11 }}>[点击切换衣橱 ▼]
                </span>
            </div>
            <div className="workshop-layout">
                <div className="workshop-center">
                    <div className="drop-zone"
                        ref={dropRef}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        style={{ borderColor: isDragging ? 'var(--primary)' : '#D0D0D0' }}>
                        <div style={{ fontSize: 48 }}>{dropZoneContent.includes('换装完成') ? '✅' :
                            dropZoneContent.includes('拖拽') ? '👗' : '🧥'}</div>
                        <div className="sub">{dropZoneContent}</div>
                        {isLoading &&
                            <div className="loading-mask">
                                <div className="spinner"></div>
                                <div style={{ fontSize: 14, fontWeight: 500 }}>AI 换装中...</div>
                                <div style={{ width: '80%', maxWidth: 200 }}>
                                    <div className="ai-progress-wrap"
                                        style={{ height: 4 }}>
                                        <div className="ai-progress-bar"
                                            style={{ width: `${progressVal}%` }}></div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11,
                                            color: 'var(--text-gray)', marginTop: 2 }}>
                                        <span>{progressText}</span>
                                        <span>{Math.round(progressVal)}%</span>
                                    </div>
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-gray)', marginTop: 6,
                                        minHeight: 20 }}>{tips[tipIndex % tips.length]}</div>
                            </div>
                        }
                    </div>
                </div>
                <div className="workshop-sidebar">
                    <div className="sidebar-title">
                        <span>👗 我的衣柜</span>
                        <span style={{ fontSize: 10, color: 'var(--text-light)' }}>{items.length} 件</span>
                    </div>
                    <div className="cat-tabs">{
                        cats.map(c => <span key={c}
                            className={`cat-tab ${activeCat === c ? 'active' : ''}`}
                            onClick={() => setActiveCat(c)}>{c}</span>)
                    }
                    </div>
                    <div className="items-grid">{
                        items.map(item => <div key={item.id}
                            className={`wardrobe-item ${dragItem && dragItem.id === item.id ? 'dragging' : ''}`}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, item)}
                            onDragEnd={handleDragEnd}>
                            <div className="wthumb">{item.icon}</div>
                            <div className="wname">{item.name}</div>
                        </div>)
                    }
                    </div>
                </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-light)', textAlign: 'center', padding: '6px 0',
                    flexShrink: 0 }}>
                💡 拖拽衣物到左侧大图即可换装
            </div>
            <button className="btn-primary"
                onClick={handleSave}
                style={{ marginTop: 4 }}>
                ✅ 保存这套穿搭并设为偏好
            </button>
            <div className="api-hint">
                <span>📡</span>
                <span><span className="method">POST</span>
                <span className="path">/v1/tryon (异步换装)</span></span>
                <span style={{ marginLeft: 'auto', color: 'var(--text-light)', fontSize: 10 }}>+POST /v1/user/save_outfit
                </span>
            </div>
            {toastMsg && <div className="toast">{toastMsg}</div>}
            {showModal &&
                <div className="modal-overlay"
                    onClick={() => setShowModal(false)}>
                    <div className="modal-sheet"
                        onClick={(e) => e.stopPropagation()}>
                        <div className="handle"></div>
                        <div className="m-title">📝 给这套穿搭取个名字吧</div>
                        <input className="m-input"
                            defaultValue="简约通勤风_0629"
                            placeholder="输入穿搭名称" />
                        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>🏷️ 生成的推荐Tag</div>
                        <div className="m-tags">
                            <span className="mtag">#简约</span>
                            <span className="mtag">#通勤</span>
                            <span className="mtag">#卡其色</span>
                            <span className="mtag">#风衣</span>
                        </div>
                        <div className="m-actions">
                            <button className="cancel"
                                onClick={() => setShowModal(false)}>取消</button>
                            <button className="confirm"
                                onClick={confirmSave}>✅ 确认保存</button>
                        </div>
                    </div>
                </div>
            }
        </div>
    );
};
