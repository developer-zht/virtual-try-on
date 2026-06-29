// =====================================================
// 页面组件: Tag 4 - 设置页
// =====================================================
window.PageSettings = function PageSettings({ onNext, onBack }) {
    const [settings, setSettings] = useState({ occasion: '通勤', weather: '晴', feel: '舒适', goal: '通勤得体',
        visual: '日常随拍', colorTone: null, priority: null });
    const [collapseOpen, setCollapseOpen] = useState(false);
    const [visionModel, setVisionModel] = useState('通义万相');
    const [understandModel, setUnderstandModel] = useState('Qwen-VL');
    const [customVision, setCustomVision] = useState({ endpoint: '', apiKey: '', modelName: '' });
    const [customUnderstand, setCustomUnderstand] = useState({ endpoint: '', apiKey: '', modelName: '' });
    const [showVisionKey, setShowVisionKey] = useState(false);
    const [showUnderstandKey, setShowUnderstandKey] = useState(false);
    const resetAll = () => {
        setSettings({ occasion: '通勤', weather: '晴', feel: '舒适', goal: '通勤得体',
            visual: '日常随拍', colorTone: null, priority: null });
        setVisionModel('通义万相');
        setUnderstandModel('Qwen-VL');
        setCustomVision({ endpoint: '', apiKey: '', modelName: '' });
        setCustomUnderstand({ endpoint: '', apiKey: '', modelName: '' });
    };
    const occasions = ['通勤', '约会', '运动', '居家', '商务', '出游'];
    const weathers = ['☀️ 晴', '⛅ 多云', '🌧️ 雨', '❄️ 雪'];
    const goals = ['👔 通勤得体', '✨ 时尚吸睛', '😌 舒适优先', '📈 显高显瘦'];
    const visuals = ['日常随拍', '杂志大片', '通勤风'];
    const tones = ['🟤 大地色', '🔵 冷色', '🔴 暖色'];
    const priorities = ['外套', '上装', '下装', '鞋履'];
    const visionModels = ['🎨 通义万相', '🖼️ 智谱CogView', '⚡ 自定义模型'];
    const understandModels = ['🧠 Qwen-VL', '👁️ GPT-4o', '🔮 自定义模型'];
    return (
        <div className="page-slot">
            <div className="nav-bar">
                <div className="nav-left"
                    onClick={onBack}>
                    <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg> 返回
                </div>
                <div className="nav-title">设置今日搭配</div>
                <div className="nav-right"
                    onClick={resetAll}>🔄 重置</div>
            </div>
            <div className="steps">
                <div className="step-dot done"><span className="circle">✓</span><span className="label">拍照</span></div>
                <div className="step-line done"></div>
                <div className="step-dot done"><span className="circle">✓</span><span className="label">档案</span></div>
                <div className="step-line done"></div>
                <div className="step-dot active"><span className="circle">3</span><span className="label">搭配</span></div>
            </div>
            <div className="sub-header">选择今天的场合与喜好，定制专属穿搭提案 ✨</div>
            <div className="card">
                <div className="card-title">📅 今日场合</div>
                <div className="tag-group">{
                    occasions.map(o => <span key={o}
                        className={`tag ${settings.occasion === o ? 'active' : ''}`}
                        onClick={() => setSettings({ ...settings, occasion: o })}>{o}</span>)
                }
                </div>
            </div>
            <div className="card">
                <div className="card-title">🌤️ 今日天气</div>
                <div className="tag-group">{
                    weathers.map(w => {
                        const val = w.split(' ')[1];
                        return <span key={w}
                            className={`tag ${settings.weather === val ? 'active' : ''}`}
                            onClick={() => setSettings({ ...settings, weather: val })}>{w}</span>
                    })
                }
                </div>
                <div style={{ padding: '0 16px 4px', fontSize: 12, color: 'var(--text-light)' }}>体感温度</div>
                <div className="segment-group">{
                    ['凉爽', '舒适', '偏热'].map(f => <button key={f}
                        className={`segment-item ${settings.feel === f ? 'active' : ''}`}
                        onClick={() => setSettings({ ...settings, feel: f })}>{f}</button>)
                }
                </div>
            </div>
            <div className="card">
                <div className="card-title">🎯 推荐策略</div>
                <div className="tag-group">{
                    goals.map(g => {
                        const val = g.split(' ')[1];
                        return <span key={g}
                            className={`tag ${settings.goal === val ? 'active' : ''}`}
                            onClick={() => setSettings({ ...settings, goal: val })}>{g}</span>
                    })
                }
                </div>
            </div>
            <div className="card">
                <div className="card-title">🎨 搭配画风</div>
                <div className="tag-group">{
                    visuals.map(v => <span key={v}
                        className={`tag ${settings.visual === v ? 'active' : ''}`}
                        onClick={() => setSettings({ ...settings, visual: v })}>{v}</span>)
                }
                </div>
            </div>
            <div className="card model-card">
                <div className="card-title">🤖 视觉生成模型</div>
                <div className="tag-group">{
                    visionModels.map(m => {
                        const val = m.split(' ')[1];
                        return <span key={m}
                            className={`tag ${visionModel === val ? 'active' : ''}`}
                            onClick={() => setVisionModel(val)}>{m}</span>
                    })
                }
                </div>
                {visionModel === '自定义模型' &&
                    <div className="model-config">
                        <div className="model-config-item">
                            <label className="model-label">API 地址</label>
                            <input className="model-input"
                                type="text"
                                placeholder="https://api.example.com/v1/images/generate"
                                value={customVision.endpoint}
                                onChange={(e) => setCustomVision({ ...customVision, endpoint: e.target.value })} />
                        </div>
                        <div className="model-config-item">
                            <label className="model-label">模型名称</label>
                            <input className="model-input"
                                type="text"
                                placeholder="如：stable-diffusion-xl"
                                value={customVision.modelName}
                                onChange={(e) => setCustomVision({ ...customVision, modelName: e.target.value })} />
                        </div>
                        <div className="model-config-item">
                            <label className="model-label">API Key</label>
                            <div className="model-key-wrap">
                                <input className="model-input"
                                    type={showVisionKey ? 'text' : 'password'}
                                    placeholder="输入您的 API Key"
                                    value={customVision.apiKey}
                                    onChange={(e) => setCustomVision({ ...customVision, apiKey: e.target.value })} />
                                <span className="model-key-toggle"
                                    onClick={() => setShowVisionKey(!showVisionKey)}>{showVisionKey ? '🙈' : '👁️'}</span>
                            </div>
                        </div>
                        <div className="model-hint">💡 自定义模型需兼容 OpenAI 图片生成接口格式</div>
                    </div>
                }
            </div>
            <div className="card model-card">
                <div className="card-title">🧠 视觉理解模型</div>
                <div className="tag-group">{
                    understandModels.map(m => {
                        const val = m.split(' ')[1];
                        return <span key={m}
                            className={`tag ${understandModel === val ? 'active' : ''}`}
                            onClick={() => setUnderstandModel(val)}>{m}</span>
                    })
                }
                </div>
                {understandModel === '自定义模型' &&
                    <div className="model-config">
                        <div className="model-config-item">
                            <label className="model-label">API 地址</label>
                            <input className="model-input"
                                type="text"
                                placeholder="https://api.example.com/v1/chat/completions"
                                value={customUnderstand.endpoint}
                                onChange={(e) => setCustomUnderstand({ ...customUnderstand, endpoint: e.target.value })} />
                        </div>
                        <div className="model-config-item">
                            <label className="model-label">模型名称</label>
                            <input className="model-input"
                                type="text"
                                placeholder="如：gpt-4o, qwen-vl-max"
                                value={customUnderstand.modelName}
                                onChange={(e) => setCustomUnderstand({ ...customUnderstand, modelName: e.target.value })} />
                        </div>
                        <div className="model-config-item">
                            <label className="model-label">API Key</label>
                            <div className="model-key-wrap">
                                <input className="model-input"
                                    type={showUnderstandKey ? 'text' : 'password'}
                                    placeholder="输入您的 API Key"
                                    value={customUnderstand.apiKey}
                                    onChange={(e) => setCustomUnderstand({ ...customUnderstand, apiKey: e.target.value })} />
                                <span className="model-key-toggle"
                                    onClick={() => setShowUnderstandKey(!showUnderstandKey)}>{showUnderstandKey ? '🙈' : '👁️'}</span>
                            </div>
                        </div>
                        <div className="model-hint">💡 用于识别衣物属性、搭配分析与身材理解</div>
                    </div>
                }
            </div>
            <div className="card">
                <div className="collapse-toggle"
                    style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px',
                        cursor: 'pointer', borderBottom: '1px solid var(--border-light)' }}
                    onClick={() => setCollapseOpen(!collapseOpen)}>
                    <span>⚙️ 高级筛选</span>
                    <span style={{ transform: collapseOpen ? 'rotate(180deg)' : 'none', transition: '0.3s',
                        color: 'var(--text-light)' }}>⌵</span>
                </div>
                <div style={{ maxHeight: collapseOpen ? 200 : 0, overflow: 'hidden', transition: 'max-height 0.4s ease',
                        padding: collapseOpen ? '6px 16px 14px' : '0 16px' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 4 }}>色系偏好</div>
                    <div className="tag-group"
                        style={{ padding: '0 0 8px' }}>{
                        tones.map(t => {
                            const val = t.split(' ')[1];
                            return <span key={t}
                                className={`tag ${settings.colorTone === val ? 'active' : ''}`}
                                onClick={() => setSettings({ ...settings, colorTone: settings.colorTone === val ? null :
                                        val })}>{t}</span>
                        })
                    }
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 4 }}>单品优先级</div>
                    <div className="tag-group"
                        style={{ padding: '0' }}>{
                        priorities.map(p => <span key={p}
                            className={`tag ${settings.priority === p ? 'active' : ''}`}
                            onClick={() => setSettings({ ...settings, priority: settings.priority === p ? null : p })}>
                            {p}</span>)
                    }
                    </div>
                </div>
            </div>
            <button className="btn-primary"
                onClick={onNext}
                style={{ marginTop: 'auto' }}>
                ✨ 生成今日穿搭方案
            </button>
            <div className="api-hint">
                <span>📡</span>
                <span><span className="method">POST</span>
                <span className="path">/v1/outfits/recommend</span></span>
                <span style={{ marginLeft: 'auto', color: 'var(--text-light)', fontSize: 10 }}>application/json
                </span>
            </div>
            <div className="status-tip">✅ 已为您扫描 1 件单品 · 档案已完善</div>
        </div>
    );
};
