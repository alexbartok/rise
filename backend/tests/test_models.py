import json
from pathlib import Path
from models import Recipe, Step

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


def test_step_accepts_perUnit_and_hold():
    step = Step(
        id="bake",
        name="Bake",
        type="active",
        duration={"min": 55, "ideal": 60, "max": 65},
        alarm={"enabled": True, "offsetMinutes": 0},
        description="Bake the loaf",
        flexPriority=1,
        unsocialHours={"canOverlap": False, "mustAvoid": False},
        perUnit=True,
        hold={
            "where": "Kühlschrank",
            "storeAction": "Brot {n} in den Kühlschrank stellen",
            "retrieveAction": "Brot {n} aus dem Kühlschrank nehmen",
            "transitionDuration": {"min": 3, "ideal": 5, "max": 5},
        },
    )
    assert step.perUnit is True
    assert step.hold.where == "Kühlschrank"
    assert step.scalesWithYield is False


def test_step_defaults_new_fields_to_false_none():
    step = Step(
        id="mix",
        name="Mix",
        type="active",
        duration={"min": 5, "ideal": 10, "max": 15},
        alarm={"enabled": False, "offsetMinutes": 0},
        description="Mix",
        flexPriority=1,
        unsocialHours={"canOverlap": False, "mustAvoid": False},
    )
    assert step.perUnit is False
    assert step.scalesWithYield is False
    assert step.hold is None
