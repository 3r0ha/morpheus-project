import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient.js';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthToggle } from '../components/auth/AuthToggle.jsx';
import { AuthInput } from '../components/auth/AuthInput.jsx';

export const TelegramConnectPage = () => {
  const [mode, setMode] = useState('login');
  const [formData, setFormData] = useState({ email: '', password: '', name: '', birthDate: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tg, setTg] = useState(null);

  useEffect(() => {
    if (window.Telegram && window.Telegram.WebApp) {
      const webApp = window.Telegram.WebApp;
      webApp.ready();
      webApp.expand();
      setTg(webApp);
      console.log("Telegram SDK инициализирован.");
    } else {
      console.error("SDK Telegram не найдено. Убедитесь, что приложение открыто в клиенте Telegram.");
      setError("Это приложение должно быть запущено внутри Telegram.");
    }
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (!tg || !tg.initData) {
      const errorMsg = 'Критическая ошибка: отсутствуют данные Telegram (initData).';
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
        tg.close();
      }, 2000);

    } catch (err) {
      const errorMessage = err.response?.data?.error || (err.response?.data?.errors ? err.response.data.errors[0].msg : 'Произошла неизвестная ошибка.');
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 font-body bg-background text-text-primary">
      {success ? (
        <p className="text-green-400 text-2xl font-bold">{success}</p>
      ) : (
        <div className="w-full max-w-xl bg-black/20 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl">
            <div className="p-8 md:p-12">
                <AuthToggle isLogin={mode === 'login'} setIsLogin={(isLogin) => setMode(isLogin ? 'login' : 'register')} />

                <motion.h2
                    key={mode}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="font-headings text-4xl font-bold text-center text-white mb-10"
                >
                    {mode === 'login' ? 'Связь с аккаунтом' : 'Создание аккаунта'}
                </motion.h2>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <AnimatePresence>
                        {mode === 'register' && (
                        <AuthInput
                            name="name"
                            placeholder="Ваше имя"
                            value={formData.name}
                            onChange={handleInputChange}
                            disabled={isLoading}
                        />
                        )}
                    </AnimatePresence>

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

                    <AnimatePresence>
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
                    </AnimatePresence>
                    
                    {error && <p className="text-red-400 text-center text-sm">{error}</p>}

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-accent-ai text-white font-bold py-4 px-6 rounded-lg text-lg
                                     transition-all duration-300 ease-in-out
                                     hover:bg-white hover:text-accent-ai hover:shadow-lg hover:shadow-accent-ai/30
                                     transform hover:-translate-y-1 disabled:opacity-50"
                        >
                            {isLoading ? 'Загрузка...' : (mode === 'login' ? 'Войти и связать' : 'Создать и связать')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};