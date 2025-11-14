import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient.js';
import { AuthToggle } from '../components/auth/AuthToggle.jsx';
import { AuthInput } from '../components/auth/AuthInput.jsx';

export const TelegramConnectPage = () => {
  const [mode, setMode] = useState('login');
  const [formData, setFormData] = useState({ email: '', password: '', name: '', birthDate: '' });
  const [isAgreed, setIsAgreed] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tg, setTg] = useState(null);
  const [appHeight, setAppHeight] = useState('100vh');

  useEffect(() => {
    const timer = setTimeout(() => {
      if (window.Telegram && window.Telegram.WebApp) {
        const webApp = window.Telegram.WebApp;
        webApp.ready();
        webApp.expand();
        setTg(webApp);

        const setViewportHeight = () => {
          if (webApp.viewportHeight) {
            setAppHeight(`${webApp.viewportHeight}px`);
          }
        };

        setViewportHeight();
        webApp.onEvent('viewportChanged', setViewportHeight);
        
        console.log("Telegram SDK инициализирован.");

        return () => {
          webApp.offEvent('viewportChanged', setViewportHeight);
        };
      } else {
        console.error("SDK Telegram не найдено. Убедитесь, что приложение открыто в клиенте Telegram.");
        setError("Это приложение должно быть запущено внутри Telegram.");
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (mode === 'register' && !isAgreed) {
        setError('Для регистрации необходимо принять условия соглашения.');
        return;
    }

    setIsLoading(true);

    if (!tg || !tg.initData) {
      const errorMsg = 'Критическая ошибка: отсутствуют данные Telegram (initData). Пожалуйста, перезапустите Web App.';
      setError(errorMsg);
      setIsLoading(false);
      return;
    }

    try {
      if (mode === 'login') {
        const loginResponse = await apiClient.post('/auth/login', {
          email: formData.email,
          password: formData.password,
        });
        localStorage.setItem('authToken', loginResponse.data.token);
        
        await apiClient.post('/auth/link-telegram', {
          telegramInitData: tg.initData
        });
      } else {
        const registerResponse = await apiClient.post('/auth/register', {
          ...formData,
          telegramInitData: tg.initData,
        });
        localStorage.setItem('authToken', registerResponse.data.token);
      }
      
      await apiClient.post('/telegram/auth-success', {
          telegramInitData: tg.initData
      });

      setSuccess('Успешно! Возвращайтесь в чат.');
      
      setTimeout(() => {
        if (tg) {
          tg.close();
        }
      }, 2000);

    } catch (err) {
      const errorMessage = err.response?.data?.error || (err.response?.data?.errors ? err.response.data.errors[0].msg : 'Произошла неизвестная ошибка.');
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="flex flex-col items-center justify-start p-4 font-body bg-background text-text-primary overflow-y-auto"
      style={{ height: appHeight }} 
    >
      {success ? (
        <p className="text-green-400 text-2xl font-bold my-auto">{success}</p>
      ) : (
        <div className="w-full max-w-xl my-auto"> 
            <div className="bg-black/20 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl">
                <div className="p-8 md:p-12">
                    <AuthToggle isLogin={mode === 'login'} setIsLogin={(isLogin) => setMode(isLogin ? 'login' : 'register')} />

                    <h2 key={mode} className="font-headings text-4xl font-bold text-center text-white mb-10">
                        {mode === 'login' ? 'Связь с аккаунтом' : 'Создание аккаунта'}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {mode === 'register' && (
                          <AuthInput
                              name="name"
                              placeholder="Ваше имя"
                              value={formData.name}
                              onChange={handleInputChange}
                              disabled={isLoading}
                          />
                        )}

                        <AuthInput
                            name="email"
                            type="text"
                            inputMode="email"
                            placeholder="Email или телефон" 
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                            disabled={isLoading}
                        />

                        <AuthInput
                            name="password"
                            type="password"
                            placeholder="Пароль"
                            value={formData.password}
                            onChange={handleInputChange}
                            required
                            disabled={isLoading}
                        />

                        {mode === 'register' && (
                          <AuthInput
                              name="birthDate"
                              type="date"
                              placeholder="Дата рождения"
                              value={formData.birthDate}
                              onChange={handleInputChange}
                              disabled={isLoading}
                          />
                        )}
                        
                        {mode === 'register' && (
                            <div className="flex items-start space-x-3 pt-2 text-sm">
                                <input
                                    type="checkbox"
                                    id="agreement"
                                    checked={isAgreed}
                                    onChange={(e) => setIsAgreed(e.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-white/30 bg-transparent text-accent-ai focus:ring-accent-ai focus:ring-offset-background"
                                />
                                <label htmlFor="agreement" className="text-text-secondary">
                                    Я принимаю условия{' '}
                                    <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-accent-ai hover:underline">
                                        Пользовательского соглашения
                                    </a>{' '}
                                    и даю согласие на обработку персональных данных в соответствии с{' '}
                                    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-accent-ai hover:underline">
                                        Политикой
                                    </a>.
                                </label>
                            </div>
                        )}

                        {error && <p className="text-red-400 text-center text-sm">{error}</p>}

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isLoading || (mode === 'register' && !isAgreed)}
                                className="w-full bg-accent-ai text-white font-bold py-4 px-6 rounded-lg text-lg
                                        transition-all duration-300 ease-in-out
                                        hover:bg-white hover:text-accent-ai hover:shadow-lg hover:shadow-accent-ai/30
                                        transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Загрузка...' : (mode === 'login' ? 'Войти и связать' : 'Создать и связать')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};