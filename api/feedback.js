import { getFile } from './_git-helper.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(455).json({ error: 'Метод не поддерживается' });
  }

  const { name, phone, message } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ success: false, error: 'Пожалуйста, заполните поля Имя и Телефон.' });
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const PROXY_URL = process.env.TELEGRAM_API_PROXY_URL;

  if (!BOT_TOKEN) {
    return res.status(500).json({ 
      success: false, 
      error: 'Ошибка конфигурации сервера: токен бота Telegram не настроен.' 
    });
  }

  try {
    // Читаем список администраторов
    const { content } = await getFile('admins.json');
    const admins = JSON.parse(content || '[]');

    if (admins.length === 0) {
      return res.status(200).json({
        success: true,
        warning: 'Заявка принята, но в боте нет зарегистрированных администраторов. Отправьте команду /stolovaya062026 боту.'
      });
    }

    const escapeHtml = (str) => {
      return (str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    };

    const text = `🍽 <b>Новая заявка с сайта «Столовая Шушары»!</b>\n\n` +
                 `👤 <b>Имя:</b> ${escapeHtml(name)}\n` +
                 `📞 <b>Телефон:</b> <code>${escapeHtml(phone)}</code>\n` +
                 `💬 <b>Сообщение:</b> ${escapeHtml(message || '—')}\n\n` +
                 `📅 <b>Время:</b> ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} (МСК)`;

    const baseUrl = PROXY_URL ? PROXY_URL.replace(/\/$/, '') : 'https://api.telegram.org';
    const url = `${baseUrl}/bot${BOT_TOKEN}/sendMessage`;

    let sentCount = 0;
    for (const admin of admins) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: admin.chatId,
            text: text,
            parse_mode: 'HTML'
          })
        });
        if (response.ok) sentCount++;
      } catch (err) {
        console.error(`Ошибка при отправке админу ${admin.chatId}:`, err.message);
      }
    }

    return res.status(200).json({ success: true, sentAdmins: sentCount });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: 'Ошибка при отправке заявки в Telegram', 
      details: error.message 
    });
  }
}
