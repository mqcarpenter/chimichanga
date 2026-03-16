document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'api/api.php';
    let allBooks = [];
    let similarItems = [];
    let similarIndex = 0;
    
    // UI Elements
    const currentlyReadingGrid = document.getElementById('currently-reading-grid');
    const toReadGrid = document.getElementById('to-read-grid');
    const readGrid = document.getElementById('read-grid');
    const searchModal = document.getElementById('search-modal');
    const similarModal = document.getElementById('similar-modal');
    
    // Load Books
    async function loadBooks() {
        try {
            const res = await fetch(`${API_URL}?action=get_books`);
            const json = await res.json();
            if (json.success) {
                allBooks = json.data;
                renderBooks();
            }
        } catch (e) {
            console.error("Failed to load books from trail", e);
        }
    }
    
    function renderBooks() {
        currentlyReadingGrid.innerHTML = '';
        const reading = allBooks.filter(b => b.status === 'currently-reading');
        const toRead = allBooks.filter(b => b.status === 'to-read');
        const read = allBooks.filter(b => b.status === 'read');
        
        if (reading.length === 0) {
            currentlyReadingGrid.innerHTML = '<p class="empty-msg">No books currently on the trail.</p>';
        } else {
            reading.forEach(b => currentlyReadingGrid.appendChild(createBookCard(b)));
        }
        
        document.getElementById('to-read-grid').innerHTML = toRead.length ? '' : '<p class="empty-msg">The corral is empty.</p>';
        toRead.forEach(b => document.getElementById('to-read-grid').appendChild(createBookCard(b)));

        document.getElementById('read-grid').innerHTML = read.length ? '' : '<p class="empty-msg">The corral is empty.</p>';
        read.forEach(b => document.getElementById('read-grid').appendChild(createBookCard(b)));
    }
    
    function createBookCard(book) {
        const div = document.createElement('div');
        div.className = 'book-card';
        
        const coverPart = book.cover_url ? 
            `<img src="${book.cover_url}" alt="Cover" class="book-cover">` : 
            `<div class="book-cover" style="display:flex;align-items:center;justify-content:center;font-size:3rem;color:var(--leather-dark);"><i class="fa-solid fa-book"></i></div>`;
        
        div.innerHTML = `
            <div class="card-header">
                ${coverPart}
                <div class="book-info">
                    <h3 class="book-title">${book.title}</h3>
                    <p class="book-author">by ${book.author}</p>
                    <div class="ratings">
                        <span><i class="fa-solid fa-star" style="color:var(--gold)"></i> Me: ${book.user_rating || '-'}</span>
                        <span style="margin-left:10px;"><i class="fa-solid fa-users"></i> ${book.community_rating || '-'}</span>
                    </div>
                    <select class="status-select" data-id="${book.id}">
                        <option value="to-read" ${book.status === 'to-read' ? 'selected' : ''}>To Read</option>
                        <option value="currently-reading" ${book.status === 'currently-reading' ? 'selected' : ''}>Currently Reading</option>
                        <option value="read" ${book.status === 'read' ? 'selected' : ''}>Read</option>
                    </select>
                </div>
            </div>
            <div class="book-actions">
                <button class="action-btn" onclick="deleteBook(${book.id})"><i class="fa-solid fa-trash"></i> Drop</button>
                <button class="action-btn find-similar" onclick="openSimilar('${book.title.replace(/'/g, "\\'")}', '${book.author.replace(/'/g, "\\'")}')"><i class="fa-solid fa-compass"></i> Similar Finds</button>
            </div>
        `;
        
        const select = div.querySelector('select');
        select.addEventListener('change', (e) => updateBookStatus(select, book.id, e.target.value));
        
        return div;
    }
    
    async function updateBookStatus(selectElement, id, newStatus) {
        selectElement.disabled = true;
        try {
            await fetch(`${API_URL}?action=update_book`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ id, status: newStatus })
            });
            setTimeout(() => {
                selectElement.disabled = false;
                loadBooks();
            }, 800);
        } catch(e) {
            selectElement.disabled = false;
        }
    }
    
    window.deleteBook = async (id) => {
        if(confirm("Kick this book out of the corral?")) {
            await fetch(`${API_URL}?action=delete_book`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ id })
            });
            loadBooks();
        }
    };
    
    // Modals
    document.getElementById('add-book-btn')?.addEventListener('click', () => searchModal.classList.remove('hidden'));
    document.querySelectorAll('.close-btn').forEach(btn => btn.addEventListener('click', (e) => e.target.closest('.modal').classList.add('hidden')));
    
    // Search
    document.getElementById('google-search-btn').addEventListener('click', async () => {
        const query = document.getElementById('google-search-input').value;
        if (!query) return;
        const resultsGrid = document.getElementById('search-results');
        resultsGrid.innerHTML = '<p>Searching the plains...</p>';
        try {
            const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10`);
            const data = await res.json();
            resultsGrid.innerHTML = '';
            if (data.items) {
                data.items.forEach(item => resultsGrid.appendChild(createSearchResultCard(item, 'Manual Search')));
            }
        } catch(e) { resultsGrid.innerHTML = '<p>Error searching.</p>'; }
    });
    
    function createSearchResultCard(item, suggestionReason) {
        const vol = item.volumeInfo;
        const cover = vol.imageLinks?.thumbnail?.replace('http:', 'https:') || '';
        const title = vol.title || 'Unknown Title';
        const author = vol.authors ? vol.authors.join(', ') : 'Unknown Author';
        const rating = vol.averageRating || 0;
        
        // Two sentence summary logic
        let rawDesc = (vol.description || '').replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
        let sentences = rawDesc.match(/[^.!?]+[.!?]+/g) || [];
        let summary = sentences.slice(0, 2).join(' ').trim();
        if(!summary) summary = rawDesc.substring(0, 150) + '...';

        const div = document.createElement('div');
        div.className = 'book-card';
        div.style.height = 'auto'; // Allow for summary text
        div.innerHTML = `
            <div class="card-header" style="height:auto; min-height:140px;">
                <img src="${cover}" class="book-cover" style="width:90px; height:130px;">
                <div class="book-info" style="padding:10px;">
                    <p style="font-size:0.65rem; color:var(--saddle-orange); font-weight:bold; text-transform:uppercase;">${suggestionReason}</p>
                    <h3 class="book-title" style="font-size:0.95rem;">${title}</h3>
                    <p class="book-author" style="font-size:0.8rem;">by ${author}</p>
                    <p style="font-size:0.75rem; line-height:1.3; margin:8px 0; color:var(--text-dark); font-weight:400; font-style:italic;">"${summary}"</p>
                    <div class="ratings" style="margin-top:auto">
                        <span><i class="fa-solid fa-users"></i> ${rating}/5</span>
                    </div>
                </div>
            </div>
            <div class="book-actions">
                <button class="action-btn lasso-btn" style="width:100%"><i class="fa-solid fa-plus"></i> Lasso to Corral</button>
            </div>
        `;
        
        div.querySelector('button').addEventListener('click', async () => {
            await fetch(`${API_URL}?action=add_book`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    title, author, cover_url: cover, 
                    google_books_id: item.id, community_rating: rating, status: 'to-read', description: summary
                })
            });
            searchModal.classList.add('hidden');
            loadBooks();
        });
        
        return div;
    }
    
    window.openSimilar = async (title, author) => {
        document.getElementById('similar-target-title').innerText = title;
        similarModal.classList.remove('hidden');
        const resultsGrid = document.getElementById('similar-results');
        resultsGrid.innerHTML = '<p>Scouting similar kin...</p>';
        
        try {
            const searchAuthor = author.split(',')[0].trim();
            const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=inauthor:${encodeURIComponent('"' + searchAuthor + '"')}&maxResults=15`);
            const data = await res.json();
            
            similarItems = (data.items || []).filter(item => 
                item.volumeInfo.title && !item.volumeInfo.title.toLowerCase().includes(title.toLowerCase())
            );
            
            similarIndex = 0;
            renderSimilarBatch(author);
        } catch(e) { resultsGrid.innerHTML = '<p>The trail went cold.</p>'; }
    };
    
    function renderSimilarBatch(author) {
        const resultsGrid = document.getElementById('similar-results');
        resultsGrid.innerHTML = '';
        const batch = similarItems.slice(similarIndex, similarIndex + 3);
        
        if (batch.length === 0) {
            resultsGrid.innerHTML = '<p>No more similar books found.</p>';
            document.getElementById('cycle-similar-btn').style.display = 'none';
            return;
        }
        
        batch.forEach(item => {
            resultsGrid.appendChild(createSearchResultCard(item, `Kin of ${author.split(',')[0]}`));
        });
        
        document.getElementById('cycle-similar-btn').style.display = (similarIndex + 3 < similarItems.length) ? 'inline-block' : 'none';
    }
    
    document.getElementById('cycle-similar-btn').addEventListener('click', () => {
        similarIndex += 3;
        renderSimilarBatch(document.getElementById('similar-target-title').innerText);
    });
    
    loadBooks();
});
