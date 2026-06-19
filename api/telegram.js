import { getFile, saveFile } from './_git-helper.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(455).send('Метод не поддерживается');
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const PROXY_URL = process.env.TELEGRAM_API_PROXY_URL;

  if (!BOT_TOKEN) {
    return res.status(500).send('Токен бота не настроен');
  }

  const update = req.body;
  
  if (!update || !update.message) {
    // Возвращаем 200 Telegram, чтобы он не слал это обновление повторно
    return res.status(200).send('No message');
  }

  const message = update.message;
  const text = message.text ? message.text.trim() : '';
  const chatId = message.chat.id;
  const username = message.from.username || '';
  const firstName = message.from.first_name || '';

  const baseUrl = PROXY_URL ? PROXY_URL.replace(/\/$/, '') : 'https://api.telegram.org';
  const sendUrl = `${baseUrl}/bot${BOT_TOKEN}/sendMessage`;

  const sendTelegramMessage = async (msgText) => {
    try {
      await fetch(sendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: msgText,
          parse_mode: 'Markdown'
        })
      });
    } catch (e) {
      console.error('Ошибка отправки ответа в Telegram:', e.message);
    }
  };

  try {
    if (text === '/stolovaya062026' || text === '/sotolovaya062026') {
      const { content } = await getFile('admins.json');
      const admins = JSON.parse(content || '[]');
      
      const exists = admins.some(admin => admin.chatId === chatId);

      if (!exists) {
        admins.push({
          chatId,
          username,
          firstName,
          registeredAt: new Date().toISOString()
        });
        
        // Сохраняем обратно на локальный диск или в GitHub репозиторий
        await saveFile('admins.json', JSON.stringify(admins, null, 2), `Register admin @${username} via bot`);
        
        await sendTelegramMessage(
          `🎉 *Вы успешно зарегистрированы в качестве администратора!*\n` +
          `Теперь вы будете получать уведомления о новых заявках с сайта столовой «Котлетка с пюрешкой».`
        );
        console.log(`Зарегистрирован новый администратор: @${username} (ID: ${chatId})`);
      } else {
        await sendTelegramMessage(`ℹ️ Вы уже зарегистрированы как администратор уведомлений.`);
      }
    } else if (text === '/start') {
      await sendTelegramMessage(
        `👋 Приветствую! Это бот уведомлений для столовой «Котлетка с пюрешкой» (г. Санкт-Петербург, пос. Шушары).\n\n` +
        `Чтобы зарегистрироваться в качестве администратора и получать заявки с сайта, отправьте команду:\n` +
        `/stolovaya062026`
      );
    }
    
    return res.status(200).send('OK');
  } catch (error) {
    console.error('Ошибка вебхука Telegram:', error.message);
    return res.status(500).send(`Error: ${error.message}`);
  }
}
