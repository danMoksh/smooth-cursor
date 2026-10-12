import Adw from "gi://Adw";
import Gtk from "gi://Gtk";
import Gdk from "gi://Gdk";
import Gio from "gi://Gio";

import {
  ExtensionPreferences,
  gettext as _,
} from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

const PRESET_KEYS = ["subtle", "dynamic", "minimal", "custom"];

export default class SmoothCursorPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const settings = this.getSettings("org.gnome.shell.extensions.smooth-cursor");

    const PRESETS = {
      subtle: {
        id: "subtle",
        title: _("Subtle (Default)"),
        subtitle: _("Snappy tracking, gentle rotation reset, crisp clicks"),
        settings: {
          "spring-damping": 50,
          "spring-stiffness": 460,
          "spring-mass": 1,
          "bounce-damping": 30,
          "bounce-stiffness": 600,
          "bounce-mass": 1,
          "extra-scale": 0.75,
          "rotate-on-move": true,
          "rotate-reset-on-stop": true,
          "rotation-sensitivity": 0.22,
          "max-tilt-angle": 20,
          "spark-count": 5,
          "spark-size": 18,
          "spark-radius": 30,
          "spark-duration": 250,
        },
      },
      dynamic: {
        id: "dynamic",
        title: _("Dynamic"),
        subtitle: _("Lively fluid physics, full rotation, energetic sparks"),
        settings: {
          "spring-damping": 45,
          "spring-stiffness": 400,
          "spring-mass": 1,
          "bounce-damping": 25,
          "bounce-stiffness": 500,
          "bounce-mass": 1,
          "extra-scale": 1.0,
          "rotate-on-move": true,
          "rotate-reset-on-stop": false,
          "rotation-sensitivity": 0.15,
          "max-tilt-angle": 360,
          "spark-count": 8,
          "spark-size": 25,
          "spark-radius": 45,
          "spark-duration": 400,
        },
      },
      minimal: {
        id: "minimal",
        title: _("Minimal"),
        subtitle: _("Upright pointer, micro click bounce, tiny sparks"),
        settings: {
          "spring-damping": 55,
          "spring-stiffness": 520,
          "spring-mass": 1,
          "bounce-damping": 35,
          "bounce-stiffness": 700,
          "bounce-mass": 1,
          "extra-scale": 0.45,
          "rotate-on-move": false,
          "rotate-reset-on-stop": true,
          "rotation-sensitivity": 0.25,
          "max-tilt-angle": 0,
          "spark-count": 3,
          "spark-size": 12,
          "spark-radius": 18,
          "spark-duration": 180,
        },
      },
      custom: {
        id: "custom",
        title: _("Custom"),
        subtitle: _("Fine-tuned user configuration"),
        settings: null,
      },
    };

    const behaviorPage = new Adw.PreferencesPage({
      title: _("Behavior"),
      icon_name: "applications-system-symbolic",
    });
    window.add(behaviorPage);

    // Preset Group
    const presetGroup = new Adw.PreferencesGroup({
      title: _("Presets"),
      description: _("Choose a behavior profile or customize settings in Advanced Mode"),
    });
    behaviorPage.add(presetGroup);

    const presetModel = new Gtk.StringList();
    PRESET_KEYS.forEach(k => presetModel.append(PRESETS[k].title));

    const presetRow = new Adw.ComboRow({
      title: _("Preset"),
      model: presetModel,
    });
    presetGroup.add(presetRow);

    let isApplyingPreset = false;

    const applyPreset = (key) => {
      const p = PRESETS[key];
      if (!p || !p.settings) return;
      isApplyingPreset = true;
      try {
        for (const [k, v] of Object.entries(p.settings)) {
          if (typeof v === "boolean") {
            settings.set_boolean(k, v);
          } else if (typeof v === "number") {
            if (settings.get_value(k).get_type_string() === "d") {
              settings.set_double(k, v);
            } else {
              settings.set_int(k, v);
            }
          }
        }
        settings.set_string("preset", key);
      } finally {
        isApplyingPreset = false;
      }
    };

    const syncPresetUI = () => {
      const currentKey = settings.get_string("preset") || "subtle";
      const index = PRESET_KEYS.indexOf(currentKey);
      if (index >= 0 && presetRow.selected !== index) {
        presetRow.selected = index;
      }
      presetRow.subtitle = PRESETS[currentKey]?.subtitle || "";
    };

    settings.connect("changed::preset", syncPresetUI);
    syncPresetUI();

    presetRow.connect("notify::selected", () => {
      const selectedKey = PRESET_KEYS[presetRow.selected];
      if (!selectedKey) return;
      if (selectedKey !== settings.get_string("preset")) {
        if (selectedKey !== "custom") {
          applyPreset(selectedKey);
        } else {
          settings.set_string("preset", "custom");
        }
      }
      presetRow.subtitle = PRESETS[selectedKey]?.subtitle || "";
    });

    const simpleGroup = new Adw.PreferencesGroup({
      title: _("Cursor Appearance and Movement"),
    });
    behaviorPage.add(simpleGroup);

    const addSwitchRow = (group, key, title, subtitle) => {
      const row = new Adw.ActionRow({ title, subtitle });
      const toggle = new Gtk.Switch({ valign: Gtk.Align.CENTER });
      settings.bind(key, toggle, "active", Gio.SettingsBindFlags.DEFAULT);
      row.add_suffix(toggle);
      row.activatable_widget = toggle;
      group.add(row);
      return row;
    };

    const addSpinRow = (group, key, title, subtitle, min, max, step) => {
      const row = new Adw.ActionRow({ title, subtitle });
      const spin = new Gtk.SpinButton({
        valign: Gtk.Align.CENTER,
        adjustment: new Gtk.Adjustment({
          lower: min,
          upper: max,
          step_increment: step,
        }),
      });
      if (settings.get_value(key).get_type_string() === "d") {
        spin.digits = 2;
        settings.bind(key, spin.adjustment, "value", Gio.SettingsBindFlags.DEFAULT);
      } else {
        settings.bind(key, spin, "value", Gio.SettingsBindFlags.DEFAULT);
      }
      row.add_suffix(spin);
      group.add(row);
      return row;
    };

    const addScaleRow = (group, key, title, subtitle, min, max, step, marks = []) => {
      const row = new Adw.ActionRow({ title, subtitle });
      const scale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, min, max, step);
      scale.set_draw_value(true);
      scale.set_size_request(200, -1);
      scale.set_valign(Gtk.Align.CENTER);
      
      for (const m of marks) {
        scale.add_mark(m, Gtk.PositionType.BOTTOM, null);
      }

      settings.bind(key, scale.get_adjustment(), "value", Gio.SettingsBindFlags.DEFAULT);
      
      row.add_suffix(scale);
      group.add(row);
      return row;
    };

    const addColorRow = (group, key, title, subtitle) => {
      const row = new Adw.ActionRow({ title, subtitle });
      const colorBtn = new Gtk.ColorButton({ valign: Gtk.Align.CENTER });
      const rgba = new Gdk.RGBA();
      rgba.parse(settings.get_string(key));
      colorBtn.set_rgba(rgba);
      colorBtn.connect("color-set", () => {
        const c = colorBtn.get_rgba();
        const hex = `#${Math.round(c.red * 255).toString(16).padStart(2, "0")}${Math.round(c.green * 255).toString(16).padStart(2, "0")}${Math.round(c.blue * 255).toString(16).padStart(2, "0")}`;
        settings.set_string(key, hex);
      });
      row.add_suffix(colorBtn);
      group.add(row);
      return row;
    };

    const addFileRow = (group, key, title, subtitle) => {
      const row = new Adw.ActionRow({ title, subtitle });
      const box = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 6, valign: Gtk.Align.CENTER });
      const label = new Gtk.Label({ label: settings.get_string(key) || _("Default"), ellipsize: 3 /* END */, max_width_chars: 15 });
      const btn = new Gtk.Button({ label: _("Browse...") });
      
      btn.connect("clicked", () => {
        const dialog = new Gtk.FileChooserNative({
          title: _("Select Custom Cursor Image"),
          action: Gtk.FileChooserAction.OPEN,
          accept_label: _("Open"),
          cancel_label: _("Cancel")
        });
        
        const filter = new Gtk.FileFilter();
        filter.add_mime_type("image/png");
        filter.add_mime_type("image/svg+xml");
        filter.add_mime_type("image/x-ico");
        filter.add_mime_type("image/x-icon");
        filter.add_mime_type("image/vnd.microsoft.icon");
        filter.add_pattern("*.cur");
        filter.add_pattern("*.ico");
        filter.set_name("Images (PNG, SVG, CUR, ICO)");
        dialog.add_filter(filter);

        dialog.connect("response", (dlg, response) => {
          if (response === Gtk.ResponseType.ACCEPT) {
            const file = dlg.get_file();
            if (file) {
              const path = file.get_path();
              settings.set_string(key, path);
              label.label = file.get_basename();
            }
          }
        });
        dialog.show();
      });
      
      const clearBtn = new Gtk.Button({ icon_name: "edit-clear-symbolic" });
      clearBtn.connect("clicked", () => {
        settings.set_string(key, "");
        label.label = _("Default");
      });

      box.append(label);
      box.append(btn);
      box.append(clearBtn);
      row.add_suffix(box);
      group.add(row);
      return row;
    };

    const CURSOR_SHAPES = [
      { id: "arrow", title: _("Classic Arrow (Default)") },
      { id: "ball", title: _("Translucent Ball") },
      { id: "custom", title: _("Custom Image...") },
    ];
    const shapeModel = new Gtk.StringList();
    CURSOR_SHAPES.forEach(s => shapeModel.append(s.title));

    const shapeRow = new Adw.ComboRow({
      title: _("Cursor Shape"),
      model: shapeModel,
    });
    simpleGroup.add(shapeRow);

    const customFileRow = addFileRow(simpleGroup, "custom-cursor-path", _("Custom Cursor Image"), _("Select a PNG or SVG to override the default cursor"));

    const syncShapeUI = () => {
      const currentShape = settings.get_string("cursor-shape") || "arrow";
      const idx = CURSOR_SHAPES.findIndex(s => s.id === currentShape);
      if (idx >= 0 && shapeRow.selected !== idx) {
        shapeRow.selected = idx;
      }
      customFileRow.visible = (currentShape === "custom");
    };
    settings.connect("changed::cursor-shape", syncShapeUI);
    syncShapeUI();

    shapeRow.connect("notify::selected", () => {
      const chosen = CURSOR_SHAPES[shapeRow.selected];
      if (chosen && chosen.id !== settings.get_string("cursor-shape")) {
        settings.set_string("cursor-shape", chosen.id);
      }
    });

    const rotateMoveRow = addSwitchRow(simpleGroup, "rotate-on-move", _("Rotate on Move"), _("Cursor rotates to face the direction of movement"));
    const rotateResetRow = addSwitchRow(simpleGroup, "rotate-reset-on-stop", _("Reset Rotation on Stop"), _("Automatically snaps the cursor back upright when you stop moving"));
    addSpinRow(simpleGroup, "cursor-size", _("Cursor Size"), _("Base size of the cursor in pixels"), 20, 100, 1);
    
    // Mode Group (Advanced toggle)
    const advancedGroup = new Adw.PreferencesGroup({
      title: _("Advanced"),
    });
    behaviorPage.add(advancedGroup);

    const advancedRow = new Adw.ActionRow({
      title: _("Advanced Mode"),
      subtitle: _("Fine-tune individual physics constants and spark properties"),
    });
    const advancedSwitch = new Gtk.Switch({
      valign: Gtk.Align.CENTER,
      active: false,
    });
    advancedRow.add_suffix(advancedSwitch);
    advancedRow.activatable_widget = advancedSwitch;
    advancedGroup.add(advancedRow);

    // Advanced Groups
    const physicsGroup = new Adw.PreferencesGroup({ title: _("Physics") });
    behaviorPage.add(physicsGroup);
    const rotateSensRow = addScaleRow(physicsGroup, "rotation-sensitivity", _("Rotation Sensitivity"), _("Higher values filter more jitter but require faster movement (pixels/ms)"), 0.1, 0.3, 0.01, [0.1, 0.15, 0.2, 0.3]);
    const maxTiltRow = addSpinRow(physicsGroup, "max-tilt-angle", _("Max Tilt Angle"), _("Maximum lean angle in degrees (360 for full continuous 360° spin)"), 0, 360, 5);
    addSpinRow(physicsGroup, "spring-damping", _("Spring Damping"), _("Cursor physics damping"), 1, 100, 1);
    addSpinRow(physicsGroup, "spring-stiffness", _("Spring Stiffness"), _("Cursor physics stiffness"), 10, 1000, 10);
    addSpinRow(physicsGroup, "spring-mass", _("Spring Mass"), _("Cursor physics mass"), 1, 100, 1);
    addSpinRow(physicsGroup, "bounce-damping", _("Bounce Damping"), _("Click bounce damping"), 1, 100, 1);
    addSpinRow(physicsGroup, "bounce-stiffness", _("Bounce Stiffness"), _("Click bounce stiffness"), 10, 1000, 10);
    addSpinRow(physicsGroup, "bounce-mass", _("Bounce Mass"), _("Click bounce mass"), 1, 100, 1);
    addSpinRow(physicsGroup, "extra-scale", _("Click Bounce Scale"), _("Multiplier for the click bounce scale"), 0.0, 1.0, 0.05);

    const sparkGroup = new Adw.PreferencesGroup({ title: _("Click Sparks") });
    behaviorPage.add(sparkGroup);
    const sparkColorRow = addColorRow(sparkGroup, "spark-color", _("Spark Color"), _("Color of the click sparks"));
    const sparkSizeRow = addSpinRow(sparkGroup, "spark-size", _("Spark Size"), _("Length of the sparks"), 1, 100, 1);
    const sparkRadiusRow = addSpinRow(sparkGroup, "spark-radius", _("Spark Radius"), _("How far the sparks travel"), 10, 200, 5);
    const sparkCountRow = addSpinRow(sparkGroup, "spark-count", _("Spark Count"), _("Number of sparks per click"), 0, 30, 1);
    const sparkDurationRow = addSpinRow(sparkGroup, "spark-duration", _("Spark Duration"), _("How long sparks last (ms)"), 50, 1000, 50);

    // Track changes to switch to Custom preset
    const presetTunedKeys = [
      "spring-damping", "spring-stiffness", "spring-mass",
      "bounce-damping", "bounce-stiffness", "bounce-mass", "extra-scale",
      "rotate-on-move", "rotate-reset-on-stop", "rotation-sensitivity", "max-tilt-angle",
      "spark-count", "spark-size", "spark-radius", "spark-duration"
    ];

    for (const key of presetTunedKeys) {
      settings.connect(`changed::${key}`, () => {
        if (isApplyingPreset) return;
        if (settings.get_string("preset") !== "custom") {
          settings.set_string("preset", "custom");
        }
      });
    }

    const resetGroup = new Adw.PreferencesGroup();
    behaviorPage.add(resetGroup);
    
    const resetRow = new Adw.ActionRow({ title: _("Reset to Defaults"), subtitle: _("Restore all settings to Subtle preset defaults") });
    const resetBtn = new Gtk.Button({ label: _("Reset"), valign: Gtk.Align.CENTER });
    resetBtn.add_css_class("destructive-action");
    resetBtn.connect("clicked", () => {
      const keys = settings.settings_schema.list_keys();
      for (const k of keys) {
        settings.reset(k);
      }
      applyPreset("subtle");
      settings.set_string("preset", "subtle");
    });
    resetRow.add_suffix(resetBtn);
    resetRow.activatable_widget = resetBtn;
    resetGroup.add(resetRow);

    const updateRotateDependencies = () => {
      const rotateEnabled = settings.get_boolean("rotate-on-move");
      rotateResetRow.set_sensitive(rotateEnabled);
      rotateSensRow.set_sensitive(rotateEnabled);
    };
    settings.connect("changed::rotate-on-move", updateRotateDependencies);
    updateRotateDependencies();

    const updateSparkDependencies = () => {
      const sparksEnabled = settings.get_int("spark-count") > 0;
      sparkColorRow.set_sensitive(sparksEnabled);
      sparkSizeRow.set_sensitive(sparksEnabled);
      sparkRadiusRow.set_sensitive(sparksEnabled);
      sparkDurationRow.set_sensitive(sparksEnabled);
    };
    settings.connect("changed::spark-count", updateSparkDependencies);
    updateSparkDependencies();

    const updateVisibility = () => {
      const advanced = advancedSwitch.active;
      physicsGroup.visible = advanced;
      sparkGroup.visible = advanced;
    };
    advancedSwitch.connect("notify::active", updateVisibility);
    updateVisibility();
  }
}
