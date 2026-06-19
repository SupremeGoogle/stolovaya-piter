import fs from 'fs';
import path from 'path';

const isVercel = !!process.env.VERCEL;

// Вспомогательные функции для работы с файлами (Локально vs GitHub)
export async function getFile(filePath) {
  if (!isVercel) {
    // Локальное чтение
    const fullPath = path.join(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
      return { content: '', sha: null };
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    return { content, sha: null };
  } else {
    // Чтение с GitHub
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || 'main';
    const token = process.env.GITHUB_TOKEN;
    
    const url = `https://api.github.com/repos/${repo}/contents/${filePath}?ref=${branch}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Vercel-Git-CMS'
        }
      });
      
      if (response.status === 404) {
        return { content: '', sha: null };
      }
      
      if (!response.ok) {
        throw new Error(`GitHub GET error ${response.status}: ${await response.text()}`);
      }
      
      const data = await response.json();
      // Декодируем base64 контент от GitHub
      const decodedContent = Buffer.from(data.content, 'base64').toString('utf8');
      return { content: decodedContent, sha: data.sha };
    } catch (error) {
      console.error(`Ошибка при чтении с GitHub (${filePath}):`, error.message);
      throw error;
    }
  }
}

export async function saveFile(filePath, content, commitMessage = 'Update file via Admin Panel') {
  if (!isVercel) {
    // Локальная запись
    const fullPath = path.join(process.cwd(), filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, content, 'utf8');
    return { success: true };
  } else {
    // Запись на GitHub
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || 'main';
    const token = process.env.GITHUB_TOKEN;
    
    // Сначала получаем SHA существующего файла (если он есть)
    const { sha } = await getFile(filePath);
    
    const url = `https://api.github.com/repos/${repo}/contents/${filePath}`;
    const base64Content = Buffer.from(content, 'utf8').toString('base64');
    
    const body = {
      message: commitMessage,
      content: base64Content,
      branch
    };
    
    if (sha) {
      body.sha = sha;
    }
    
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Vercel-Git-CMS'
        },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        throw new Error(`GitHub PUT error ${response.status}: ${await response.text()}`);
      }
      
      return { success: true };
    } catch (error) {
      console.error(`Ошибка при сохранении на GitHub (${filePath}):`, error.message);
      throw error;
    }
  }
}

// Специальная функция для коммита бинарных данных (изображений)
export async function saveBinaryFile(filePath, base64Data, commitMessage = 'Upload image via Admin Panel') {
  // Очищаем префикс base64 (например, "data:image/jpeg;base64,")
  const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
  
  if (!isVercel) {
    // Локальное сохранение
    const fullPath = path.join(process.cwd(), filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const buffer = Buffer.from(cleanBase64, 'base64');
    fs.writeFileSync(fullPath, buffer);
    return { success: true };
  } else {
    // Сохранение на GitHub
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || 'main';
    const token = process.env.GITHUB_TOKEN;
    
    // Получаем SHA файла, если он уже существует (чтобы перезаписать)
    let sha = null;
    const getUrl = `https://api.github.com/repos/${repo}/contents/${filePath}?ref=${branch}`;
    try {
      const getRes = await fetch(getUrl, {
        headers: {
          'Authorization': `token ${token}`,
          'User-Agent': 'Vercel-Git-CMS'
        }
      });
      if (getRes.ok) {
        const getData = await getRes.json();
        sha = getData.sha;
      }
    } catch (e) {
      // Игнорируем ошибку получения SHA, если файла нет
    }
    
    const url = `https://api.github.com/repos/${repo}/contents/${filePath}`;
    const body = {
      message: commitMessage,
      content: cleanBase64,
      branch
    };
    
    if (sha) {
      body.sha = sha;
    }
    
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Vercel-Git-CMS'
        },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        throw new Error(`GitHub PUT binary error ${response.status}: ${await response.text()}`);
      }
      
      return { success: true };
    } catch (error) {
      console.error(`Ошибка при загрузке бинарного файла на GitHub (${filePath}):`, error.message);
      throw error;
    }
  }
}
