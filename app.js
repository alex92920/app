const tg = window.Telegram?.WebApp;
if (tg) tg.expand();

const user = tg?.initDataUnsafe?.user || { id: 5498528671, first_name: "Тест" };
const API_BASE = '';

let allProducts = [];
let cart = [];
let isAdmin = false;

async function init() {
    try {
        const resAdmin = await fetch(`${API_BASE}/api/check-admin/${user.id}`);
        const adminData = await resAdmin.json();
        isAdmin = adminData.isAdmin;

        if (isAdmin) {
            document.getElementById('adminBtn').classList.remove('hidden');
        }
    } catch (e) {
        console.error("Ошибка проверки прав админа:", e);
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
    panel.classList.toggle('hidden');
}

document.getElementById('addProductForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const productData = {
        title: document.getElementById('pTitle').value,
        category: document.getElementById('pCategory').value,
        price: document.getElementById('pPrice').value,
        sizes: document.getElementById('pSizes').value.split(','),
        imageUrl: document.getElementById('pImageUrl').value
    };

    const res = await fetch(`${API_BASE}/api/admin/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, product: productData })
    });

    if (res.ok) {
        alert('Товар успешно добавлен!');
        e.target.reset();
        loadProducts();
    }
});

async function deleteProduct(id) {
    if (!confirm('Удалить товар?')) return;

    const res = await fetch(`${API_BASE}/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
    });

    if (res.ok) loadProducts();
}

async function init() {
    try {
        const resAdmin = await fetch(`${API_BASE}/api/check-admin/${user.id}`);
        const adminData = await resAdmin.json();
        
        // Отладка: покажет ваш ID и статус
        tg.showAlert(`Ваш ID: ${5498528671} | Админ: ${adminData.isAdmin}`);

        isAdmin = adminData.isAdmin;
        if (isAdmin) {
            document.getElementById('adminBtn').classList.remove('hidden');
        }
    } catch (e) {
        alert("Ошибка сети при проверке админа: " + e.message);
    }
    loadProducts();
}

