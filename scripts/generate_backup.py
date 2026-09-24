import sqlite3
import os
import datetime
import random

home_dir = os.path.expanduser('~')
backup_dir = os.path.join(home_dir, 'stok-takip', 'backups')
os.makedirs(backup_dir, exist_ok=True)

backup_path = os.path.join(backup_dir, 'Telefoncu-Test-200-Urun-Yedek.sqlite')

if os.path.exists(backup_path):
    os.remove(backup_path)

print(f"Creating demo test database at: {backup_path}")

conn = sqlite3.connect(backup_path)
cursor = conn.cursor()

# Run SQL schema
sql_schema_file = os.path.join(os.path.dirname(__file__), 'generate-demo-backup.sql')
with open(sql_schema_file, 'r', encoding='utf-8') as f:
    cursor.executescript(f.read())

# Helper to generate EAN-13
def generate_ean13(index):
    prefix = "869"
    body = str(100000000 + index)
    twelve = prefix + body
    total_sum = 0
    for i in range(12):
        digit = int(twelve[i])
        total_sum += digit if i % 2 == 0 else digit * 3
    check_digit = (10 - (total_sum % 10)) % 10
    return twelve + str(check_digit)

now_dt = datetime.datetime.now()
now_iso = now_dt.isoformat()

# Product Templates
templates = [
    # iPhone Aksesuarları
    (2, "Spigen", "iPhone 15 Pro", "iPhone 15 Pro Magsafe Ultra Hybrid Kılıf", 25000, 45000),
    (2, "Apple", "iPhone 15", "iPhone 15 Orijinal Silikon Kılıf", 30000, 65000),
    (2, "Baseus", "iPhone 14 Pro Max", "iPhone 14 Pro Max Şeffaf Darbe Emici Kılıf", 12000, 25000),
    (2, "Spigen", "iPhone 13", "iPhone 13 Tough Armor Tank Kılıf", 28000, 52000),
    (3, "Spigen", "iPhone 15 Pro", "iPhone 15 Pro Ez Fit Kolay Kurulum Cam", 15000, 35000),
    (3, "Baseus", "iPhone 14", "iPhone 14 9H Temperli Cam Koruyucu", 4000, 15000),
    (3, "Spigen", "iPhone 13/14", "iPhone 13/14 Hayalet Gizlilik Camı", 8000, 25000),
    
    # Samsung Aksesuarları
    (2, "Spigen", "Galaxy S24 Ultra", "Samsung Galaxy S24 Ultra Rugged Armor Kılıf", 26000, 48000),
    (2, "Baseus", "Galaxy S23 FE", "Samsung S23 FE Şeffaf Kamera Korumalı Kılıf", 10000, 22000),
    (2, "Spigen", "Galaxy A54", "Samsung Galaxy A54 Liquid Air Kılıf", 18000, 35000),
    (3, "Baseus", "Galaxy S24 Ultra", "Samsung S24 Ultra Seramik Kırılmaz Cam", 6000, 20000),

    # Şarj & Güç
    (4, "Anker", "20W GaN", "Anker 20W USB-C Hızlı Şarj Adaptörü", 18000, 38000),
    (4, "Apple", "20W USB-C", "Apple 20W USB-C Güç Adaptörü (Orijinal)", 45000, 75000),
    (4, "Baseus", "100W Cable", "Baseus Type-C to Type-C 100W Örgülü Kablo (1m)", 12000, 28000),
    (4, "Anker", "Lightning", "Anker MFi Sertifikalı Lightning Şarj Kablosu", 14000, 32000),
    (7, "Anker", "10000mAh", "Anker PowerCore 10000mAh Taşınabilir Şarj Cihazı", 32000, 59000),
    (7, "Baseus", "20000mAh 22.5W", "Baseus Bipow 20000mAh 22.5W Dijital Ekranlı Powerbank", 48000, 89000),

    # Kulaklık & Ses
    (5, "Apple", "AirPods Pro 2", "Apple AirPods Pro 2. Nesil Type-C Kulaklık", 550000, 749000),
    (5, "Anker", "Soundcore R50i", "Anker Soundcore R50i TWS Kablosuz Kulaklık", 38000, 69000),
    (5, "JBL", "Wave 300", "JBL Wave 300TWS Kablosuz Kulak İçi Kulaklık", 85000, 139000),

    # Araç & Hafıza
    (10, "Baseus", "Magsafe Mount", "Baseus Araç İçi Magsafe Havalandırma Tutucu", 16000, 36000),
    (10, "Anker", "30W Car Charger", "Anker 30W Çift Çıkışlı Hızlı Araç Şarjı", 14000, 32000),
    (9, "SanDisk", "128GB Ultra", "SanDisk 128GB MicroSDXC 140MB/s Hafıza Kartı", 19000, 38000),
    (9, "SanDisk", "64GB Dual", "SanDisk 64GB Ultra Dual Type-C Flash Bellek", 13000, 26000),

    # Telefon Cihazları
    (1, "Apple", "iPhone 15 Pro", "Apple iPhone 15 Pro 128GB Titanyum", 5200000, 6499900),
    (1, "Samsung", "Galaxy S24 Ultra", "Samsung Galaxy S24 Ultra 256GB Siyah", 4800000, 5999900),
    (1, "Xiaomi", "Redmi Note 13 Pro", "Xiaomi Redmi Note 13 Pro 256GB 8GB RAM", 1200000, 1599900),
]

colors = ["Siyah", "Beyaz", "Şeffaf", "Lacivert", "Uzay Grisi", "Titanyum", "Yeşil", "Kırmızı", "Altın"]

print("Seeding 220 items into SQLite...")

created_products = []
for i in range(1, 221):
    tmpl = templates[(i - 1) % len(templates)]
    barcode = generate_ean13(i)
    color = colors[(i - 1) % len(colors)]
    variant = "256GB" if i % 3 == 0 else ("128GB" if i % 2 == 0 else "Standart")

    name = f"{tmpl[3]} ({color} - #{i})"
    buy_price = tmpl[4] + ((i % 5) * 500)
    sell_price = int(buy_price * 1.35)
    min_stock = 10 if i % 4 == 0 else 5

    # Stock quantity
    if i % 15 == 0:
        stock_qty = 0
    elif i % 7 == 0:
        stock_qty = 2
    else:
        stock_qty = 15 + (i % 35)

    cursor.execute("""
        INSERT INTO products (
            barcode, name, category_id, brand, model, variant, color,
            purchase_price, sale_price, minimum_stock, stock_quantity,
            description, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    """, (
        barcode, name, tmpl[0], tmpl[1], tmpl[2], variant, color,
        buy_price, sell_price, min_stock, stock_qty,
        "Sistem tarafından üretilmiş performans test verisi",
        now_iso, now_iso
    ))
    
    product_id = cursor.lastrowid
    created_products.append({
        'id': product_id,
        'name': name,
        'buy_price': buy_price,
        'sell_price': sell_price,
    })

    if stock_qty > 0:
        cursor.execute("""
            INSERT INTO stock_movements (
                product_id, movement_type, quantity, previous_stock, new_stock, unit_price, reference_type, reference_id, description, created_at
            ) VALUES (?, 'IN_PURCHASE', ?, 0, ?, ?, 'INITIAL_SEED', 1, 'İlk Stok Yüklemesi', ?)
        """, (product_id, stock_qty, stock_qty, buy_price, now_iso))

# 2. Seed Past 30 Days Sales (Heavy in last 7 days for trend graph)
print("Seeding 60 realistic sales transactions across past 30 days...")
payment_types = ['CASH', 'CARD', 'TRANSFER']

sale_id_counter = 1
for days_back in range(29, -1, -1):
    # Determine how many sales occurred on this day (more sales in recent 7 days)
    sales_count = random.randint(2, 5) if days_back <= 6 else random.randint(1, 3)
    
    for s_idx in range(sales_count):
        sale_dt = now_dt - datetime.timedelta(days=days_back, hours=random.randint(1, 10), minutes=random.randint(0, 59))
        sale_iso = sale_dt.isoformat()
        date_str = sale_dt.strftime('%Y%m%d')
        sale_num = f"SAT-{date_str}-{1000 + sale_id_counter}"
        pay_type = payment_types[sale_id_counter % len(payment_types)]

        # Pick 1 to 3 items for this sale
        chosen_prods = random.sample(created_products, random.randint(1, 3))
        
        sale_total = 0
        items_to_insert = []
        for prod in chosen_prods:
            qty = random.randint(1, 2)
            unit_p = prod['sell_price']
            tot_p = qty * unit_p
            sale_total += tot_p
            items_to_insert.append((prod['id'], qty, unit_p, tot_p))

        # Insert Sale
        cursor.execute("""
            INSERT INTO sales (sale_number, total_amount, discount_amount, payment_type, status, created_at, updated_at)
            VALUES (?, ?, 0, ?, 'COMPLETED', ?, ?)
        """, (sale_num, sale_total, pay_type, sale_iso, sale_iso))
        
        real_sale_id = cursor.lastrowid

        # Insert Sale Items & Stock Movements
        for (pid, qty, unit_p, tot_p) in items_to_insert:
            cursor.execute("""
                INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, discount_amount, total_amount)
                VALUES (?, ?, ?, ?, 0, ?)
            """, (real_sale_id, pid, qty, unit_p, tot_p))

            cursor.execute("""
                INSERT INTO stock_movements (
                    product_id, movement_type, quantity, previous_stock, new_stock, unit_price, reference_type, reference_id, description, created_at
                ) VALUES (?, 'SALE', ?, 20, 19, ?, 'SALE', ?, ?, ?)
            """, (pid, -qty, unit_p, real_sale_id, f"Satış: {sale_num}", sale_iso))

        sale_id_counter += 1

# 3. Seed Past Supplier Purchases
print("Seeding 12 supplier purchase orders...")
suppliers = ['Genpa A.Ş.', 'İndeks Bilgisayar', 'KVK Teknik', 'Arena Bilgisayar', 'Baseus Türkiye']

for p_idx in range(1, 13):
    p_dt = now_dt - datetime.timedelta(days=p_idx * 2, hours=3)
    p_iso = p_dt.isoformat()
    p_num = f"ALS-{p_dt.strftime('%Y%m%d')}-{100 + p_idx}"
    supplier = suppliers[p_idx % len(suppliers)]

    chosen_prods = random.sample(created_products, random.randint(2, 5))
    p_total = 0
    p_items = []
    for prod in chosen_prods:
        qty = random.randint(5, 20)
        unit_p = prod['buy_price']
        tot_p = qty * unit_p
        p_total += tot_p
        p_items.append((prod['id'], qty, unit_p, tot_p))

    cursor.execute("""
        INSERT INTO purchases (purchase_number, supplier_name, total_amount, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
    """, (p_num, supplier, p_total, p_iso, p_iso))
    real_p_id = cursor.lastrowid

    for (pid, qty, unit_p, tot_p) in p_items:
        cursor.execute("""
            INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_price, total_amount)
            VALUES (?, ?, ?, ?, ?)
        """, (real_p_id, pid, qty, unit_p, tot_p))

# Record Backup History Entry
cursor.execute("""
    INSERT INTO backup_history (file_name, file_path, backup_type, created_at)
    VALUES (?, ?, 'MANUAL', ?)
""", ('Telefoncu-Test-200-Urun-Yedek.sqlite', backup_path, now_iso))

conn.commit()
conn.close()

size_kb = os.path.getsize(backup_path) / 1024
print(f"COMPLETE! Created demo database with 220 products, 60+ sales, and 12 purchases. Size: {size_kb:.2f} KB")
