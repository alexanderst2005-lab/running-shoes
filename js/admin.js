/**
 * Controlador del Panel de Administración para Running Shoes
 * - Estadísticas del catálogo
 * - Inicialización / Seeding de Firebase Firestore
 * - CRUD completo de productos (Crear, Editar, Eliminar)
 */

document.addEventListener('DOMContentLoaded', async () => {

  // ─── ESTADO FIREBASE ────────────────────────────────────────────────────
  const badge = document.getElementById('firebase-status-badge');
  const statDbStatus = document.getElementById('stat-db-status');
  
  const isOnline = window.RUNNING_SHOES_FIREBASE && window.RUNNING_SHOES_FIREBASE.isConfigured();

  if (badge) {
    badge.className = isOnline
      ? 'admin-status-badge firebase-online'
      : 'admin-status-badge firebase-local';
    badge.innerHTML = isOnline
      ? '⚡ Firebase Conectado'
      : '⚠️ Modo Local (Sin Firebase)';
  }

  if (statDbStatus) {
    statDbStatus.textContent = isOnline ? 'Firebase Cloud' : 'Catálogo Local';
  }

  // ─── AUTENTICACIÓN FIREBASE ───────────────────────────────────────────────
  const loginContainer = document.getElementById('login-container');
  const adminDashboard = document.getElementById('admin-dashboard');
  const loginForm = document.getElementById('login-form');
  const btnLogout = document.getElementById('btn-logout');
  const loginError = document.getElementById('login-error');

  if (isOnline && firebase.auth) {
    // Observar estado de autenticación
    firebase.auth().onAuthStateChanged(user => {
      if (user) {
        // Usuario logueado
        loginContainer.style.display = 'none';
        adminDashboard.style.display = 'block';
        btnLogout.style.display = 'block';
        
        // Cargar datos del dashboard al iniciar sesión
        loadDashboardStats();
        loadProductsTable();
      } else {
        // Sin sesión
        loginContainer.style.display = 'flex';
        adminDashboard.style.display = 'none';
        btnLogout.style.display = 'none';
      }
    });

    // Manejar envío del formulario de login
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        loginError.style.display = 'none';
        
        try {
          await firebase.auth().signInWithEmailAndPassword(email, password);
        } catch (error) {
          console.error("Error de login:", error);
          loginError.style.display = 'block';
          if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
             loginError.textContent = 'Correo o contraseña incorrectos.';
          } else {
             loginError.textContent = 'Error al iniciar sesión. Verifica tu conexión.';
          }
        }
      });
    }

    // Manejar cierre de sesión
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        firebase.auth().signOut();
      });
    }
  } else {
    // Si no hay Firebase (modo local), mostrar dashboard para pruebas locales
    loginContainer.style.display = 'none';
    adminDashboard.style.display = 'block';
    loadDashboardStats();
    loadProductsTable();
  }

  // ─── SEEDING DE DATOS EN FIREBASE ─────────────────────────────────────────
  const btnSeed = document.getElementById('btn-seed-firebase');
  if (btnSeed) {
    btnSeed.addEventListener('click', async () => {
      btnSeed.disabled = true;
      btnSeed.textContent = '⏳ Subiendo a Firebase...';
      try {
        await window.productsService.seedInitialData();
        alert('✅ ¡Base de datos inicializada con éxito! El catálogo base fue guardado en Firebase Firestore.');
        await loadDashboardStats();
        await loadProductsTable();
      } catch (err) {
        alert('❌ Error al inicializar: ' + err.message);
      } finally {
        btnSeed.disabled = false;
        btnSeed.textContent = '🌱 Inicializar Firestore (1-Clic)';
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 1. DASHBOARD — ESTADÍSTICAS DEL CATÁLOGO
  // ══════════════════════════════════════════════════════════════════════════
  async function loadDashboardStats() {
    const products = await window.productsService.getAllProducts();
    
    // Contadores
    const totalProducts = products.length;
    const uniqueBrands = new Set(products.map(p => p.brandId)).size;
    const featuredCount = products.filter(p => p.badge && p.badge.trim() !== '').length;

    setText('stat-total-products', totalProducts);
    setText('stat-total-brands', uniqueBrands);
    setText('stat-featured-count', featuredCount);
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 2. GESTIÓN DE PRODUCTOS — TABLA E INVENTARIO
  // ══════════════════════════════════════════════════════════════════════════
  let currentEditProductId = null;

  async function loadProductsTable(brandFilter = 'all') {
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-secondary);">Cargando inventario...</td></tr>';

    let products = await window.productsService.getAllProducts();
    if (brandFilter !== 'all') {
      products = products.filter(p => p.brandId === brandFilter);
    }

    const countEl = document.getElementById('products-count');
    if (countEl) countEl.textContent = `${products.length} productos`;

    if (products.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty-state">
              <div class="empty-icon">📦</div>
              <div class="empty-title">Sin productos registrados</div>
              <div class="empty-desc">Agrega zapatillas con el formulario de la izquierda o haz clic en "Inicializar Firestore".</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = '';
    products.forEach(p => {
      const priceText = p.priceFormatted || (p.priceCOP ? `$${Number(p.priceCOP).toLocaleString('es-CO')} COP` : 'N/A');
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><img src="${p.image}" class="product-thumb" alt="${p.name}" onerror="this.src='https://via.placeholder.com/52'" /></td>
        <td><strong>${p.name}</strong> ${p.badge ? `<br><small style="color:var(--accent-green);font-size:0.75rem;">🏷️ ${p.badge}</small>` : ''}</td>
        <td><span class="badge-status badge-confirmed">${p.brandName || p.brandId}</span></td>
        <td style="color:var(--text-secondary);font-size:0.85rem;">${p.category || 'Running'}</td>
        <td style="color:var(--accent-green);font-weight:700;">${priceText}</td>
        <td>
          <div class="table-actions">
            <button class="btn-edit btn-edit-product" data-id="${p.id}">✏️ Editar</button>
            <button class="btn-danger btn-delete-product" data-id="${p.id}">🗑️ Eliminar</button>
          </div>
        </td>
      `;

      // Event listener para Editar
      tr.querySelector('.btn-edit-product').addEventListener('click', () => openEditModal(p));

      // Event listener para Eliminar
      tr.querySelector('.btn-delete-product').addEventListener('click', async () => {
        if (confirm(`¿Estás seguro de eliminar "${p.name}"?`)) {
          try {
            await window.productsService.deleteProduct(p.id);
            alert(`✅ "${p.name}" ha sido eliminado.`);
            await loadProductsTable(filterBrandEl ? filterBrandEl.value : 'all');
            await loadDashboardStats();
          } catch (err) {
            alert('❌ Error al eliminar: ' + err.message);
          }
        }
      });

      tbody.appendChild(tr);
    });
  }

  // Filtro por marca
  const filterBrandEl = document.getElementById('filter-brand-admin');
  if (filterBrandEl) {
    filterBrandEl.addEventListener('change', () => {
      loadProductsTable(filterBrandEl.value);
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 3. MODAL DE EDICIÓN DE PRODUCTO
  // ══════════════════════════════════════════════════════════════════════════
  const editModal = document.getElementById('edit-product-modal');
  const btnCloseEdit = document.getElementById('btn-close-edit-modal');
  const btnCancelEdit = document.getElementById('btn-cancel-edit');

  function openEditModal(product) {
    currentEditProductId = product.id;

    document.getElementById('edit-prod-name').value       = product.name || '';
    document.getElementById('edit-prod-brand').value      = product.brandId || 'nike';
    document.getElementById('edit-prod-category').value   = product.category || 'Daily Trainer';
    document.getElementById('edit-prod-price').value      = product.priceCOP || '';
    document.getElementById('edit-prod-image').value      = product.image || '';
    document.getElementById('edit-prod-cushioning').value = product.cushioning || '';
    document.getElementById('edit-prod-weight').value     = product.weight || '';
    document.getElementById('edit-prod-drop').value       = product.drop || '';
    document.getElementById('edit-prod-badge').value      = product.badge || '';
    document.getElementById('edit-prod-desc').value       = product.description || '';

    editModal.classList.add('active');
  }

  function closeEditModal() {
    if (editModal) editModal.classList.remove('active');
    currentEditProductId = null;
  }

  if (btnCloseEdit) btnCloseEdit.addEventListener('click', closeEditModal);
  if (btnCancelEdit) btnCancelEdit.addEventListener('click', closeEditModal);

  const editForm = document.getElementById('edit-product-form');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!currentEditProductId) return;

      const brandId = document.getElementById('edit-prod-brand').value;
      const brandMap = { nike:'Nike', adidas:'Adidas', 'new-balance':'New Balance', asics:'ASICS', puma:'Puma', reebok:'Reebok' };
      const priceNum = parseInt(document.getElementById('edit-prod-price').value) || 0;

      const updatedData = {
        name:         document.getElementById('edit-prod-name').value,
        brandId,
        brandName:    brandMap[brandId] || brandId.toUpperCase(),
        category:     document.getElementById('edit-prod-category').value,
        priceCOP:     priceNum,
        priceFormatted: `$${priceNum.toLocaleString('es-CO')} COP`,
        image:        document.getElementById('edit-prod-image').value,
        cushioning:   document.getElementById('edit-prod-cushioning').value,
        weight:       document.getElementById('edit-prod-weight').value,
        drop:         document.getElementById('edit-prod-drop').value,
        badge:        document.getElementById('edit-prod-badge').value,
        description:  document.getElementById('edit-prod-desc').value,
      };

      try {
        await window.productsService.updateProduct(currentEditProductId, updatedData);
        closeEditModal();
        alert(`✅ "${updatedData.name}" actualizado con éxito.`);
        await loadProductsTable(filterBrandEl ? filterBrandEl.value : 'all');
        await loadDashboardStats();
      } catch (err) {
        alert('❌ Error al actualizar producto: ' + err.message);
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 4. FORMULARIO PARA AGREGAR NUEVA ZAPATILLA
  // ══════════════════════════════════════════════════════════════════════════
  const addForm = document.getElementById('add-product-form');
  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const brandId = document.getElementById('prod-brand').value;
      const brandMap = { nike:'Nike', adidas:'Adidas', 'new-balance':'New Balance', asics:'ASICS', puma:'Puma', reebok:'Reebok' };
      const priceNum = parseInt(document.getElementById('prod-price').value) || 0;

      const newProduct = {
        brandId,
        brandName:      brandMap[brandId] || brandId.toUpperCase(),
        name:           document.getElementById('prod-name').value,
        category:       document.getElementById('prod-category').value,
        priceCOP:       priceNum,
        priceFormatted: `$${priceNum.toLocaleString('es-CO')} COP`,
        image:          document.getElementById('prod-image').value,
        cushioning:     document.getElementById('prod-cushioning').value,
        weight:         document.getElementById('prod-weight').value,
        drop:           document.getElementById('prod-drop').value,
        badge:          document.getElementById('prod-badge').value,
        description:    document.getElementById('prod-desc').value,
        sizes:          ["38","39","40","41","42","43","44"]
      };

      try {
        await window.productsService.addProduct(newProduct);
        alert(`✅ "${newProduct.name}" guardado exitosamente.`);
        addForm.reset();
        await loadProductsTable(filterBrandEl ? filterBrandEl.value : 'all');
        await loadDashboardStats();
      } catch (err) {
        alert('❌ Error al guardar la zapatilla: ' + err.message);
      }
    });
  }

  // ─── CARGA INICIAL ────────────────────────────────────────────────────────
  await loadDashboardStats();
  await loadProductsTable();
});
