import { saveFile, saveBinaryFile } from './_git-helper.js';

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

  const { password, data, images } = req.body;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'stolovaya062026';

  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, error: 'Неверный пароль администратора' });
  }

  if (!data) {
    return res.status(400).json({ success: false, error: 'Отсутствуют данные для сохранения' });
  }

  try {
    // 1. Сначала загружаем изображения, если они переданы
    if (images && Array.isArray(images) && images.length > 0) {
      console.log(`Загрузка ${images.length} изображений...`);
      for (const img of images) {
        if (img.name && img.base64) {
          const filePath = `public/images/${img.name}`;
          await saveBinaryFile(filePath, img.base64, `Upload image ${img.name} via Admin Panel`);
        }
      }
    }

    // 2. Сохраняем обновленный файл data.json
    const jsonContent = JSON.stringify(data, null, 2);
    await saveFile('public/data.json', jsonContent, 'Update website content via Admin Panel');
    
    console.log('Сайт успешно обновлен!');
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: 'Ошибка при сохранении изменений', 
      details: error.message 
    });
  }
}
