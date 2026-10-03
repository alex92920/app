const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { Telegraf } = require('telegraf');

const ADMIN_ID = 5498528671; // Ваш Telegram ID
const BOT_TOKEN = process.env.BOT_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN'; // Токен от @BotFather
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://your-domain.com'; // Ссылка на ваш hosted-app (HTTPS)

const bot = new Telegraf(BOT_TOKEN);
const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const DB_FILE = path.join(__dirname, 'database.json');

// Инициализация БД
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ products: [], orders: [] }, null, 2));
}

function readDB() {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// --- БОТ КОМАНДЫ ---
bot.start((ctx) => {
    ctx.reply('Привет! Открой магазин одежды по кнопке ниже:', {
        reply_markup: {
            inline_keyboard: [[
                { text: '🛍️ Открыть Магазин', web_app: { url: WEBAPP_URL } }
            ]]
        }
    });
});

// --- API ЭНДПОИНТЫ ---

// Проверка: является ли пользователь админом
app.get('/api/check-admin/:userId', (req, res) => {
    const userId = Number(req.params.userId);
    res.json({ isAdmin: userId === ADMIN_ID });
});

// Получить каталог товаров
app.get('/api/products', (req, res) => {
    const db = readDB();
    res.json(db.products);
});

// [АДМИН] Добавить товар
app.post('/api/admin/products', (req, res) => {
    const { userId, product } = req.body;
    if (Number(userId) !== ADMIN_ID) {
        return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const db = readDB();
    const newProduct = {
        id: Date.now(),
        title: product.title,
        category: product.category,
        price: Number(product.price),
        sizes: Array.isArray(product.sizes) ? product.sizes : product.sizes.split(',').map(s => s.trim()),
        imageUrl: product.imageUrl
    };

    db.products.push(newProduct);
    writeDB(db);
    res.json({ success: true, product: newProduct });
});

// [АДМИН] Удалить товар
app.delete('/api/admin/products/:id', (req, res) => {
    const { userId } = req.body;
    if (Number(userId) !== ADMIN_ID) {
        return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const db = readDB();
    db.products = db.products.filter(p => p.id !== Number(req.params.id));
    writeDB(db);
    res.json({ success: true });
});

// Оформление заказа
app.post('/api/order', async (req, res) => {
    const { userId, cart, total, customerName } = req.body;
    const db = readDB();

    const order = { id: Date.now(), userId, cart, total, date: new Date().toISOString() };
    db.orders.push(order);
    writeDB(db);

    // Уведомление админа о новом заказе через бота
    const itemsText = cart.map(item => `• ${item.title} (${item.size}) — ${item.price} ₽`).join('\n');
    try {
        await bot.telegram.sendMessage(ADMIN_ID, 
            `🚨 *Новый заказ!*\n` +
            `От: ${customerName} (ID: ${userId})\n` +
            `Сумма: *${total} ₽*\n\n` +
            `*Состав заказа:*\n${itemsText}`,
            { parse_mode: 'Markdown' }
        );
    } catch (err) {
        console.error('Ошибка отправки сообщения в ТГ:', err);
    }

    res.json({ success: true });
});

bot.launch().catch(err => console.error('Bot launch error:', err));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
