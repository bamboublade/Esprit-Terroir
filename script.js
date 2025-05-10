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
}// Rechercher automatiquement le Place ID correct
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
                map.setCenter(businessData.location);
                marker.setPosition(businessData.location);
                contactMap.setCenter(businessData.location);
            }
            
            // Récupérer les informations détaillées avec le nouveau Place ID
            fetchBusinessData();
        } else {
            console.error("Impossible de trouver le Place ID automatiquement:", status);
            console.log("Essai de recherche avec Nearby Search comme alternative...");
            
            // Essayer avec nearbySearch comme alternative
            const nearbyRequest = {
                location: businessData.location,
                radius: 500,
                keyword: 'Esprit Terroir'
            };
            
            placesService.nearbySearch(nearbyRequest, (nearbyResults, nearbyStatus) => {
                if (nearbyStatus === google.maps.places.PlacesServiceStatus.OK && nearbyResults && nearbyResults.length > 0) {
                    // Place ID trouvé par recherche à proximité
                    const nearbyPlace = nearbyResults[0];
                    console.log("Place ID trouvé par recherche à proximité:", nearbyPlace.place_id);
                    
                    businessData.placeId = nearbyPlace.place_id;
                    fetchBusinessData();
                } else {
                    console.error("Impossible de trouver le Place ID via recherche à proximité:", nearbyStatus);
                    console.log("Utilisation des données statiques comme fallback");
                    
                    // Utiliser les données statiques
                    updateBusinessUI();
                    showBusinessInfoWindow();
                    displayFallbackReviews();
                }
            });
        }
    });
}// Global variables
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

// Initialiser la carte et rechercher automatiquement le Place ID
window.initMaps = function() {
    // Initialiser les cartes
    initBusinessMap();
    initContactMap();
    
    // Rechercher le bon Place ID automatiquement, puis récupérer les données
    findCorrectPlaceId();
}

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

// Fetch business data from Google Places API
function fetchBusinessData() {
    // Vérifier si nous avons un Place ID valide
    if (!businessData.placeId) {
        console.log("Pas de Place ID disponible, impossible de récupérer les avis");
        updateBusinessUI();
        showBusinessInfoWindow();
        
        // Afficher un message indiquant qu'aucun avis n'est disponible
        const reviewsContainer = document.getElementById('reviews-container');
        reviewsContainer.innerHTML = `
            <div class="no-reviews-message">
                <p>Impossible de récupérer les avis Google - aucun identifiant d'établissement trouvé.</p>
                <p>Consultez nos avis sur <a href="https://g.page/Esprit-Terroir/review" target="_blank">Google Maps</a>.</p>
            </div>
        `;
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
                ...businessData,
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
                isOpenNow: place.opening_hours ? place.opening_hours.isOpen() : null
            };
            
            // Update UI with the fetched data
            updateBusinessUI();
            
            // Update the info window with the new data
            showBusinessInfoWindow();
            
            // Afficher uniquement les avis Google réels
            displayReviews(place.reviews || []);
        } else {
            console.error('Error fetching business details:', status);
            // Mettre à jour l'UI avec les données de base
            updateBusinessUI();
            showBusinessInfoWindow();
            
            // Afficher un message indiquant que les avis n'ont pas pu être récupérés
            const reviewsContainer = document.getElementById('reviews-container');
            reviewsContainer.innerHTML = `
                <div class="no-reviews-message">
                    <p>Impossible de récupérer les avis Google (erreur: ${status}).</p>
                    <p>Consultez nos avis sur <a href="https://g.page/Esprit-Terroir/review" target="_blank">Google Maps</a>.</p>
                </div>
            `;
        }
    });
}
}

// Update the UI with business data
function updateBusinessUI() {
    // Update average rating
    document.getElementById('average-rating').textContent = businessData.rating.toFixed(1);
    
    // Update rating stars
    const starsContainer = document.getElementById('rating-stars');
    starsContainer.innerHTML = generateStarsHTML(businessData.rating);
    
    // Update review count
    document.getElementById('review-count').textContent = `${businessData.reviewsCount} avis`;
    
    // Update business hours
    updateBusinessHours();
}

// Update business hours display
function updateBusinessHours() {
    const hoursContainer = document.getElementById('business-hours-container');
    
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
    const today = new Date().getDay();
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    
    let hoursHTML = '';
    
    businessData.openingHours.forEach((hourText, index) => {
        // Parse the day and hours from the text (e.g., "Monday: 8:30 AM – 7:30 PM")
        const day = hourText.split(':')[0];
        const hours = hourText.split(':').slice(1).join(':').trim();
        
        // Convert to French format
        const frenchDay = days[(index + 1) % 7]; // Adjust index because Google starts with Monday (index 0)
        const frenchHours = convertToFrenchTimeFormat(hours);
        
        // Check if this is today
        const isToday = (index + 1) % 7 === today;
        
        hoursHTML += `
            <div class="hours-item ${isToday ? 'today' : ''}">
                <span class="day">${frenchDay}</span>
                <span class="time">${frenchHours}</span>
            </div>
        `;
    });
    
    hoursContainer.innerHTML = hoursHTML;
    
    // Add open/closed status if available
    if (businessData.isOpenNow !== null) {
        const statusElement = document.createElement('div');
        statusElement.classList.add('open-status');
        statusElement.textContent = businessData.isOpenNow ? 'Ouvert maintenant' : 'Fermé actuellement';
        statusElement.style.color = businessData.isOpenNow ? 'var(--google-green)' : 'var(--google-red)';
        statusElement.style.fontWeight = 'bold';
        statusElement.style.marginTop = '10px';
        
        hoursContainer.appendChild(statusElement);
    }
}

// Convert Google time format to French time format
function convertToFrenchTimeFormat(timeStr) {
    // This is a simplified conversion and may need adjustment
    // Example: "8:30 AM – 7:30 PM" -> "8h30 - 19h30"
    
    try {
        // Split time ranges
        const times = timeStr.split('–');
        if (times.length !== 2) return timeStr;
        
        // Process opening time
        let openingTime = times[0].trim();
        let openingHour = parseInt(openingTime.split(':')[0]);
        const openingMinute = openingTime.split(':')[1].split(' ')[0];
        const openingAmPm = openingTime.split(' ')[1];
        
        if (openingAmPm === 'PM' && openingHour !== 12) {
            openingHour += 12;
        } else if (openingAmPm === 'AM' && openingHour === 12) {
            openingHour = 0;
        }
        
        // Process closing time
        let closingTime = times[1].trim();
        let closingHour = parseInt(closingTime.split(':')[0]);
        const closingMinute = closingTime.split(':')[1].split(' ')[0];
        const closingAmPm = closingTime.split(' ')[1];
        
        if (closingAmPm === 'PM' && closingHour !== 12) {
            closingHour += 12;
        } else if (closingAmPm === 'AM' && closingHour === 12) {
            closingHour = 0;
        }
        
        return `${openingHour}h${openingMinute} - ${closingHour}h${closingMinute}`;
    } catch (error) {
        console.error('Error converting time format:', error);
        return timeStr;
    }
}

// Show the business info window on the map
function showBusinessInfoWindow() {
    const content = `
        <div class="map-info-window">
            <div class="map-info-title">${businessData.name}</div>
            <div class="map-info-address">${businessData.address}</div>
            <div class="map-info-rating">
                <span class="map-info-rating-score">${businessData.rating.toFixed(1)}</span>
                <div class="map-info-rating-stars">${generateStarsHTML(businessData.rating, true)}</div>
            </div>
            <div class="map-info-actions">
                <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(businessData.address)}&destination_place_id=${businessData.placeId}" target="_blank" class="map-info-button">Itinéraire</a>
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
    
    // Vérifier si nous avons des avis à afficher
    if (!reviews || reviews.length === 0) {
        console.log("Aucun avis réel n'a été trouvé");
        reviewsContainer.innerHTML = `
            <div class="no-reviews-message">
                <p>Aucun avis n'a pu être récupéré depuis Google pour le moment.</p>
                <p>Consultez nos avis sur <a href="https://g.page/Esprit-Terroir/review" target="_blank">Google Maps</a>.</p>
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
        const relativeTime = formatRelativeTime(review.time);
        
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
                <div class="review-content">${reviewText}</div>
            </div>
        `;
    });
    
    reviewsContainer.innerHTML = reviewsHTML;
    
    // Add event listener to "load more reviews" button
    const loadMoreButton = document.getElementById('load-more-reviews');
    if (loadMoreButton) {
        loadMoreButton.addEventListener('click', (e) => {
            e.preventDefault();
            // Utiliser le Place ID pour ouvrir la page des avis Google
            if (businessData.placeId) {
                window.open(`https://search.google.com/local/reviews?placeid=${businessData.placeId}`, '_blank');
            } else {
                // Fallback si nous n'avons pas de Place ID
                window.open(`https://www.google.com/search?q=Esprit+Terroir+Aix+en+Provence+avis`, '_blank');
            }
        });
    }
}

// Générer une couleur d'arrière-plan pour l'avatar basée sur la lettre
function generateAvatarColor(letter) {
    // Utiliser un hash simple basé sur le code ASCII
    const charCode = letter.charCodeAt(0);
    const hue = (charCode * 10) % 360; // Teinte entre 0 et 360
    return `hsl(${hue}, 70%, 60%)`;
}

// Supprimer la fonction displayFallbackReviews qui n'est plus utilisée
// Cette fonction a été supprimée car nous voulons uniquement des avis réels

// Generate HTML for star ratings
function generateStarsHTML(rating, small = false) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    const size = small ? 16 : 20;
    
    let starsHTML = '';
    
    // Add full stars
    for (let i = 0; i < fullStars; i++) {
        starsHTML += `
            <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" fill="currentColor" viewBox="0 0 16 16">
                <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
            </svg>
        `;
    }
    
    // Add half star if needed
    if (halfStar) {
        starsHTML += `
            <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" fill="currentColor" viewBox="0 0 16 16">
                <path d="M5.354 5.119 7.538.792A.516.516 0 0 1 8 .5c.183 0 .366.097.465.292l2.184 4.327 4.898.696A.537.537 0 0 1 16 6.32a.548.548 0 0 1-.17.445l-3.523 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256a.52.52 0 0 1-.146.05c-.342.06-.668-.254-.6-.642l.83-4.73L.173 6.765a.55.55 0 0 1-.172-.403.58.58 0 0 1 .085-.302.513.513 0 0 1 .37-.245l4.898-.696zM8 12.027a.5.5 0 0 1 .232.056l3.686 1.894-.694-3.957a.565.565 0 0 1 .162-.505l2.907-2.77-4.052-.576a.525.525 0 0 1-.393-.288L8.001 2.223 8 2.226v9.8z"/>
            </svg>
        `;
    }
    
    // Add empty stars
    for (let i = 0; i < emptyStars; i++) {
        starsHTML += `
            <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" fill="currentColor" viewBox="0 0 16 16">
                <path d="M2.866 14.85c-.078.444.36.791.746.593l4.39-2.256 4.389 2.256c.386.198.824-.149.746-.592l-.83-4.73 3.522-3.356c.33-.314.16-.888-.282-.95l-4.898-.696L8.465.792a.513.513 0 0 0-.927 0L5.354 5.12l-4.898.696c-.441.062-.612.636-.283.95l3.523 3.356-.83 4.73zm4.905-2.767-3.686 1.894.694-3.957a.565.565 0 0 0-.163-.505L1.71 6.745l4.052-.576a.525.525 0 0 0 .393-.288L8 2.223l1.847 3.658a.525.525 0 0 0 .393.288l4.052.575-2.906 2.77a.565.565 0 0 0-.163.506l.694 3.957-3.686-1.894a.503.503 0 0 0-.461 0z"/>
            </svg>
        `;
    }
    
    return starsHTML;
}

// Format the timestamp to a relative time string
function formatRelativeTime(timestamp) {
    if (!timestamp) return 'Date inconnue';
    
    const now = new Date();
    const reviewDate = new Date(timestamp * 1000); // Convert to milliseconds
    const diffInMs = now - reviewDate;
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays < 1) {
        return 'aujourd\'hui';
    } else if (diffInDays === 1) {
        return 'hier';
    } else if (diffInDays < 7) {
        return `il y a ${diffInDays} jours`;
    } else if (diffInDays < 30) {
        const weeks = Math.floor(diffInDays / 7);
        return `il y a ${weeks} ${weeks === 1 ? 'semaine' : 'semaines'}`;
    } else if (diffInDays < 365) {
        const months = Math.floor(diffInDays / 30);
        return `il y a ${months} ${months === 1 ? 'mois' : 'mois'}`;
    } else {
        const years = Math.floor(diffInDays / 365);
        return `il y a ${years} ${years === 1 ? 'an' : 'ans'}`;
    }
}

// Get custom map styles
function getMapStyles() {
    return [
        {
            "featureType": "administrative",
            "elementType": "labels.text.fill",
            "stylers": [
                {
                    "color": "#444444"
                }
            ]
        },
        {
            "featureType": "landscape",
            "elementType": "all",
            "stylers": [
                {
                    "color": "#f2f2f2"
                }
            ]
        },
        {
            "featureType": "poi",
            "elementType": "all",
            "stylers": [
                {
                    "visibility": "on"
                }
            ]
        },
        {
            "featureType": "poi.business",
            "elementType": "geometry.fill",
            "stylers": [
                {
                    "visibility": "on"
                }
            ]
        },
        {
            "featureType": "poi.park",
            "elementType": "all",
            "stylers": [
                {
                    "visibility": "on"
                },
                {
                    "color": "#c6e7a0"
                }
            ]
        },
        {
            "featureType": "road",
            "elementType": "all",
            "stylers": [
                {
                    "saturation": -100
                },
                {
                    "lightness": 45
                }
            ]
        },
        {
            "featureType": "road.highway",
            "elementType": "all",
            "stylers": [
                {
                    "visibility": "simplified"
                }
            ]
        },
        {
            "featureType": "road.arterial",
            "elementType": "labels.icon",
            "stylers": [
                {
                    "visibility": "off"
                }
            ]
        },
        {
            "featureType": "transit",
            "elementType": "all",
            "stylers": [
                {
                    "visibility": "off"
                }
            ]
        },
        {
            "featureType": "water",
            "elementType": "all",
            "stylers": [
                {
                    "color": "#b0e0f1"
                },
                {
                    "visibility": "on"
                }
            ]
        }
    ];
}

// Event listeners once the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu
    const hamburger = document.querySelector('.hamburger');
    const menu = document.querySelector('.menu');

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        menu.classList.toggle('active');
    });

    // Close menu when clicking menu items
    const menuLinks = document.querySelectorAll('.menu a');
    menuLinks.forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            menu.classList.remove('active');
        });
    });

    // Header scroll
    const header = document.querySelector('.header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

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
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                const headerHeight = document.querySelector('.header').offsetHeight;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerHeight;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
});
