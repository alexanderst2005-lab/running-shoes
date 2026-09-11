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
  const authLoading = document.getElementById('auth-loading');
  const loginContainer = document.getElementById('login-container');
  const adminDashboard = document.getElementById('admin-dashboard');
  const loginForm = document.getElementById('login-form');
  const btnLogout = document.getElementById('btn-logout');
  const loginError = document.getElementById('login-error');

  if (isOnline && firebase.auth) {
    // Observar estado de autenticación
    firebase.auth().onAuthStateChanged(user => {
      if (authLoading) authLoading.style.display = 'none';

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
    if (authLoading) authLoading.style.display = 'none';
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
        if (confirm(`¿Estás seguro de que deseas eliminar la zapatilla "${p.name}"?`)) {
          try {
            await deleteImageFile(p.image);
            await window.productsService.deleteProduct(p.id);
            tr.remove();
            await loadDashboardStats();
            document.getElementById('products-count').textContent = `${(await window.productsService.getAllProducts()).length} productos`;
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
  let currentEditProductImage = null;

  async function deleteImageFile(imageUrl) {
    // Ya no usamos Firebase Storage, así que no hay archivos huérfanos que borrar.
    // La imagen base64 se elimina automáticamente al borrar el documento en Firestore.
    return;
  }

  async function compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.7) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = event => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => reject(new Error('No se pudo procesar la imagen'));
      };
      reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    });
  }

  async function uploadImageFile(fileInputId) {
    const fileInput = document.getElementById(fileInputId);
    const file = fileInput.files[0];
    if (!file) return null;
    
    // Convertir y comprimir la imagen a Base64
    return await compressImage(file);
  }

  function openEditModal(product) {
    currentEditProductId = product.id;
    currentEditProductImage = product.image || '';

    document.getElementById('edit-prod-name').value       = product.name || '';
    document.getElementById('edit-prod-brand').value      = product.brandId || 'nike';
    document.getElementById('edit-prod-category').value   = product.category || 'Daily Trainer';
    document.getElementById('edit-prod-price').value      = product.priceCOP || '';
    document.getElementById('edit-prod-image').value      = ''; // Reset file input
    document.getElementById('edit-prod-cushioning').value = product.cushioning || '';
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

      const submitBtn = editForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Guardando...';

      const brandId = document.getElementById('edit-prod-brand').value;
      const brandMap = { nike:'Nike', adidas:'Adidas', 'new-balance':'New Balance', asics:'ASICS', puma:'Puma', reebok:'Reebok' };
      const priceNum = parseInt(document.getElementById('edit-prod-price').value) || 0;

      let imageUrl = null;
      try {
        if (firebase.storage) {
          imageUrl = await uploadImageFile('edit-prod-image');
        }
      } catch (err) {
        alert('❌ Error al subir nueva imagen: ' + err.message);
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
        return;
      }

      // Eliminar imagen antigua si subió una nueva
      if (imageUrl && currentEditProductImage && currentEditProductImage !== imageUrl) {
        await deleteImageFile(currentEditProductImage);
      }

      const updatedData = {
        name:         document.getElementById('edit-prod-name').value,
        brandId,
        brandName:    brandMap[brandId] || brandId.toUpperCase(),
        category:     document.getElementById('edit-prod-category').value,
        priceCOP:     priceNum,
        priceFormatted: `$${priceNum.toLocaleString('es-CO')} COP`,
        image:        imageUrl || currentEditProductImage,
        cushioning:   document.getElementById('edit-prod-cushioning').value,
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
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
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

      const submitBtn = addForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Subiendo imagen y guardando...';

      let imageUrl = '';
      try {
        if (firebase.storage) {
          imageUrl = await uploadImageFile('prod-image');
        }
        if (!imageUrl) {
          // Si no hay Storage o falló sin error, usamos un placeholder
          imageUrl = 'assets/images/hero.jpg'; 
        }
      } catch (err) {
        alert('❌ Error al subir la imagen: ' + err.message);
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
        return;
      }

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
        image:          imageUrl,
        cushioning:     document.getElementById('prod-cushioning').value,
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
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    });
  }

  // ─── CARGA INICIAL ────────────────────────────────────────────────────────
  await loadDashboardStats();
  await loadProductsTable();
});
