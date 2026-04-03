import json
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from settings import AppSettings, SettingsUpdate

RECIPES_DIR = Path(os.environ.get("RECIPES_DIR", Path(__file__).parent.parent / "recipes"))

app = FastAPI(title="Rise API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _validate_recipe_id(recipe_id: str) -> None:
    """Reject recipe IDs that could cause path traversal."""
    if ".." in recipe_id or "/" in recipe_id or "\\" in recipe_id:
        raise HTTPException(status_code=400, detail="Invalid recipe ID")


class FavoriteUpdate(BaseModel):
    favorite: bool


@app.get("/api/health")
def health():
    return {"status": "ok", "app": "rise"}


@app.get("/api/recipes")
def list_recipes():
    """List all recipes (metadata only, no phases/steps)."""
    recipes = []
    for recipe_dir in sorted(RECIPES_DIR.iterdir()):
        recipe_file = recipe_dir / "recipe.json"
        if recipe_dir.is_dir() and recipe_file.exists():
            data = json.loads(recipe_file.read_text())
            meta = {
                "id": data["id"],
                "name": data["name"],
                "description": data.get("description", ""),
                "source": data.get("source"),
                "favorite": data.get("favorite", False),
                "baseYield": data.get("baseYield"),
            }
            recipes.append(meta)
    return recipes


@app.get("/api/recipes/{recipe_id}")
def get_recipe(recipe_id: str):
    """Get full recipe JSON."""
    _validate_recipe_id(recipe_id)
    recipe_file = RECIPES_DIR / recipe_id / "recipe.json"
    if not recipe_file.exists():
        raise HTTPException(status_code=404, detail="Recipe not found")
    return json.loads(recipe_file.read_text())


@app.patch("/api/recipes/{recipe_id}/favorite")
def toggle_favorite(recipe_id: str, update: FavoriteUpdate):
    """Update favorite flag in recipe JSON."""
    _validate_recipe_id(recipe_id)
    recipe_file = RECIPES_DIR / recipe_id / "recipe.json"
    if not recipe_file.exists():
        raise HTTPException(status_code=404, detail="Recipe not found")
    data = json.loads(recipe_file.read_text())
    data["favorite"] = update.favorite
    recipe_file.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    return {"ok": True}


@app.get("/api/recipes/{recipe_id}/images")
def list_images(recipe_id: str):
    """List all images for a recipe."""
    _validate_recipe_id(recipe_id)
    images_dir = RECIPES_DIR / recipe_id / "images"
    if not images_dir.exists():
        return []
    return sorted([
        f.name for f in images_dir.iterdir()
        if f.is_file() and f.suffix.lower() in ('.jpg', '.jpeg', '.png', '.webp', '.gif')
    ])


@app.get("/api/recipes/{recipe_id}/images/{filename}")
def get_image(recipe_id: str, filename: str):
    """Serve a recipe image."""
    _validate_recipe_id(recipe_id)
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    image_path = RECIPES_DIR / recipe_id / "images" / filename
    if not image_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(image_path)


@app.get("/api/settings")
def get_settings():
    return AppSettings.load().model_dump()


@app.patch("/api/settings")
def update_settings(update: SettingsUpdate):
    settings = AppSettings.load()
    for key, value in update.model_dump(exclude_none=True).items():
        setattr(settings, key, value)
    settings.save()
    return settings.model_dump()


# ---------------------------------------------------------------------------
# Production: serve built Svelte frontend as static files.
# Must be LAST so it doesn't intercept /api routes.
# ---------------------------------------------------------------------------
frontend_dist = Path(os.environ.get("FRONTEND_DIST", Path(__file__).parent.parent / "frontend" / "dist"))
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
