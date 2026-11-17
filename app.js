
const API_KEY = "6OXkrNQUGRmLx5XL6HnrjJ0jdlbYOiZX";
const API_URL = "https://api.giphy.com/v1/gifs/search";

// HTML elements
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const gifContainer = document.getElementById("gifContainer");
const status = document.getElementById("status");
const loader = document.getElementById("loader");

// RxJS operators
const {
    fromEvent,
    debounceTime,
    map,
    filter,
    distinctUntilChanged
} = rxjs;

// Search variables
let currentQuery = "";
let currentOffset = 0;
let isLoading = false;
let searchController = null;

// GIF search function
async function searchGifs(query, loadMore = false) {
    if (loadMore && isLoading) return;

    if (!loadMore) {
        if (searchController) {
            searchController.abort();
        }

        searchController = new AbortController();

        currentQuery = query;
        currentOffset = 0;
        gifContainer.innerHTML = "";
    }

    if (!searchController) return;

    const requestController = searchController;

    isLoading = true;
    loader.style.display = "block";
    status.textContent = "Loading GIFs...";

    const url = `${API_URL}?api_key=${API_KEY}&q=${encodeURIComponent(query)}&limit=12&offset=${currentOffset}&rating=g`;

    try {
        const response = await fetch(url, {
            signal: requestController.signal
        });

        if (!response.ok) {
            throw new Error(`Giphy API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.data.length === 0 && !loadMore) {
            status.textContent = "Nothing found. Try another search.";
            return;
        }

        data.data.forEach(gif => {
            const img = document.createElement("img");
            img.src = gif.images.fixed_height.url;
            img.alt = gif.title;
            gifContainer.appendChild(img);
        });

        currentOffset += data.data.length;

        if (data.data.length === 0) {
            status.textContent = "No more GIFs to load.";
        } else {
            status.textContent = `Loaded ${currentOffset} GIFs`;
        }

    } catch (error) {
        if (error.name === "AbortError") return;

        status.textContent = "Something went wrong. Try again.";
        console.error(error);

    } finally {
        if (searchController === requestController) {
            isLoading = false;
            loader.style.display = "none";
        }
    }
}

// Search button
fromEvent(searchButton, "click").subscribe(() => {
    const query = searchInput.value.trim();

    if (query.length < 2) {
        status.textContent = "Enter at least 2 characters.";
        return;
    }

    if (query === currentQuery) return;

    searchGifs(query);
});

// Enter key
fromEvent(searchInput, "keydown").subscribe(event => {
    if (event.key === "Enter") {
        searchButton.click();
    }
});

// Automatic search
fromEvent(searchInput, "input").pipe(
    map(event => event.target.value.trim()),
    debounceTime(1000),
    distinctUntilChanged(),
    filter(query => query.length >= 2),
    filter(query => query !== currentQuery)
).subscribe(query => {
    searchGifs(query);
});

// Category buttons
document.querySelectorAll("button.category[data-query]").forEach(button => {
console.log("Найдено кнопок:", document.querySelectorAll("button.category[data-query]").length);
button.addEventListener("click", () => {
        const query = button.dataset.query;

        searchInput.value = query;
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));

        console.log("Selected category:", query);
    });
});

// Infinite scroll
fromEvent(window, "scroll").pipe(
    debounceTime(200),
    filter(() => {
        const scrollPosition = window.innerHeight + window.scrollY;
        const pageHeight = document.documentElement.scrollHeight;

        return scrollPosition >= pageHeight - 500;
    }),
    filter(() => currentQuery !== "" && !isLoading)
).subscribe(() => {
    searchGifs(currentQuery, true);
});
