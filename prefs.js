import Adw from "gi://Adw";
import Gtk from "gi://Gtk";
import Gdk from "gi://Gdk";
import Gio from "gi://Gio";

import {
  ExtensionPreferences,
  gettext as _,
} from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

export default class CursorSparkPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const settings = this.getSettings("org.gnome.shell.extensions.cursor-spark");

    const behaviorPage = new Adw.PreferencesPage({
      title: _("Behavior"),
      icon_name: "applications-system-symbolic",
    });
    window.add(behaviorPage);

    const advancedGroup = new Adw.PreferencesGroup({
      title: _("Mode"),
    });
    behaviorPage.add(advancedGroup);

    const advancedRow = new Adw.ActionRow({
      title: _("Advanced Mode"),
      subtitle: _("Show advanced physics and spark configuration"),
    });
    const advancedSwitch = new Gtk.Switch({
      valign: Gtk.Align.CENTER,
      active: false,
    });
    advancedRow.add_suffix(advancedSwitch);
    advancedRow.activatable_widget = advancedSwitch;
    advancedGroup.add(advancedRow);

    const simpleGroup = new Adw.PreferencesGroup({
      title: _("Cursor Behavior"),
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
      if (settings.get_value(key).get_type_string() === 'd') {
        spin.digits = 2;
        settings.bind(key, spin.adjustment, "value", Gio.SettingsBindFlags.DEFAULT);
      } else {
        settings.bind(key, spin, "value", Gio.SettingsBindFlags.DEFAULT);
      }
      row.add_suffix(spin);
      group.add(row);
      return row;
    };

    const addColorRow = (group, key, title, subtitle) => {
      const row = new Adw.ActionRow({ title, subtitle });
      const colorBtn = new Gtk.ColorButton({ valign: Gtk.Align.CENTER });
      const rgba = new Gdk.RGBA();
      rgba.parse(settings.get_string(key));
      colorBtn.set_rgba(rgba);
      colorBtn.connect('color-set', () => {
        const c = colorBtn.get_rgba();
        const hex = `#${Math.round(c.red * 255).toString(16).padStart(2, '0')}${Math.round(c.green * 255).toString(16).padStart(2, '0')}${Math.round(c.blue * 255).toString(16).padStart(2, '0')}`;
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
      
      btn.connect('clicked', () => {
        const dialog = new Gtk.FileChooserNative({
          title: _("Select Custom Cursor Image"),
          action: Gtk.FileChooserAction.OPEN,
          accept_label: _("Open"),
          cancel_label: _("Cancel")
        });
        
        const filter = new Gtk.FileFilter();
        filter.add_mime_type('image/png');
        filter.add_mime_type('image/svg+xml');
        filter.add_mime_type('image/x-ico');
        filter.add_mime_type('image/x-icon');
        filter.add_mime_type('image/vnd.microsoft.icon');
        filter.add_pattern('*.cur');
        filter.add_pattern('*.ico');
        filter.set_name("Images (PNG, SVG, CUR, ICO)");
        dialog.add_filter(filter);

        dialog.connect('response', (dlg, response) => {
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
      clearBtn.connect('clicked', () => {
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

    addFileRow(simpleGroup, "custom-cursor-path", _("Custom Cursor Image"), _("Select a PNG or SVG to override the default cursor"));
    addSwitchRow(simpleGroup, "rotate-on-move", _("Rotate on Move"), _("Cursor rotates to face the direction of movement"));
    addSwitchRow(simpleGroup, "rotate-reset-on-stop", _("Reset Rotation on Stop"), _("Automatically snaps the cursor back upright when you stop moving"));
    addSpinRow(simpleGroup, "cursor-size", _("Cursor Size"), _("Base size of the cursor in pixels"), 20, 100, 1);
    
    // Advanced Groups
    const physicsGroup = new Adw.PreferencesGroup({ title: _("Physics") });
    behaviorPage.add(physicsGroup);
    addSpinRow(physicsGroup, "spring-damping", _("Spring Damping"), _("Cursor physics damping"), 1, 100, 1);
    addSpinRow(physicsGroup, "spring-stiffness", _("Spring Stiffness"), _("Cursor physics stiffness"), 10, 1000, 10);
    addSpinRow(physicsGroup, "spring-mass", _("Spring Mass"), _("Cursor physics mass"), 1, 100, 1);
    addSpinRow(physicsGroup, "extra-scale", _("Click Bounce Scale"), _("Multiplier for the click bounce scale"), 0.0, 1.0, 0.05);

    const sparkGroup = new Adw.PreferencesGroup({ title: _("Click Sparks") });
    behaviorPage.add(sparkGroup);
    addColorRow(sparkGroup, "spark-color", _("Spark Color"), _("Color of the click sparks"));
    addSpinRow(sparkGroup, "spark-size", _("Spark Size"), _("Length of the sparks"), 1, 100, 1);
    addSpinRow(sparkGroup, "spark-radius", _("Spark Radius"), _("How far the sparks travel"), 10, 200, 5);
    addSpinRow(sparkGroup, "spark-count", _("Spark Count"), _("Number of sparks per click"), 0, 30, 1);
    addSpinRow(sparkGroup, "spark-duration", _("Spark Duration"), _("How long sparks last (ms)"), 50, 1000, 50);

    const updateVisibility = () => {
      const advanced = advancedSwitch.active;
      physicsGroup.visible = advanced;
      sparkGroup.visible = advanced;
    };
    advancedSwitch.connect("notify::active", updateVisibility);
    updateVisibility();
  }
}
