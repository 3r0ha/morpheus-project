import React from 'react';
import { motion } from 'framer-motion';
import { AccordionItem } from '@/components/common/AccordionItem';
import { Header } from '@/components/app/Header';

const AboutPage = () => {
  return (
    <div className="h-screen w-screen flex flex-col font-body bg-background text-text-primary">
      <Header />
      <main className="flex-1 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto py-12 px-8"
        >
          <h1 className="font-headings text-4xl md:text-5xl font-bold mb-6">О проекте "Морфеус"</h1>
          <div className="space-y-6 text-text-secondary text-lg leading-relaxed mb-16">
            <p>
              "Морфеус" — это ваш личный проводник в мир подсознания, использующий мощь передовых нейронных сетей для глубокого и персонализированного анализа сновидений.
            </p>
            <p>
              Мы верим, что сны — это ключ к пониманию себя. Наша миссия — предоставить вам инструмент, который поможет расшифровать сложные сообщения, которые ваш мозг посылает вам каждую ночь.
            </p>
            <p>
              В отличие от традиционных сонников с их устаревшими и обобщенными трактовками, наш ИИ-анализатор учитывает ваш уникальный жизненный контекст, чтобы предоставить инсайты, которые действительно имеют значение для вас.
            </p>
          </div>

          <div className="mt-12">
            <h2 className="font-headings text-3xl font-bold mb-6">Юридическая информация</h2>
            <div className="bg-surface-2 rounded-lg p-4 border border-border-color">
                <AccordionItem title="Пользовательское соглашение">
                    <p>1.1. Настоящее Пользовательское соглашение регулирует отношения между Сервисом "Морфеус" и Пользователем по использованию функционала Сервиса.</p>
                    <p>1.2. Используя Сервис, Пользователь подтверждает, что ознакомился и полностью согласен с условиями настоящего Соглашения.</p>
                </AccordionItem>
                <AccordionItem title="Политика обработки персональных данных">
                    <p>2.1. Мы собираем и обрабатываем только те персональные данные, которые необходимы для предоставления качественного сервиса.</p>
                    <p>2.2. Мы не передаем ваши персональные данные третьим лицам без вашего явного согласия, за исключением случаев, предусмотренных законодательством.</p>
                </AccordionItem>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default AboutPage;