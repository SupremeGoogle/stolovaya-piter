/**
 * Cloudflare Worker: Reverse Proxy for Telegram Bot API
 * 
 * Этот воркер пересылает любые запросы на api.telegram.org.
 * Разверните его в Cloudflare и укажите полученный URL в файле .env (TELEGRAM_API_PROXY_URL).
 * 
 * Пример: TELEGRAM_API_PROXY_URL=https://tg-proxy.myname.workers.dev
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Подменяем хост на официальный Telegram API
    const targetUrl = new URL(url.pathname + url.search, 'https://api.telegram.org');
    
    // Копируем заголовки, чтобы избежать проблем с CORS и авторизацией
    const newHeaders = new Headers(request.headers);
    newHeaders.set('Host', 'api.telegram.org');
    
    // Создаем новый запрос с измененным URL и заголовками
    const newRequest = new Request(targetUrl, {
      method: request.method,
      headers: newHeaders,
      body: request.body,
      redirect: 'follow'
    });
    
    // Выполняем запрос к Telegram и возвращаем результат
    try {
      const response = await fetch(newRequest);
      
      // Добавляем CORS заголовки, если нужно делать запросы напрямую с фронтенда
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      responseHeaders.set('Access-Control-Allow-Headers', '*');
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });
    } catch (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
