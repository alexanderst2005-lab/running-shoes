/**
 * Controlador Principal de Interfaz de Usuario para Running Shoes
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Referencias DOM
  const homeView = document.getElementById('home-view');
  const brandView = document.getElementById('brand-view');
  const brandsGrid = document.getElementById('brands-grid');
  const productsGrid = document.getElementById('products-grid');
  const categoryFilters = document.getElementById('category-filters');
  
  // Brand Header Elements
  const brandTitle = document.getElementById('brand-header-title');
  const brandDesc = document.getElementById('brand-header-desc');
  const brandBadge = document.getElementById('brand-header-badge');
  const btnBackToBrands = document.getElementById('btn-back-to-brands');
  const productCountText = document.getElementById('product-count-text');

  // Search Modal Elements
  const searchModal = document.getElementById('search-modal');
  const btnOpenSearch = document.getElementById('btn-open-search');
  const btnCloseSearch = document.getElementById('btn-close-search');
  const searchInput = document.getElementById('search-input');
  const searchResultsGrid = document.getElementById('search-results-grid');

  // Quick View Modal Elements
  const quickViewModal = document.getElementById('quick-view-modal');
  const btnCloseQuickView = document.getElementById('btn-close-quick-view');
  const modalImg = document.getElementById('modal-product-img');
  const modalTitle = document.getElementById('modal-product-title');
  const modalPrice = document.getElementById('modal-product-price');
  const modalCategory = document.getElementById('modal-product-category');
  const modalDesc = document.getElementById('modal-product-desc');
  const modalCushioning = document.getElementById('modal-spec-cushioning');
  const modalSizesContainer = document.getElementById('modal-sizes-container');
  const btnModalWhatsapp = document.getElementById('btn-modal-whatsapp');

  // State
  let currentBrandId = null;
  let currentFilter = 'all';
  let activeSelectedSize = null;
  let currentModalProduct = null;

  // ------------------------------------------------------------------------
  // 1. INICIALIZACIÓN Y CARGA DE MARCAS (HOMEPAGE)
  // ------------------------------------------------------------------------
  async function renderBrandsGrid() {
    if (!brandsGrid) return;
    brandsGrid.innerHTML = '<div style="color: var(--text-secondary); text-align: center; grid-column: 1/-1;">Cargando marcas...</div>';

    const brands = await window.productsService.getBrands();
    
    // Fetch all product counts concurrently to avoid UI popping/disappearing
    const counts = await Promise.all(brands.map(brand => window.productsService.getProductCountByBrand(brand.id)));

    brandsGrid.innerHTML = '';

    brands.forEach((brand, index) => {
      const productCount = counts[index];

      const card = document.createElement('div');
      card.className = 'brand-card';
      card.dataset.brandId = brand.id;

      card.innerHTML = `
        <img src="${brand.image}" alt="${brand.name}" class="brand-card-img" loading="lazy" />
        <div class="brand-card-overlay">
          <div class="brand-card-top">
            <span class="brand-badge-pill">${productCount} References</span>
            <div class="brand-logo-watermark">${brand.logoText || brand.name}</div>
          </div>
          <div class="brand-card-bottom">
            <h3 class="brand-name">${brand.name}</h3>
            <p class="brand-tagline">${brand.tagline}</p>
            <button class="btn-explore-brand">
              Ver Catálogo Exclusivo
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        openBrandCatalog(brand.id);
      });

      brandsGrid.appendChild(card);
    });
  }

  // ------------------------------------------------------------------------
  // 2. NAVEGACIÓN Y VISTAS (SPA Routing con Historial)
  // ------------------------------------------------------------------------
  
  // Manejo de Historial (Permite usar botón "Atrás" en móviles)
  window.addEventListener('popstate', (e) => {
    if (e.state && e.state.view === 'brand') {
      openBrandCatalog(e.state.brandId, 'all', false);
    } else {
      showHomepage(false);
    }
  });

  // Estado inicial al cargar la página
  history.replaceState({ view: 'home' }, '', window.location.pathname);

  async function openBrandCatalog(brandId, filter = 'all', pushHistory = true) {
    currentBrandId = brandId;
    currentFilter = filter;

    const brand = await window.productsService.getBrandById(brandId);
    if (!brand) return;

    // Actualizar Encabezado de la Marca
    if (brandTitle) brandTitle.textContent = brand.name;
    if (brandDesc) brandDesc.textContent = brand.description || brand.tagline;
    if (brandBadge) brandBadge.textContent = `${brand.name} Official`;

    // Cambiar Vistas
    homeView.style.display = 'none';
    brandView.classList.add('active');

    // Desplazarse suavemente arriba
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Guardar en el historial del navegador
    if (pushHistory) {
      history.pushState({ view: 'brand', brandId: brandId }, '', `#marca-${brandId}`);
    }

    // Cargar Catálogo
    await renderBrandProducts(brandId, filter);
  }

  function showHomepage(pushHistory = true) {
    currentBrandId = null;
    brandView.classList.remove('active');
    homeView.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (pushHistory) {
      history.pushState({ view: 'home' }, '', window.location.pathname);
    }
  }

  if (btnBackToBrands) {
    btnBackToBrands.addEventListener('click', () => showHomepage(true));
  }

  // Renderizar Productos de la Marca Seleccionada
  async function renderBrandProducts(brandId, filter = 'all') {
    if (!productsGrid) return;

    productsGrid.innerHTML = '<div style="color: var(--text-secondary); text-align: center; grid-column: 1/-1; padding: 40px;">Cargando catálogo...</div>';

    let products = await window.productsService.getProductsByBrand(brandId);

    // Generar Chips de Categorías Únicas
    const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))];
    renderCategoryFilters(categories, filter);

    // Filtrar Productos si hay categoría activa
    if (filter !== 'all') {
      products = products.filter(p => p.category === filter);
    }

    if (productCountText) {
      productCountText.textContent = `Mostrando ${products.length} zapatillas disponibles`;
    }

    if (products.length === 0) {
      productsGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-secondary);">
          <h3>No hay referencias en esta categoría</h3>
          <p style="margin-top: 8px;">Selecciona "Todas" para explorar todos los modelos de esta marca.</p>
        </div>
      `;
      return;
    }

    productsGrid.innerHTML = '';

    products.forEach(product => {
      const card = createProductCard(product);
      productsGrid.appendChild(card);
    });
  }

  // Componente de Tarjeta de Producto
  function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';

    const priceText = product.priceFormatted || (product.priceCOP ? `$${product.priceCOP.toLocaleString('es-CO')} COP` : 'Consultar Precio');

    card.innerHTML = `
      <div class="product-card-header">
        ${product.badge ? `<span class="product-badge">${product.badge}</span>` : ''}
        <span class="product-brand-tag">${product.brandName}</span>
        <img src="${product.image}" alt="${product.name}" class="product-img" loading="lazy" />
      </div>
      <div class="product-card-body">
        <div class="product-category">${product.category || 'Running'}</div>
        <h4 class="product-title">${product.name}</h4>
        
        <div class="product-specs-pills">
          ${product.cushioning ? `<span class="spec-pill">${product.cushioning}</span>` : ''}
        </div>

        <div class="product-price-row">
          <div class="product-price">${priceText}</div>
        </div>

        <button class="btn-whatsapp-product" data-product-name="${product.name}">
          <svg viewBox="0 0 24 24"><path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984 0 1.764.459 3.487 1.333 5.003l-1.417 5.176 5.297-1.389c1.46.797 3.109 1.216 4.777 1.217h.004c5.505 0 9.988-4.478 9.989-9.985 0-2.667-1.037-5.174-2.924-7.062s-4.394-2.944-7.063-2.944zm5.72 14.162c-.244.688-1.42 1.309-1.956 1.393-.535.084-1.218.125-3.524-.805-2.949-1.189-4.85-4.185-4.998-4.382-.148-.198-1.203-1.602-1.203-3.056 0-1.454.762-2.17 1.034-2.464.272-.294.593-.367.791-.367.198 0 .396.002.569.011.183.009.431-.07.674.513.247.593.841 2.054.915 2.203.074.148.124.322.025.517-.099.198-.148.322-.296.495-.148.173-.312.387-.446.52-.148.148-.302.309-.13.605.173.297.768 1.267 1.649 2.051 1.134 1.01 2.091 1.322 2.388 1.47.297.148.47.124.643-.074.173-.198.742-.865.94-1.162.198-.297.396-.247.667-.148.272.099 1.73.816 2.027.965.297.148.495.223.569.347.074.124.074.717-.17 1.405z"/></svg>
          <span>Consultar por WhatsApp</span>
        </button>
      </div>
    `;

    // Click en la tarjeta abre el Modal Quick View
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.btn-whatsapp-product')) {
        openQuickViewModal(product);
      }
    });

    // Click en el Botón WhatsApp abre directamente WhatsApp y registra en Firebase
    const btnWp = card.querySelector('.btn-whatsapp-product');
    btnWp.addEventListener('click', (e) => {
      e.stopPropagation();
      window.WhatsAppIntegration.openProductChat(product);
    });

    return card;
  }

  // Chips de Filtrado
  function renderCategoryFilters(categories, activeFilter) {
    if (!categoryFilters) return;
    categoryFilters.innerHTML = '';

    categories.forEach(cat => {
      const chip = document.createElement('button');
      chip.className = `filter-chip ${cat === activeFilter ? 'active' : ''}`;
      chip.textContent = cat === 'all' ? 'Todas las Categorías' : cat;

      chip.addEventListener('click', () => {
        renderBrandProducts(currentBrandId, cat);
      });

      categoryFilters.appendChild(chip);
    });
  }

  // ------------------------------------------------------------------------
  // 3. MODAL QUICK VIEW & SELECCIÓN DE TALLA
  // ------------------------------------------------------------------------
  function openQuickViewModal(product) {
    currentModalProduct = product;
    activeSelectedSize = null;

    modalImg.src = product.image;
    modalImg.alt = product.name;
    modalTitle.textContent = product.name;
    modalPrice.textContent = product.priceFormatted || (product.priceCOP ? `$${product.priceCOP.toLocaleString('es-CO')} COP` : 'Consultar');
    modalCategory.textContent = `${product.brandName} • ${product.category || 'Running'}`;
    modalDesc.textContent = product.description || 'Calzado deportivo de alto rendimiento diseñado para ofrecer amortiguación superior, estabilidad y retorno de energía.';

    modalCushioning.textContent = product.cushioning || 'Alta';

    // Renderizar Tallas
    modalSizesContainer.innerHTML = '';
    const sizes = product.sizes || ["38", "39", "40", "41", "42", "43", "44"];

    sizes.forEach(size => {
      const sizeBtn = document.createElement('button');
      sizeBtn.className = 'size-btn';
      sizeBtn.textContent = size;

      sizeBtn.addEventListener('click', () => {
        document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
        sizeBtn.classList.add('active');
        activeSelectedSize = size;
      });

      modalSizesContainer.appendChild(sizeBtn);
    });

    quickViewModal.classList.add('active');
  }

  if (btnCloseQuickView) {
    btnCloseQuickView.addEventListener('click', () => {
      quickViewModal.classList.remove('active');
    });
  }

  if (btnModalWhatsapp) {
    btnModalWhatsapp.addEventListener('click', () => {
      if (currentModalProduct) {
        window.WhatsAppIntegration.openProductChat(currentModalProduct.name, activeSelectedSize);
      }
    });
  }

  // ------------------------------------------------------------------------
  // 4. BÚSQUEDA INTERACTIVA RAPIDA
  // ------------------------------------------------------------------------
  if (btnOpenSearch) {
    btnOpenSearch.addEventListener('click', () => {
      searchModal.classList.add('active');
      searchInput.focus();
    });
  }

  if (btnCloseSearch) {
    btnCloseSearch.addEventListener('click', () => {
      searchModal.classList.remove('active');
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', async (e) => {
      const query = e.target.value.trim();
      if (query.length < 2) {
        searchResultsGrid.innerHTML = '<div style="color: var(--text-muted); text-align: center; grid-column: 1/-1;">Escribe el nombre de la marca o modelo de zapatilla...</div>';
        return;
      }

      const results = await window.productsService.searchProducts(query);
      searchResultsGrid.innerHTML = '';

      if (results.length === 0) {
        searchResultsGrid.innerHTML = '<div style="color: var(--text-secondary); text-align: center; grid-column: 1/-1;">No encontramos zapatillas con ese nombre.</div>';
        return;
      }

      results.forEach(product => {
        const card = createProductCard(product);
        searchResultsGrid.appendChild(card);
      });
    });
  }

  // ------------------------------------------------------------------------
  // INICIALIZACIÓN
  // ------------------------------------------------------------------------
  await renderBrandsGrid();
});
