class Professional {
   
    constructor(name, ratings, experience, distance, photo) {
        this.name = name;
        this.ratings = ratings;
        this.experience = experience;
        this.distance = distance;
        this.photo = photo;
       
    }

    generateStars(ratings) {
        let stars = '';
        for (let i = 0; i < 5; i++) {
            if (i < ratings) {
                stars += '<span class="filled">★</span>';
            } else {
                stars += '<span>★</span>';
            }
        }
        return stars;
    }

    renderCard() {
        return `
            <div class="card">
                <div class="worker-photo">
                    <img src="${this.photo}" alt="${this.name}">
                </div>
                <div class="card-content">
                    <h3>${this.name}</h3>
                    <div class="rating-visual">
                        ${this.generateStars(this.ratings)}
                    </div>
                    <p class="experience">${this.experience}</p>
                    <p class="distance">${this.distance}</p>
                    <button class="contact-btn">Contact</button>
                </div>
            </div>
        `;
    }
}

let allProfessionals = []; 

document.addEventListener("DOMContentLoaded", async () => { 
    console.log("script.js has loaded and DOM is ready!");
    const workerCardsContainer = document.querySelector(".worker-cards");


    function renderProfessionalCards(professionalsToRender) {
        if (workerCardsContainer) {
            workerCardsContainer.innerHTML = ''; 
            if (professionalsToRender.length === 0) {
                workerCardsContainer.innerHTML = '<p class="no-results">No professionals found.</p>'; // Simplified message
            } else {
                professionalsToRender.forEach(professional => {
                    workerCardsContainer.innerHTML += professional.renderCard();
                });
            }
        }
    }

    try {
        const response = await fetch("assets/professionals.json");
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const jsonData = await response.json();

        allProfessionals = jsonData.map(data => new Professional(
            data.name,
            data.ratings,
            data.experience,
            data.distance,
            data.photo

        ));

        console.log("Fetched Professionals:", allProfessionals);

        renderProfessionalCards(allProfessionals);

    } catch (error) {
        console.error("Error fetching or parsing professional data:", error);
        if (workerCardsContainer) {
            workerCardsContainer.innerHTML = '<p class="error-message">Failed to load professionals. Please try again later.</p>';
        }
    }

});
    function renderProfessionalCards(professionalsToRender) {
        if (workerCardsContainer) {
            workerCardsContainer.innerHTML = ''; 
            if (professionalsToRender.length === 0) {
                workerCardsContainer.innerHTML = '<p class="no-results">No professionals found for this search.</p>';
            } else {
                professionalsToRender.forEach(professional => {
                    workerCardsContainer.innerHTML += professional.renderCard();
                });
            }
        }
    }
    