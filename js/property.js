// js/property.js
// Handles property detail page: Firestore loading + smart app redirect

// ====== CONFIGURATION ======
// TODO: Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCTKqOzIxyvD7mLGIefVDb79VTO0oHi1M8",
  authDomain: "ubiqa-production.firebaseapp.com",
  projectId: "ubiqa-production",
  storageBucket: "ubiqa-production.firebasestorage.app",
  messagingSenderId: "533701055644",
  appId: "1:533701055644:web:f10d7369a51bca08108959"
};

// TODO: Update these with actual app store URLs when ready
const APP_STORE_URL = "https://apps.apple.com/app/oqupa/idXXXXXXXXX";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.oqupa.app";

// Custom URL scheme for the app (iOS/Android)
const APP_URL_SCHEME = "oqupa://";

// ====== INITIALIZE FIREBASE ======
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ====== UTILITY FUNCTIONS ======

/**
 * Get property ID from URL
 * Supports: /property.html?id=abc123 or /property/abc123
 */
function getPropertyIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const queryId = urlParams.get('id');
  
  if (queryId) return queryId;
  
  // Check path segments: /property/abc123
  const pathSegments = window.location.pathname.split('/').filter(Boolean);
  const propertyIndex = pathSegments.indexOf('property');
  
  if (propertyIndex !== -1 && pathSegments[propertyIndex + 1]) {
    return pathSegments[propertyIndex + 1].replace('.html', '');
  }
  
  return null;
}

/**
 * Detect if user is on mobile device
 */
function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Detect platform (iOS, Android, or desktop)
 */
function getPlatform() {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

/**
 * Format price with Peruvian Soles
 */
function formatPrice(price) {
  if (!price) return 'Precio no disponible';
  return `S/ ${price.toLocaleString('es-PE')}`;
}

/**
 * Format location string
 */
function formatLocation(listing) {
  const parts = [];
  if (listing.district) parts.push(listing.district);
  if (listing.city) parts.push(listing.city);
  if (listing.region) parts.push(listing.region);
  
  return parts.join(', ') || 'Ubicación no especificada';
}

// ====== SMART APP REDIRECT ======

/**
 * Attempt to open the app, fallback to store if not installed
 */
function tryOpenApp(propertyId) {
  const platform = getPlatform();
  const deepLink = `${APP_URL_SCHEME}property/${propertyId}`;
  
  // Universal link (will open app if installed)
  const universalLink = `https://www.oqupa.com/property/${propertyId}`;
  
  if (platform === 'ios') {
    // Try to open app via universal link
    window.location.href = universalLink;
    
    // Fallback to App Store after 2 seconds if app didn't open
    setTimeout(() => {
      window.location.href = APP_STORE_URL;
    }, 2000);
    
  } else if (platform === 'android') {
    // Try to open app via app link
    window.location.href = universalLink;
    
    // Fallback to Play Store after 2 seconds if app didn't open
    setTimeout(() => {
      window.location.href = PLAY_STORE_URL;
    }, 2000);
    
  } else {
    // Desktop: show QR code or email link (future feature)
    alert('Descarga la app de Oqupa en tu móvil para ver esta propiedad');
  }
}

/**
 * Setup smart app banner
 */
function setupAppBanner(propertyId) {
  const platform = getPlatform();
  const openAppButton = document.getElementById('open-app-button');
  const iosDownload = document.getElementById('ios-download');
  const androidDownload = document.getElementById('android-download');
  
  if (platform === 'ios') {
    iosDownload.style.display = 'inline-flex';
    iosDownload.href = APP_STORE_URL;
  } else if (platform === 'android') {
    androidDownload.style.display = 'inline-flex';
    androidDownload.href = PLAY_STORE_URL;
  }
  
  // "Open in App" button
  openAppButton.addEventListener('click', (e) => {
    e.preventDefault();
    tryOpenApp(propertyId);
  });
}

// ====== RENDER PROPERTY DATA ======

/**
 * Render property details on the page
 */
function renderProperty(listing, propertyId) {
  // Update page title and meta tags
  const title = listing.title || 'Propiedad en Oqupa';
  document.getElementById('page-title').textContent = title;
  document.getElementById('og-title').setAttribute('content', title);
  document.getElementById('twitter-title').setAttribute('content', title);
  
  const description = listing.description?.substring(0, 160) || 'Encuentra tu próxima propiedad en Piura';
  document.getElementById('page-description').setAttribute('content', description);
  document.getElementById('og-description').setAttribute('content', description);
  document.getElementById('twitter-description').setAttribute('content', description);
  
  // Update Open Graph image
  if (listing.images && listing.images.length > 0) {
    const imageUrl = listing.images[0];
    document.getElementById('og-image').setAttribute('content', imageUrl);
    document.getElementById('twitter-image').setAttribute('content', imageUrl);
    document.getElementById('property-image').src = imageUrl;
    document.getElementById('property-image').alt = title;
  }
  
  // Update URL
  const currentUrl = window.location.href;
  document.getElementById('og-url').setAttribute('content', currentUrl);
  
  // Price
  document.getElementById('property-price').textContent = formatPrice(listing.price);
  
  // Title
  document.getElementById('property-title').textContent = title;
  
  // Location
  const locationSpan = document.querySelector('#property-location span');
  locationSpan.textContent = formatLocation(listing);
  
  // Features
  const featuresContainer = document.getElementById('property-features');
  featuresContainer.innerHTML = '';
  
  if (listing.bedrooms) {
    featuresContainer.innerHTML += `
      <div class="feature">
        🛏️ ${listing.bedrooms} ${listing.bedrooms === 1 ? 'Dormitorio' : 'Dormitorios'}
      </div>
    `;
  }
  
  if (listing.bathrooms) {
    featuresContainer.innerHTML += `
      <div class="feature">
        🚿 ${listing.bathrooms} ${listing.bathrooms === 1 ? 'Baño' : 'Baños'}
      </div>
    `;
  }
  
  if (listing.area) {
    featuresContainer.innerHTML += `
      <div class="feature">
        📏 ${listing.area} m²
      </div>
    `;
  }
  
  if (listing.propertyType) {
    const typeLabels = {
      house: 'Casa',
      apartment: 'Departamento',
      land: 'Terreno',
      commercial: 'Local Comercial',
      office: 'Oficina'
    };
    const typeLabel = typeLabels[listing.propertyType] || listing.propertyType;
    
    featuresContainer.innerHTML += `
      <div class="feature">
        🏠 ${typeLabel}
      </div>
    `;
  }
  
  // Description
  document.getElementById('property-description').textContent = listing.description || 'Sin descripción disponible.';
  
  // Contact button (WhatsApp)
  const contactButton = document.getElementById('contact-button');
  if (listing.contactPhone) {
    const phone = listing.contactPhone.replace(/\D/g, ''); // Remove non-digits
    const message = encodeURIComponent(`Hola, me interesa la propiedad: ${title}`);
    contactButton.href = `https://wa.me/${phone}?text=${message}`;
  } else {
    contactButton.style.display = 'none';
  }
  
  // Setup app banner
  setupAppBanner(propertyId);
  
  // Show content, hide loading
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('property-content').style.display = 'block';
}

/**
 * Show error state
 */
function showError() {
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('error-state').style.display = 'block';
}

// ====== LOAD PROPERTY FROM FIRESTORE ======

/**
 * Load property data from Firestore
 */
async function loadProperty(propertyId) {
  try {
    console.log('Loading property:', propertyId);
    
    // Fetch from Firestore
    const docRef = db.collection('listings').doc(propertyId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      console.error('Property not found');
      showError();
      return;
    }
    
    const listing = doc.data();
    console.log('Property loaded:', listing);
    
    // Check if listing is active (not deleted/expired)
    if (listing.status === 'deleted' || listing.status === 'inactive') {
      console.error('Property is not active');
      showError();
      return;
    }
    
    // Render the property
    renderProperty(listing, propertyId);
    
    // Track view (optional - increment view count)
    // await docRef.update({
    //   viewCount: firebase.firestore.FieldValue.increment(1)
    // });
    
  } catch (error) {
    console.error('Error loading property:', error);
    showError();
  }
}

// ====== INITIALIZE PAGE ======

/**
 * Initialize the property page
 */
function initPropertyPage() {
  const propertyId = getPropertyIdFromUrl();
  
  if (!propertyId) {
    console.error('No property ID found in URL');
    showError();
    return;
  }
  
  console.log('Property ID:', propertyId);
  
  // Load property from Firestore
  loadProperty(propertyId);
}

// Run when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPropertyPage);
} else {
  initPropertyPage();
}