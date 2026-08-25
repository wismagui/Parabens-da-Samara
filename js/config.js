// Shared tunable constants for the whole game.

export const WALL_HEIGHT = 4.2;
export const PLAYER_RADIUS = 0.55;
export const PLAYER_HEIGHT = 1.7;
export const MOVE_SPEED = 6.0; // world units / second

export const CAMERA_DISTANCE = 7.5;
export const CAMERA_HEIGHT = 4.5;
export const CAMERA_LOOK_HEIGHT = 1.3;
export const CAMERA_DAMPING = 6.0; // higher = snappier follow
export const CAMERA_ROTATE_SENSITIVITY = 0.006; // radians per pixel dragged

export const BATTLE_CAMERA_DISTANCE = 6.5;
export const BATTLE_CAMERA_HEIGHT = 3.2;

export const TOTAL_GAPS = 6;

export const PLAYER_MAX_HP = 100;
export const PLAYER_BASE_ATK = 20;
// Samara gets stronger each time she beats a Gap — these add up across the run.
export const PLAYER_ATK_GROWTH_PER_WIN = 3;
export const PLAYER_HP_GROWTH_PER_WIN = 8;
export const DEFEND_DAMAGE_MULTIPLIER = 0.5;
export const SPECIAL_ATK_MULTIPLIER = 1.6;
export const SPECIAL_DEF_PIERCE = 0.5; // monster defense counts for less against the special move
export const TURN_PAUSE_MS = 700;

// Persistent HP carries across battles (topped up between fights only by
// growth on victory, or by finding an Energético Baly Nuclear can — which
// fully restores HP).
export const CHEST_PICKUP_RADIUS = 1.6;
export const ENERGY_DRINK_PICKUP_RADIUS = 1.5;
