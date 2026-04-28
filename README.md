# Ant Colony Commander (React Native + Web)

A lightweight strategy game built with React Native (Expo) that runs on:
- 📱 iOS / Android (Expo Go or native builds)
- 🌐 Browser (React Native Web via Expo)

## Gameplay
You control a growing ant colony:
- Gather **food** and **wood** every tick.
- Train **workers** and **soldiers**.
- Research technologies for better economy and military power.
- Attack and conquer rival colonies.

Win condition: conquer all enemy colonies.

## Run locally

```bash
npm install
npm run web
```

Other platforms:

```bash
npm run android
npm run ios
```

## Tech stack
- React Native
- Expo
- React Native Web
=======
# AntsAI

Test for AI Made game with ants.

## Troubleshooting: "Binary files not supported" when creating a PR

If your PR creation flow reports **"Binary files not supported"**, it usually means the PR body is trying to include content from a binary file (for example images, archives, model weights, or compiled artifacts) instead of plain text.

### What to check

1. **Only include text files in PR descriptions**
   - PR title/body must be plain UTF-8 text.
   - Do not paste raw binary output.

2. **Do not commit generated binaries unless necessary**
   - Avoid committing files like `.png`, `.jpg`, `.zip`, `.exe`, `.bin`, or large model files unless required.
   - If needed, reference them briefly in text rather than embedding content.

3. **Use Git LFS for large binary assets**
   - Track binary assets with Git LFS so diffs and hosting behavior are handled correctly.

4. **Check what changed before opening the PR**
   - Run `git status` and `git diff --name-only`.
   - Confirm you are not unintentionally including binary artifacts.

5. **If using automation/tools**
   - Ensure the tool that generates PR text reads only markdown/text files.
   - Exclude binary files from any "summarize changed files" step.

### Quick fix flow

```bash
git status
git diff --name-only
```

If you see unintended binary files, remove them from the commit and recommit:

```bash
git rm --cached <binary-file>
# optionally add to .gitignore
```

Then retry PR creation with a plain-text title and body.
