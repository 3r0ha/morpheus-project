import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/context/AuthContext'; 
import { loginUser, registerUser } from '@/services/apiClient';
import { AuthToggle } from './AuthToggle';
import { AuthInput } from './AuthInput';

const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', birthDate: '' });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      let response;
      if (isLogin) {
        response = await loginUser({ email: formData.email, password: formData.password });
        toast.success('С возвращением!');
      } else {
        response = await registerUser(formData);
        toast.success('Аккаунт успешно создан!');
      }
      
      login(response.data.token);

      navigate('/app');

    } catch (err) {
      const errorMessage = err.response?.data?.error || (err.response?.data?.errors ? err.response.data.errors[0].msg : 'Произошла неизвестная ошибка.');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl bg-black/20 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl">
      <div className="p-8 md:p-12">
        <AuthToggle isLogin={isLogin} setIsLogin={setIsLogin} />

        <motion.h2
          key={isLogin ? 'login-title' : 'register-title'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="font-headings text-5xl font-bold text-center text-white mb-10" 
        >
          {isLogin ? 'С возвращением' : 'Присоединяйтесь'}
        </motion.h2>

        <form onSubmit={handleSubmit} className="space-y-8">
          <AnimatePresence>
            {!isLogin && (
              <AuthInput
                name="name"
                placeholder="Ваше имя"
                value={formData.name}
                onChange={handleInputChange}
                key="name-input"
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
            key="identifier-input"
          />

          <AuthInput
            name="password"
            type="password"
            placeholder="Пароль"
            value={formData.password}
            onChange={handleInputChange}
            required
            key="password-input"
          />

          <AnimatePresence>
            {!isLogin && (
              <AuthInput
                name="birthDate"
                type="date"
                placeholder="Дата рождения"
                value={formData.birthDate}
                onChange={handleInputChange}
                key="birthdate-input"
              />
            )}
          </AnimatePresence>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-accent-ai text-white font-bold py-4 px-6 rounded-lg text-lg
                         transition-all duration-300 ease-in-out
                         hover:bg-white hover:text-accent-ai hover:shadow-lg hover:shadow-accent-ai/30
                         transform hover:-translate-y-1 disabled:opacity-50"
            >
              {isLoading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Создать аккаунт')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthForm;