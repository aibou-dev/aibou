# Bunshin Avatar Assets

This directory contains PNGTuber-style avatar assets used by the bunshin avatar engine.

## Asset Structure

Each character has its own subdirectory (e.g., `nagi/`) containing PNG images following this naming convention:

```
{emotion}.png           — Static pose for the given emotion
{emotion}_talking.png   — Talking variant (mouth open / animation frame)
```

### Required Emotions

| File Name              | Description             |
|------------------------|-------------------------|
| `neutral.png`          | Default idle expression |
| `neutral_talking.png`  | Default talking         |
| `thinking.png`         | Thinking / blinking     |
| `thinking_talking.png` | Thinking + talking      |
| `happy.png`            | Happy expression        |
| `happy_talking.png`    | Happy + talking         |
| `worried.png`          | Worried / sad           |
| `worried_talking.png`  | Worried + talking       |
| `excited.png`          | Excited / energetic     |
| `excited_talking.png`  | Excited + talking       |

### Fallback Behavior

- `curious` emotion falls back to `neutral`
- If a `_talking` variant is missing, the static pose is used

## Important

**Avatar images are NOT included in this repository.**
You must provide your own PNG assets and place them in the appropriate subdirectory.
Any PNGTuber-compatible sprite set will work as long as it follows the naming convention above.
