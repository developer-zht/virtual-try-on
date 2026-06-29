// =====================================================
// 页面组件: Tag 2 - 拍照页
// =====================================================
window.PageScan = function PageScan({ onNext, onBack }) {
    const [hasImage, setHasImage] = useState(false);
    const [viewAngle, setViewAngle] = useState('flat');
    return (
        <div className="page-slot">
            <div className="nav-bar">
                <div className="nav-left"
                    onClick={onBack}>
                    <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg> 返回
                </div>
                <div className="nav-title">扫描衣物</div>
                <div style={{ width: 60 }}></div>
            </div>
            <div className="steps">
                <div className="step-dot active"><span className="circle">1</span><span className="label">拍照</span></div>
                <div className="step-line"></div>
                <div className="step-dot"><span className="circle">2</span><span className="label">档案</span></div>
                <div className="step-line"></div>
                <div className="step-dot"><span className="circle">3</span><span className="label">搭配</span></div>
            </div>
            <div className={`camera-preview ${hasImage ? 'has-image' : ''}`}>
                {
                    hasImage ? <>
                        <span style={{ fontSize: 56 }}>🧥</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', marginTop: 2 }}>✅
                        已上传卡其色风衣</span>
                        <span className="sub-text"
                            style={{ color: 'var(--text-light)' }}>识别中...</span>
                    </> :
                    <>
                        <span>📷</span>
                        <span className="sub-text">点击下方拍照或上传</span>
                    </>
                }
            </div>
            <div className="card"
                style={{ marginBottom: 8 }}>
                <div className="card-title">📐 拍照视角</div>
                <div className="tag-group">{
                    ['平铺图', '悬挂图', '上身图'].map((t, i) => {
                        const val = ['flat', 'hanging', 'wearing'][i];
                        return <span key={t}
                            className={`tag ${viewAngle === val ? 'active' : ''}`}
                            onClick={() => setViewAngle(val)}>{t}</span>
                    })
                }
                </div>
            </div>
            <div className="dual-btn">
                <div className="btn-outline"
                    onClick={() => setHasImage(true)}><span className="icon">📷</span> 拍照
                </div>
                <div className="btn-outline"
                    onClick={() => setHasImage(true)}><span className="icon">🖼️</span> 相册上传
                </div>
            </div>
            <div style={{ background: '#FFF3CD', borderRadius: 8, padding: '8px 12px', fontSize: 12,
                    color: '#856404', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                ⚡️ AI正在后台分析，您可先完善个人信息
            </div>
            <button className={`btn-primary ${!hasImage ? 'disabled' : ''}`}
                onClick={onNext}
                style={{ marginTop: 'auto' }}>
                {
                    hasImage ? '下一步：完善个人数据 →' : '请先上传衣物图片'
                }
            </button>
            <div className="status-tip"
                style={{ color: 'var(--text-light)', fontSize: 10, marginTop: 4 }}>
                已选 {hasImage ? '1' : '0'} 张图片（建议单件平铺拍摄效果最佳）
            </div>
        </div>
    );
};
