// Global variables for Google Maps
let map;
let placesService;
let marker;
let infoWindow;
let businessData = {
    placeId: null, // To be fetched
    location: { lat: 43.52142, lng: 5.451539 }, // Default for Esprit Terroir
    name: 'Esprit Terroir',
    address: '1960 route des Châteaux du Mont Robert, 13290 Aix-en-Provence',
    phone: '04 88 41 73 27',
    email: 'contact@esprit-terroir.com', // Added email
    website: 'https://esprit-terroir.com',
    rating: 4.7, // Fallback
    reviewsCount: 127, // Fallback
    reviews: [],
    openingHours: null,
    isOpenNow: null
};

// Expose initMaps globally for Google Maps API callback
window.initMaps = function() {
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
        styles: getMapStyles()
    });

    placesService = new google.maps.places.PlacesService(map);
    infoWindow = new google.maps.InfoWindow({ maxWidth: 320 });

    marker = new google.maps.Marker({
        position: businessData.location,
        map: map,
        animation: google.maps.Animation.DROP,
        title: businessData.name
    });

    marker.addListener('click', () => {
        showBusinessInfoWindow();
    });

    // Optionally show info window by default after a delay
    // setTimeout(showBusinessInfoWindow, 1500); 
}

function findCorrectPlaceId() {
    console.log("Searching for Place ID for:", businessData.name, businessData.address);
    if (!placesService) {
        console.error("PlacesService not initialized. Retrying in 1s.");
        setTimeout(findCorrectPlaceId, 1000); // Retry if service not ready
        return;
    }

    const request = {
        query: `${businessData.name}, ${businessData.address}`,
        fields: ['place_id', 'name', 'formatted_address', 'geometry']
    };

    placesService.findPlaceFromQuery(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
            const place = results[0];
            console.log("Place ID found by query:", place.place_id, "for", place.name);
            businessData.placeId = place.place_id;
            
            if (place.geometry && place.geometry.location) {
                businessData.location = {
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng()
                };
                if (map) map.setCenter(businessData.location);
                if (marker) marker.setPosition(businessData.location);
            }
            fetchBusinessDetails();
        } else {
            console.warn("Could not find Place ID via text query:", status, ". Trying Nearby Search.");
            searchNearby();
        }
    });
}

function searchNearby() {
    const nearbyRequest = {
        location: businessData.location,
        radius: 500, // Search within 500 meters
        keyword: businessData.name,
        type: ['food', 'grocery_or_supermarket', 'store'] // More specific types
    };
    placesService.nearbySearch(nearbyRequest, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
            // Heuristic: find the best match. For now, take the first one.
            // A more robust solution might compare names or addresses if multiple results.
            const place = results.find(p => p.name.toLowerCase().includes("esprit terroir")) || results[0];
            console.log("Place ID found by nearby search:", place.place_id, "for", place.name);
            businessData.placeId = place.place_id;

            if (place.geometry && place.geometry.location) {
                businessData.location = {
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng()
                };
                if (map) map.setCenter(businessData.location);
                if (marker) marker.setPosition(businessData.location);
            }
            fetchBusinessDetails();
        } else {
            console.error("Failed to find Place ID via Nearby Search:", status);
            console.log("Using fallback static data. Reviews will not be loaded from API.");
            updateBusinessUI(); // Update with fallback data
            showBusinessInfoWindow();
            displayFallbackReviewsMessage("Impossible de trouver l'établissement sur Google Maps pour charger les avis.");
        }
    });
}

function fetchBusinessDetails() {
    if (!businessData.placeId) {
        console.error("No Place ID available to fetch details.");
        displayFallbackReviewsMessage("Aucun identifiant d'établissement Google trouvé.");
        updateBusinessUI(); // Show fallback data
        showBusinessInfoWindow();
        return;
    }
    console.log("Fetching details for Place ID:", businessData.placeId);
    const request = {
        placeId: businessData.placeId,
        fields: [
            'name', 'formatted_address', 'formatted_phone_number', 'website',
            'geometry', 'opening_hours', 'rating', 'user_ratings_total', 'reviews'
        ]
    };

    placesService.getDetails(request, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
            console.log("Business details fetched:", place);
            businessData.name = place.name || businessData.name;
            businessData.address = place.formatted_address || businessData.address;
            businessData.phone = place.formatted_phone_number || businessData.phone;
            businessData.website = place.website || businessData.website; // Keep GMB website if available
            if (place.geometry && place.geometry.location) {
                businessData.location = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
            }
            businessData.rating = place.rating !== undefined ? place.rating : businessData.rating;
            businessData.reviewsCount = place.user_ratings_total !== undefined ? place.user_ratings_total : businessData.reviewsCount;
            businessData.reviews = place.reviews || [];
            businessData.openingHours = place.opening_hours ? place.opening_hours.weekday_text : null;
            businessData.isOpenNow = place.opening_hours ? place.opening_hours.isOpen() : null;
            
            updateBusinessUI();
            showBusinessInfoWindow(); // Update info window with fresh data
            displayReviews(businessData.reviews);
        } else {
            console.error("Error fetching business details:", status);
            displayFallbackReviewsMessage(`Erreur lors de la récupération des détails Google (${status}).`);
            updateBusinessUI(); // Show fallback data
            showBusinessInfoWindow();
        }
    });
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
}

function updateBusinessUI() {
    document.getElementById('average-rating').textContent = businessData.rating.toFixed(1);
    document.getElementById('rating-stars').innerHTML = generateStarsHTML(businessData.rating);
    document.getElementById('review-count').textContent = `${businessData.reviewsCount} avis`;
    
    document.getElementById('business-address').textContent = businessData.address;
    document.getElementById('business-phone').textContent = businessData.phone;
    document.getElementById('business-email').textContent = businessData.email; // Display email

    updateBusinessHoursUI();
}

function updateBusinessHoursUI() {
    const hoursContainer = document.getElementById('business-hours-container');
    if (!hoursContainer) return;

    if (!businessData.openingHours) {
        hoursContainer.innerHTML = `
            <div class="hours-item"><span class="day">Lundi - Samedi</span> <span class="time">8h30 - 19h30</span></div>
            <div class="hours-item"><span class="day">Dimanche</span> <span class="time">8h30 - 12h30</span></div>
            <div class="open-status" style="color: var(--gray-dark); margin-top: 10px;">Horaires non disponibles via Google.</div>
        `;
        return;
    }

    const todayJsIndex = new Date().getDay(); // 0 for Sunday, 1 for Monday...
    // Google's weekday_text array: Index 0 is usually Monday, but it can depend on the locale of the business.
    // To be safe, we should parse the day name.
    const daysOrder = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

    let hoursHTML = '';
    businessData.openingHours.forEach((hourText, index) => {
        const parts = hourText.split(/:\s*(.*)/s); // Split on the first colon followed by space
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

    if (businessData.isOpenNow !== null && businessData.isOpenNow !== undefined) {
        const statusElement = document.createElement('div');
        statusElement.classList.add('open-status');
        statusElement.textContent = businessData.isOpenNow ? 'Ouvert maintenant' : 'Fermé actuellement';
        statusElement.style.color = businessData.isOpenNow ? 'var(--google-green)' : 'var(--google-red)';
        hoursContainer.appendChild(statusElement);
    }
}


function showBusinessInfoWindow() {
    if (!infoWindow || !map || !marker) return;
    const content = `
        <div class="map-info-window">
            <div class="map-info-title">${businessData.name}</div>
            <div class="map-info-address">${businessData.address}</div>
            <div class="map-info-rating">
                <span class="map-info-rating-score">${businessData.rating.toFixed(1)}</span>
                <div class="map-info-rating-stars">${generateStarsHTML(businessData.rating, true)}</div>
            </div>
            <div class="map-info-actions">
                <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(businessData.address)}&destination_place_id=${businessData.placeId || ''}" target="_blank" class="map-info-button">Itinéraire</a>
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

    if (!reviews || reviews.length === 0) {
        displayFallbackReviewsMessage("Aucun avis Google n'a pu être chargé pour cet établissement.");
        return;
    }

    let reviewsHTML = '';
    // Display up to 6 reviews, or all if fewer
    const reviewsToShow = reviews.slice(0, 6); 

    reviewsToShow.forEach(review => {
        const avatarText = review.author_name ? review.author_name.charAt(0).toUpperCase() : 'U';
        const relativeTime = formatRelativeTime(review.time);
        const reviewText = review.text ? review.text.replace(/\n/g, '<br>') : "<i>Cet utilisateur n'a pas laissé de commentaire.</i>";

        reviewsHTML += `
            <div class="review-card">
                <div class="review-header">
                    <div class="review-avatar" style="background-color: ${generateAvatarColor(avatarText)}">${avatarText}</div>
                    <div>
                        <div class="review-author">${review.author_name || 'Utilisateur Google'}</div>
                        <div class="review-date">${relativeTime}</div>
                    </div>
                </div>
                <div class="review-stars">${generateStarsHTML(review.rating)}</div>
                <div class="review-content">${reviewText}</div>
            </div>
        `;
    });
    reviewsContainer.innerHTML = reviewsHTML;

    const loadMoreButton = document.getElementById('load-more-reviews');
    if (loadMoreButton) {
        loadMoreButton.style.display = reviews.length > 0 ? 'inline-block' : 'none';
        // Update its href to point to Google reviews page using Place ID if available
        let googleReviewsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(businessData.name + " " + businessData.address)}`; // Fallback
        if (businessData.placeId) {
            googleReviewsUrl = `https://search.google.com/local/reviews?placeid=${businessData.placeId}`;
        }
        loadMoreButton.href = googleReviewsUrl;
    }
}

function generateAvatarColor(letter) {
    const charCode = letter.charCodeAt(0);
    const hue = (charCode * 137.508) % 360; // Golden angle
    return `hsl(${hue}, 55%, 65%)`; // Softer colors
}

function generateStarsHTML(rating, small = false) {
    rating = Number(rating); // Ensure rating is a number
    const totalStars = 5;
    let starsHTML = '';
    const size = small ? 16 : 18; // Adjusted review star size

    for (let i = 1; i <= totalStars; i++) {
        if (i <= rating) { // Full star
            starsHTML += `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" fill="currentColor" class="star-icon full-star" viewBox="0 0 16 16"><path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/></svg>`;
        } else if (i === Math.ceil(rating) && rating % 1 >= 0.4) { // Half star (more precise: 0.4 to 0.9 is half, for GMB usually 0.5)
             starsHTML += `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" fill="currentColor" class="star-icon half-star" viewBox="0 0 16 16"><path d="M5.354 5.119 7.538.792A.516.516 0 0 1 8 .5c.183 0 .366.097.465.292l2.184 4.327 4.898.696A.537.537 0 0 1 16 6.32a.548.548 0 0 1-.17.445l-3.523 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256a.52.52 0 0 1-.146.05c-.342.06-.668-.254-.6-.642l.83-4.73L.173 6.765a.55.55 0 0 1-.172-.403.58.58 0 0 1 .085-.302.513.513 0 0 1 .37-.245l4.898-.696zM8 12.027a.5.5 0 0 1 .232.056l3.686 1.894-.694-3.957a.565.565 0 0 1 .162-.505l2.907-2.77-4.052-.576a.525.525 0 0 1-.393-.288L8.001 2.223 8 2.226v9.8z"/></svg>`;
        } else { // Empty star
            starsHTML += `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" fill="currentColor" class="star-icon empty-star" viewBox="0 0 16 16"><path d="M2.866 14.85c-.078.444.36.791.746.593l4.39-2.256 4.389 2.256c.386.198.824-.149.746-.592l-.83-4.73 3.522-3.356c.33-.314.16-.888-.282-.95l-4.898-.696L8.465.792a.513.513 0 0 0-.927 0L5.354 5.12l-4.898.696c-.441.062-.612.636-.283.95l3.523 3.356-.83 4.73zm4.905-2.767-3.686 1.894.694-3.957a.565.565 0 0 0-.163-.505L1.71 6.745l4.052-.576a.525.525 0 0 0 .393-.288L8 2.223l1.847 3.658a.525.525 0 0 0 .393.288l4.052.575-2.906 2.77a.565.565 0 0 0-.163.506l.694 3.957-3.686-1.894a.503.503 0 0 0-.461 0z"/></svg>`;
        }
    }
    return starsHTML;
}


function formatRelativeTime(unixTimestampInSeconds) {
    if (!unixTimestampInSeconds && unixTimestampInSeconds !==0) return 'Date inconnue';
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
    if (diffDays < 30) return `il y a ${Math.floor(diffDays / 7)} sem.`;
    if (diffDays < 365) return `il y a ${Math.floor(diffDays / 30.44)} mois`;
    return `il y a ${Math.floor(diffDays / 365.25)} an(s)`;
}

function getMapStyles() {
    return [ /* Using simpler styles for clarity, can be expanded */
        { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
        { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
        { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
        { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
        { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
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
document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu
    const hamburger = document.querySelector('.hamburger');
    const menu = document.querySelector('.menu');
    if (hamburger && menu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            menu.classList.toggle('active');
            // Prevent body scroll when menu is open
            document.body.style.overflow = menu.classList.contains('active') ? 'hidden' : '';
        });
        document.querySelectorAll('.menu a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                menu.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }

    // Header scroll
    const header = document.querySelector('.header');
    if (header) {
        window.addEventListener('scroll', () => {
            header.classList.toggle('scrolled', window.scrollY > 80);
        });
    }

    // Back to top button
    const backToTopBtn = document.getElementById('backToTop');
    if (backToTopBtn) {
        window.addEventListener('scroll', () => {
            backToTopBtn.classList.toggle('active', window.scrollY > 300);
        });
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && href.length > 1 && href.startsWith("#")) {
                const targetElement = document.querySelector(href);
                if (targetElement) {
                    e.preventDefault();
                    const headerHeight = header ? header.offsetHeight : 0;
                    const elementPosition = targetElement.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerHeight;
                    window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                }
            }
        });
    });

    // FAQ toggle
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        if (question) {
            question.addEventListener('click', () => {
                const isActive = item.classList.contains('active');
                faqItems.forEach(otherItem => otherItem.classList.remove('active')); // Close others
                if (!isActive) item.classList.add('active'); // Open current if it wasn't active
            });
        }
    });
    
    // Lazy loading for images (basic example, consider IntersectionObserver for production)
    const lazyImages = document.querySelectorAll('img[loading="lazy"]');
    lazyImages.forEach(img => {
        if (img.dataset.src) {
            img.src = img.dataset.src;
        }
    });

    // Update current year in footer
    const currentYearSpan = document.getElementById('currentYear');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }
});
