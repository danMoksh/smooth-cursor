<div align="center">
  <img src="assets/logo.png" width="200" alt="Smooth Cursor Logo">
  <h1>Smooth Cursor</h1>
  <p>A smooth, physics-based cursor for GNOME Shell.</p>
</div>

---

<video src="assets/smoothcursor.mp4" autoplay loop muted playsinline width="100%"></video>

We spend 8 hours a day staring at a pointer. It's time it felt alive. 

Every flick, drag, and click is powered by realistic physics. It is built for aesthetic screen recordings, but I have tried to tune it for daily use.

## Features

- **Physics-based movement.** The cursor drags, rotates, and settles using realistic spring physics.
- **Click sparks and bounce.** Wayland prevents extensions from dynamically reading cursor shapes like the I-beam text selector. To maintain a responsive feel, the cursor physically shrinks and bounces when you click. You can also enable click sparks.
- **Custom cursors.** Replace the default pointer with any custom SVG or PNG file.
- **Fully configurable.** Every physics variable (damping, stiffness, mass, rotation sensitivity) is exposed in the extension preferences.
- **Cross-platform.** Runs on both Wayland and X11.

## How it works

The extension replaces the system cursor with a custom graphic object.

The extension reads the hardware mouse coordinates on every frame.

A mathematical spring model calculates the distance between the graphic object and the hardware coordinates. This distance creates a force. The force pulls the graphic object toward the coordinates.

A second spring model rotates the object to match the movement direction.

The extension polls the mouse button state on every frame. A third spring model scales the object on click to create a physical bounce effect.

## Supported versions

Smooth Cursor is built for and compatible with GNOME Shell versions: **47, 48, 49, 50, and 51**.

## Installation

> **Note:** This extension is not yet available on the official GNOME Extensions website. You must install it locally using the instructions below.

### Quick install (terminal)

The easiest way to install is by running this one-line command in your terminal. It will securely download, compile, and install the extension:

```sh
curl -fsSL https://raw.githubusercontent.com/danMoksh/smooth-cursor/main/install.sh | bash
```

### Manual install

1. Download the `smooth-cursor@danMoksh.github.io.zip` file from the [Releases](https://github.com/danMoksh/smooth-cursor/releases) page.
2. Extract the `.zip` file.
3. Move the extracted folder into `~/.local/share/gnome-shell/extensions/`.

Alternatively, you can install the `.zip` directly via terminal:
```sh
gnome-extensions install smooth-cursor@danMoksh.github.io.zip
```

### Restart GNOME Shell

After installation, you must restart GNOME Shell to see the extension in your Extension Manager:
* **Wayland:** Log out of your user session and log back in.
* **X11:** Press `Alt` + `F2`, type `r`, and press `Enter`.

## Configuration

Open the GNOME Extensions app (or Extension Manager), find "Smooth Cursor", and click the settings gear. From there, you can configure the spring physics, mass, bounce damping, click sparks, and rotation sensitivity to tune it exactly to your liking.

### Custom styles and colors

Settings are organized as a style: a set of defaults plus optional overrides that apply only while the system uses a dark style.

- The preferences dialog shows a grid of preset styles; each preview renders the trail on light (top) and dark (bottom) backgrounds.
- **Customize…** opens the detailed editor: a Default/Dark toggle switches which state you are editing; in Dark mode each row has an icon-only revert button to drop the override and fall back to the default state.
- **Customize…** while a preset is active creates a new custom style derived from it (you can create as many as you like, each with its own card); while a custom style is active it edits that style in place. The editor has a Delete button at the bottom that removes the style and falls back to the first preset.

## Limitations and workarounds

Wayland prevents extensions from dynamically reading the current cursor shape (such as the I-beam text selector). Because the extension replaces the cursor entirely, it cannot automatically change shapes when hovering over text.

To maintain a highly responsive feel despite this limitation, the extension uses a tactile workaround: **whenever you click, drag, or write, the cursor physically shrinks and bounces.** This tiny bit of interaction ensures the pointer always feels alive and responsive to your actions, even without dynamic shape-shifting.

<video src="assets/text-highlighting.mp4" autoplay loop muted playsinline width="100%"></video>

## Translations and development

Want to help translate or build the extension from source? 

1. **Translations:** Add or update your language in the `po/` directory. Run `./po/update-pot.sh` to update the template, and `./po/compile-locales.sh` to test your translations locally.
2. **Packaging:** Run `./package.sh` to bundle the extension into a `.zip` file for distribution.

## License

This project is licensed under the [MIT License](LICENSE).
