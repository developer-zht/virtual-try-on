// =====================================================
// 页面组件: Tag 1 - 欢迎页（含注册/登录弹窗）
// =====================================================
window.PageWelcome = function PageWelcome({ onNext }) {
    const [showAuth, setShowAuth] = useState(false);
    const [authMode, setAuthMode] = useState('register'); // register | login
    const [loginType, setLoginType] = useState('account'); // account | phone
    const [phone, setPhone] = useState('');
    const [verifyCode, setVerifyCode] = useState('');
    const [account, setAccount] = useState('');
    const [password, setPassword] = useState('');
    const [agree, setAgree] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [toastMsg, setToastMsg] = useState(null);

    // 验证码倒计时
    useEffect(() => {
        if (countdown > 0) {
            const t = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(t);
        }
    }, [countdown]);

    const sendCode = () => {
        if (!/^1\d{10}$/.test(phone)) {
            setToastMsg('⚠️ 请输入有效的手机号');
            setTimeout(() => setToastMsg(null), 2000);
            return;
        }
        setCountdown(60);
        setToastMsg('✅ 验证码已发送');
        setTimeout(() => setToastMsg(null), 2000);
    };

    // 预设账号（前端原型演示用）
    const presetAccounts = [
        { account: 'admin', password: 'admin123', role: '管理员' }
    ];

    const handleAuth = () => {
        if (!agree) {
            setToastMsg('⚠️ 请先同意用户协议与隐私政策');
            setTimeout(() => setToastMsg(null), 2000);
            return;
        }
        if (loginType === 'phone') {
            if (!phone || !verifyCode) {
                setToastMsg('⚠️ 请输入手机号和验证码');
                setTimeout(() => setToastMsg(null), 2000);
                return;
            }
        } else {
            if (!account || !password) {
                setToastMsg('⚠️ 请输入账号和密码');
                setTimeout(() => setToastMsg(null), 2000);
                return;
            }
            // 登录模式：校验预设账号
            if (authMode === 'login') {
                const matched = presetAccounts.find(a => a.account === account && a.password === password);
                if (!matched) {
                    setToastMsg('⚠️ 账号或密码错误，请重试');
                    setTimeout(() => setToastMsg(null), 2000);
                    return;
                }
                setToastMsg(`🎉 ${matched.role}登录成功，欢迎回来！`);
                setTimeout(() => {
                    setToastMsg(null);
                    setShowAuth(false);
                    onNext();
                }, 1200);
                return;
            }
            // 注册模式：检查账号是否已存在
            if (presetAccounts.some(a => a.account === account)) {
                setToastMsg('⚠️ 该账号已被注册');
                setTimeout(() => setToastMsg(null), 2000);
                return;
            }
        }
        setToastMsg(authMode === 'register' ? '🎉 注册成功，欢迎加入！' : '🎉 登录成功');
        setTimeout(() => {
            setToastMsg(null);
            setShowAuth(false);
            onNext();
        }, 1200);
    };

    const socialLogin = (provider) => {
        setToastMsg(`🔗 正在跳转 ${provider} 授权...`);
        setTimeout(() => {
            setToastMsg(`🎉 ${provider} 登录成功`);
            setTimeout(() => {
                setToastMsg(null);
                setShowAuth(false);
                onNext();
            }, 1000);
        }, 800);
    };

    return (
        <div className="page-slot"
            style={{ justifyContent: 'center', alignItems: 'center', background: '#fff' }}>
            <div style={{ width: '100%', maxWidth: 320, margin: '0 auto', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', height: '100%', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', top: 20, left: 20, right: 20, display: 'flex',
                        justifyContent: 'space-between', alignItems: 'center', width: 'calc(100% - 40px)' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#E8E8E8', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#999' }}>👤</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}
                        onClick={() => { setAuthMode('login'); setShowAuth(true); }}>注册 / 登录</div>
                </div>
                <div className="welcome-illustration">🧥</div>
                <div className="welcome-title">告别 "今天穿什么"<br />的烦恼</div>
                <div className="welcome-sub">
                    VestiCore 读懂你的衣柜。<br />
                    结合天气与场合，从你已有的衣服里，推荐最合适的那一套。
                </div>
                <button className="btn-primary"
                    onClick={() => { setAuthMode('register'); setShowAuth(true); }}
                    style={{ maxWidth: 280 }}>
                    🚀 开始探索我的衣橱
                </button>
                <div style={{ fontSize: 10, color: '#DFE6E9', marginTop: 14, textAlign: 'center' }}>
                    登录即代表同意《用户协议》和《隐私政策》
                </div>
            </div>

            {/* 注册/登录弹窗 */}
            {showAuth &&
                <div className="auth-overlay"
                    onClick={() => setShowAuth(false)}>
                    <div className="auth-sheet"
                        onClick={(e) => e.stopPropagation()}>
                        <div className="auth-handle"></div>
                        {/* 顶部装饰 */}
                        <div className="auth-header">
                            <div className="auth-logo">🧥</div>
                            <div className="auth-brand">VestiCore</div>
                            <div className="auth-slogan">懂你的衣柜，懂你的穿搭</div>
                        </div>
                        {/* 模式切换 */}
                        <div className="auth-tabs">
                            <span className={`auth-tab ${authMode === 'register' ? 'active' : ''}`}
                                onClick={() => setAuthMode('register')}>注册</span>
                            <span className={`auth-tab ${authMode === 'login' ? 'active' : ''}`}
                                onClick={() => setAuthMode('login')}>登录</span>
                        </div>
                        {/* 登录方式切换 */}
                        <div className="auth-type-switch">
                            <span className={`auth-type ${loginType === 'account' ? 'active' : ''}`}
                                onClick={() => setLoginType('account')}>账号密码</span>
                            <span className={`auth-type ${loginType === 'phone' ? 'active' : ''}`}
                                onClick={() => setLoginType('phone')}>手机号</span>
                        </div>
                        {/* 表单 */}
                        <div className="auth-form">
                            {loginType === 'phone' ?
                                <>
                                    <div className="auth-input-wrap">
                                        <span className="auth-input-icon">📱</span>
                                        <input className="auth-input"
                                            type="tel"
                                            maxLength="11"
                                            placeholder="请输入手机号"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} />
                                    </div>
                                    <div className="auth-input-wrap">
                                        <span className="auth-input-icon">🔑</span>
                                        <input className="auth-input"
                                            type="text"
                                            maxLength="6"
                                            placeholder="请输入验证码"
                                            value={verifyCode}
                                            onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))} />
                                        <button className="auth-code-btn"
                                            disabled={countdown > 0}
                                            onClick={sendCode}>
                                            {countdown > 0 ? `${countdown}s` : '获取验证码'}
                                        </button>
                                    </div>
                                </>
                                :
                                <>
                                    <div className="auth-input-wrap">
                                        <span className="auth-input-icon">👤</span>
                                        <input className="auth-input"
                                            type="text"
                                            placeholder="账号 / 邮箱"
                                            value={account}
                                            onChange={(e) => setAccount(e.target.value)} />
                                    </div>
                                    <div className="auth-input-wrap">
                                        <span className="auth-input-icon">🔒</span>
                                        <input className="auth-input"
                                            type="password"
                                            placeholder="密码（6-20位）"
                                            maxLength="20"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)} />
                                    </div>
                                </>
                            }
                            <div className="auth-agree"
                                onClick={() => setAgree(!agree)}>
                                <span className={`auth-check ${agree ? 'checked' : ''}`}>{agree ? '✓' : ''}</span>
                                <span style={{ fontSize: 12, color: 'var(--text-gray)' }}>
                                    我已阅读并同意 <span style={{ color: 'var(--primary)' }}>《用户协议》</span> 和 <span style={{ color: 'var(--primary)' }}>《隐私政策》</span>
                                </span>
                            </div>
                            <button className="auth-submit-btn"
                                onClick={handleAuth}>
                                {authMode === 'register' ? '✨ 立即注册' : '🎉 立即登录'}
                            </button>
                        </div>
                        {/* 第三方登录 */}
                        <div className="auth-social">
                            <div className="auth-social-line">
                                <span></span>
                                <span style={{ fontSize: 11, color: 'var(--text-light)', padding: '0 12px' }}>其他方式登录</span>
                                <span></span>
                            </div>
                            <div className="auth-social-btns">
                                <div className="auth-social-btn wechat"
                                    onClick={() => socialLogin('微信')}>
                                    <span className="auth-social-icon">💬</span>
                                    <span className="auth-social-name">微信</span>
                                </div>
                                <div className="auth-social-btn weibo"
                                    onClick={() => socialLogin('微博')}>
                                    <span className="auth-social-icon">🐦</span>
                                    <span className="auth-social-name">微博</span>
                                </div>
                                <div className="auth-social-btn xhs"
                                    onClick={() => socialLogin('小红书')}>
                                    <span className="auth-social-icon">📕</span>
                                    <span className="auth-social-name">小红书</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            }
            {toastMsg && <div className="toast">{toastMsg}</div>}
        </div>
    );
};
