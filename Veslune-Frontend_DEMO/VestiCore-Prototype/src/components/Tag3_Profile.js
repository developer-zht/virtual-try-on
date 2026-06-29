// =====================================================
// 页面组件: Tag 3 - 档案页
// =====================================================
window.PageProfile = function PageProfile({ onNext, onBack }) {
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('📸 正在读取图片...');
    const [form, setForm] = useState({ height: '170', weight: '65', shoulder: '44', bodyShape: '沙漏形',
        size: 'M', styles: ['简约'], colors: ['黑', '白'], pants: '长裤' });
    useEffect(() => {
        const totalDuration = 8000;
        const startTime = Date.now();
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const pct = Math.min((elapsed / totalDuration) * 100, 99);
            setProgress(pct);
            if (pct < 20) setStatusText('📸 正在读取图片...');
            else if (pct < 50) setStatusText('🧩 正在分割衣物轮廓...');
            else if (pct < 80) setStatusText('🏷️ 正在匹配品类与颜色...');
            else if (pct < 99) setStatusText('✨ 二次渲染效果生成中...');
            else setStatusText('✅ 识别完成！');
            if (pct >= 99) { clearInterval(interval);
                setTimeout(() => setProgress(100), 300); }
        }, 150);
        return () => clearInterval(interval);
    }, []);
    const styleList = ['简约', '通勤', '复古', '街头', '甜美', '运动'];
    const colorsList = ['红', '橙', '黄', '绿', '蓝', '紫', '黑', '白', '灰', '粉'];
    const toggleStyle = (s) => {
        if (form.styles.includes(s)) { setForm({ ...form, styles: form.styles.filter(x => x !== s) }); } else { if (
                form.styles.length >= 3) return;
            setForm({ ...form, styles: [...form.styles, s] }); }
    };
    const toggleColor = (c) => {
        if (form.colors.includes(c)) { setForm({ ...form, colors: form.colors.filter(x => x !== c) }); } else { setForm(
                { ...form, colors: [...form.colors, c] }); }
    };
    return (
        <div className="page-slot">
            <div className="nav-bar">
                <div className="nav-left"
                    onClick={onBack}>
                    <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg> 返回
                </div>
                <div className="nav-title">完善穿衣档案</div>
                <div className="nav-right"
                    onClick={onNext}>跳过</div>
            </div>
            <div className="steps">
                <div className="step-dot done"><span className="circle">✓</span><span className="label">拍照</span></div>
                <div className="step-line done"></div>
                <div className="step-dot active"><span className="circle">2</span><span className="label">档案</span></div>
                <div className="step-line"></div>
                <div className="step-dot"><span className="circle">3</span><span className="label">搭配</span></div>
            </div>
            <div className="ai-progress-text"><span>{statusText}</span>
                <span>{Math.round(progress)}%</span>
            </div>
            <div className="ai-progress-wrap"><div className="ai-progress-bar"
                style={{ width: `${progress}%` }}></div></div>
            <div className="card">
                <div className="card-title">📏 身体数据</div>{
                    [
                        { label: '身高', key: 'height', unit: 'cm' },
                        { label: '体重', key: 'weight', unit: 'kg' },
                        { label: '肩宽', key: 'shoulder', unit: 'cm' }
                    ].map(item => <div className="card-item"
                        key={item.key}>
                        <span className="label">{item.label}</span>
                        <div className="value">
                            <input type="number"
                                value={form[item.key]}
                                onChange={e => setForm({ ...form, [item.key]: e.target.value })}
                                style={{ width: 55, border: 'none', textAlign: 'right', fontSize: 15, outline: 'none',
                                    background: 'transparent' }}
                            /> {item.unit}
                        </div>
                    </div>)
                }
                <div className="card-item">
                    <span className="label">体型</span>
                    <div className="value"
                        style={{ cursor: 'pointer' }}
                        onClick={() => { const v = prompt('输入体型 (梨形/苹果形/沙漏形/矩形/倒三角)', form.bodyShape); if (v) setForm({ ...
                                    form, bodyShape: v }); }}>
                        {form.bodyShape}<span className="arrow">⌵</span>
                    </div>
                </div>
                <div className="card-item">
                    <span className="label">日常尺码</span>
                    <div className="value"
                        style={{ cursor: 'pointer' }}
                        onClick={() => { const v = prompt('输入尺码 (XS/S/M/L/XL/XXL)', form.size); if (v) setForm({ ...form,
                                size: v }); }}>
                        {form.size}<span className="arrow">⌵</span>
                    </div>
                </div>
            </div>
            <div className="card">
                <div className="card-title">🎨 穿搭偏好</div>
                <div style={{ padding: '0 16px 2px', fontSize: 12, color: 'var(--text-light)' }}>风格偏好（最多选3个）</div>
                <div className="tag-group">{
                    styleList.map(s => <span key={s}
                        className={`tag ${form.styles.includes(s) ? 'active' : ''}`}
                        onClick={() => toggleStyle(s)}>{s}</span>)
                }
                </div>
                <div style={{ padding: '0 16px 2px', fontSize: 12, color: 'var(--text-light)' }}>颜色偏好</div>
                <div className="color-group">{
                    colorsList.map(c => {
                        const colorMap = { '红': '#FF6B6B', '橙': '#FF9F43', '黄': '#FECA57', '绿': '#00D2D3',
                            '蓝': '#54A0FF', '紫': '#A29BFE', '黑': '#2D3436', '白': '#F8F9FA', '灰': '#B2BEC3',
                            '粉': '#FD79A8' };
                        return <span key={c}
                            className={`color-dot ${form.colors.includes(c) ? 'active' : ''}`}
                            onClick={() => toggleColor(c)}
                            style={{ background: colorMap[c], borderColor: c === '白' ? '#ddd' : colorMap[c],
                                width: 30, height: 30 }}></span>
                    })
                }
                </div>
                <div style={{ padding: '0 16px 2px', fontSize: 12, color: 'var(--text-light)' }}>裤长偏好</div>
                <div className="segment-group">{
                    ['九分裤', '长裤', '短裤'].map(p => <button key={p}
                        className={`segment-item ${form.pants === p ? 'active' : ''}`}
                        onClick={() => setForm({ ...form, pants: p })}>{p}</button>)
                }
                </div>
            </div>
            <button className="btn-primary"
                onClick={onNext}
                style={{ marginTop: 'auto' }}>
                🚀 查看今日穿搭建议
            </button>
            <div className="status-tip"
                style={{ fontSize: 10, marginTop: 4 }}>
                以下信息仅用于算法推荐，不会对外展示
            </div>
        </div>
    );
};
