const tg = window.Telegram?.WebApp;
if (tg) tg.expand();

// Извлекаем ID из Telegram или берем дефолтный
const user = tg?.initDataUnsafe?.user || { id: 5498528671, first_name: "Тест" };
const API_BASE = ''; // Если сервер и фронтенд на разных хостах, укажите тут URL сервера

let allProducts = [];
let cart = [];
let isAdmin = false;

async function init() {
    // 1. Показываем всплывающее окно с полученным ID
    const currentId = user.id;
    if (tg?.showAlert) {
        tg.showAlert(`Ваш ID в Telegram: ${currentId}`);
    } else {
        alert(`Ваш ID: ${currentId}`);
    }

    // 2. Принудительно показываем кнопку админки, если ID совпадает с 5498528671
    if (Number(currentId) === 5498528671) {
        isAdmin = true;
        const adminBtn = document.getElementById('adminBtn');
        if (adminBtn) adminBtn.classList.remove('hidden');
    }

    loadProducts();
}

async function loadProducts() {
    try {
        const res = await fetch(`${API_BASE}/api/products`);
        allProducts = await res.json();
        renderProducts(allProducts);
    } catch (e) {
        console.error("Ошибка загрузки товаров:", e);
    }
}

function renderProducts(products) {
    const catalog = document.getElementById('catalog');
    if (!catalog) return;
    catalog.innerHTML = '';

    if (products.length === 0) {
        catalog.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Товаров пока нет</p>';
        return;
    }

    products.forEach(p => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${p.imageUrl}" alt="${p.title}" onerror="this.src='https://via.placeholder.com/150'">
            <h3>${p.title}</h3>
            <p class="category">${p.category}</p>
            <p class="price">${p.price} ₽</p>
            
            <div class="size-select">
                <label>Размер:</label>
                <select id="size-${p.id}">
                    ${p.sizes.map(s => `<option value="${s.trim()}">${s.trim()}</option>`).join('')}
                </select>
            </div>

            <button onclick="addToCart(${p.id})" class="btn-primary">В корзину</button>
            ${isAdmin ? `<button onclick="deleteProduct(${p.id})" class="btn-danger">🗑 Удалить</button>` : ''}
        `;
        catalog.appendChild(card);
    });
}

function filterCategory(cat) {
    if (cat === 'all') renderProducts(allProducts);
    else renderProducts(allProducts.filter(p => p.category.toLowerCase() === cat.toLowerCase()));
}

function addToCart(productId) {
    const product = allProducts.find(p => p.id === productId);
    const selectedSize = document.getElementById(`size-${productId}`).value;

    cart.push({ ...product, size: selectedSize });
    updateCartUI();
    if (tg?.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
}

function updateCartUI() {
    const cartModal = document.getElementById('cartModal');
    if (!cartModal) return;

    if (cart.length > 0) {
        cartModal.classList.remove('hidden');
        document.getElementById('cartCount').innerText = cart.length;
        const total = cart.reduce((sum, item) => sum + item.price, 0);
        document.getElementById('cartTotal').innerText = total;
    } else {
        cartModal.classList.add('hidden');
    }
}

async function checkout() {
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    
    try {
        const response = await fetch(`${API_BASE}/api/order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: user.id,
                customerName: user.first_name || 'Покупатель',
                cart: cart,
                total: total
            })
        });

        if (response.ok) {
            if (tg?.showAlert) {
                tg.showAlert('Ваш заказ отправлен продавцу!');
            } else {
                alert('Ваш заказ отправлен продавцу!');
            }
            cart = [];
            updateCartUI();
        }
    } catch (e) {
        alert('Ошибка при оформлении заказа');
    }
}

function toggleAdminPanel() {
    const panel = document.getElementById('adminSection');
    if (panel) panel.classList.toggle('hidden');
}

document.getElementById('addProductForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const productData = {
        title: document.getElementById('pTitle').value,
        category: document.getElementById('pCategory').value,
        price: document.getElementById('pPrice').value,
        sizes: document.getElementById('pSizes').value.split(','),
        imageUrl: document.getElementById('pImageUrl').value
    };

    try {
        const res = await fetch(`${API_BASE}/api/admin/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, product: productData })
        });

        if (res.ok) {
            alert('Товар успешно добавлен!');
            e.target.reset();
            loadProducts();
        } else {
            alert('Ошибка сервера при добавлении товара!');
        }
    } catch (err) {
        alert('Ошибка отправки: ' + err.message);
    }
});

async function deleteProduct(id) {
    if (!confirm('Удалить товар?')) return;

    try {
        const res = await fetch(`${API_BASE}/api/admin/products/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id })
        });

        if (res.ok) loadProducts();
    } catch (err) {
        alert('Ошибка удаления: ' + err.message);
    }
}

init();
