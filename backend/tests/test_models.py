import json
from pathlib import Path
from models import Recipe

def test_load_biga_pizza():
    path = Path(__file__).parent.parent.parent / "recipes" / "biga-pizza" / "recipe.json"
    data = json.loads(path.read_text())
    recipe = Recipe(**data)
    assert recipe.id == "biga-pizza"
    assert recipe.name == "100% Biga Pizzateig"
    assert len(recipe.phases) == 2
    assert len(recipe.ingredientGroups) == 2
    assert recipe.surplus is not None
    assert recipe.surplus.enabled is True
    assert len(recipe.surplus.options) == 3

def test_optional_defaults_to_false():
    path = Path(__file__).parent.parent.parent / "recipes" / "biga-pizza" / "recipe.json"
    data = json.loads(path.read_text())
    recipe = Recipe(**data)
    for group in recipe.ingredientGroups:
        for item in group.items:
            assert item.optional is False

def test_step_dependencies_are_valid():
    path = Path(__file__).parent.parent.parent / "recipes" / "biga-pizza" / "recipe.json"
    data = json.loads(path.read_text())
    recipe = Recipe(**data)
    all_step_ids = {step.id for phase in recipe.phases for step in phase.steps}
    for phase in recipe.phases:
        for step in phase.steps:
            if step.dependsOn is not None:
                assert step.dependsOn in all_step_ids, f"Step {step.id} depends on unknown step {step.dependsOn}"
