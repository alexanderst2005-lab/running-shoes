/**
 * Servicio de Productos y Consultas para Running Shoes
 * - Firebase Firestore como base de datos principal
 * - Catálogo local como respaldo automático
 */

class ProductsService {
  constructor() {
    this.db = null;
    this.ready = false;
    this._init();
  }

  _init() {
    try {
      if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        this.db = firebase.firestore();
        this.ready = true;
        console.log('✅ Firestore conectado correctamente.');
      } else {
        console.warn('⚠️ Firebase no disponible. Usando catálogo local.');
      }
    } catch (e) {
      console.error('❌ Error al conectar Firestore:', e);
    }
  }

  // ─── CACHE UTILS ───────────────────────────────────────────────────────────
  _isCacheEnabled() {
    return typeof window !== 'undefined' && !window.location.pathname.includes('admin.html');
  }

  // ─── MARCAS ────────────────────────────────────────────────────────────────

  async getBrands() {
    const cacheKey = 'rs_cache_brands';
    if (this._isCacheEnabled()) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        this._fetchBrands().then(d => localStorage.setItem(cacheKey, JSON.stringify(d)));
        return JSON.parse(cached);
      }
    }
    const data = await this._fetchBrands();
    if (this._isCacheEnabled()) localStorage.setItem(cacheKey, JSON.stringify(data));
    return data;
  }

  async _fetchBrands() {
    if (this.db) {
      try {
        const snap = await this.db.collection('brands').orderBy('name').get();
        if (!snap.empty) {
          return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
      } catch (e) { console.warn('Error leyendo marcas:', e); }
    }
    return [...INITIAL_BRANDS];
  }

  async getBrandById(brandId) {
    const brands = await this.getBrands();
    return brands.find(b => b.id === brandId) || null;
  }

  // ─── PRODUCTOS ─────────────────────────────────────────────────────────────

  async getAllProducts() {
    const cacheKey = 'rs_cache_all_products';
    if (this._isCacheEnabled()) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        this._fetchAllProducts().then(d => localStorage.setItem(cacheKey, JSON.stringify(d)));
        return JSON.parse(cached);
      }
    }
    const data = await this._fetchAllProducts();
    if (this._isCacheEnabled()) localStorage.setItem(cacheKey, JSON.stringify(data));
    return data;
  }

  async _fetchAllProducts() {
    if (this.db) {
      try {
        const snap = await this.db.collection('products').get();
        if (!snap.empty) return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) { console.warn('Error leyendo productos:', e); }
    }
    return [...INITIAL_PRODUCTS];
  }

  async getProductsByBrand(brandId) {
    const cacheKey = `rs_cache_products_${brandId}`;
    if (this._isCacheEnabled()) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        this._fetchProductsByBrand(brandId).then(d => localStorage.setItem(cacheKey, JSON.stringify(d)));
        return JSON.parse(cached);
      }
    }
    const data = await this._fetchProductsByBrand(brandId);
    if (this._isCacheEnabled()) localStorage.setItem(cacheKey, JSON.stringify(data));
    return data;
  }

  async _fetchProductsByBrand(brandId) {
    if (this.db) {
      try {
        const snap = await this.db.collection('products')
          .where('brandId', '==', brandId).get();
        if (!snap.empty) return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) { console.warn('Error leyendo productos de marca:', e); }
    }
    return INITIAL_PRODUCTS.filter(p => p.brandId === brandId);
  }

  async getProductById(productId) {
    if (this.db) {
      try {
        const doc = await this.db.collection('products').doc(productId).get();
        if (doc.exists) return { id: doc.id, ...doc.data() };
      } catch (e) { console.warn('Error leyendo producto:', e); }
    }
    return INITIAL_PRODUCTS.find(p => p.id === productId) || null;
  }

  async searchProducts(query) {
    if (!query) return [];
    const q = query.toLowerCase();
    const all = await this.getAllProducts();
    return all.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.brandName.toLowerCase().includes(q) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  }

  async getProductCountByBrand(brandId) {
    const products = await this.getProductsByBrand(brandId);
    return products.length;
  }

  async addProduct(data) {
    if (this.db) {
      const ref = await this.db.collection('products').add({
        ...data,
        createdAt: new Date().toISOString()
      });
      return ref.id;
    }
    const id = `local-${Date.now()}`;
    INITIAL_PRODUCTS.unshift({ id, ...data });
    return id;
  }

  async updateProduct(productId, data) {
    if (this.db) {
      await this.db.collection('products').doc(productId).update(data);
      return;
    }
    const i = INITIAL_PRODUCTS.findIndex(p => p.id === productId);
    if (i !== -1) INITIAL_PRODUCTS[i] = { ...INITIAL_PRODUCTS[i], ...data };
  }

  async deleteProduct(productId) {
    if (this.db) {
      await this.db.collection('products').doc(productId).delete();
      return;
    }
    const i = INITIAL_PRODUCTS.findIndex(p => p.id === productId);
    if (i !== -1) INITIAL_PRODUCTS.splice(i, 1);
  }

  // ─── CONSULTAS / PEDIDOS ───────────────────────────────────────────────────

  async logInquiry(product) {
    if (!this.db) return;
    try {
      await this.db.collection('inquiries').add({
        productId: product.id || '',
        productName: product.name,
        brandId: product.brandId || '',
        brandName: product.brandName || '',
        status: 'pending',
        createdAt: new Date().toISOString(),
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) {
      console.warn('No se pudo registrar consulta:', e);
    }
  }

  async getInquiries() {
    if (!this.db) return [];
    try {
      const snap = await this.db.collection('inquiries')
        .orderBy('timestamp', 'desc').limit(100).get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('Error leyendo consultas:', e);
      return [];
    }
  }

  async updateInquiryStatus(inquiryId, status) {
    if (!this.db) return;
    await this.db.collection('inquiries').doc(inquiryId).update({ status });
  }

  async deleteInquiry(inquiryId) {
    if (!this.db) return;
    await this.db.collection('inquiries').doc(inquiryId).delete();
  }

  // ─── ESTADÍSTICAS ──────────────────────────────────────────────────────────

  async getStats() {
    const products = await this.getAllProducts();
    const inquiries = await this.getInquiries();

    const brandCounts = {};
    products.forEach(p => {
      brandCounts[p.brandName] = (brandCounts[p.brandName] || 0) + 1;
    });

    const inquiryByBrand = {};
    inquiries.forEach(i => {
      inquiryByBrand[i.brandName] = (inquiryByBrand[i.brandName] || 0) + 1;
    });

    // Producto más consultado
    const productInquiries = {};
    inquiries.forEach(i => {
      productInquiries[i.productName] = (productInquiries[i.productName] || 0) + 1;
    });
    const topProduct = Object.entries(productInquiries)
      .sort((a, b) => b[1] - a[1])[0];

    const pending = inquiries.filter(i => i.status === 'pending').length;
    const confirmed = inquiries.filter(i => i.status === 'confirmed').length;
    const delivered = inquiries.filter(i => i.status === 'delivered').length;

    return {
      totalProducts: products.length,
      totalInquiries: inquiries.length,
      pendingInquiries: pending,
      confirmedInquiries: confirmed,
      deliveredInquiries: delivered,
      topProduct: topProduct ? topProduct[0] : 'Sin datos',
      topProductCount: topProduct ? topProduct[1] : 0,
      brandCounts,
      inquiryByBrand
    };
  }

  // ─── INICIALIZACIÓN DE DATOS ───────────────────────────────────────────────

  async seedInitialData() {
    if (!this.db) throw new Error('Firestore no está disponible. Verifica las credenciales.');

    const batchSize = 20;
    const allItems = [
      ...INITIAL_BRANDS.map(b => ({ col: 'brands', id: b.id, data: b })),
      ...INITIAL_PRODUCTS.map(p => ({ col: 'products', id: p.id, data: p }))
    ];

    for (let i = 0; i < allItems.length; i += batchSize) {
      const chunk = allItems.slice(i, i + batchSize);
      const batch = this.db.batch();
      chunk.forEach(item => {
        const ref = this.db.collection(item.col).doc(item.id);
        batch.set(ref, item.data, { merge: true });
      });
      await batch.commit();
    }
    return true;
  }
}

window.productsService = new ProductsService();
