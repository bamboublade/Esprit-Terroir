const CONFIG = {
    domain: 'espritterroir.fr',
    baseUrl: 'https://espritterroir.fr',
    business: {
        location: { lat: 43.52142, lng: 5.451539 },
        name: 'Esprit Terroir',
        address: '1960 route des Châteaux du Mont Robert, 13290 Aix-en-Provence, Les Milles',
        phone: '04 88 41 73 27',
        email: 'contact@esprit-terroir.com',
        website: 'https://espritterroir.fr',
        facebook: 'https://www.facebook.com/SAS.Esprit.Terroir/',
        instagram: 'https://www.instagram.com/esprit_terroir/',
        instagramToken: 'YOUR_LONG_LIVED_ACCESS_TOKEN_HERE' // Replace after Phase 2 of roadmap
    }
};

let map;
let marker;
let infoWindow;
let businessData = {
    placeId: null,
    location: CONFIG.business.location,
    name: CONFIG.business.name,
    address: CONFIG.business.address,
    phone: CONFIG.business.phone,
    email: CONFIG.business.email,
    website: CONFIG.business.website,
    rating: 4.7,
    reviewsCount: 127,
    reviews: [],
    openingHours: null,
    isOpenNow: null
};

// Expose initMaps globally for Google Maps API callback
window.initMaps = function () {
    initBusinessMap();
    findCorrectPlaceId(); // This will fetch data and then update UI + reviews
};

function initBusinessMap() {
    const mapElement = document.getElementById("map");
    if (!mapElement) {
        console.error("Map element with ID 'map' not found.");
        return;
    }
    map = new google.maps.Map(mapElement, {
        center: businessData.location,
        zoom: 15,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        mapId: 'DEMO_MAP_ID'
    });

    infoWindow = new google.maps.InfoWindow({ maxWidth: 320 });

    marker = new google.maps.marker.AdvancedMarkerElement({
        position: businessData.location,
        map: map,
        title: businessData.name
    });

    marker.addListener('gmp-click', () => {
        showBusinessInfoWindow();
    });
}

async function findCorrectPlaceId() {
    console.log("Searching for Place ID for:", businessData.name, businessData.address);
    try {
        const { places } = await google.maps.places.Place.searchByText({
            textQuery: `${businessData.name}, ${businessData.address}`,
            fields: ['id', 'displayName', 'formattedAddress', 'location'],
        });
        if (places && places.length > 0) {
            const place = places[0];
            console.log("Place ID found by query:", place.id, "for", place.displayName);
            businessData.placeId = place.id;
            if (place.location) {
                businessData.location = { lat: place.location.lat(), lng: place.location.lng() };
                if (map) map.setCenter(businessData.location);
                if (marker) marker.position = businessData.location;
            }
            fetchBusinessDetails();
        } else {
            console.warn("Could not find Place ID via text query. Trying Nearby Search.");
            searchNearby();
        }
    } catch (e) {
        console.warn("searchByText failed:", e, ". Trying Nearby Search.");
        searchNearby();
    }
}

async function searchNearby() {
    try {
        const { places } = await google.maps.places.Place.searchNearby({
            fields: ['id', 'displayName', 'location'],
            locationRestriction: { center: businessData.location, radius: 500 },
            includedTypes: ['grocery_store'],
            maxResultCount: 5,
        });
        if (places && places.length > 0) {
            const place = places.find(p => p.displayName && p.displayName.toLowerCase().includes("esprit terroir")) || places[0];
            console.log("Place ID found by nearby search:", place.id, "for", place.displayName);
            businessData.placeId = place.id;
            if (place.location) {
                businessData.location = { lat: place.location.lat(), lng: place.location.lng() };
                if (map) map.setCenter(businessData.location);
                if (marker) marker.position = businessData.location;
            }
            fetchBusinessDetails();
        } else {
            console.error("Failed to find Place ID via Nearby Search.");
            updateUIAfterPlaceIdFailure();
        }
    } catch (e) {
        console.error("searchNearby failed:", e);
        updateUIAfterPlaceIdFailure();
    }
}

async function fetchBusinessDetails() {
    if (!businessData.placeId) {
        console.error("No Place ID available to fetch details.");
        updateUIAfterPlaceIdFailure("Aucun identifiant d'établissement Google trouvé.");
        return;
    }
    console.log("Fetching details for Place ID:", businessData.placeId);
    try {
        const place = new google.maps.places.Place({ id: businessData.placeId });
        await place.fetchFields({
            fields: ['displayName', 'formattedAddress', 'nationalPhoneNumber', 'websiteURI',
                'location', 'regularOpeningHours', 'rating', 'userRatingCount', 'reviews', 'id']
        });
        console.log("Business details fetched:", place);
        businessData.name = place.displayName || businessData.name;
        businessData.address = place.formattedAddress || businessData.address;
        businessData.phone = place.nationalPhoneNumber || businessData.phone;
        businessData.website = place.websiteURI || businessData.website;
        if (place.location) {
            businessData.location = { lat: place.location.lat(), lng: place.location.lng() };
        }
        businessData.rating = place.rating !== undefined ? place.rating : businessData.rating;
        businessData.reviewsCount = place.userRatingCount !== undefined ? place.userRatingCount : businessData.reviewsCount;
        businessData.reviews = place.reviews || [];
        businessData.openingHours = place.regularOpeningHours ? place.regularOpeningHours.weekdayDescriptions : null;
        businessData.isOpenNow = place.regularOpeningHours ? (place.regularOpeningHours.openNow ?? null) : null;
        businessData.placeId = place.id || businessData.placeId;

        updateBusinessUI();
        showBusinessInfoWindow();
        displayReviews(businessData.reviews);
    } catch (e) {
        console.error("Error fetching business details:", e);
        updateUIAfterPlaceIdFailure(`Erreur lors de la récupération des détails Google.`);
    }
}

function updateUIAfterPlaceIdFailure(message = "Impossible de trouver l'établissement sur Google Maps pour charger les avis.") {
    updateBusinessUI(); // Update with fallback data
    showBusinessInfoWindow(); // Show info window with fallback data
    displayFallbackReviewsMessage(message);
    updateGoogleActionButtons(); // Update buttons with fallback links
}


function displayFallbackReviewsMessage(message) {
    const reviewsContainer = document.getElementById('reviews-container');
    if (reviewsContainer) {
        reviewsContainer.innerHTML = `
            <div class="no-reviews-message">
                <p>${message}</p>
                <p>Consultez nos avis directement sur <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(businessData.name + " " + businessData.address)}" target="_blank">Google Maps</a>.</p>
            </div>
        `;
    }
    // Ensure "load more" button is hidden if there are no reviews from API
    const loadMoreButton = document.getElementById('load-more-reviews');
    if (loadMoreButton) loadMoreButton.style.display = 'none';
}

function updateBusinessUI() {
    document.getElementById('average-rating').textContent = businessData.rating.toFixed(1);
    document.getElementById('rating-stars').innerHTML = generateStarsHTML(businessData.rating);
    document.getElementById('review-count').textContent = `${businessData.reviewsCount} avis`;

    document.getElementById('business-address').textContent = businessData.address;
    document.getElementById('business-phone').textContent = businessData.phone;
    document.getElementById('business-email').textContent = businessData.email;

    updateBusinessHoursUI();
}

function updateBusinessHoursUI() {
    const hoursContainer = document.getElementById('business-hours-container');
    if (!hoursContainer) return;

    if (!businessData.openingHours || businessData.openingHours.length === 0) {
        hoursContainer.innerHTML = `
            <div class="hours-item"><span class="day">Lundi - Samedi</span> <span class="time">8h30 - 19h30</span></div>
            <div class="hours-item"><span class="day">Dimanche</span> <span class="time">8h30 - 12h30</span></div>
            <div class="open-status" style="color: var(--gray-dark); margin-top: 10px;">Horaires non disponibles via Google pour le moment.</div>
        `;
        return;
    }

    const todayJsIndex = new Date().getDay();
    const daysOrder = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

    let hoursHTML = '';
    businessData.openingHours.forEach((hourText) => {
        const parts = hourText.split(/:\s*(.*)/s);
        const dayName = parts[0].trim();
        const hours = parts[1] ? parts[1].trim().replace('–', '-') : 'Fermé';
        const isToday = daysOrder[todayJsIndex] === dayName;

        hoursHTML += `
            <div class="hours-item ${isToday ? 'today' : ''}">
                <span class="day">${dayName}</span>
                <span class="time">${hours}</span>
            </div>
        `;
    });
    hoursContainer.innerHTML = hoursHTML;

    const statusElement = document.createElement('div');
    statusElement.classList.add('open-status');
    if (businessData.isOpenNow !== null && businessData.isOpenNow !== undefined) {
        statusElement.textContent = businessData.isOpenNow ? 'Ouvert maintenant' : 'Fermé actuellement';
        statusElement.style.color = businessData.isOpenNow ? 'var(--google-green)' : 'var(--google-red)';
    } else {
        statusElement.textContent = 'Statut (ouvert/fermé) inconnu';
        statusElement.style.color = 'var(--gray-dark)';
    }
    hoursContainer.appendChild(statusElement);
}


function showBusinessInfoWindow() {
    if (!infoWindow || !map || !marker) return;
    const destinationQuery = businessData.placeId
        ? `&destination_place_id=${businessData.placeId}`
        : `&destination=${encodeURIComponent(businessData.address)}`;

    const content = `
        <div class="map-info-window">
            <div class="map-info-title">${businessData.name}</div>
            <div class="map-info-address">${businessData.address}</div>
            <div class="map-info-rating">
                <span class="map-info-rating-score">${businessData.rating.toFixed(1)}</span>
                <div class="map-info-rating-stars">${generateStarsHTML(businessData.rating, true)}</div>
            </div>
            <div class="map-info-actions">
                <a href="https://www.google.com/maps/dir/?api=1${destinationQuery}" target="_blank" class="map-info-button">Itinéraire</a>
                <a href="tel:${businessData.phone.replace(/\s/g, '')}" class="map-info-button">Appeler</a>
            </div>
        </div>
    `;
    infoWindow.setContent(content);
    infoWindow.open(map, marker);
}

function displayReviews(reviews) {
    const reviewsContainer = document.getElementById('reviews-container');
    if (!reviewsContainer) return;

    const actualReviews = Array.isArray(reviews) ? reviews : [];

    if (actualReviews.length === 0) {
        displayFallbackReviewsMessage("Aucun avis Google n'a pu être chargé pour cet établissement.");
        updateGoogleActionButtons(); // Ensure buttons have fallback or are hidden
        return;
    }

    let reviewsHTML = '';
    const reviewsToShow = actualReviews.slice(0, 6);

    reviewsToShow.forEach(review => {
        const authorName = review.authorAttribution?.displayName || 'Utilisateur Google';
        const avatarText = authorName.charAt(0).toUpperCase();
        const publishTime = review.publishTime ? review.publishTime.getTime() / 1000 : null;
        const relativeTime = formatRelativeTime(publishTime);
        const rawText = review.text?.text || review.text || null;
        const reviewText = rawText ? String(rawText).replace(/\n/g, '<br>') : "<i>Cet utilisateur n'a pas laissé de commentaire.</i>";

        reviewsHTML += `
            <div class="review-card">
                <div class="review-header">
                    <div class="review-avatar" style="background-color: ${generateAvatarColor(avatarText)}">${avatarText}</div>
                    <div>
                        <div class="review-author">${authorName}</div>
                        <div class="review-date">${relativeTime}</div>
                    </div>
                </div>
                <div class="review-stars">${generateStarsHTML(review.rating)}</div>
                <div class="review-content">${reviewText}</div>
            </div>
        `;
    });
    reviewsContainer.innerHTML = reviewsHTML;
    updateGoogleActionButtons(actualReviews.length > 0);
}

function updateGoogleActionButtons(reviewsAvailable = false) {
    const loadMoreButton = document.getElementById('load-more-reviews');
    const leaveReviewButton = document.getElementById('leave-review-button');

    if (loadMoreButton) {
        loadMoreButton.style.display = reviewsAvailable ? 'inline-block' : 'none';
        if (businessData.placeId) {
            loadMoreButton.href = `https://search.google.com/local/reviews?placeid=${businessData.placeId}`;
        } else {
            // Fallback if no reviews and no placeId, but button is somehow shown (or for generic link)
            loadMoreButton.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(businessData.name + " " + businessData.address)}`;
            if (!reviewsAvailable) loadMoreButton.style.display = 'none'; // Explicitly hide if no reviews
        }
    }

    if (leaveReviewButton) {
        if (businessData.placeId) {
            // This is the direct link to the review submission form
            leaveReviewButton.href = `https://search.google.com/local/writereview?placeid=${businessData.placeId}`;
        } else {
            // Fallback to the g.page link or a generic search if g.page isn't set in HTML
            // The HTML already has a good fallback: "https://g.page/Esprit-Terroir/review"
            // No change needed here if placeId is not found, it will use the HTML href.
            // If you want to hide it if no placeId:
            // leaveReviewButton.style.display = businessData.placeId ? 'inline-block' : 'none';
        }
    }
}


function generateAvatarColor(letter) {
    const charCode = letter.charCodeAt(0);
    const hue = (charCode * 137.508) % 360;
    return `hsl(${hue}, 55%, 65%)`;
}

function generateStarsHTML(rating, small = false) {
    rating = Number(rating);
    const totalStars = 5;
    let starsHTML = '';
    const size = small ? 16 : 18;

    for (let i = 1; i <= totalStars; i++) {
        if (i <= rating) {
            starsHTML += `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" fill="currentColor" class="star-icon full-star" viewBox="0 0 16 16"><path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/></svg>`;
        } else if (i === Math.ceil(rating) && rating % 1 >= 0.4 && rating % 1 < 0.9) {
            starsHTML += `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" fill="currentColor" class="star-icon half-star" viewBox="0 0 16 16"><path d="M5.354 5.119 7.538.792A.516.516 0 0 1 8 .5c.183 0 .366.097.465.292l2.184 4.327 4.898.696A.537.537 0 0 1 16 6.32a.548.548 0 0 1-.17.445l-3.523 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256a.52.52 0 0 1-.146.05c-.342.06-.668-.254-.6-.642l.83-4.73L.173 6.765a.55.55 0 0 1-.172-.403.58.58 0 0 1 .085-.302.513.513 0 0 1 .37-.245l4.898-.696zM8 12.027a.5.5 0 0 1 .232.056l3.686 1.894-.694-3.957a.565.565 0 0 1 .162-.505l2.907-2.77-4.052-.576a.525.525 0 0 1-.393-.288L8.001 2.223 8 2.226v9.8z"/></svg>`;
        } else {
            starsHTML += `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" fill="currentColor" class="star-icon empty-star" viewBox="0 0 16 16"><path d="M2.866 14.85c-.078.444.36.791.746.593l4.39-2.256 4.389 2.256c.386.198.824-.149.746-.592l-.83-4.73 3.522-3.356c.33-.314.16-.888-.282-.95l-4.898-.696L8.465.792a.513.513 0 0 0-.927 0L5.354 5.12l-4.898.696c-.441.062-.612.636-.283.95l3.523 3.356-.83 4.73zm4.905-2.767-3.686 1.894.694-3.957a.565.565 0 0 0-.163-.505L1.71 6.745l4.052-.576a.525.525 0 0 0 .393-.288L8 2.223l1.847 3.658a.525.525 0 0 0 .393.288l4.052.575-2.906 2.77a.565.565 0 0 0-.163.506l.694 3.957-3.686-1.894a.503.503 0 0 0-.461 0z"/></svg>`;
        }
    }
    return starsHTML;
}

function formatRelativeTime(unixTimestampInSeconds) {
    if (!unixTimestampInSeconds && unixTimestampInSeconds !== 0) return 'Date inconnue';
    const now = new Date();
    const reviewDate = new Date(unixTimestampInSeconds * 1000);
    const diffMs = now.getTime() - reviewDate.getTime();
    const diffSeconds = Math.round(diffMs / 1000);
    const diffMinutes = Math.round(diffSeconds / 60);
    const diffHours = Math.round(diffMinutes / 60);
    const diffDays = Math.round(diffHours / 24);

    if (diffSeconds < 60) return `à l'instant`;
    if (diffMinutes < 60) return `il y a ${diffMinutes} min`;
    if (diffHours < 24) return `il y a ${diffHours} h`;
    if (diffDays === 1) return `hier`;
    if (diffDays < 7) return `il y a ${diffDays} jours`;
    if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `il y a ${weeks} sem.`;
    }
    if (diffDays < 365) {
        const months = Math.floor(diffDays / 30.44);
        return `il y a ${months} mois`;
    }
    const years = Math.floor(diffDays / 365.25);
    return `il y a ${years} an${years > 1 ? 's' : ''}`;
}

function getMapStyles() {
    return [
        { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
        { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
        { featureType: "administrative.land_parcel", elementType: "labels", stylers: [{ visibility: "off" }] },
        { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
        { featureType: "poi", elementType: "labels.text", stylers: [{ visibility: "off" }] },
        { featureType: "poi.business", stylers: [{ visibility: "off" }] },
        { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
        { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
        { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
        { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
        { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
        { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
        { featureType: "transit.line", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
        { featureType: "transit.station", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9c9c9" }] },
        { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] }
    ];
}

// DOMContentLoaded for general page interactions
document.addEventListener('DOMContentLoaded', function () {
    const hamburger = document.querySelector('.hamburger');
    const menu = document.querySelector('.menu');
    if (hamburger && menu) {
        hamburger.addEventListener('click', () => {
            const isActive = menu.classList.toggle('active');
            hamburger.classList.toggle('active', isActive);
            document.body.style.overflow = isActive ? 'hidden' : '';
        });
        document.querySelectorAll('.menu a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                menu.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }

    const header = document.querySelector('.header');
    if (header) {
        window.addEventListener('scroll', () => {
            header.classList.toggle('scrolled', window.scrollY > 80);
        });
    }

    const backToTopBtn = document.getElementById('backToTop');
    if (backToTopBtn) {
        window.addEventListener('scroll', () => {
            backToTopBtn.classList.toggle('active', window.scrollY > 300);
        });
        backToTopBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href && href.length > 1 && href.startsWith("#")) {
                try {
                    const targetElement = document.querySelector(href);
                    if (targetElement) {
                        e.preventDefault();
                        const headerElement = document.querySelector('.header');
                        const headerHeight = headerElement ? headerElement.offsetHeight : 0;
                        const elementPosition = targetElement.getBoundingClientRect().top;
                        const buffer = (header && !header.classList.contains('scrolled')) ? 20 : 0;
                        const offsetPosition = elementPosition + window.pageYOffset - headerHeight - buffer;

                        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                    }
                } catch (error) {
                    console.warn("Smooth scroll target not found or invalid selector:", href, error);
                }
            }
        });
    });

    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        if (question) {
            question.addEventListener('click', () => {
                const isActive = item.classList.contains('active');
                faqItems.forEach(otherItem => {
                    if (otherItem !== item) {
                        otherItem.classList.remove('active');
                    }
                });
                item.classList.toggle('active', !isActive);
            });
        }
    });

    // Scroll Reveal Animation
    const revealCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                // Optional: stop observing once revealed
                // observer.unobserve(entry.target);
            }
        });
    };

    const revealObserver = new IntersectionObserver(revealCallback, {
        threshold: 0.15
    });

    document.querySelectorAll('.reveal').forEach(el => {
        revealObserver.observe(el);
    });

    const currentYearSpan = document.getElementById('currentYear');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    // Initialize button states with fallbacks before API data might arrive
    updateGoogleActionButtons(false);

    // Initialize Instagram feed
    fetchInstagramFeed();
});

/**
 * Instagram Live Feed Integration
 * Fetches media from Instagram Graph API and sorts by likes
 */
async function fetchInstagramFeed() {
    const token = CONFIG.business.instagramToken;
    const grid = document.querySelector('.instagram-grid');

    if (!token || token === 'YOUR_LONG_LIVED_ACCESS_TOKEN_HERE') {
        console.log('Instagram Live: No token provided, showing static fallback.');
        return;
    }

    try {
        // Fetch from Instagram Graph API
        const response = await fetch(`https://graph.facebook.com/v19.0/me/media?fields=id,caption,media_type,media_url,permalink,like_count,thumbnail_url,timestamp&access_token=${token}`);
        const data = await response.json();

        if (data && data.data) {
            // Sort by likes (descending)
            const sortedMedia = data.data.sort((a, b) => (b.like_count || 0) - (a.like_count || 0));

            // Clear existing static items
            grid.innerHTML = '';

            // Display top 3
            sortedMedia.slice(0, 3).forEach(item => {
                const post = document.createElement('a');
                post.href = item.permalink;
                post.target = '_blank';
                post.className = 'instagram-item';

                post.innerHTML = `
                    <img src="${item.media_type === 'VIDEO' ? item.thumbnail_url : item.media_url}" alt="${item.caption || 'Instagram Post'}" loading="lazy">
                    <div class="instagram-overlay">
                        <span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white" viewBox="0 0 16 16" style="margin-right: 5px;">
                                <path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01L8 2.748z"/>
                            </svg> 
                            ${item.like_count || 0}
                        </span>
                    </div>
                `;
                grid.appendChild(post);
            });
        }
    } catch (error) {
        console.error('Error fetching Instagram feed:', error);
    }
}
