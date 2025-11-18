class Professional {
    constructor(data) {
        this.name = data.name;
        this.ratings = data.ratings;
        this.experience = data.experience;
        this.distance = data.distance;
        this.photo = data.photo;
        this._id = data._id;
        this.contact = data.contact;
        this.city = data.city;
        this.skills = data.skills;
    }

    generateStars(ratings) {
        let stars = '';
        const numericRatings = typeof ratings === 'number' ? ratings : 0;
        for (let i = 0; i < 5; i++) {
            if (i < Math.floor(numericRatings)) {
                stars += '<span class="filled">★</span>';
            } else {
                stars += '<span>★</span>';
            }
        }
        return stars;
    }

    renderCard() {
        const skillsDisplay = this.skills && Array.isArray(this.skills) ? this.skills.join(', ') : 'N/A';

        return `
            <div class="card">
                <div class="worker-photo">
                    <img src="${this.photo || 'default-avatar.png'}" alt="${this.name}">
                </div>
                <div class="card-content">
                    <h3>${this.name}</h3>
                    <div class="rating-visual">
                        ${this.generateStars(this.ratings)}
                        <span class="rating-number">${this.ratings !== undefined ? this.ratings : 'N/A'}/5</span>
                    </div>
                    <p class="experience">${this.experience} years experience</p>
                    <p class="distance">${this.distance} km away</p>
                    <p class="city-location">Location: ${this.city || 'N/A'}</p>
                    <p class="skill">Skills: ${skillsDisplay}</p>
                    <button class="contact-btn" data-worker-id="${this._id}" data-contact-info="${this.contact}">Contact</button>
                </div>
            </div>
        `;
    }
}

// ... (Professional class and other code) ...

let allProfessionals = [];

document.addEventListener("DOMContentLoaded", async () => {
    console.log("script.js has loaded and DOM is ready!");
    const workerCardsContainer = document.querySelector(".worker-cards");

    // --- UPDATED: Get references to your existing HTML elements using their structure or classes ---

    // For the skill search input:
   const skillSearchInput = document.getElementById('search-skill');
const citySearchInput  = document.getElementById('search-city');
const searchButton     = document.querySelector('.find-help');

    // For the "Clear Search" button:
    // This button currently doesn't exist in your HTML.
    // You either need to add it to HTML, or remove its references here.
    // For now, I'm providing a selector assuming you WILL add a button with class="clear-btn"
    const clearSearchButton = document.querySelector(".clear-btn"); 
    // If you don't want a clear button, remove this line and its event listener further down.


    // --- Add these console logs to verify that elements are found ---
    console.log("skillSearchInput:", skillSearchInput); // Should not be null
    console.log("citySearchInput:", citySearchInput);   // Should not be null
    console.log("searchButton:", searchButton);         // Should not be null
    // ---- Ensure Find Help button triggers the search ----
if (searchButton) {
    searchButton.addEventListener('click', function (e) {
        e.preventDefault();
        console.log("Find Help clicked");
        fetchAndDisplayProfessionals();
    });
} else {
    console.error("Find Help button not found!");
}

    console.log("clearSearchButton:", clearSearchButton); // Will be null if button not in HTML yet


    function renderProfessionalCards(professionalsToRender) {
        // ... (this part remains the same) ...
        if (workerCardsContainer) {
            workerCardsContainer.innerHTML = '';
            if (professionalsToRender.length === 0) {
                workerCardsContainer.innerHTML = '<p class="no-results">No professionals found matching your criteria.</p>';
            } else {
                professionalsToRender.forEach(professional => {
                    workerCardsContainer.innerHTML += professional.renderCard();
                });
            }
        }
    }

    // --- Function to fetch and display professionals based on current search inputs ---
    async function fetchAndDisplayProfessionals() {
        // Safe value extraction
        const skillTerm = skillSearchInput ? skillSearchInput.value.trim() : '';
        const cityTerm  = citySearchInput ? citySearchInput.value.trim() : '';
    
        // NEW: treat skillTerm as name search too
        const nameTerm = skillTerm;
    
        // If nothing entered → show placeholder, no API call
        if (!skillTerm && !cityTerm) {
            if (workerCardsContainer) {
                workerCardsContainer.innerHTML = '<p class="no-results">Type a skill or  city to search professionals.</p>';
            }
            return;
        }
    
        // Build query params
        const queryParams = [];
        if (skillTerm) queryParams.push(`skill=${encodeURIComponent(skillTerm)}`);
        if (nameTerm)  queryParams.push(`name=${encodeURIComponent(nameTerm)}`); // NEW
        if (cityTerm)  queryParams.push(`city=${encodeURIComponent(cityTerm)}`);
    
        const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
        const url = `/api/workers${queryString}`;
    
        console.log("FETCH URL:", url); // DEBUG
    
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            const jsonData = await response.json();
            const currentProfessionals = jsonData.map(data => new Professional(data));
    
            if (!skillTerm && !cityTerm) {
                allProfessionals = [...currentProfessionals];
            }
    
            renderProfessionalCards(currentProfessionals);
    
        } catch (error) {
            console.error("Error fetching or parsing professional data:", error);
            if (workerCardsContainer) {
                workerCardsContainer.innerHTML = '<p class="error-message">Failed to load professionals. Please try again later.</p>';
            }
        }
    }
    
    // async function fetchAndDisplayProfessionals() {
    //     // Safely access value only if the element exists
    //     const skillTerm = skillSearchInput ? skillSearchInput.value.trim() : '';
    //     const cityTerm = citySearchInput ? citySearchInput.value.trim() : '';
    
    //     // NEW: if both fields are empty, do not call the API. Show placeholder instead.
    //     if (!skillTerm && !cityTerm) {
    //         if (workerCardsContainer) {
    //             workerCardsContainer.innerHTML = '<p class="no-results">Type a skill or city to search professionals.</p>';
    //         }
    //         return;
    //     }
    //     const queryParams = [];
    //     if (skillTerm) {
    //         queryParams.push(`skill=${encodeURIComponent(skillTerm)}`);
    //     }
    //     if (cityTerm) {
    //         queryParams.push(`city=${encodeURIComponent(cityTerm)}`);
    //     }

    //     const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
    //     const url = `/api/workers${queryString}`;
        
    //     try {
    //         const response = await fetch(url);
    //         if (!response.ok) {
    //             throw new Error(`HTTP error! status: ${response.status}`);
    //         }
    //         const jsonData = await response.json();
    //         const currentProfessionals = jsonData.map(data => new Professional(data));
    //         if (!skillTerm && !cityTerm) {
    //              allProfessionals = [...currentProfessionals];
    //         }
    //         renderProfessionalCards(currentProfessionals);

    //     } catch (error) {
    //         console.error("Error fetching or parsing professional data:", error);
    //         if (workerCardsContainer) {
    //             workerCardsContainer.innerHTML = '<p class="error-message">Failed to load professionals. Please try again later.</p>';
    //         }
    //     }
    // }

    // --- Initial Load ---
    // Only attempt to fetch if the necessary inputs are actually found
    if (workerCardsContainer) {
        workerCardsContainer.innerHTML = '<p class="no-results">Search professionals by skill or city.</p>';
    }
    if (!(skillSearchInput && citySearchInput)) {
        console.error("Search inputs not found in the DOM. Search functionality limited. Check selectors.");
    }


    // --- Search Functionality ---
    if (searchButton) { // Just check if the search button exists
        searchButton.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent form submission and page reload
            fetchAndDisplayProfessionals();
        });
    } else {
        console.warn("Search button not found, search functionality disabled.");
    }

    // Optional: Trigger search on 'Enter' key press in either input
    if (skillSearchInput) {
        skillSearchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); // Prevent form submission
                searchButton?.click(); // Use optional chaining in case button is null
            }
        });
    }
    if (citySearchInput) {
        citySearchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); // Prevent form submission
                searchButton?.click();
            }
        });
    }

    // --- Clear Search Functionality ---
    // This will only work if clearSearchButton is not null (i.e., you added it to HTML)
    if (clearSearchButton) { 
        clearSearchButton.addEventListener('click', () => {
            if (skillSearchInput) skillSearchInput.value = '';
            if (citySearchInput) citySearchInput.value = '';
            fetchAndDisplayProfessionals();
        });
    } else {
        console.warn("Clear Search button not found, clear functionality disabled.");
    }

    // --- Event listener for Contact buttons (remains the same) ---
    if (workerCardsContainer) {
        workerCardsContainer.addEventListener('click', (event) => {
            const contactButton = event.target.closest('.contact-btn');
            if (contactButton) {
                const workerId = contactButton.dataset.workerId;
                const contactInfo = contactButton.dataset.contactInfo;
                alert(`Contact Worker ID: ${workerId}\nContact Info: ${contactInfo}`);
            }
        });
    }
});