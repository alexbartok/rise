import pytest
from httpx import AsyncClient, ASGITransport
from main import app

@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c

@pytest.mark.anyio
async def test_list_recipes(client):
    resp = await client.get("/api/recipes")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    recipe = next(r for r in data if r["id"] == "biga-pizza")
    assert recipe["name"] == "100% Biga Pizzateig"
    # Should not include phases (metadata only)
    assert "phases" not in recipe

@pytest.mark.anyio
async def test_get_recipe(client):
    resp = await client.get("/api/recipes/biga-pizza")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == "biga-pizza"
    assert "phases" in data

@pytest.mark.anyio
async def test_get_recipe_not_found(client):
    resp = await client.get("/api/recipes/nonexistent")
    assert resp.status_code == 404

@pytest.mark.anyio
async def test_toggle_favorite(client):
    # Get current value
    resp = await client.get("/api/recipes/biga-pizza")
    original = resp.json()["favorite"]

    # Toggle
    resp = await client.patch("/api/recipes/biga-pizza/favorite", json={"favorite": not original})
    assert resp.status_code == 200

    # Verify change
    resp = await client.get("/api/recipes/biga-pizza")
    assert resp.json()["favorite"] is not original

    # Reset to original
    await client.patch("/api/recipes/biga-pizza/favorite", json={"favorite": original})

@pytest.mark.anyio
async def test_list_images(client):
    resp = await client.get("/api/recipes/biga-pizza/images")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
