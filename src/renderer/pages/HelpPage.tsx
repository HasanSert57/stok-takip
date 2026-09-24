import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import {
  BookOpen,
  LayoutDashboard,
  Package,
  FolderTree,
  Boxes,
  ShoppingCart,
  Truck,
  DollarSign,
  Barcode,
  History,
  FileBarChart,
  Database,
  Settings,
  Search,
  Sparkles,
  Command,
} from 'lucide-react';

interface GuideSection {
  id: string;
  title: string;
  badge?: string;
  icon: React.ReactNode;
  summary: string;
  capabilities: string[];
  tips: string;
}

export const HelpPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const sections: GuideSection[] = [
    {
      id: 'dashboard',
      title: '1. Özet Ekranı (Dashboard)',
      icon: <LayoutDashboard size={20} className="text-blue-600" />,
      summary: 'İşletmenizin günlük finansal durumunu, ciro, kâr tahmini ve kritik stok durumunu canlı gösteren genel bakış ekranıdır.',
      capabilities: [
        'Günlük toplam ciro ve toplam satılan adet miktarını görüntüleme.',
        'Tahmini net kâr tutarını canlı takip etme.',
        'Stok seviyesi kritik eşiğe düşmüş ürün sayısını görme.',
        'Son 7 günün ciro değişim grafiğini (Recharts) inceleme.',
        'En çok satan ilk 5 ürünü ve son satış hareketlerini takip etme.',
      ],
      tips: 'Her sabah dükkanı açtığınızda günün performansını ve kritik stok durumundaki eksikleri buradan hızlıca gözden geçirebilirsiniz.',
    },
    {
      id: 'products',
      title: '2. Ürün Kataloğu',
      badge: 'F3',
      icon: <Package size={20} className="text-indigo-600" />,
      summary: 'Mağazanızdaki tüm ürünlerin, aksesuarların ve mal stoklarının kaydedildiği, düzenlendiği ve yönetildiği ana kütüphanedir.',
      capabilities: [
        'Hızlı arama kutusu ile barkod, ürün adı, marka veya modele göre anında bulma.',
        'Kategori ve Marka bazlı canlı filtreleme.',
        'Yeni ürün eklerken EAN-13 (869...) standart Türkiye barkodunu tek tıkla otomatik üretme.',
        'Alış fiyatı, Satış fiyatı, Varyant (128GB, 256GB), Renk ve Minimum stok eşiği belirleme.',
        'Ürün silme (pasife alma) ve ürün detay kartından birim kâr marjını görüntüleme.',
      ],
      tips: 'Ürün eklerken "Minimum Stok Eşiği" belirlemeyi unutmayın; stok bu seviyeye düştüğünde sistem sizi otomatik uyarır.',
    },
    {
      id: 'categories',
      title: '3. Kategoriler',
      icon: <FolderTree size={20} className="text-cyan-600" />,
      summary: 'Ürünlerinizi düzenli gruplara ayırmak için hiyerarşik kategori ağacı oluşturma ekranıdır.',
      capabilities: [
        'Ana kategoriler (Örn: Aksesuarlar) ve Alt kategoriler (Örn: Şarj Cihazları ➔ Type-C Kablolar) oluşturma.',
        'Her kategorinin altında kaç adet ürün olduğunu canlı görüntüleme.',
        'Kategori adını, üst kategorisini ve açıklamasını güncelleme veya silme.',
      ],
      tips: 'Düzenli kategorilendirme, Fiyat Yönetimi ekranında toplu zam veya indirim yaparken büyük kolaylık sağlar.',
    },
    {
      id: 'stock',
      title: '4. Stok Durumu',
      icon: <Boxes size={20} className="text-amber-600" />,
      summary: 'Deponuzdaki ve raflarınızdaki mevcut ürün stok miktarlarının ve alt stok uyarılarının yönetildiği ekrandır.',
      capabilities: [
        'Stok miktarı tükenmiş (0 adet) ve kritik seviyedeki ürünleri renklendirilmiş rozetlerle inceleme.',
        'Sayım fazlası veya eksiği durumunda manuel stok düzeltme (giriş/çıkış yapma).',
        'Stok değişikliği yaparken açıklama veya neden (Örn: Fire, Sayım Düzeltmesi) kaydetme.',
      ],
      tips: 'Haftalık stok sayımlarınızda fark çıkan ürünlerin stoğunu bu ekrandan tek tıkla güncelleyebilirsiniz.',
    },
    {
      id: 'pos',
      title: '5. Hızlı Satış (POS)',
      badge: 'F1 & ENTER',
      icon: <ShoppingCart size={20} className="text-emerald-600" />,
      summary: 'Kasadayken el tipi barkod okuyucu ile saniyeler içinde hızlı satış yapma ve fiş kesme ekranıdır.',
      capabilities: [
        'El tipi barkod okuyucu ile okutulan ürünü milisaniyeler içinde sepete ekleme.',
        'Sepet geneline tutar veya yüzde bazında indirim/iskonto uygulama.',
        'Nakit veya Kredi Kartı ödeme seçeneği seçme.',
        'ENTER tuşuna basarak satışı anında tamamlama; stoğun otomatik düşmesi ve ciroya işlenmesi.',
      ],
      tips: 'Müşteri kasadayken klavyeden F1 tuşuna basarak hızlıca kasa ekranına geçebilirsiniz.',
    },
    {
      id: 'purchases',
      title: '6. Alış / Stok Girişi',
      badge: 'F4',
      icon: <Truck size={20} className="text-purple-600" />,
      summary: 'Toptancıdan veya tedarikçinizden yeni koli mal geldiğinde ürün girişlerinin yapıldığı ekrandır.',
      capabilities: [
        'Toplu gelen ürünlerin adet, yeni alış maliyeti ve fatura/tedarikçi bilgilerini işleme.',
        'Mal girişi yapıldığında ürün stok adedinin otomatik artması ve yeni alış fiyatının güncellenmesi.',
        'Geçmiş alış belgelerini ve faturaları listeleme.',
      ],
      tips: 'Toptancıdan mal aldığınızda F4 tuşuna basarak alış kaydı oluşturun; stoklarınız ve ürün maliyetleriniz otomatik güncellensin.',
    },
    {
      id: 'price',
      title: '7. Fiyat Yönetimi',
      icon: <DollarSign size={20} className="text-teal-600" />,
      summary: 'Kategorilerdeki ürünlere toplu zam, indirim veya marj bazlı fiyat güncellemesi yapma ekranıdır.',
      capabilities: [
        'Seçili kategorideki ürünlere yüzdesel zam (%15) veya indirim (%10) uygulama.',
        'Tüm ürünlerin fiyatını sabit tutarda (+50 ₺) artırma.',
        'Alış fiyatı üzerine hedeflenen kâr marjını (%35) otomatik olarak hesaplatıp uygulama.',
        'Fiyatlar veritabanına yansımadan önce "Önizleme" tablosunda eski-yeni fiyatları inceleme.',
      ],
      tips: 'Fiyat değişikliği yapmadan önce mutlaka Önizleme butonuna basarak yeni fiyatları kontrol edin, ardından Onayla butonuna tıklayın.',
    },
    {
      id: 'barcode',
      title: '8. Barkod & Etiket Tasarlama',
      icon: <Barcode size={20} className="text-blue-600" />,
      summary: 'Ürünleriniz için EAN-13 standardında termal etiket baskı önizlemesi ve yazdırma ekranıdır.',
      capabilities: [
        'Türkiye perakende standardı olan EAN-13 çizgisel barkod kalıbında etiket hazırlama.',
        'Termal etiket yazıcıları (80mm/58mm) için ürün adı, barkod ve fiyat içeren canlı baskı önizlemesi.',
        'Tek tıkla etiket yazıcınıza baskı komutu gönderme.',
      ],
      tips: 'Barkodsuz gelen kılıf veya kırılmaz cam ürünlerinize sistemden EAN-13 barkod üretip termal etiket basarak ürün üzerine yapıştırabilirsiniz.',
    },
    {
      id: 'stock-movements',
      title: '9. Stok Hareketleri',
      icon: <History size={20} className="text-slate-600" />,
      summary: 'Sistemde gerçekleşen tüm stok giriş, çıkış, satış ve iade işlemlerinin tarih sırasına göre kayıt altına alındığı denetim ekranıdır (Audit Log).',
      capabilities: [
        'Hangi ürünün, ne zaman, hangi işlemle (Satış, Alış, Düzeltme) ve kaç adet değiştiğini inceleme.',
        'İşlemi yapan referans belge kimliğini ve açıklamasını takip etme.',
      ],
      tips: 'Stokta bir uyumsuzluk fark ettiğinizde bu ekrandan ilgili ürünün geçmiş tüm hareketlerini kontrol edebilirsiniz.',
    },
    {
      id: 'reports',
      title: '10. Raporlar & CSV Dışa Aktar',
      icon: <FileBarChart size={20} className="text-pink-600" />,
      summary: 'Belirli tarih aralıklarındaki satış performansınızı, toplam cironuzu ve kârlılığınızı analiz etme ekranıdır.',
      capabilities: [
        'Başlangıç ve bitiş tarihi seçerek tarih aralıklı finansal rapor alma.',
        'Toplam satılan adet, elde edilen ciro ve hesaplanan net kâr tutarını inceleme.',
        'Rapor verilerini tek tıkla Excel uyumlu `.csv` formatında bilgisayarınıza indirme (CSV İndir).',
      ],
      tips: 'Aylık muhasebe ve durum değerlendirmelerinizi almak için tarih aralığı seçip "CSV İndir" butonuna tıklayarak Excel dosyası alabilirsiniz.',
    },
    {
      id: 'backup',
      title: '11. Veritabanı Yedekleme & Geri Yükleme',
      icon: <Database size={20} className="text-amber-600" />,
      summary: 'Verilerinizin kaybolmaması için SQLite veritabanınızın yedeğini alma ve geri yükleme ekranıdır.',
      capabilities: [
        'Şimdi Yedek Al: Bilgisayarınızın ana dizininde `~/stok-takip/backups/` klasörüne anında sıcak yedek alma.',
        'Yedekten Geri Yükle: Eski yedeğinizi seçerek verilerinizi eksiksiz geri yükleme.',
        'Otomatik güvenli yedekleme mekanizması ile verilerinizi koruma.',
      ],
      tips: 'Yedekleriniz bilgisayarınızın ana kullanıcısındaki `stok-takip/backups` klasörüne kaydedilir. Bu klasörü harici bir diske veya cloud sürücünüze kopyalayabilirsiniz.',
    },
    {
      id: 'settings',
      title: '12. Ayarlar',
      icon: <Settings size={20} className="text-slate-600" />,
      summary: 'Mağaza bilgilerinizi, para biriminizi ve otomatik yedekleme sıklığınızı yapılandırdığınız ekrandır.',
      capabilities: [
        'Mağaza unvanı ve fatura başlığı değiştirme.',
        'Varsayılan kâr marjı oranı (%30) tanımlama.',
        'Otomatik yedekleme sıklığını (Günlük / Haftalık / Devre Dışı) seçme.',
      ],
      tips: 'Otomatik yedeklemeyi "Her Gün Otomatik" olarak seçerseniz sistem arka planda günlük düzenli yedeğinizi oluşturur.',
    },
  ];

  const filteredSections = sections.filter(
    (s) =>
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.capabilities.some((c) => c.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-5xl pb-12">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-blue-500/10 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md">
            <BookOpen size={28} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Kullanım Kılavuzu & Ekran Rehberi</h1>
            <p className="text-xs text-blue-100 mt-0.5">
              Kodhanem Stok Takip Programı sistemindeki tüm ekranların ne işe yaradığını, yeteneklerini ve ipuçlarını buradan inceleyebilirsiniz.
            </p>
          </div>
        </div>

        {/* Quick Search */}
        <div className="pt-2 max-w-md">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Ekran adı veya özellik arayın (Örn: POS, Barkod, Yedek)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/95 backdrop-blur-md rounded-lg text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-white shadow-inner"
            />
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Bar */}
      <Card className="bg-slate-900 text-white p-4 border-none shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Command size={18} className="text-blue-400" />
            <span className="font-bold">Hızlı Klavye Kısayolları:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded border border-slate-700 font-mono">
              <strong className="text-blue-400">F1</strong> Satış Ekranı (POS)
            </span>
            <span className="inline-flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded border border-slate-700 font-mono">
              <strong className="text-blue-400">F2</strong> Barkod Arama
            </span>
            <span className="inline-flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded border border-slate-700 font-mono">
              <strong className="text-blue-400">F3</strong> Ürün Ekle
            </span>
            <span className="inline-flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded border border-slate-700 font-mono">
              <strong className="text-blue-400">F4</strong> Mal Alış Girişi
            </span>
            <span className="inline-flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded border border-slate-700 font-mono">
              <strong className="text-emerald-400">ENTER</strong> Satışı Tamamla
            </span>
            <span className="inline-flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded border border-slate-700 font-mono">
              <strong className="text-amber-400">ESC</strong> Kapat / İptal
            </span>
          </div>
        </div>
      </Card>

      {/* Screen Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSections.map((section) => (
          <Card key={section.id} className="space-y-3.5 hover:border-blue-300 transition-colors shadow-sm flex flex-col justify-between">
            <div className="space-y-3">
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-slate-100">{section.icon}</div>
                  <h3 className="text-sm font-extrabold text-slate-900">{section.title}</h3>
                </div>
                {section.badge && <Badge variant="info">{section.badge}</Badge>}
              </div>

              {/* Summary */}
              <p className="text-xs text-slate-600 leading-relaxed font-medium">{section.summary}</p>

              {/* Capabilities List */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Sparkles size={12} className="text-blue-500" /> Ne Yapabilirsiniz?
                </span>
                <ul className="space-y-1 text-xs text-slate-700">
                  {section.capabilities.map((c, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span className="leading-snug">{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Tip Box */}
            <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-100 text-[11px] text-blue-900 leading-snug font-medium mt-3">
              💡 <strong>İpucu:</strong> {section.tips}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
