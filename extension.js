import St from "gi://St";
import Clutter from "gi://Clutter";
import GLib from "gi://GLib";
import Shell from "gi://Shell";
import Gio from "gi://Gio";

import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";

import { Spring } from "./spring.js";

export default class SmoothCursorExtension extends Extension {
  enable() {
    // Auto-install invisible cursor theme if needed
    try {
      const iconDir = GLib.build_filenamev([GLib.get_user_data_dir(), 'icons']);
      const targetDir = GLib.build_filenamev([iconDir, 'adwaita-invisible']);
      
      const targetFile = Gio.File.new_for_path(targetDir);
      if (!targetFile.query_exists(null)) {
        GLib.mkdir_with_parents(iconDir, 0o755);
        const sourceDir = this.dir.get_child('adwaita-invisible').get_path();
        GLib.spawn_command_line_sync(`cp -r "${sourceDir}" "${iconDir}/"`);
      }
    } catch (e) {
      logError(e, 'Failed to install invisible cursor theme');
    }

    this._settings = this.getSettings();
    this._settingsSignalIds = [];
    this._interfaceSettings = new Gio.Settings({ schema_id: 'org.gnome.desktop.interface' });
    this._originalCursorTheme = this._interfaceSettings.get_string('cursor-theme');
    
    // Only save original if it's not already adwaita-invisible (e.g. extension was restarted)
    if (this._originalCursorTheme !== 'adwaita-invisible') {
      this._savedCursorTheme = this._originalCursorTheme;
    }
    
    this._interfaceSettings.set_string('cursor-theme', 'adwaita-invisible');

    this._cont = new Clutter.Actor({ reactive: false });
    
    // Create cursor actor
    this._cursorActor = new St.Icon({
      icon_size: this._settings.get_int('cursor-size'),
      fallback_icon_name: 'pointer',
    });
    
    const updateCursorImage = () => {
      const customPath = this._settings.get_string('custom-cursor-path');
      let gicon;
      if (customPath && GLib.file_test(customPath, GLib.FileTest.EXISTS)) {
        gicon = Gio.icon_new_for_string(customPath);
      } else {
        const iconFile = this.dir.get_child('cursor.svg').get_path();
        gicon = Gio.icon_new_for_string(iconFile);
      }
      this._cursorActor.gicon = gicon;
    };
    
    this._settingsSignalIds.push(this._settings.connect('changed::custom-cursor-path', updateCursorImage));
    updateCursorImage();

    this._cursorActor.set_pivot_point(0, 0);
    this._settingsSignalIds.push(this._settings.connect('changed::cursor-size', () => {
      this._cursorActor.icon_size = this._settings.get_int('cursor-size');
    }));
    
    this._cont.add_child(this._cursorActor);
    
    Shell.util_set_hidden_from_pick(this._cont, true);
    global.stage.add_child(this._cont);

    this._overviewShowingId = Main.overview.connect("showing", () => {
      global.stage.set_child_above_sibling(this._cont, null);
    });

    this._cursorTracker = global.backend.get_cursor_tracker();

    // Use polling for click detection since Wayland blocks captured-event
    this._sparks = [];
    this._isMouseDown = false;
    this._wasMouseDown = false;

    const [coords] = this._cursorTracker.get_pointer();
    let initialX = coords.x;
    let initialY = coords.y;

    const getSpringConfig = () => ({
      damping: this._settings.get_int('spring-damping'),
      stiffness: this._settings.get_int('spring-stiffness'),
      mass: this._settings.get_int('spring-mass'),
    });
    
    const updatePhysics = () => {
      const sc = getSpringConfig();
      this._cursorX.damping = sc.damping;
      this._cursorX.stiffness = sc.stiffness;
      this._cursorX.mass = sc.mass;
      this._cursorY.damping = sc.damping;
      this._cursorY.stiffness = sc.stiffness;
      this._cursorY.mass = sc.mass;
    };
    
    this._settingsSignalIds.push(this._settings.connect('changed::spring-damping', updatePhysics));
    this._settingsSignalIds.push(this._settings.connect('changed::spring-stiffness', updatePhysics));
    this._settingsSignalIds.push(this._settings.connect('changed::spring-mass', updatePhysics));
    
    this._rotateOnMove = this._settings.get_boolean('rotate-on-move');
    this._rotateResetOnStop = this._settings.get_boolean('rotate-reset-on-stop');
    this._settingsSignalIds.push(this._settings.connect('changed::rotate-on-move', () => {
        this._rotateOnMove = this._settings.get_boolean('rotate-on-move');
    }));
    this._settingsSignalIds.push(this._settings.connect('changed::rotate-reset-on-stop', () => {
        this._rotateResetOnStop = this._settings.get_boolean('rotate-reset-on-stop');
    }));

    const springConfig = getSpringConfig();
    const rotationConfig = { damping: 60, stiffness: 300, mass: 1 };
    const scaleConfig = { damping: 25, stiffness: 500, mass: 1 };

    this._cursorX = new Spring({ ...springConfig, initial: initialX });
    this._cursorY = new Spring({ ...springConfig, initial: initialY });
    this._rotation = new Spring(rotationConfig);
    this._scale = new Spring({ ...scaleConfig, initial: 1 });

    this._lastMousePos = { x: initialX, y: initialY };
    this._lastUpdateTime = GLib.get_monotonic_time() / 1000;
    this._previousAngle = 0;
    this._accumulatedRotation = 0;
    this._smoothedVx = 0;
    this._smoothedVy = 0;
    this._scaleTimeoutId = null;
    this._rotationTimeoutId = null;

    this._tickTime = GLib.get_monotonic_time() / 1000;

    this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 16, () => {
      try {
        this._tick();
      } catch (e) {
        logError(e, "SmoothCursor _tick error");
      }
      return GLib.SOURCE_CONTINUE;
    });
  }

  _spawnSparks() {
    const now = GLib.get_monotonic_time() / 1000;
    const curX = this._cursorX.value;
    const curY = this._cursorY.value;
    const sparkCount = this._settings.get_int('spark-count');
    
    for (let i = 0; i < sparkCount; i++) {
      const angle = (2 * Math.PI * i) / sparkCount;
      
      const sparkActor = new St.Widget({
        style: `background-color: ${this._settings.get_string('spark-color')}; border-radius: 1px;`,
        width: this._settings.get_int('spark-size'), // sparkSize
        height: 2,
      });
      
      sparkActor.set_pivot_point(0, 0.5);
      sparkActor.rotation_angle_z = angle * (180 / Math.PI);
      
      this._cont.add_child(sparkActor);
      
      this._sparks.push({
        actor: sparkActor,
        startX: curX,
        startY: curY,
        angle: angle,
        startTime: now
      });
    }
  }

  _tick() {
    const currentTime = GLib.get_monotonic_time() / 1000;
    let dt = (currentTime - this._tickTime) / 1000.0;
    if (dt > 0.1) dt = 0.016;
    this._tickTime = currentTime;

    const [ptrX, ptrY, mods] = global.get_pointer();
    const isDown = (mods & Clutter.ModifierType.BUTTON1_MASK) !== 0;

    if (isDown && !this._wasMouseDown) {
      this._isMouseDown = true;
      this._scale.set(0.7 * this._settings.get_double('extra-scale')); // Bounce down
      this._spawnSparks();
    } else if (!isDown && this._wasMouseDown) {
      this._isMouseDown = false;
      this._scale.set(1.0); // Bounce up
    }
    this._wasMouseDown = isDown;

    if (this._cursorTracker) {
      const x = ptrX;
      const y = ptrY;
      
      const deltaTime = currentTime - this._lastUpdateTime;
      if (deltaTime > 0) {
        const vx = (x - this._lastMousePos.x) / deltaTime;
        const vy = (y - this._lastMousePos.y) / deltaTime;
        
        // Exponential moving average for velocity smoothing
        const alpha = 0.15; // Lower is smoother
        this._smoothedVx = this._smoothedVx * (1 - alpha) + vx * alpha;
        this._smoothedVy = this._smoothedVy * (1 - alpha) + vy * alpha;
        
        const speed = Math.sqrt(vx * vx + vy * vy);
        const smoothedSpeed = Math.sqrt(this._smoothedVx * this._smoothedVx + this._smoothedVy * this._smoothedVy);
        
        this._cursorX.set(x);
        this._cursorY.set(y);

        if (this._rotateOnMove) {
          // Use smoothedSpeed threshold and smoothed velocity vector to calculate angle
          if (smoothedSpeed > 40) {
            const currentAngle = Math.atan2(this._smoothedVy, this._smoothedVx) * (180 / Math.PI) + 90;
            
            // Fix: Use modulo 360 to prevent wild spinning if previousAngle is very large
            let angleDiff = (currentAngle - this._previousAngle) % 360;
            if (angleDiff > 180) angleDiff -= 360;
            if (angleDiff < -180) angleDiff += 360;
            
            this._accumulatedRotation += angleDiff;
            this._rotation.set(this._accumulatedRotation);
            this._previousAngle = currentAngle;
            
            if (this._rotationTimeoutId !== null) {
              GLib.Source.remove(this._rotationTimeoutId);
              this._rotationTimeoutId = null;
            }
            
            // If the user wants it to reset on stop, set the timeout
            if (this._rotateResetOnStop) {
              this._rotationTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 150, () => {
                const nearestUpright = Math.round(this._accumulatedRotation / 360) * 360;
                this._rotation.set(nearestUpright);
                this._accumulatedRotation = nearestUpright;
                
                // Fix: set previousAngle to the normalized 0-360 value so next movement isn't a 1440 degree diff!
                this._previousAngle = nearestUpright % 360;
                
                this._rotationTimeoutId = null;
                return GLib.SOURCE_REMOVE;
              });
            }
          }
        } else {
          this._rotation.set(0);
          this._accumulatedRotation = 0;
          this._previousAngle = 0;
        }

        if (speed > 0.1) {
          if (!this._isMouseDown) {
            this._scale.set(0.95);
            
            if (this._scaleTimeoutId !== null) {
              GLib.Source.remove(this._scaleTimeoutId);
            }
            
            this._scaleTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 150, () => {
              if (!this._isMouseDown) {
                this._scale.set(1);
              }
              this._scaleTimeoutId = null;
              return GLib.SOURCE_REMOVE;
            });
          }
        }
      }

      this._lastUpdateTime = currentTime;
      this._lastMousePos = { x, y };
    }

    const curX = this._cursorX.update(dt);
    const curY = this._cursorY.update(dt);
    const curRot = this._rotation.update(dt);
    const curScale = this._scale.update(dt);

    this._cursorActor.set_position(curX, curY);
    this._cursorActor.rotation_angle_z = curRot;
    this._cursorActor.scale_x = curScale;
    this._cursorActor.scale_y = curScale;

    // Process sparks
    const sparkRadius = this._settings.get_int('spark-radius');
    const sparkSize = this._settings.get_int('spark-size');
    const duration = this._settings.get_int('spark-duration');

    this._sparks = this._sparks.filter(spark => {
      const elapsed = currentTime - spark.startTime;
      if (elapsed >= duration) {
        if (spark.actor) {
          this._cont.remove_child(spark.actor);
          spark.actor.destroy();
        }
        return false;
      }
      
      const progress = elapsed / duration;
      const eased = progress * (2 - progress); // ease-out quad
      
      const distance = eased * sparkRadius;
      const lineLength = Math.max(0, sparkSize * (1 - eased));
      
      const x = spark.startX + distance * Math.cos(spark.angle);
      const y = spark.startY + distance * Math.sin(spark.angle);
      
      spark.actor.set_position(x, y - 1); // center the 2px line vertically on its pivot
      spark.actor.width = lineLength;
      
      // Optionally fade out
      spark.actor.opacity = 255 * (1 - eased);
      
      return true;
    });
  }

  disable() {
    if (this._interfaceSettings && this._savedCursorTheme) {
      const currentTheme = this._interfaceSettings.get_string('cursor-theme');
      // Only revert if the user hasn't manually changed the theme while the extension was running
      if (currentTheme === 'adwaita-invisible') {
        this._interfaceSettings.set_string('cursor-theme', this._savedCursorTheme);
      }
    }

    if (this._settingsSignalIds) {
      this._settingsSignalIds.forEach(id => this._settings.disconnect(id));
      this._settingsSignalIds = null;
    }
    this._settings = null;
    
    if (this._timeoutId) {
      GLib.Source.remove(this._timeoutId);
      this._timeoutId = null;
    }
    
    if (this._scaleTimeoutId) {
      GLib.Source.remove(this._scaleTimeoutId);
      this._scaleTimeoutId = null;
    }
    
    if (this._rotationTimeoutId) {
      GLib.Source.remove(this._rotationTimeoutId);
      this._rotationTimeoutId = null;
    }


    this._cursorTracker = null;

    if (this._overviewShowingId) {
      Main.overview.disconnect(this._overviewShowingId);
      this._overviewShowingId = null;
    }

    if (this._sparks) {
      for (const spark of this._sparks) {
        if (spark.actor) {
          spark.actor.destroy();
        }
      }
      this._sparks = [];
    }

    if (this._cont) {
      global.stage.remove_child(this._cont);
      this._cont.destroy();
      this._cont = null;
    }
    this._cursorActor = null;
  }
}
