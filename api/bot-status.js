import { getFile } from './_git-helper.js';

export default async function handler(req, res) {
  // Добавляем заголовки CORS на всякий случай
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  
  try {
    const { content } = await getFile('admins.json');
    const admins = JSON.parse(content || '[]');
    
    return res.status(200).json({
      hasToken: !!BOT_TOKEN,
      proxyUsed: !!process.env.TELEGRAM_API_PROXY_URL,
      adminsCount: admins.length,
      adminsList: admins.map(a => a.username || a.firstName || a.chatId)
    });
  } catch (error) {
    return res.status(500).json({ 
      error: 'Ошибка при получении статуса бота', 
      details: error.message 
    });
  }
}
