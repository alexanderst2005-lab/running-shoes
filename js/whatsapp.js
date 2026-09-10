/**
 * Integración con WhatsApp para Running Shoes
 * - Genera mensajes personalizados por producto
 * - Registra automáticamente cada consulta en Firebase Firestore
 *
 * Número de la tienda: +57 318 410 3668
 */

const WHATSAPP_STORE_PHONE = "573184103668";

window.WhatsAppIntegration = {
  phone: WHATSAPP_STORE_PHONE,

  createProductLink: function (productName) {
    const msg = `Hola, estoy interesado en la ${productName}. Quisiera conocer el precio y la disponibilidad.`;
    return `https://wa.me/${this.phone}?text=${encodeURIComponent(msg)}`;
  },

  createGeneralLink: function (subject = 'zapatillas deportivas') {
    const msg = `Hola Running Shoes, quisiera recibir asesoría personalizada sobre ${subject}.`;
    return `https://wa.me/${this.phone}?text=${encodeURIComponent(msg)}`;
  },

  /**
   * Abre WhatsApp y registra la consulta en Firebase
   * @param {Object} product - Objeto completo del producto
   */
  openProductChat: function (product) {
    // 1. Abrir WhatsApp
    const url = this.createProductLink(product.name);
    window.open(url, '_blank', 'noopener,noreferrer');

    // 2. Registrar consulta en Firebase automáticamente
    if (window.productsService && typeof window.productsService.logInquiry === 'function') {
      window.productsService.logInquiry(product).catch(() => {});
    }
  }
};
