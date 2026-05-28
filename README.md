# An Experimental Crossover Game

A short browser-based turn-based RPG demo with Firebase Firestore leaderboard support.

## Brief project summary

*An Experimental Crossover Game* is a browser-based turn-based RPG demo that starts in-medias-res after the player enters their name. The game features a short two-battle structure, VN-style dialogue scenes, party members with HP/MP, special attacks, items, victory/game-over screens, and a battle-only timer. After defeating the final boss, the player’s clear time and total turns are saved to a Firebase Firestore leaderboard, which displays the Top 10 fastest clears.

## How to run locally

Because the JavaScript uses ES modules, run this through a local web server.

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Firebase setup

Open `script.js` and replace the placeholder `firebaseConfig` values with your Firebase Web App config.

The game uses Firestore collection:

```text
leaderboard
```

Saved fields:

```text
playerName
clearTime
turns
createdAt
```

If Firebase is not configured yet, the game uses localStorage fallback so the demo can still be tested.

Full setup instructions are in:

```text
FIREBASE_AND_DEPLOYMENT_GUIDE.md
```

Firestore rules are included in:

```text
firestore.rules
```

## Netlify

This is a static HTML/CSS/JS project.

Netlify settings:

```text
Build command: leave blank
Publish directory: .
```

## Main game flow

```text
Fake landing page
Battle 1
Victory screen
Post-battle VN dialogue
Boss battle
Victory screen
Post-boss VN dialogue
To be continued gag
Leaderboard
Thank you screen
```

## Asset notes

Uploaded images were organized into:

```text
assets/images/characters
assets/images/portraits
assets/images/enemies
assets/images/effects
```

Generated/placeholder assets include:

```text
YOU battle portrait
Kiryu battle portrait crop
Shiroko battle portrait crop
Sewer battle background
Sewer VN background
Missile Drone battle crop
Placeholder audio
Freedom's Advance placeholder MP4
```
