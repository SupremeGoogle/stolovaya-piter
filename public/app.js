// Инициализация при загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
  loadAndRenderContent();
  setupHeaderScroll();
  setupAnimationFix();
});

// Фикс: перезапуск анимации карусели при возврате на вкладку
// Некоторые браузеры останавливают CSS animation в фоновых вкладках
function setupAnimationFix() {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      restartAnimation('gallery-track');
      restartAnimation('reviews-track');
    }
  });
}

function restartAnimation(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.animation = 'none';
  // Принудительный reflow
  void el.offsetWidth;
  el.style.animation = '';
}


// Загрузка динамического контента с сервера/диска
async function loadAndRenderContent() {
  try {
    // Внедряем cache-buster (?t=...), чтобы браузер не кэшировал старую версию при обновлении в админке
    const response = await fetch(`/data.json?t=${Date.now()}`);
    if (!response.ok) {
      throw new Error('Не удалось загрузить data.json');
    }
    const data = await response.json();
    renderContent(data);
  } catch (error) {
    console.error('Ошибка рендеринга динамического контента:', error);
  }
}

// Заполнение страницы данными из JSON
function renderContent(data) {
  // 1. Герой-секция
  if (data.hero) {
    const heroTitle = document.getElementById('hero-title');
    const heroSubtitle = document.getElementById('hero-subtitle');
    if (heroTitle) heroTitle.innerHTML = data.hero.title;
    if (heroSubtitle) heroSubtitle.textContent = data.hero.subtitle;
  }

  // 2. Преимущества
  if (data.features) {
    const grid = document.getElementById('features-grid');
    grid.innerHTML = data.features.map(f => `
      <div class="glass card feature-card glass-card">
        <h3>${f.title}</h3>
        <p>${f.description}</p>
      </div>
    `).join('');
  }

  // 3. Каталог
  if (data.catalog) {
    // Без категории
    const gridUncategorized = document.getElementById('grid-uncategorized');
    if (gridUncategorized) {
      gridUncategorized.innerHTML = (data.catalog.uncategorized || []).map(item => `
        <div class="product-card glass glass-card">
          <div class="product-img-wrapper">
            <img src="${item.image}" alt="${item.name}" onerror="this.src='images/shashlik_pork.jpg'">
          </div>
          <div class="product-info">
            <h3>${item.name}</h3>
            <p>${item.description}</p>
            <div class="product-price-row">
              <span class="product-price">${item.price}</span>
              <button class="product-order-btn" onclick="openOrder('${item.name}')">Заказать</button>
            </div>
          </div>
        </div>
      `).join('');
    }

    // Комплексные обеды
    const gridComplex = document.getElementById('grid-complex');
    if (gridComplex) {
      gridComplex.innerHTML = (data.catalog.complex || []).map(item => `
        <div class="product-card glass glass-card">
          <div class="product-img-wrapper">
            <img src="${item.image}" alt="${item.name}" onerror="this.src='images/shashlik_pork.jpg'">
          </div>
          <div class="product-info">
            <h3>${item.name}</h3>
            <p>${item.description}</p>
            <div class="product-price-row">
              <span class="product-price">${item.price}</span>
              <button class="product-order-btn" onclick="openOrder('${item.name}')">Заказать</button>
            </div>
          </div>
        </div>
      `).join('');
    }
  }

  // 4. О магазине
  if (data.about) {
    const titleEl = document.getElementById('about-title');
    const desc1El = document.getElementById('about-desc1');
    const desc2El = document.getElementById('about-desc2');
    const addrEl = document.getElementById('about-address');
    const addrMobEl = document.getElementById('about-address-mob');
    const wtEl = document.getElementById('about-worktime');
    const wtMobEl = document.getElementById('about-worktime-mob');

    if (titleEl) titleEl.textContent = data.about.title;
    if (desc1El) desc1El.textContent = data.about.description1;
    if (desc2El) desc2El.textContent = data.about.description2;
    if (addrEl) addrEl.textContent = data.about.address;
    if (addrMobEl) addrMobEl.textContent = data.about.address;
    if (wtEl) wtEl.textContent = data.about.workTime;
    if (wtMobEl) wtMobEl.textContent = data.about.workTime;
  }

  // 5. Галерея
  if (data.gallery) {
    const track = document.getElementById('gallery-track');
    const slidesHtml = (data.gallery || []).map(item => `
      <div class="gallery-item">
        <img src="${item.image}" alt="${item.title}" onerror="this.src='images/shashlik_pork.jpg'">
        <div class="gallery-overlay">
          <h4>${item.title}</h4>
          <p>${item.subtitle}</p>
        </div>
      </div>
    `).join('');
    // Дублируем слайды для бесконечного скролла
    track.innerHTML = slidesHtml + slidesHtml;
    // Принудительный reflow и перезапуск анимации (фикс пропадания)
    void track.offsetWidth;
    track.style.animation = 'none';
    void track.offsetWidth;
    track.style.animation = '';
  }

  // 6. Отзывы
  if (data.reviews) {
    const reviewsTrack = document.getElementById('reviews-track');
    if (reviewsTrack) {
      const reviewsHtml = data.reviews.map(r => `
        <div class="review-card glass glass-card">
          <div class="review-header">
            <div class="review-author">
              <h4>${r.name}</h4>
              <span class="review-rank">${r.rank}</span>
            </div>
            <span class="review-date">${r.date}</span>
          </div>
          <p class="review-text">"${r.text}"</p>
        </div>
      `).join('');
      // Дублируем отзывы для бесконечной карусели
      reviewsTrack.innerHTML = reviewsHtml + reviewsHtml;
      // Принудительный reflow и перезапуск анимации (фикс пропадания)
      void reviewsTrack.offsetWidth;
      reviewsTrack.style.animation = 'none';
      void reviewsTrack.offsetWidth;
      reviewsTrack.style.animation = '';
    }
  }
}

// Функция переключения вкладок каталога
function switchCategory(category) {
  const btnUncategorized = document.getElementById('btn-uncategorized');
  const btnComplex = document.getElementById('btn-complex');
  const gridUncategorized = document.getElementById('grid-uncategorized');
  const gridComplex = document.getElementById('grid-complex');
  
  if (category === 'uncategorized') {
    btnUncategorized.classList.add('active');
    btnComplex.classList.remove('active');
    gridUncategorized.style.display = 'grid';
    gridComplex.style.display = 'none';
  } else if (category === 'complex') {
    btnUncategorized.classList.remove('active');
    btnComplex.classList.add('active');
    gridUncategorized.style.display = 'none';
    gridComplex.style.display = 'grid';
  }
}

// Функция быстрой предзаполненной формы заказа
function openOrder(itemName) {
  const msgField = document.getElementById('form-msg');
  const feedbackSection = document.getElementById('feedback');
  
  msgField.value = `Здравствуйте! Хочу заказать или узнать подробнее про: ${itemName}.`;
  
  feedbackSection.scrollIntoView({ behavior: 'smooth' });
  
  setTimeout(() => {
    document.getElementById('form-name').focus();
  }, 800);
}

// Отправка формы обратной связи на сервер
async function sendFeedback(event) {
  event.preventDefault();
  
  const form = document.getElementById('orderForm');
  const statusMsg = document.getElementById('form-status-msg');
  const submitBtn = form.querySelector('.form-submit-btn');
  
  const name = document.getElementById('form-name').value.trim();
  const phone = document.getElementById('form-phone').value.trim();
  const message = document.getElementById('form-msg').value.trim();
  
  if (phone.length < 6) {
    showStatus('Введите корректный номер телефона', 'error');
    return;
  }
  
  submitBtn.disabled = true;
  submitBtn.classList.add('loading');
  statusMsg.className = 'form-status';
  statusMsg.style.display = 'none';
  
  try {
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, phone, message })
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      if (result.warning) {
        showStatus(`Заявка принята! Предупреждение: ${result.warning}`, 'success');
      } else {
        showStatus('Заявка успешно отправлена! Наш менеджер скоро свяжется с вами.', 'success');
      }
      form.reset();
    } else {
      showStatus(result.error || 'Произошла ошибка при отправке заявки. Попробуйте еще раз.', 'error');
    }
  } catch (error) {
    console.error('Ошибка отправки формы:', error);
    showStatus('Сервер недоступен. Пожалуйста, проверьте соединение с интернетом.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove('loading');
  }
}

// Помощник для вывода статусных сообщений формы
function showStatus(text, type) {
  const statusMsg = document.getElementById('form-status-msg');
  statusMsg.style.display = 'block';
  statusMsg.textContent = text;
  statusMsg.className = `form-status ${type}`;
}

// Блюр для шапки при скролле
function setupHeaderScroll() {
  window.addEventListener('scroll', () => {
    const header = document.getElementById('main-header');
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
}

// Функции мобильного меню (бургер)
function toggleMobileMenu() {
  const burgerBtn = document.getElementById('burger-btn');
  const navMenu = document.getElementById('nav-menu');
  
  if (burgerBtn && navMenu) {
    burgerBtn.classList.toggle('active');
    navMenu.classList.toggle('active');
  }
}

function closeMobileMenu() {
  const burgerBtn = document.getElementById('burger-btn');
  const navMenu = document.getElementById('nav-menu');
  
  if (burgerBtn && navMenu) {
    burgerBtn.classList.remove('active');
    navMenu.classList.remove('active');
  }
}
