import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, FolderKanban, Link2, Lock, ShieldCheck } from 'lucide-react';
import { api, ApiError } from '../api/client';
import type { UserProfile } from '../types';

interface AuthScreenProps {
  onAuthenticated: (user: UserProfile) => void;
}

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const switchMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'register' && displayName.trim().length < 2) {
      setError('Vui lòng nhập tên hiển thị (tối thiểu 2 ký tự).');
      return;
    }
    if (!email.trim()) {
      setError('Vui lòng nhập địa chỉ email.');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu cần có ít nhất 6 ký tự.');
      return;
    }

    setSubmitting(true);
    try {
      const res =
        mode === 'login'
          ? await api.login({ email: email.trim(), password })
          : await api.register({
              displayName: displayName.trim(),
              email: email.trim(),
              password,
            });
      onAuthenticated(res.user);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Không thể kết nối máy chủ. Vui lòng thử lại.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setError(null);
    setMode('login');
    setEmail(demoEmail);
    setPassword('WorkLink@2026');
    setSubmitting(true);
    try {
      const res = await api.login({
        email: demoEmail,
        password: 'WorkLink@2026',
      });
      onAuthenticated(res.user);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Không thể đăng nhập tài khoản mẫu.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="h-16 px-6 lg:px-10 border-b border-slate-200 bg-white flex items-center justify-between gap-8">
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
            <Link2 className="w-4 h-4" aria-hidden="true" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Sổ Link
          </span>
        </div>
        <div className="text-sm text-slate-500 whitespace-nowrap shrink-0">
          Không gian lưu trữ đường dẫn làm việc
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10 lg:py-16">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          <section className="lg:col-span-6 flex flex-col justify-between py-2">
            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-blue-600">
                  Kho liên kết cá nhân
                </p>
                <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 text-balance leading-tight">
                  Lưu gọn mọi đường dẫn công việc, tách biệt theo từng tài khoản
                </h1>
                <p className="text-base text-slate-600 leading-relaxed max-w-xl">
                  Tập trung tài liệu dự án, bảng thiết kế, hệ thống nội bộ và công cụ hằng ngày vào một nơi duy nhất. Đăng nhập để đồng bộ thư mục và liên kết riêng của bạn.
                </p>
              </div>

              <div className="border-t border-slate-200 pt-6 space-y-5">
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 text-slate-700">
                    <Lock className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                      Dữ liệu riêng tư cho từng tài khoản
                    </h2>
                    <p className="text-sm text-slate-600 mt-0.5">
                      Mỗi tài khoản sở hữu kho liên kết, thư mục và ghi chú hoàn toàn độc lập.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 text-slate-700">
                    <FolderKanban className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                      Phân loại theo thư mục, ghim & tìm kiếm tức thì
                    </h2>
                    <p className="text-sm text-slate-600 mt-0.5">
                      Lọc nhanh theo thư mục, thẻ từ khóa hoặc các liên kết quan trọng đã ghim.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 text-slate-700">
                    <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                      Kiểm tra định dạng URL an toàn
                    </h2>
                    <p className="text-sm text-slate-600 mt-0.5">
                      Tự động chuẩn hóa đường dẫn https:// và chặn các liên kết không hợp lệ.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200">
              <p className="text-xs font-medium text-slate-500 mb-3">
                Hoặc trải nghiệm nhanh với tài khoản mẫu có sẵn dữ liệu:
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleDemoLogin('minh.nguyen@work.vn')}
                  disabled={submitting}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                >
                  Dùng thử: Minh Nguyễn
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoLogin('linh.tran@design.vn')}
                  disabled={submitting}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                >
                  Dùng thử: Linh Trần
                </button>
              </div>
            </div>
          </section>

          <section className="lg:col-span-6 flex items-center">
            <div className="w-full bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs">
              <div
                role="tablist"
                aria-label="Chọn hình thức xác thực"
                className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg mb-6"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'login'}
                  onClick={() => switchMode('login')}
                  className={`py-2 px-4 text-sm font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    mode === 'login'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'register'}
                  onClick={() => switchMode('register')}
                  className={`py-2 px-4 text-sm font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    mode === 'register'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tạo tài khoản
                </button>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900">
                  {mode === 'login'
                    ? 'Đăng nhập vào kho liên kết'
                    : 'Đăng ký tài khoản mới'}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {mode === 'login'
                    ? 'Nhập email và mật khẩu để truy cập các link làm việc của bạn.'
                    : 'Tạo không gian lưu trữ riêng chỉ với vài giây.'}
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700"
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {mode === 'register' && (
                  <div>
                    <label
                      htmlFor="auth-display-name"
                      className="block text-sm font-medium text-slate-700 mb-1.5"
                    >
                      Tên hiển thị
                    </label>
                    <input
                      id="auth-display-name"
                      type="text"
                      autoComplete="name"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Ví dụ: Nguyễn Minh"
                      className="w-full h-11 px-3.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="auth-email"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Email công việc
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ten.ban@congty.vn"
                    className="w-full h-11 px-3.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="auth-password"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={
                        mode === 'login' ? 'current-password' : 'new-password'
                      }
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Tối thiểu 6 ký tự"
                      className="w-full h-11 pl-3.5 pr-11 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 mt-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
                >
                  {submitting
                    ? 'Đang xử lý...'
                    : mode === 'login'
                      ? 'Đăng nhập'
                      : 'Tạo tài khoản & bắt đầu'}
                </button>
              </form>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
