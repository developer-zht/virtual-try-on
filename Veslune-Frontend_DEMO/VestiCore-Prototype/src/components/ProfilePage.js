// =====================================================
// 个人档案页（小红书风格表单）
// =====================================================
window.PageProfileDetail = function PageProfileDetail({ onBack }) {
    const savedProfile = window.UserProfile || {
        height: '170', weight: '65', shoulder: '44',
        bodyShape: '沙漏形', size: 'M',
        styles: ['简约'], colors: ['黑', '白'], pants: '长裤'
    };
    const [form, setForm] = useState(savedProfile);
    const [isEditing, setIsEditing] = useState(false);
    const [toastMsg, setToastMsg] = useState(null);

    const styleList = ['简约', '通勤', '复古', '街头', '甜美', '运动'];
    const colorsList = ['红', '橙', '黄', '绿', '蓝', '紫', '黑', '白', '灰', '粉'];
    const bodyShapes = ['梨形', '苹果形', '沙漏形', '矩形', '倒三角'];
    const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    const pantsList = ['九分裤', '长裤', '短裤'];

    const toggleStyle = (s) => {
        if (!isEditing) return;
        if (form.styles.includes(s)) {
            setForm({ ...form, styles: form.styles.filter(x => x !== s) });
        } else {
            if (form.styles.length >= 3) return;
            setForm({ ...form, styles: [...form.styles, s] });
        }
    };

    const toggleColor = (c) => {
        if (!isEditing) return;
        if (form.colors.includes(c)) {
            setForm({ ...form, colors: form.colors.filter(x => x !== c) });
        } else {
            setForm({ ...form, colors: [...form.colors, c] });
        }
    };

    const colorMap = {
        '红': '#FF6B6B', '橙': '#FF9F43', '黄': '#FECA57', '绿': '#00D2D3',
        '蓝': '#54A0FF', '紫': '#A29BFE', '黑': '#2D3436', '白': '#F8F9FA',
        '灰': '#B2BEC3', '粉': '#FD79A8'
    };

    const handleSave = () => {
        window.UserProfile = { ...form };
        setIsEditing(false);
        setToastMsg('✅ 档案已更新保存');
        setTimeout(() => setToastMsg(null), 2000);
    };

    const handleCancel = () => {
        setForm({ ...savedProfile });
        setIsEditing(false);
    };

    return (
        <div className="page-slot profile-detail-page">
            <div className="nav-bar">
                <div className="nav-left" onClick={onBack}>
                    <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg> 返回
                </div>
                <div className="nav-title">📋 个人档案</div>
                <div className="nav-right"
                    style={{ color: isEditing ? 'var(--primary)' : 'var(--text-light)' }}
                    onClick={() => {
                        if (isEditing) { handleSave(); }
                        else { setIsEditing(true); }
                    }}>
                    {isEditing ? '💾 保存' : '✏️ 编辑'}
                </div>
            </div>

            <div className="profile-header-card">
                <div className="profile-avatar-lg">
                    <span>👤</span>
                </div>
                <div className="profile-header-info">
                    <div className="profile-header-name">我的档案</div>
                    <div className="profile-header-desc">完善身材数据，让推荐更懂你</div>
                </div>
            </div>

            {/* 身体数据 */}
            <div className="card profile-card">
                <div className="card-title">📏 身体数据</div>
                {[
                    { label: '身高', key: 'height', unit: 'cm' },
                    { label: '体重', key: 'weight', unit: 'kg' },
                    { label: '肩宽', key: 'shoulder', unit: 'cm' }
                ].map(item => (
                    <div className="card-item" key={item.key}>
                        <span className="label">{item.label}</span>
                        <div className="value">
                            {isEditing ? (
                                <input type="number"
                                    value={form[item.key]}
                                    onChange={e => setForm({ ...form, [item.key]: e.target.value })}
                                    style={{ width: 55, border: 'none', textAlign: 'right', fontSize: 15,
                                        outline: 'none', background: 'transparent' }}
                                />
                            ) : (
                                <span>{form[item.key]}</span>
                            )}
                            <span style={{ marginLeft: 2 }}>{item.unit}</span>
                        </div>
                    </div>
                ))}
                <div className="card-item">
                    <span className="label">体型</span>
                    <div className="value" style={{ gap: 4 }}>
                        {isEditing ? bodyShapes.map(b => (
                            <span key={b}
                                className={`tag ${form.bodyShape === b ? 'active' : ''}`}
                                style={{ fontSize: 11, padding: '3px 10px' }}
                                onClick={() => setForm({ ...form, bodyShape: b })}>
                                {b}
                            </span>
                        )) : (
                            <span className="profile-value-tag">{form.bodyShape}</span>
                        )}
                    </div>
                </div>
                <div className="card-item">
                    <span className="label">日常尺码</span>
                    <div className="value" style={{ gap: 4 }}>
                        {isEditing ? sizes.map(s => (
                            <span key={s}
                                className={`tag ${form.size === s ? 'active' : ''}`}
                                style={{ fontSize: 12, padding: '3px 8px', minWidth: 32 }}
                                onClick={() => setForm({ ...form, size: s })}>
                                {s}
                            </span>
                        )) : (
                            <span className="profile-value-tag">{form.size}</span>
                        )}
                    </div>
                </div>
            </div>

            {/* 穿搭偏好 */}
            <div className="card profile-card">
                <div className="card-title">🎨 穿搭偏好</div>
                <div style={{ padding: '0 16px 2px', fontSize: 12, color: 'var(--text-light)' }}>
                    风格偏好（最多选3个）
                </div>
                <div className="tag-group">
                    {styleList.map(s => (
                        <span key={s}
                            className={`tag ${form.styles.includes(s) ? 'active' : ''}`}
                            onClick={() => toggleStyle(s)}
                            style={{ opacity: !isEditing && !form.styles.includes(s) ? 0.5 : 1 }}>
                            {s}
                        </span>
                    ))}
                </div>
                <div style={{ padding: '0 16px 2px', fontSize: 12, color: 'var(--text-light)' }}>
                    颜色偏好
                </div>
                <div className="color-group">
                    {colorsList.map(c => (
                        <span key={c}
                            className={`color-dot ${form.colors.includes(c) ? 'active' : ''}`}
                            onClick={() => toggleColor(c)}
                            style={{
                                background: colorMap[c],
                                borderColor: c === '白' ? '#ddd' : colorMap[c],
                                width: 30, height: 30,
                                opacity: !isEditing && !form.colors.includes(c) ? 0.4 : 1
                            }}></span>
                    ))}
                </div>
                <div style={{ padding: '0 16px 2px', fontSize: 12, color: 'var(--text-light)' }}>
                    裤长偏好
                </div>
                <div className="segment-group">
                    {pantsList.map(p => (
                        <button key={p}
                            className={`segment-item ${form.pants === p ? 'active' : ''}`}
                            onClick={() => isEditing && setForm({ ...form, pants: p })}>
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {/* 编辑时取消按钮 */}
            {isEditing && (
                <button className="btn-secondary"
                    onClick={handleCancel}
                    style={{ marginTop: 8 }}>
                    取消编辑
                </button>
            )}

            <div style={{ fontSize: 10, color: 'var(--text-light)', textAlign: 'center',
                    padding: '12px 0 4px' }}>
                以下信息仅用于算法推荐，不会对外展示
            </div>

            {toastMsg && <div className="toast">{toastMsg}</div>}
        </div>
    );
};
