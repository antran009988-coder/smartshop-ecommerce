const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        full_name TEXT,
        role TEXT DEFAULT 'customer'
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT,
        slug TEXT UNIQUE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT,
        slug TEXT UNIQUE,
        base_price INTEGER,
        view_count INTEGER DEFAULT 0,
        rating NUMERIC(2,1) DEFAULT 4.8,
        category_id INTEGER,
        description TEXT,
        image_url TEXT,
        specs TEXT
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_variants (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        variant_name TEXT NOT NULL,
        price_diff INTEGER DEFAULT 0,
        stock INTEGER DEFAULT 20
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        user_name TEXT,
        rating INTEGER,
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Bảng Đơn hàng hỗ trợ trạng thái: pending (Chờ xử lý), shipping (Đang giao), delivered (Giao thành công), cancelled (Đã hủy)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        username TEXT,
        full_name TEXT,
        phone TEXT,
        address TEXT,
        payment_method TEXT,
        total_amount INTEGER,
        items TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      INSERT INTO users (username, password, full_name, role)
      VALUES ('admin', 'admin123', 'Quản Trị Viên', 'admin')
      ON CONFLICT (username) DO NOTHING;
    `);
    await pool.query(`
      INSERT INTO users (username, password, full_name, role)
      VALUES ('user', 'user123', 'Nguyễn Văn A', 'customer')
      ON CONFLICT (username) DO NOTHING;
    `);

    await pool.query(`INSERT INTO categories (id, name, slug) VALUES (1, 'Laptop & PC', 'laptop-pc') ON CONFLICT (id) DO NOTHING;`);
    await pool.query(`INSERT INTO categories (id, name, slug) VALUES (2, 'Phụ kiện Gaming', 'phu-kien-gaming') ON CONFLICT (id) DO NOTHING;`);
    await pool.query(`INSERT INTO categories (id, name, slug) VALUES (3, 'Thiết bị thông minh', 'thiet-bi-thong-minh') ON CONFLICT (id) DO NOTHING;`);

    const existingProds = await pool.query('SELECT COUNT(*)::int AS cnt FROM products');
    if (existingProds.rows[0].cnt === 0) {
      const productsData = [
        { name: 'Laptop Gaming ASUS ROG', category_id: 1, img: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500&auto=format&fit=crop&q=80' },
        { name: 'Chuột Không Dây Logitech', category_id: 2, img: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500&auto=format&fit=crop&q=80' },
        { name: 'Bàn Phím Cơ RGB Keychron', category_id: 2, img: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=500&auto=format&fit=crop&q=80' },
        { name: 'Tai Nghe Gaming HyperX 7.1', category_id: 2, img: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&auto=format&fit=crop&q=80' },
        { name: 'Màn Hình UltraWide LG 34 inch', category_id: 1, img: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500&auto=format&fit=crop&q=80' },
        { name: 'Đồng Hồ Thông Minh Apple Watch', category_id: 3, img: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&auto=format&fit=crop&q=80' },
        { name: 'Card Đồ Họa RTX 4060 Ti 8GB', category_id: 1, img: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=500&auto=format&fit=crop&q=80' },
        { name: 'Ghế Gaming Ergonomic Cao Cấp', category_id: 2, img: 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=500&auto=format&fit=crop&q=80' },
        { name: 'Laptop Văn Phòng Dell XPS 13', category_id: 1, img: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&auto=format&fit=crop&q=80' },
        { name: 'Chuột Gaming Razer DeathAdder', category_id: 2, img: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&auto=format&fit=crop&q=80' },
        { name: 'Bàn Phím Không Dây Logitech MX', category_id: 2, img: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&auto=format&fit=crop&q=80' },
        { name: 'Tai Nghe Bluetooth Sony WH-1000XM5', category_id: 3, img: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=500&auto=format&fit=crop&q=80' },
        { name: 'Màn Hình Gaming MSI 24 inch 165Hz', category_id: 1, img: 'https://images.unsplash.com/photo-1551645120-d70bfe84c826?w=500&auto=format&fit=crop&q=80' },
        { name: 'Loa Bluetooth JBL Flip 6', category_id: 3, img: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500&auto=format&fit=crop&q=80' },
        { name: 'Ổ Cứng SSD NVMe Samsung 1TB', category_id: 1, img: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=500&auto=format&fit=crop&q=80' },
        { name: 'Webcam Full HD Logitech C920', category_id: 3, img: 'https://images.unsplash.com/photo-1587826080691-72583842c7aa?w=500&auto=format&fit=crop&q=80' },
        { name: 'Router Wi-Fi 6 TP-Link Archer', category_id: 3, img: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=500&auto=format&fit=crop&q=80' },
        { name: 'Balo Laptop Chống Nước Mark Ryden', category_id: 2, img: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&auto=format&fit=crop&q=80' },
        { name: 'Đế Tản Nhiệt Laptop Cooler Master', category_id: 2, img: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=500&auto=format&fit=crop&q=80' },
        { name: 'Micro Thu Âm Podcast Elgato Wave 3', category_id: 3, img: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=500&auto=format&fit=crop&q=80' },
        { name: 'Tay Cầm Chơi Game Xbox Series X', category_id: 2, img: 'https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?w=500&auto=format&fit=crop&q=80' },
        { name: 'Kính Thực Tế Ảo Meta Quest 3', category_id: 3, img: 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1bd?w=500&auto=format&fit=crop&q=80' },
        { name: 'Cáp Chuyển Đổi Type-C Sang HDMI', category_id: 2, img: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80' },
        { name: 'Hub USB-C Anker 7-in-1 Multicard', category_id: 2, img: 'https://images.unsplash.com/photo-1616440347437-b1c73416efc2?w=500&auto=format&fit=crop&q=80' },
        { name: 'Sạc Dự Phòng 20000mAh Baseus 65W', category_id: 3, img: 'https://images.unsplash.com/photo-1609592424083-a7c36a4b11f0?w=500&auto=format&fit=crop&q=80' },
        { name: 'Giá Đỡ Laptop Nhôm Nguyên Khối', category_id: 2, img: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=500&auto=format&fit=crop&q=80' },
        { name: 'Lót Chuột Gaming Khổ Lớn RGB 80x30', category_id: 2, img: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=500&auto=format&fit=crop&q=80' },
        { name: 'Bút Trình Chiếu Laser Logitech R400', category_id: 3, img: 'https://images.unsplash.com/photo-1588702547919-26b89e037805?w=500&auto=format&fit=crop&q=80' },
        { name: 'Bộ Tua Vít Đa Năng Sửa Chữa PC 115 in 1', category_id: 2, img: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=500&auto=format&fit=crop&q=80' },
        { name: 'Đèn LED RGB Bàn Làm Việc Smart Bar', category_id: 3, img: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=500&auto=format&fit=crop&q=80' },
        { name: 'Bộ Phát Wi-Fi Di Động 4G TP-Link', category_id: 3, img: 'https://images.unsplash.com/photo-1563770660941-20978e870e26?w=500&auto=format&fit=crop&q=80' },
        { name: 'Bộ Phím Chuột Không Dây Rapoo', category_id: 2, img: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&auto=format&fit=crop&q=80' },
        { name: 'Thẻ Nhớ MicroSD 128GB SanDisk Extreme', category_id: 3, img: 'https://images.unsplash.com/photo-1588611934999-1925f4236a28?w=500&auto=format&fit=crop&q=80' },
        { name: 'Miếng Dán Màn Hình MacBook Chống Lóa', category_id: 2, img: 'https://images.unsplash.com/photo-1522204523234-8729aa6e3d5f?w=500&auto=format&fit=crop&q=80' },
        { name: 'Quạt Tản Nhiệt CPU Noctua NH-D15', category_id: 1, img: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=500&auto=format&fit=crop&q=80' },
        { name: 'Bộ Vệ Sinh Laptop & PC Chuyên Dụng', category_id: 2, img: 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=500&auto=format&fit=crop&q=80' }
      ];

      for (let i = 0; i < productsData.length; i++) {
        const p = productsData[i];
        const slug = `san-pham-${i + 1}`;
        const base_price = Math.floor(Math.random() * 18 + 2) * 500000;
        const view_count = Math.floor(Math.random() * 450 + 50);
        const rating = (Math.random() * 0.8 + 4.2).toFixed(1);
        const description = `Thiết bị ${p.name} chính hãng, bảo hành 12 tháng, phục vụ tối ưu cho nhu cầu học tập, làm việc và giải trí chuyên nghiệp.`;
        const specs = `Bảo hành: 12 tháng chính hãng | Tình trạng: Mới 100% | Xuất xứ: Chính hãng`;

        const prodRes = await pool.query(
          `INSERT INTO products (name, slug, base_price, view_count, rating, category_id, description, image_url, specs) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (slug) DO NOTHING
           RETURNING id;`,
          [p.name, slug, base_price, view_count, rating, p.category_id, description, p.img, specs]
        );

        if (prodRes.rows.length > 0) {
          const prodId = prodRes.rows[0].id;
          await pool.query(
            `INSERT INTO reviews (product_id, user_name, rating, comment) VALUES ($1, 'Trần Văn Nam', 5, 'Sản phẩm dùng rất mượt, đóng gói cẩn thận!');`,
            [prodId]
          );
          await pool.query(
            `INSERT INTO reviews (product_id, user_name, rating, comment) VALUES ($1, 'Lê Thị Thu', 4, 'Chất lượng tốt so với tầm giá, giao hàng nhanh.');`,
            [prodId]
          );
        }
      }
    }
  } catch (err) {
    console.error('Lỗi DB:', err.message);
  }
}

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ tài khoản và mật khẩu!' });
  }
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [
      String(username).trim(),
      String(password)
    ]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      res.json({ success: true, user: { username: user.username, full_name: user.full_name, role: user.role } });
    } else {
      res.status(401).json({ success: false, message: 'Sai tài khoản hoặc mật khẩu!' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/register', async (req, res) => {
  const { username, password, full_name } = req.body;
  if (!username || !String(username).trim() || !password || String(password).length < 4) {
    return res.status(400).json({ success: false, message: 'Tên đăng nhập và mật khẩu (tối thiểu 4 ký tự) là bắt buộc!' });
  }
  try {
    const cleanUsername = String(username).trim();
    const checkUser = await pool.query('SELECT id FROM users WHERE username = $1', [cleanUsername]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Tên đăng nhập đã tồn tại!' });
    }
    const result = await pool.query(
      'INSERT INTO users (username, password, full_name, role) VALUES ($1, $2, $3, $4) RETURNING username, full_name, role;',
      [cleanUsername, String(password), String(full_name || 'Khách hàng mới').trim(), 'customer']
    );
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:id/variants', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM product_variants WHERE product_id = $1 ORDER BY id ASC',
      [id]
    );
    if (result.rows.length > 0) {
      return res.json(result.rows);
    }
    res.json([
      { id: 1, product_id: Number(id), variant_name: 'Màu Đen - Tiêu chuẩn', price_diff: 0, stock: 25 },
      { id: 2, product_id: Number(id), variant_name: 'Màu Bạc / Xám - Bản nâng cấp', price_diff: 350000, stock: 15 },
      { id: 3, product_id: Number(id), variant_name: 'Combo + Gói bảo hành 24T', price_diff: 650000, stock: 10 }
    ]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM reviews WHERE product_id = $1 ORDER BY id DESC', [id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_name, rating, comment } = req.body;
    const safeRating = Math.min(5, Math.max(1, Number(rating) || 5));
    if (!comment || !String(comment).trim()) {
      return res.status(400).json({ error: 'Nội dung đánh giá không được để trống' });
    }
    const result = await pool.query(
      'INSERT INTO reviews (product_id, user_name, rating, comment) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, String(user_name || 'Khách vãng lai').trim(), safeRating, String(comment).trim()]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  const { username, full_name, phone, address, payment_method, total_amount, items } = req.body;
  if (!full_name || !String(full_name).trim() || !phone || !String(phone).trim() || !address || !String(address).trim()) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ họ tên, số điện thoại và địa chỉ!' });
  }
  if (!Array.isArray(items) || items.length === 0 || Number(total_amount) <= 0) {
    return res.status(400).json({ success: false, message: 'Giỏ hàng trống hoặc tổng tiền không hợp lệ!' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO orders (username, full_name, phone, address, payment_method, total_amount, items, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending') RETURNING *;`,
      [
        username || 'guest',
        String(full_name).trim(),
        String(phone).trim(),
        String(address).trim(),
        payment_method || 'cod',
        Number(total_amount),
        JSON.stringify(items)
      ]
    );
    res.json({ success: true, order: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const result = await pool.query('SELECT * FROM orders WHERE username = $1 ORDER BY id DESC', [username]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/orders/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("UPDATE orders SET status = 'cancelled' WHERE id = $1 RETURNING *;", [id]);
    res.json({ success: true, order: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= API QUẢN TRỊ (ADMIN) =================

app.get('/api/admin/orders', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/orders/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const allowedStatuses = ['pending', 'shipping', 'delivered', 'cancelled'];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Trạng thái đơn hàng không hợp lệ!' });
  }
  try {
    const result = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    res.json({ success: true, order: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/products', async (req, res) => {
  try {
    const { name, base_price, category_id, description, image_url, specs } = req.body;
    if (!name || !String(name).trim() || Number(base_price) <= 0) {
      return res.status(400).json({ success: false, error: 'Tên sản phẩm và giá gốc (> 0) là bắt buộc!' });
    }
    const cleanName = String(name).trim();
    const slug =
      cleanName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-') +
      '-' +
      Date.now();
    const result = await pool.query(
      `INSERT INTO products (name, slug, base_price, view_count, rating, category_id, description, image_url, specs) 
       VALUES ($1, $2, $3, 100, 5.0, $4, $5, $6, $7) RETURNING *;`,
      [
        cleanName,
        slug,
        Number(base_price),
        Number(category_id) || 1,
        description || '',
        image_url || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=500&auto=format&fit=crop&q=80',
        specs || 'Bảo hành: 12 tháng chính hãng | Tình trạng: Mới 100%'
      ]
    );
    res.json({ success: true, product: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM products WHERE id = $1', [id]);
    res.json({ success: true, message: 'Đã xóa' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const distDir = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;
async function startServer() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`🚀 Server Doanh Nghiệp chạy mượt tại port ${PORT}`);
  });
}
startServer();