import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Импорт хэндлеров для локальной эмуляции Serverless API
import feedbackHandler from './api/feedback.js';
import botStatusHandler from './api/bot-status.js';
import telegramHandler from './api/telegram.js';
import saveContentHandler from './api/save-content.js';

// Загрузка переменных окружения
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PROXY_URL = process.env.TELEGRAM_API_PROXY_URL;
const ADMINS_FILE = path.join(__dirname, 'admins.json');

// Middleware
app.use(express.json({ limit: '50mb' })); // Увеличиваем лимит для base64 изображений
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Маппинг роутов на Serverless функции (идентично Vercel)
app.post('/api/feedback', feedbackHandler);
app.get('/api/bot-status', botStatusHandler);
app.post('/api/telegram', telegramHandler);
app.post('/api/save-content', saveContentHandler);

// Помощник для отправки запросов к Telegram API (для лонг-пулинга локально)
async function callTelegram(method, body = {}) {
  const baseUrl = PROXY_URL ? PROXY_URL.replace(/\/$/, '') : 'https://api.telegram.org';
  const url = `${baseUrl}/bot${BOT_TOKEN}/${method}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Telegram API responded with ${response.status}: ${errText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Ошибка при вызове метода Telegram ${method}:`, error.message);
    return null;
  }
}

// Фоновый процесс для лонг-пулинга обновлений Telegram (только локально для отладки)
let updateOffset = 0;

async function pollTelegramUpdates() {
  if (!BOT_TOKEN) return;

  try {
    const updates = await callTelegram('getUpdates', {
      offset: updateOffset,
      timeout: 10
    });

    if (updates && updates.ok && updates.result.length > 0) {
      for (const update of updates.result) {
        updateOffset = update.update_id + 1;
        
        // Симулируем webhook-запрос, вызывая локальный обработчик
        const mockReq = {
          method: 'POST',
          body: update
        };
        const mockRes = {
          status: (code) => ({
            send: (msg) => {},
            json: (obj) => {}
          })
        };
        
        await telegramHandler(mockReq, mockRes);
      }
    }
  } catch (error) {
    console.error('Ошибка в цикле лонг-пулинга:', error.message);
  }

  setTimeout(pollTelegramUpdates, 1000);
}

// Запуск сервера
app.listen(PORT, async () => {
  console.log(`==================================================`);
  console.log(`Локальный сервер столовой успешно запущен!`);
  console.log(`Адрес сайта: http://localhost:${PORT}`);
  console.log(`Админка: http://localhost:${PORT}/admin.html`);
  console.log(`==================================================`);
  
  // Инициализируем файл admins.json если его нет
  if (!fs.existsSync(ADMINS_FILE)) {
    fs.writeFileSync(ADMINS_FILE, '[]', 'utf8');
  }
  if (!fs.existsSync(path.join(__dirname, 'public', 'data.json'))) {
    console.warn('ВНИМАНИЕ: Файл public/data.json отсутствует!');
  }
  
  // Локальный лонг-пулинг запускается только при явном указании переменной окружения
  if (BOT_TOKEN && process.env.LOCAL_POLLING === 'true') {
    console.log('Сброс вебхука Telegram для работы локального лонг-пулинга...');
    await callTelegram('deleteWebhook', { drop_pending_updates: true });
    pollTelegramUpdates();
  } else if (BOT_TOKEN) {
    console.log('Локальный лонг-пулинг отключен. Чтобы включить, задайте LOCAL_POLLING=true в файле .env');
  }
});
