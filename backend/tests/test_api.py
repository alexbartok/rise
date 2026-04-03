import json

import pytest
from httpx import AsyncClient, ASGITransport

import main
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


# ---------------------------------------------------------------------------
# Locale-aware recipe loading tests
# ---------------------------------------------------------------------------

@pytest.fixture
def _recipes_tmp(tmp_path, monkeypatch):
    """Set up a temporary RECIPES_DIR with a test recipe and an English translation."""
    recipe_dir = tmp_path / "test-bread"
    recipe_dir.mkdir()

    default_recipe = {
        "id": "test-bread",
        "name": "Testbrot",
        "description": "Ein Testbrot",
        "phases": [{"name": "Teig"}],
    }
    (recipe_dir / "recipe.json").write_text(json.dumps(default_recipe))

    en_recipe = {
        "id": "test-bread",
        "name": "Test Bread",
        "description": "A test bread",
        "phases": [{"name": "Dough"}],
    }
    (recipe_dir / "recipe.en.json").write_text(json.dumps(en_recipe))

    monkeypatch.setattr(main, "RECIPES_DIR", tmp_path)
    return tmp_path


@pytest.mark.anyio
async def test_get_recipe_with_lang(client, _recipes_tmp):
    """When recipe.en.json exists, ?lang=en returns the translated content."""
    resp = await client.get("/api/recipes/test-bread?lang=en")
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Test Bread"
    assert data["description"] == "A test bread"
    assert data["phases"][0]["name"] == "Dough"


@pytest.mark.anyio
async def test_get_recipe_lang_fallback(client, _recipes_tmp):
    """When locale file doesn't exist, falls back to recipe.json."""
    resp = await client.get("/api/recipes/test-bread?lang=fr")
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Testbrot"


@pytest.mark.anyio
async def test_list_recipes_with_lang(client, _recipes_tmp):
    """list_recipes respects the lang parameter."""
    resp = await client.get("/api/recipes?lang=en")
    assert resp.status_code == 200
    data = resp.json()
    recipe = next(r for r in data if r["id"] == "test-bread")
    assert recipe["name"] == "Test Bread"
    assert recipe["description"] == "A test bread"


@pytest.mark.anyio
async def test_lang_validation_rejects_traversal(client, _recipes_tmp):
    """Lang values with dots/slashes are rejected."""
    resp = await client.get("/api/recipes/test-bread?lang=../etc")
    assert resp.status_code == 400
