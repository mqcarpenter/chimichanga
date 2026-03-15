document.addEventListener('DOMContentLoaded', () => {
    // Mock Data for "Up Next" queue
    const queue = [
        {
            title: "Project Hail Mary",
            author: "Andy Weir",
            coverGradient: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
            icon: "fa-rocket"
        },
        {
            title: "Atomic Habits",
            author: "James Clear",
            coverGradient: "linear-gradient(135deg, #10b981, #047857)",
            icon: "fa-chart-pie"
        },
        {
            title: "Sapiens",
            author: "Yuval Noah Harari",
            coverGradient: "linear-gradient(135deg, #f59e0b, #b45309)",
            icon: "fa-earth-americas"
        },
        {
            title: "The Three-Body Problem",
            author: "Cixin Liu",
            coverGradient: "linear-gradient(135deg, #8b5cf6, #5b21b6)",
            icon: "fa-user-astronaut"
        }
    ];

    const upNextGrid = document.getElementById('up-next-grid');

    // Populate the grid
    queue.forEach(book => {
        const card = document.createElement('div');
        card.className = 'grid-card glass-panel';
        card.innerHTML = `
            <div class="gradient-placeholder" style="background: ${book.coverGradient}">
                <i class="fa-solid ${book.icon}"></i>
            </div>
            <div class="card-info">
                <h4>${book.title}</h4>
                <p>${book.author}</p>
            </div>
        `;
        // Add a micro-interaction
        card.addEventListener('click', () => {
             card.style.transform = 'scale(0.95)';
             setTimeout(() => {
                 card.style.transform = '';
             }, 150);
        });
        upNextGrid.appendChild(card);
    });

    // Add button interaction
    const addBtn = document.querySelector('.add-btn');
    addBtn.addEventListener('click', () => {
        const icon = addBtn.querySelector('i');
        icon.classList.remove('fa-plus');
        icon.classList.add('fa-spinner', 'fa-spin');
        
        setTimeout(() => {
            icon.classList.remove('fa-spinner', 'fa-spin');
            icon.classList.add('fa-check');
            addBtn.style.background = 'rgba(16, 185, 129, 0.2)';
            addBtn.style.color = 'var(--success)';
            
            setTimeout(() => {
                icon.classList.remove('fa-check');
                icon.classList.add('fa-plus');
                addBtn.style.background = '';
                addBtn.style.color = '';
            }, 2000);
        }, 1000);
    });
});
