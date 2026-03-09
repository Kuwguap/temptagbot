from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional


@dataclass
class ProductConfig:
    id: str
    code: str
    label: str
    price_cents: int
    active: bool
    sort_order: int


@dataclass
class TelegramSettings:
    admin_group_id: Optional[int]


@dataclass
class BotConfiguration:
    products: List[ProductConfig]
    telegram: TelegramSettings

