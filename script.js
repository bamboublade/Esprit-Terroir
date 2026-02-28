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
        instagramToken: 'IGAAMkFrdhY1pBZAFlGSmdzV1B1UjJpVEU3cXBieHA1UnhyTHNJaTlkWEVkTTNxdGV4eUI3S19EQnJWZAnRneVlHdXJzTGoyUU9BbWhvSmFJaExuNU5BeXpmTGZAmOVFWS00zVlFfemdGUkswNmZAFc1cyVTBVazNYY1VSakM2OWZAodwZDZD' // Replace after Phase 2 of roadmap
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

/**
 * Hero Slider Logic
 */
function initHeroSlider() {
    const slider = document.querySelector('.hero-slider');
    if (!slider) return;

    // List of downloaded Instagram IDs for the hero slider
    const heroPhotos = [
        '17844644460488733', '17869665069349071', '17869665069349071', '17869937178462359',
        '17870576295374738', '17884696725363426', '17886593271196391', '17890848405126681',
        '17899790445190127', '17903976675169308', '17938483974001406', '17945920641029535',
        '17949012009058608', '17957349257954410', '17966120432797066', '17967363038763646',
        '17969761223822507', '17970993530862688', '17974670336712708', '18040622006305397',
        '18041861705565946', '18052830953358070', '18054849614019773', '18060538535271017',
        '18061659323135654', '18061738979177164', '18063758021016798', '18064277354143340',
        '18068751791327418', '18068848777938386', '18070642136606846', '18070805126503236',
        '18072614921001978', '18073700723314467', '18079722617305220', '18079944400763318',
        '18080280995274195', '18080537063363365', '18081451772324720', '18086395927973274',
        '18111907984442954', '18112306156552831', '18121911157546923', '18132685159374063',
        '18152692666422515', '18153441646407692', '18183310096351858', '18209941291308156',
        '18303644707215642', '18309441742173311', '18480735850078647'
    ];

    // Pick 10 random photos
    const selected = [...heroPhotos].sort(() => 0.5 - Math.random()).slice(0, 10);

    // Clear and populate slider
    slider.innerHTML = '';
    selected.forEach((id, index) => {
        const slide = document.createElement('div');
        slide.className = index === 0 ? 'slide active' : 'slide';
        slide.style.backgroundImage = `url('images/hero/hero_${id}.jpg')`;
        slider.appendChild(slide);
    });

    const slides = document.querySelectorAll('.hero-slider .slide');
    if (slides.length <= 1) return;

    let currentSlide = 0;
    const slideInterval = 5000;

    function nextSlide() {
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
    }

    setInterval(nextSlide, slideInterval);
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

    // Initialize Hero Slider
    initHeroSlider();

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

    if (!token || token.includes('YOUR_LONG_LIVED')) {
        console.log('Instagram Live: No token provided, showing static fallback.');
        return;
    }

    try {
        // We try the Instagram Basic Display API first as it's the most common for "Tester Tokens"
        // fields: like_count is NOT available in Basic Display, but works in Graph API (Business)
        let apiUrl = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp&access_token=${token}`;

        // If the token looks like a Business/Graph token, we could try the other endpoint, 
        // but graph.instagram.com is generally more reliable for simple feed display.

        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data && data.error) {
            console.error('Instagram API Error:', data.error.message);
            // If it fails with Basic Display, let's try the Business Graph API just in case
            if (data.error.code === 100 || data.error.type === 'OAuthException') {
                const businessUrl = `https://graph.facebook.com/v19.0/me/media?fields=id,caption,media_type,media_url,permalink,like_count,thumbnail_url,timestamp&access_token=${token}`;
                const bizResponse = await fetch(businessUrl);
                const bizData = await bizResponse.json();
                if (bizData && bizData.data) {
                    renderInstagramGrid(bizData.data, grid);
                }
            }
            return;
        }

        if (data && data.data) {
            renderInstagramFeed(data.data, grid);
            renderInstagramGallery(data.data);
        }
    } catch (error) {
        console.error('Error fetching Instagram feed:', error);
    }
}

/**
 * Renders the top-liked posts in the Instagram section
 */
function renderInstagramFeed(media, grid) {
    if (!media || !grid) return;

    // Sort by likes if available, otherwise by date
    const sortedMedia = [...media].sort((a, b) => {
        if (a.like_count !== undefined && b.like_count !== undefined) {
            return b.like_count - a.like_count;
        }
        return new Date(b.timestamp) - new Date(a.timestamp);
    });

    // Clear existing
    grid.innerHTML = '';

    // Display top 6
    sortedMedia.slice(0, 6).forEach(item => {
        const post = document.createElement('a');
        post.href = item.permalink;
        post.target = '_blank';
        post.className = 'instagram-item';

        const likesHtml = item.like_count !== undefined ? `
            <span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white" viewBox="0 0 16 16" style="margin-right: 5px;">
                    <path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01L8 2.748z"/>
                </svg> 
                ${item.like_count}
            </span>
        ` : `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="white" viewBox="0 0 16 16">
                <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003z" />
            </svg>
        `;

        post.innerHTML = `
            <img src="${item.media_type === 'VIDEO' ? item.thumbnail_url : item.media_url}" alt="${item.caption || 'Instagram Post'}" loading="lazy">
            <div class="instagram-overlay">
                ${likesHtml}
            </div>
        `;
        grid.appendChild(post);
    });
}

/**
 * Randomizes and populates the Gallery section
 */
function renderInstagramGallery(media) {
    const gallery = document.querySelector('.gallery-container');
    if (!media || !gallery) return;

    // Shuffle media and pick 8
    const shuffled = [...media].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 8);

    // Clear existing
    gallery.innerHTML = '';

    selected.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'gallery-item';

        // Use thumbnail for videos
        const imgUrl = item.media_type === 'VIDEO' ? item.thumbnail_url : item.media_url;

        itemDiv.innerHTML = `
            <img src="${imgUrl}" alt="${item.caption || 'Galerie Esprit Terroir'}" loading="lazy">
            <div class="gallery-overlay">
                <span>${item.caption ? item.caption.substring(0, 30) + '...' : 'Esprit Terroir'}</span>
            </div>
        `;

        // Wrap in link to Instagram
        const link = document.createElement('a');
        link.href = item.permalink;
        link.target = '_blank';
        link.style.textDecoration = 'none';
        link.style.color = 'inherit';
        link.appendChild(itemDiv);

        gallery.appendChild(link);
    });
}

