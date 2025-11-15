import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '@/context/AuthContext'; 
import { loginUser, registerUser } from '@/services/apiClient';
import { AuthToggle } from './AuthToggle';
import { AuthInput } from './AuthInput';
import { AuthMethodToggle } from './AuthMethodToggle';
import OtpInput from './OtpInput';

const isValidIdentifier = (identifier) => {
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
  const isPhone = /^\+7\d{10}$/.test(identifier);
  return isEmail || isPhone;
};

const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState('email');
  const [formData, setFormData] = useState({ name: '', email: '', password: '', birthDate: '' });
  const [isAgreed, setIsAgreed] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [registrationStep, setRegistrationStep] = useState(1);
  const [otp, setOtp] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  
  const handleIdentifierChange = (e) => {
    let { value } = e.target;
    if ((!isLogin && authMethod === 'phone') || (isLogin && /^[78]/.test(value))) {
        const numbers = value.replace(/\D/g, '');
        if (numbers.startsWith('8')) {
            value = '+7' + numbers.slice(1);
        } else if (numbers.startsWith('7')) {
            value = '+7' + numbers.slice(1);
        } else if (numbers) {
            value = '+' + numbers;
        } else {
            value = '';
        }
        value = value.slice(0, 12);
    }
    setFormData({ ...formData, email: value });
  };

  const handleFinalSubmit = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await registerUser(formData);
      toast.success('Аккаунт успешно создан!');
      login(response.data.token);
      navigate('/app');
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Произошла ошибка при регистрации.';
      setError(errorMessage);
      toast.error(errorMessage);
      setRegistrationStep(1);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isLogin) { 
      setIsLoading(true);
      try {
        const response = await loginUser({ email: formData.email, password: formData.password });
        toast.success('С возвращением!');
        login(response.data.token);
        navigate('/app');
      } catch (err) {
        const errorMessage = err.response?.data?.error || 'Неверный логин или пароль.';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (registrationStep === 1) {
      if (!isAgreed) {
        toast.error('Необходимо принять условия соглашения.');
        return;
      }
      if (!isValidIdentifier(formData.email)) {
        toast.error('Пожалуйста, введите корректный email или номер телефона.');
        return;
      }
      toast.success(`Код (условно) отправлен на ${formData.email}`);
      setRegistrationStep(2);
    }
  };

  let identifierInputProps;
  if (isLogin) {
    identifierInputProps = { placeholder: 'Email или телефон', type: 'text', inputMode: 'text' };
  } else {
    identifierInputProps = authMethod === 'email' 
      ? { placeholder: 'Email', type: 'email', inputMode: 'email' }
      : { placeholder: '+7 (999) 999-99-99', type: 'tel', inputMode: 'tel' };
  }

  return (
    <div className="w-full max-w-xl bg-black/20 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl">
      <div className="p-8 md:p-12">
        <AuthToggle isLogin={isLogin} setIsLogin={(val) => { setIsLogin(val); setRegistrationStep(1); }} />

        <motion.h2
          key={isLogin ? 'login-title' : 'register-title'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="font-headings text-5xl font-bold text-center text-white mb-6" 
        >
          {isLogin ? 'С возвращением' : 'Присоединяйтесь'}
        </motion.h2>

        {!isLogin && registrationStep === 1 && <AuthMethodToggle method={authMethod} setMethod={setAuthMethod} />}

        <form onSubmit={handleSubmit} className="mt-8">
          <AnimatePresence mode="wait">
            {isLogin || registrationStep === 1 ? (
              <motion.div
                key="details-step"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ duration: 0.5 }}
                className="space-y-8"
              >
                {!isLogin && (
                  <AuthInput
                    name="name"
                    placeholder="Ваше имя"
                    value={formData.name}
                    onChange={handleInputChange}
                    key="name-input"
                  />
                )}
                
                <AuthInput
                  name="email"
                  value={formData.email}
                  onChange={handleIdentifierChange}
                  required
                  key={isLogin ? 'login-id' : `register-${authMethod}`}
                  {...identifierInputProps}
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

                {!isLogin && (
                  <motion.div 
                    key="agreement-checkbox"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex items-start space-x-3 pt-2"
                  >
                    <input
                      type="checkbox"
                      id="agreement"
                      checked={isAgreed}
                      onChange={(e) => setIsAgreed(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-white/30 bg-transparent text-accent-ai focus:ring-accent-ai focus:ring-offset-background"
                    />
                    <label htmlFor="agreement" className="text-text-secondary text-sm">
                      Я принимаю условия{' '}
                      <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-accent-ai hover:underline">
                        Пользовательского соглашения
                      </Link>{' '}
                      и даю согласие на обработку персональных данных в соответствии с{' '}
                      <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-accent-ai hover:underline">
                        Политикой
                      </Link>.
                    </label>
                  </motion.div>
                )}
                
                {error && <p className="text-red-400 text-center text-sm pt-4">{error}</p>}

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-accent-ai text-white font-bold py-4 px-6 rounded-lg text-lg transition-all duration-300 ease-in-out hover:bg-white hover:text-accent-ai transform hover:-translate-y-1 disabled:opacity-50"
                  >
                    {isLogin ? 'Войти' : 'Получить код'}
                  </button>
                </div>
              </motion.div>
            ) : (
              <OtpInput
                otp={otp}
                setOtp={setOtp}
                onConfirm={handleFinalSubmit}
                isLoading={isLoading}
              />
            )}
          </AnimatePresence>
        </form>
      </div>
    </div>
  );
};

export default AuthForm;