const BASE = import.meta.env.VITE_API_URL || '';

async function checkedFetch(url, options) {
    const resp = await fetch(url, options);
    if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
    return resp.json();
}

export async function fetchRecipes() {
    return checkedFetch(`${BASE}/api/recipes`);
}

export async function fetchRecipe(id) {
    return checkedFetch(`${BASE}/api/recipes/${id}`);
}

export async function toggleFavorite(id, favorite) {
    return checkedFetch(`${BASE}/api/recipes/${id}/favorite`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorite }),
    });
}

export async function fetchImages(id) {
    return checkedFetch(`${BASE}/api/recipes/${id}/images`);
}

export function imageUrl(recipeId, filename) {
    return `${BASE}/api/recipes/${recipeId}/images/${filename}`;
}
