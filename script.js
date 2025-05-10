// Global variables
let map;
let contactMap;
let placesService;
let marker;
let infoWindow;
let businessData = {
    // Nous allons rechercher le Place ID automatiquement
    placeId: null,
    location: { lat: 43.52142, lng: 5.451539 }, // Coordonnées d'Esprit Terroir
    name: 'Esprit Terroir',
    address: '1960 route des Châteaux du Mont Robert, 13290 Aix-en-Provence',
    phone: '04 88 41 73 27',
    website: 'https://esprit-terroir.com',
    rating: 4.7,
    reviewsCount: 127
};

// Initialize the maps when Google Maps API is loaded
// Exposer la fonction au niveau global pour que Google Maps puisse l'appeler
window.initMaps = function() {
    // Initialize the main business map
    initBusinessMap();

    // Initialize the contact map
    initContactMap();

    // Rechercher le bon Place ID automatiquement, puis récupérer les données
    findCorrectPlaceId();
};

// Initialize the business map
function initBusinessMap() {
    // Create the map
    map = new google.maps.Map(document.getElementById("map"), {
        center: businessData.location,
        zoom: 15,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        styles: getMapStyles()
    });

    // Create places service
    placesService = new google.maps.places.PlacesService(map);

    // Create info window
    infoWindow = new google.maps.InfoWindow({
        maxWidth: 320
    });

    // Create a marker for the business location
    marker = new google.maps.Marker({
        position: businessData.location,
        map: map,
        animation: google.maps.Animation.DROP,
        title: businessData.name
    });

    // Add click event to the marker to display the info window
    marker.addListener('click', () => {
        showBusinessInfoWindow();
    });

    // Show info window by default
    setTimeout(showBusinessInfoWindow, 1000);
}

// Initialize the contact map
function initContactMap() {
    // Create the contact map
    contactMap = new google.maps.Map(document.getElementById("contact-map"), {
        center: businessData.location,
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: getMapStyles()
    });

    // Create a marker for the business location on the contact map
    const contactMarker = new google.maps.Marker({
        position: businessData.location,
        map: contactMap,
        title: businessData.name
    });

    // Create a simplified info window for the contact map
    const contactInfoWindow = new google.maps.InfoWindow({
        content: `
            <div style="text-align: center; padding: 10px;">
                <div style="font-weight: bold;">${businessData.name}</div>
                <div>${businessData.address}</div>
            </div>
        `,
        maxWidth: 250
    });

    // Add click event to the marker to display the info window
    contactMarker.addListener('click', () => {
        contactInfoWindow.open(contactMap, contactMarker);
    });

    // Show info window by default after a delay
    setTimeout(() => {
        contactInfoWindow.open(contactMap, contactMarker);
    }, 1000);
}

// Rechercher automatiquement le Place ID correct
function findCorrectPlaceId() {
    console.log("Recherche automatique du Place ID pour Esprit Terroir...");

    // Utiliser le service Places pour rechercher par texte
    const request = {
        query: 'Esprit Terroir Aix-en-Provence',
        fields: ['place_id', 'formatted_address', 'name', 'geometry']
    };

    placesService.findPlaceFromQuery(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
            // Place ID trouvé automatiquement
            const place = results[0];
            console.log("Place ID trouvé automatiquement:", place.place_id);

            // Mettre à jour le businessData avec le nouveau Place ID
            businessData.placeId = place.place_id;

            // Si les coordonnées sont disponibles, les mettre à jour
            if (place.geometry && place.geometry.location) {
                businessData.location = {
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng()
                };

                // Mettre à jour la position des cartes et du marqueur
                if (map) map.setCenter(businessData.location);
                if (marker) marker.setPosition(businessData.location);
                if (contactMap) contactMap.setCenter(businessData.location);
                // Note: The contactMarker inside initContactMap is local, so this won't update it
                // if initContactMap has already run. This might need a refactor if dynamic
                // updates to contactMarker position are critical post-initialization.
                // For now, initContactMap will use the latest businessData.location when called.
            }

            // Récupérer les informations détaillées avec le nouveau Place ID
            fetchBusinessData();
        } else {
            console.error("Impossible de trouver le Place ID automatiquement:", status);
            console.log("Essai de recherche avec Nearby Search comme alternative...");

            // Essayer avec nearbySearch comme alternative
            const nearbyRequest = {
                location: businessData.location, // Use the initial or potentially updated location
                radius: 500,
                keyword: 'Esprit Terroir'
            };

            placesService.nearbySearch(nearbyRequest, (nearbyResults, nearbyStatus) => {
                if (nearbyStatus === google.maps.places.PlacesServiceStatus.OK && nearbyResults && nearbyResults.length > 0) {
                    // Place ID trouvé par recherche à proximité
                    const nearbyPlace = nearbyResults[0];
                    console.log("Place ID trouvé par recherche à proximité:", nearbyPlace.place_id);

                    businessData.placeId = nearbyPlace.place_id;
                    // Update location if nearby search provides more accurate geo
                    if (nearbyPlace.geometry && nearbyPlace.geometry.location) {
                        businessData.location = {
                            lat: nearbyPlace.geometry.location.lat(),
                            lng: nearbyPlace.geometry.location.lng()
                        };
                        if (map) map.setCenter(businessData.location);
                        if (marker) marker.setPosition(businessData.location);
                        if (contactMap) contactMap.setCenter(businessData.location);
                    }
                    fetchBusinessData();
                } else {
                    console.error("Impossible de trouver le Place ID via recherche à proximité:", nearbyStatus);
                    console.log("Utilisation des données statiques comme fallback");

                    // Utiliser les données statiques
                    updateBusinessUI(); // Update UI with whatever data we have
                    showBusinessInfoWindow(); // Show info window with current data
                    // Display a message indicating fallback for reviews
                    const reviewsContainer = document.getElementById('reviews-container');
                    if (reviewsContainer) {
                        reviewsContainer.innerHTML = `
                            <div class="no-reviews-message">
                                <p>Impossible de trouver l'établissement sur Google Maps pour charger les avis.</p>
                                <p>Consultez nos avis sur <a href="https://g.page/review/Esprit-Terroir" target="_blank">Google Maps</a>.</p>
                            </div>
                        `;
                    }
                }
            });
        }
    });
}

// Fetch business data from Google Places API
function fetchBusinessData() {
    // Vérifier si nous avons un Place ID valide
    if (!businessData.placeId) {
        console.log("Pas de Place ID disponible, impossible de récupérer les avis");
        updateBusinessUI(); // Update UI with existing data
        showBusinessInfoWindow(); // Show info window with existing data

        // Afficher un message indiquant qu'aucun avis n'est disponible
        const reviewsContainer = document.getElementById('reviews-container');
        if (reviewsContainer) {
            reviewsContainer.innerHTML = `
                <div class="no-reviews-message">
                    <p>Impossible de récupérer les avis Google - aucun identifiant d'établissement trouvé.</p>
                    <p>Consultez nos avis sur <a href="https://g.page/review/Esprit-Terroir" target="_blank">Google Maps</a>.</p>
                </div>
            `;
        }
        return;
    }

    console.log("Récupération des données avec le Place ID:", businessData.placeId);

    const request = {
        placeId: businessData.placeId,
        // Assurez-vous que 'reviews' est inclus dans les champs demandés
        fields: [
            'name',
            'formatted_address',
            'formatted_phone_number',
            'website',
            'geometry',
            'opening_hours',
            'rating',
            'user_ratings_total',
            'reviews', // Explicitement demander les avis
            'photos'
        ]
    };

    placesService.getDetails(request, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
            console.log("Données récupérées avec succès:", place);
            console.log("Avis disponibles:", place.reviews ? place.reviews.length : 0);

            // Update businessData with the fetched data
            businessData = {
                ...businessData, // Keep existing data and overwrite with new if available
                name: place.name || businessData.name,
                address: place.formatted_address || businessData.address,
                phone: place.formatted_phone_number || businessData.phone,
                website: place.website || businessData.website,
                location: place.geometry?.location ? {
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng()
                } : businessData.location,
                rating: place.rating || businessData.rating,
                reviewsCount: place.user_ratings_total || businessData.reviewsCount,
                reviews: place.reviews || [],
                openingHours: place.opening_hours ? place.opening_hours.weekday_text : null,
                isOpenNow: place.opening_hours ? place.opening_hours.isOpen() : null // isOpen can be undefined
            };

            // Update UI with the fetched data
            updateBusinessUI();

            // Update the info window with the new data
            showBusinessInfoWindow();

            // Afficher uniquement les avis Google réels
            displayReviews(place.reviews || []);
        } else {
            console.error('Error fetching business details:', status);
            // Mettre à jour l'UI avec les données de base ou ce qu'on a
            updateBusinessUI();
            showBusinessInfoWindow();

            // Afficher un message indiquant que les avis n'ont pas pu être récupérés
            const reviewsContainer = document.getElementById('reviews-container');
            if (reviewsContainer) {
                reviewsContainer.innerHTML = `
                    <div class="no-reviews-message">
                        <p>Impossible de récupérer les avis Google (erreur: ${status}).</p>
                        <p>Consultez nos avis sur <a href="https://g.page/review/Esprit-Terroir" target="_blank">Google Maps</a>.</p>
                    </div>
                `;
            }
        }
    });
} // THIS IS THE CORRECT END OF fetchBusinessData
// THE EXTRA '}' WAS REMOVED FROM AFTER THIS LINE

// Update the UI with business data
function updateBusinessUI() {
    const averageRatingEl = document.getElementById('average-rating');
    const starsContainerEl = document.getElementById('rating-stars');
    const reviewCountEl = document.getElementById('review-count');

    if (averageRatingEl) averageRatingEl.textContent = businessData.rating.toFixed(1);
    if (starsContainerEl) starsContainerEl.innerHTML = generateStarsHTML(businessData.rating);
    if (reviewCountEl) reviewCountEl.textContent = `${businessData.reviewsCount} avis`;

    // Update business hours
    updateBusinessHours();
}

// Update business hours display
function updateBusinessHours() {
    const hoursContainer = document.getElementById('business-hours-container');
    if (!hoursContainer) return;

    if (!businessData.openingHours) {
        // Fallback hours if Google data is not available
        hoursContainer.innerHTML = `
            <div class="hours-item">
                <span class="day">Lundi - Samedi</span>
                <span class="time">8h30 - 19h30</span>
            </div>
            <div class="hours-item">
                <span class="day">Dimanche</span>
                <span class="time">8h30 - 12h30</span>
            </div>
        `;
        return;
    }

    // Get current day (0 = Sunday, 1 = Monday, ...)
    const today = new Date().getDay(); // Sunday is 0, Monday is 1, etc.
    // Google's opening_hours.weekday_text usually starts with Monday as index 0
    // Need to map Google's day index to JS Date's getDay() index
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const googleDaysOrder = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];


    let hoursHTML = '';
    businessData.openingHours.forEach((hourText) => {
        // Parse the day and hours from the text (e.g., "Lundi : 08:30 – 19:30")
        const parts = hourText.split(/:(.*)/s); // Split on the first colon
        const dayName = parts[0].trim();
        const hours = parts[1] ? parts[1].trim() : 'Fermé';

        // Determine if this is today for styling
        const dayIndexInGoogleOrder = googleDaysOrder.indexOf(dayName);
        // Google Monday=0...Sunday=6. JS Date Sunday=0...Saturday=6
        const jsDayIndex = (dayIndexInGoogleOrder + 1) % 7;
        const isToday = jsDayIndex === today;

        hoursHTML += `
            <div class="hours-item ${isToday ? 'today' : ''}">
                <span class="day">${dayName}</span>
                <span class="time">${hours.replace('–', '-')}</span>
            </div>
        `;
    });

    hoursContainer.innerHTML = hoursHTML;

    // Add open/closed status if available
    if (businessData.isOpenNow !== null && businessData.isOpenNow !== undefined) {
        const statusElement = document.createElement('div');
        statusElement.classList.add('open-status');
        statusElement.textContent = businessData.isOpenNow ? 'Ouvert maintenant' : 'Fermé actuellement';
        statusElement.style.color = businessData.isOpenNow ? 'var(--google-green, green)' : 'var(--google-red, red)';
        statusElement.style.fontWeight = 'bold';
        statusElement.style.marginTop = '10px';

        hoursContainer.appendChild(statusElement);
    }
}

// Convert Google time format to French time format (This function might not be needed if Google already provides French format)
// The current updateBusinessHours directly uses the text from Google, which is often localized.
// If conversion is still needed for some reason, this function would be the place.
// For now, this function is not actively used by updateBusinessHours if weekday_text is already well-formatted.
function convertToFrenchTimeFormat(timeStr) {
    // Example: "8:30 AM – 7:30 PM" -> "8h30 - 19h30"
    // This is simplified. Google's weekday_text is usually already localized.
    try {
        if (timeStr.toLowerCase() === "closed" || timeStr.toLowerCase() === "fermé") return "Fermé";
        const times = timeStr.split(/\s*–\s*|\s*-\s*/); // Split by '–' or '-'
        if (times.length !== 2) return timeStr;

        const formatPart = (part) => {
            let [time, period] = part.trim().split(/\s+/);
            let [hour, minute] = time.split(':');
            hour = parseInt(hour);

            if (period) { // AM/PM format
                period = period.toUpperCase();
                if (period === 'PM' && hour !== 12) hour += 12;
                if (period === 'AM' && hour === 12) hour = 0; // Midnight
            }
            return `${String(hour).padStart(2, '0')}h${minute}`;
        };

        return `${formatPart(times[0])} - ${formatPart(times[1])}`;
    } catch (error) {
        console.error('Error converting time format:', error, "Input:", timeStr);
        return timeStr; // Return original on error
    }
}

// Show the business info window on the map
function showBusinessInfoWindow() {
    if (!infoWindow || !map || !marker) return; // Ensure map elements are initialized

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

// Display reviews from Google
function displayReviews(reviews) {
    const reviewsContainer = document.getElementById('reviews-container');
    if (!reviewsContainer) return;

    // Vérifier si nous avons des avis à afficher
    if (!reviews || reviews.length === 0) {
        console.log("Aucun avis réel n'a été trouvé ou fourni.");
        reviewsContainer.innerHTML = `
            <div class="no-reviews-message">
                <p>Aucun avis n'a pu être récupéré depuis Google pour le moment.</p>
                <p>Consultez nos avis sur <a href="https://g.page/review/Esprit-Terroir" target="_blank">Google Maps</a>.</p>
            </div>
        `;
        return;
    }

    console.log(`Affichage de ${reviews.length} avis réels de Google`);

    let reviewsHTML = '';

    reviews.forEach((review, index) => {
        console.log(`Avis ${index + 1}:`, review.author_name, review.rating, review.time);

        // Get the first letter of the author name for the avatar
        const avatarText = review.author_name ? review.author_name.charAt(0).toUpperCase() : '?';

        // Format the relative time
        const relativeTime = formatRelativeTime(review.time); // review.time is in seconds since epoch

        // Préparer le texte de l'avis (s'assurer qu'il n'est pas null)
        const reviewText = review.text || '';

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
                <div class="review-content">${reviewText.replace(/\n/g, '<br>')}</div>
            </div>
        `;
    });

    reviewsContainer.innerHTML = reviewsHTML;

    // Add event listener to "load more reviews" button
    const loadMoreButton = document.getElementById('load-more-reviews');
    if (loadMoreButton) {
        loadMoreButton.style.display = 'inline-block'; // Make sure it's visible
        loadMoreButton.addEventListener('click', (e) => {
            e.preventDefault();
            // Utiliser le Place ID pour ouvrir la page des avis Google
            let googleReviewsUrl = 'https://www.google.com/search?q=Esprit+Terroir+Aix+en+Provence+avis'; // Fallback
            if (businessData.placeId) {
                googleReviewsUrl = `https://search.google.com/local/reviews?placeid=${businessData.placeId}`;
            } else if (businessData.name && businessData.address) {
                 googleReviewsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(businessData.name + " " + businessData.address)}`;
            }
            window.open(googleReviewsUrl, '_blank');
        });
    }
}

// Générer une couleur d'arrière-plan pour l'avatar basée sur la lettre
function generateAvatarColor(letter) {
    // Utiliser un hash simple basé sur le code ASCII
    const charCode = letter.charCodeAt(0);
    const hue = (charCode * 137.508) % 360; // Golden angle approximation for good distribution
    return `hsl(${hue}, 60%, 70%)`; // Adjusted saturation and lightness
}

// Generate HTML for star ratings
function generateStarsHTML(rating, small = false) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.4 && rating % 1 <= 0.6; // More precise half-star
    const partialStar = rating % 1 > 0 && rating % 1 < 0.4 || rating % 1 > 0.6; // For a filled star if mostly full
    let fullStarsToDraw = fullStars;
    if (partialStar && (rating % 1 > 0.6)) { // If more than 0.6, count as full star for display
        fullStarsToDraw +=1;
    }

    const size = small ? 16 : 20;
    let starsHTML = '';

    // Add full stars
    for (let i = 0; i < fullStarsToDraw; i++) {
        starsHTML += `
            <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" fill="currentColor" viewBox="0 0 16 16" class="star-icon full-star">
                <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
            </svg>
        `;
    }

    // Add half star if needed
    if (halfStar) {
        starsHTML += `
            <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" fill="currentColor" viewBox="0 0 16 16" class="star-icon half-star">
                <path d="M5.354 5.119 7.538.792A.516.516 0 0 1 8 .5c.183 0 .366.097.465.292l2.184 4.327 4.898.696A.537.537 0 0 1 16 6.32a.548.548 0 0 1-.17.445l-3.523 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256a.52.52 0 0 1-.146.05c-.342.06-.668-.254-.6-.642l.83-4.73L.173 6.765a.55.55 0 0 1-.172-.403.58.58 0 0 1 .085-.302.513.513 0 0 1 .37-.245l4.898-.696zM8 12.027a.5.5 0 0 1 .232.056l3.686 1.894-.694-3.957a.565.565 0 0 1 .162-.505l2.907-2.77-4.052-.576a.525.525 0 0 1-.393-.288L8.001 2.223 8 2.226v9.8z"/>
            </svg>
        `;
    }
    const emptyStars = 5 - fullStarsToDraw - (halfStar ? 1 : 0);
    // Add empty stars
    for (let i = 0; i < emptyStars; i++) {
        starsHTML += `
            <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" fill="currentColor" viewBox="0 0 16 16" class="star-icon empty-star">
                <path d="M2.866 14.85c-.078.444.36.791.746.593l4.39-2.256 4.389 2.256c.386.198.824-.149.746-.592l-.83-4.73 3.522-3.356c.33-.314.16-.888-.282-.95l-4.898-.696L8.465.792a.513.513 0 0 0-.927 0L5.354 5.12l-4.898.696c-.441.062-.612.636-.283.95l3.523 3.356-.83 4.73zm4.905-2.767-3.686 1.894.694-3.957a.565.565 0 0 0-.163-.505L1.71 6.745l4.052-.576a.525.525 0 0 0 .393-.288L8 2.223l1.847 3.658a.525.525 0 0 0 .393.288l4.052.575-2.906 2.77a.565.565 0 0 0-.163.506l.694 3.957-3.686-1.894a.503.503 0 0 0-.461 0z"/>
            </svg>
        `;
    }

    return starsHTML;
}

// Format the timestamp to a relative time string
function formatRelativeTime(unixTimestampInSeconds) {
    if (!unixTimestampInSeconds) return 'Date inconnue';

    const now = new Date();
    const reviewDate = new Date(unixTimestampInSeconds * 1000); // Convert to milliseconds
    const diffInMs = now.getTime() - reviewDate.getTime();
    const diffInSeconds = Math.floor(diffInMs / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays < 1) {
        if (diffInHours < 1) {
            if (diffInMinutes < 1) {
                return `il y a quelques secondes`;
            }
            return `il y a ${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'}`;
        }
        return `il y a ${diffInHours} ${diffInHours === 1 ? 'heure' : 'heures'}`;
    } else if (diffInDays === 1) {
        return 'hier';
    } else if (diffInDays < 7) {
        return `il y a ${diffInDays} jours`;
    } else if (diffInDays < 30) {
        const weeks = Math.floor(diffInDays / 7);
        return `il y a ${weeks} ${weeks === 1 ? 'semaine' : 'semaines'}`;
    } else if (diffInDays < 365) {
        const months = Math.floor(diffInDays / 30.44); // Average days in month
        return `il y a ${months} ${months === 1 ? 'mois' : 'mois'}`;
    } else {
        const years = Math.floor(diffInDays / 365.25); // Account for leap year
        return `il y a ${years} ${years === 1 ? 'an' : 'ans'}`;
    }
}

// Get custom map styles
function getMapStyles() {
    return [
        // Your existing map styles... (ensure this is a valid array of style objects)
        {
            "featureType": "administrative",
            "elementType": "labels.text.fill",
            "stylers": [{"color": "#444444"}]
        },
        {"featureType": "landscape", "elementType": "all", "stylers": [{"color": "#f2f2f2"}]},
        {"featureType": "poi", "elementType": "all", "stylers": [{"visibility": "on"}]},
        {
            "featureType": "poi.business",
            "elementType": "geometry.fill",
            "stylers": [{"visibility": "on"}]
        },
        {
            "featureType": "poi.park",
            "elementType": "all",
            "stylers": [{"visibility": "on"}, {"color": "#c6e7a0"}]
        },
        {
            "featureType": "road",
            "elementType": "all",
            "stylers": [{"saturation": -100}, {"lightness": 45}]
        },
        {
            "featureType": "road.highway",
            "elementType": "all",
            "stylers": [{"visibility": "simplified"}]
        },
        {
            "featureType": "road.arterial",
            "elementType": "labels.icon",
            "stylers": [{"visibility": "off"}]
        },
        {"featureType": "transit", "elementType": "all", "stylers": [{"visibility": "off"}]},
        {
            "featureType": "water",
            "elementType": "all",
            "stylers": [{"color": "#b0e0f1"}, {"visibility": "on"}]
        }
    ];
}

// Event listeners once the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu
    const hamburger = document.querySelector('.hamburger');
    const menu = document.querySelector('.menu');

    if (hamburger && menu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            menu.classList.toggle('active');
        });
    }


    // Close menu when clicking menu items
    const menuLinks = document.querySelectorAll('.menu a');
    menuLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (hamburger && menu) {
                hamburger.classList.remove('active');
                menu.classList.remove('active');
            }
        });
    });

    // Header scroll
    const header = document.querySelector('.header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }


    // Back to top button
    const backToTopBtn = document.getElementById('backToTop');
    if (backToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTopBtn.classList.add('active');
            } else {
                backToTopBtn.classList.remove('active');
            }
        });

        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            // Ensure it's not just "#" or an empty href
            if (href && href.length > 1) {
                try {
                    const target = document.querySelector(href);
                    if (target) {
                        e.preventDefault();
                        const headerElement = document.querySelector('.header');
                        const headerHeight = headerElement ? headerElement.offsetHeight : 0;
                        const elementPosition = target.getBoundingClientRect().top;
                        const offsetPosition = elementPosition + window.pageYOffset - headerHeight;

                        window.scrollTo({
                            top: offsetPosition,
                            behavior: 'smooth'
                        });
                    }
                } catch (error) {
                    // Catch invalid selector errors if href is not a valid ID
                    console.warn("Smooth scroll failed for selector:", href, error);
                }
            }
        });
    });
});
