from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class Duration(BaseModel):
    min: int
    ideal: int
    max: int


class Alarm(BaseModel):
    enabled: bool
    offsetMinutes: int


class UnsocialHours(BaseModel):
    canOverlap: bool
    mustAvoid: bool


class GapAfterPrevious(BaseModel):
    min: int
    ideal: int
    max: int


class Step(BaseModel):
    id: str
    name: str
    emoji: str | None = None
    type: Literal["active", "passive"]
    duration: Duration
    dependsOn: str | None = None
    gapAfterPrevious: GapAfterPrevious | None = None
    alarm: Alarm
    description: str
    flexPriority: int
    unsocialHours: UnsocialHours
    optional: bool = False


class Phase(BaseModel):
    id: str
    name: str
    steps: list[Step]


class IngredientItem(BaseModel):
    name: str
    amount: float
    unit: str
    scalable: bool
    notes: str | None = None
    optional: bool = False


class IngredientGroup(BaseModel):
    name: str
    phase: str
    optional: bool = False
    items: list[IngredientItem]


class WeightPerUnit(BaseModel):
    min: float
    max: float


class BaseYield(BaseModel):
    amount: int
    unit: str
    weightPerUnit: WeightPerUnit


class ShelfLife(BaseModel):
    days: int
    qualityNotes: str


class ReactivationStep(BaseModel):
    id: str
    name: str
    emoji: str | None = None
    type: Literal["active", "passive"]
    duration: Duration
    dependsOn: str | None = None
    description: str
    alarm: Alarm


class SurplusOption(BaseModel):
    id: str
    name: str
    description: str
    shelfLife: ShelfLife
    reactivationSteps: list[ReactivationStep]


class Surplus(BaseModel):
    enabled: bool
    options: list[SurplusOption]


class Note(BaseModel):
    title: str
    content: str


class Recipe(BaseModel):
    id: str
    name: str
    description: str
    source: str | None = None
    favorite: bool = False
    baseYield: BaseYield
    ingredientGroups: list[IngredientGroup]
    phases: list[Phase]
    surplus: Surplus | None = None
    notes: list[Note] | None = None


class RecipeMeta(BaseModel):
    id: str
    name: str
    description: str
    source: str | None = None
    favorite: bool = False
    baseYield: BaseYield
