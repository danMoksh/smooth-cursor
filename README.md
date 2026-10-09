<div align="center">
  <img src="assets/logo.png" width="200" alt="Smooth Cursor Logo">
  <h1>Smooth Cursor</h1>
  <p>A smooth, physics-based cursor for GNOME Shell.</p>
</div>

---

<video src="assets/smoothcursor.mp4" autoplay loop muted playsinline width="100%"></video>

We spend 8 hours a day staring at a pointer. It's time it felt alive. 

Every flick, drag, and click is powered by realistic physics. It is built for aesthetic screen recordings, but perfectly tuned for daily use.

## features

- **Physics-based movement.** The cursor drags, rotates, and settles using realistic spring physics.
- **Click sparks and bounce.** Wayland prevents extensions from dynamically reading cursor shapes like the I-beam text selector. To maintain a responsive feel, the cursor physically shrinks and bounces when you click. You can also enable click sparks.
- **Custom cursors.** Replace the default pointer with any custom SVG or PNG file.
- **Fully configurable.** Every physics variable (damping, stiffness, mass, rotation sensitivity) is exposed in the extension preferences.
- **Cross-platform.** Runs on both Wayland and X11.

## how it works

The extension replaces the system cursor with a custom graphic object.

The extension reads the hardware mouse coordinates on every frame.

A mathematical spring model calculates the distance between the graphic object and the hardware coordinates. This distance creates a force. The force pulls the graphic object toward the coordinates.

A second spring model rotates the object to match the movement direction.

The extension polls the mouse button state on every frame. A third spring model scales the object on click to create a physical bounce effect.

## supported versions

Smooth Cursor is built for and compatible with GNOME Shell versions: **47, 48, 49, 50, and 51**.

## installation

> **Note:** This extension is not yet available on the official GNOME Extensions website. You must install it locally using the instructions below.

### quick install (terminal)

The easiest way to install is by running these commands in your terminal:

```sh
git clone https://github.com/danMoksh/smooth-cursor.git
cd smooth-cursor
mkdir -p ~/.local/share/gnome-shell/extensions/smooth-cursor@danMoksh.github.io
cp -r . ~/.local/share/gnome-shell/extensions/smooth-cursor@danMoksh.github.io
```

### manual install

1. Clone or download this repository.
2. Open your file manager and navigate to `~/.local/share/gnome-shell/extensions/` (press `Ctrl` + `H` to see hidden folders).
3. Paste the downloaded folder there and rename it exactly to `smooth-cursor@danMoksh.github.io`.

### restart gnome shell

After installation, you must restart GNOME Shell to see the extension in your Extension Manager:
* **Wayland:** Log out of your user session and log back in.
* **X11:** Press `Alt` + `F2`, type `r`, and press `Enter`.

## configuration

Open the GNOME Extensions app (or Extension Manager), find "Smooth Cursor", and click the settings gear. From there, you can configure the spring physics, mass, bounce damping, click sparks, and rotation sensitivity to tune it exactly to your liking.

## translations & development

Want to help translate or build the extension from source? 

1. **Translations:** Add or update your language in the `po/` directory. Run `./po/update-pot.sh` to update the template, and `./po/compile-locales.sh` to test your translations locally.
2. **Packaging:** Run `./package.sh` to bundle the extension into a `.zip` file for distribution.

## license

This project is licensed under the [MIT License](LICENSE).
