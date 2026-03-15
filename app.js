document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'api/api.php';
    let allBooks = [];
    
    // UI Elements
    const currentlyReadingGrid = document.getElementById('currently-reading-grid');
    const corralGrid = document.getElementById('corral-grid');
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
                    ${book.description ? `<p style="font-size: 0.8rem; margin: 8px 0; border-top: 1px dashed var(--leather-medium); padding-top: 8px;">${book.description}</p>` : ''}
                    <div class="ratings">
                        <span><i class="fa-solid fa-star"></i> Me: ${book.user_rating || '-'}</span>
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
            
            // Visual feedback loop
            const oldBg = selectElement.style.background;
            const oldColor = selectElement.style.color;
            selectElement.style.background = 'var(--success)';
            selectElement.style.color = '#fff';
            
            setTimeout(() => {
                selectElement.style.background = oldBg;
                selectElement.style.color = oldColor;
                selectElement.disabled = false;
                loadBooks(); // Optional: Reload to move the card to the right corral segment
            }, 800);
            
        } catch(e) {
            selectElement.disabled = false;
            console.error(e);
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
    
    // Modals Handling
    document.getElementById('add-book-btn').addEventListener('click', () => {
        searchModal.classList.remove('hidden');
    });
    
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.add('hidden');
        });
    });
    
    // Google Books Search
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
                data.items.forEach(item => {
                    resultsGrid.appendChild(createSearchResultCard(item, false));
                });
            } else {
                resultsGrid.innerHTML = '<p>No books found.</p>';
            }
        } catch(e) {
            resultsGrid.innerHTML = '<p>Error searching.</p>';
        }
    });
    
    function createSearchResultCard(item, isSimilar = false) {
        const vol = item.volumeInfo;
        const cover = vol.imageLinks?.thumbnail ? vol.imageLinks.thumbnail.replace('http:', 'https:') : '';
        const title = vol.title || 'Unknown Title';
        const author = vol.authors ? vol.authors.join(', ') : 'Unknown Author';
        const rating = vol.averageRating || 0;
        
        // Extract 2 sentence description
        let rawDesc = (vol.description || '').replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
        let sentences = rawDesc.match(/[^.!?]+[.!?]+/g) || [];
        let cleanDesc = sentences.slice(0, 2).join(' ').trim();
        if(!cleanDesc) cleanDesc = rawDesc.substring(0, 100) + (rawDesc.length > 100 ? '...' : '');

        let reasonHtml = '';
        if (isSimilar) {
            // Give a hint as to why it matched based on category
            const category = vol.categories ? vol.categories[0] : 'Related Genre';
            const pages = vol.pageCount ? `~${vol.pageCount} pages` : '';
            cleanDesc = `Suggested because: by ${author}, ${pages}, subject ${category}`.replace(/,\s*,/g, ',');
            reasonHtml = `<p style="font-size: 0.75rem; color: var(--saddle-orange); font-weight: bold; margin-bottom: 5px;">
                            <i class="fa-solid fa-tag"></i> Match: ${category}</p>`;
        }
        
        const div = document.createElement('div');
        div.className = 'book-card';
        div.innerHTML = `
            <div class="card-header" style="height:140px;">
                ${cover ? `<img src="${cover}" class="book-cover" style="width:90px;">` : `<div class="book-cover" style="width:90px;display:flex;align-items:center;justify-content:center"><i class="fa-solid fa-book"></i></div>`}
                <div class="book-info" style="padding:10px;">
                    ${reasonHtml}
                    <h3 class="book-title" style="font-size:1rem;">${title}</h3>
                    <p class="book-author" style="font-size:0.8rem;">${author}</p>
                    <div class="ratings" style="margin-top:auto">
                        <span><i class="fa-solid fa-users"></i> ${rating}/5</span>
                    </div>
                </div>
            </div>
            <div class="book-actions">
                <button class="action-btn find-similar" style="width:100%"><i class="fa-solid fa-plus"></i> Add to Corral</button>
            </div>
        `;
        
        div.querySelector('button').addEventListener('click', async () => {
            await fetch(`${API_URL}?action=add_book`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    title, author, cover_url: cover, 
                    google_books_id: item.id, community_rating: rating, status: 'to-read', description: cleanDesc
                })
            });
            searchModal.classList.add('hidden');
            loadBooks();
        });
        
        return div;
    }
    
    // Similar Finds logic
    let similarItems = [];
    let similarIndex = 0;
    
    window.openSimilar = async (title, author) => {
        document.getElementById('similar-target-title').innerText = title;
        similarModal.classList.remove('hidden');
        const resultsGrid = document.getElementById('similar-results');
        resultsGrid.innerHTML = '<p>Scouting for similar reads...</p>';
        document.getElementById('cycle-similar-btn').style.display = 'none';
        
        try {
            // First try to find books by the same author minus the exact title
            const authorQuery = encodeURIComponent(`inauthor:"${author}"`);
            const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${authorQuery}&maxResults=15`);
            const data = await res.json();
            
            similarItems = (data.items || []).filter(item => 
                item.volumeInfo.title && !item.volumeInfo.title.toLowerCase().includes(title.toLowerCase())
            );
            
            // If we don't have enough, append a generic subject/title-based search
            if (similarItems.length < 3) {
                const subjectQuery = encodeURIComponent(title.split(' ')[0] + " " + (title.split(' ')[1] || ""));
                const extraRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${subjectQuery}&maxResults=15`);
                const extraData = await extraRes.json();
                const moreItems = (extraData.items || []).filter(item => 
                    item.volumeInfo.title && !item.volumeInfo.title.toLowerCase().includes(title.toLowerCase())
                );
                similarItems = [...similarItems, ...moreItems];
            }
            
            similarIndex = 0;
            renderSimilarBatch();
        } catch(e) {
            resultsGrid.innerHTML = '<p>The trail went cold checking for similar books.</p>';
        }
    };
    
    function renderSimilarBatch() {
        const resultsGrid = document.getElementById('similar-results');
        resultsGrid.innerHTML = '';
        
        const batch = similarItems.slice(similarIndex, similarIndex + 3);
        
        if (batch.length === 0) {
            resultsGrid.innerHTML = '<p>No more similar books found on this trail.</p>';
            document.getElementById('cycle-similar-btn').style.display = 'none';
            return;
        }
        
        batch.forEach(item => {
            resultsGrid.appendChild(createSearchResultCard(item, true));
        });
        
        if (similarIndex + 3 < similarItems.length) {
            document.getElementById('cycle-similar-btn').style.display = 'inline-block';
        } else {
            document.getElementById('cycle-similar-btn').style.display = 'none';
        }
    }
    
    document.getElementById('cycle-similar-btn').addEventListener('click', () => {
        similarIndex += 3;
        renderSimilarBatch();
    });
    
    // Initial Load
    loadBooks();
});
