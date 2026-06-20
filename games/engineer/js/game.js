import { GRID, TOP_BAR, BOT_BAR, VEHICLES } from './constants.js';
import { Physics  } from './physics.js';
import { Vehicle  } from './vehicle.js';
import { Renderer } from './renderer.js';
import { Editor   } from './editor.js';
import { UI       } from './ui.js';

class Game {
  constructor() {
    this.canvas   = document.getElementById('c');
    this.physics  = new Physics();
    this.renderer = new Renderer(this.canvas);
    this.editor   = new Editor(this.canvas, this.physics);
    this.ui       = new UI();

    this.mode        = 'BUILD';
    this.vehicle     = null;
    this.vehicleType = 'truck';

    this._wire();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    requestAnimationFrame(() => this._loop());
  }

  _wire() {
    this.ui.onMatChange     = mat => { this.editor.curMat = mat; };
    this.ui.onVehicleChange = v   => { this.vehicleType = v; };
    this.ui.onTest          = () => this._startTest();
    this.ui.onBack      = () => this._backToBuild();
    this.ui.onClear     = () => {
      this.physics.nodes = this.physics.nodes.slice(0, 2);
      this.physics.edges = [];
      this.ui.updateHUD(0, 0);
    };
  }

  resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this._initLevel();
  }

  _initLevel() {
    const H      = this.canvas.height;
    const W      = this.canvas.width;
    const usable = H - TOP_BAR - BOT_BAR;

    this.groundY = TOP_BAR + usable * 0.70;
    this.lBankX  = Math.round(W * 0.17);
    this.rBankX  = Math.round(W * 0.83);

    this.physics.reset();
    const ay = Math.round(this.groundY / GRID) * GRID;
    const lx = Math.round(this.lBankX  / GRID) * GRID;
    const rx = Math.round(this.rBankX  / GRID) * GRID;
    this.physics.addNode(lx, ay, true);
    this.physics.addNode(rx, ay, true);

    this.editor.setZone(this.lBankX, this.rBankX, this.groundY);
    this.editor.active = true;
    this.editor.curMat = 'steel';
    this.mode    = 'BUILD';
    this.vehicle = null;

    this.ui.setMode('BUILD');
    this.ui.selectMat('steel');
    this.ui.selectVehicle(this.vehicleType);
    this.ui.hint('Клікни між опорами щоб додати вузол. Тягни між вузлами щоб з\'єднати балкою або тросом.');
  }

  _startTest() {
    if (this.mode !== 'BUILD') return;
    if (this.physics.edges.length === 0) {
      this.ui.hint('⚠️ Спочатку побудуй хоч одну балку!');
      return;
    }
    this.mode = 'TEST';
    this.editor.active   = false;
    this.editor.dragFrom = -1;
    this.editor.hoverN   = -1;

    // Snapshot the as-built shape so we can restore it after the test.
    for (const n of this.physics.nodes) { n.ox = n.x; n.oy = n.y; n.px = n.x; n.py = n.y; }
    for (const e of this.physics.edges) { e.broken = false; e.stress = 0; }

    this.vehicle = new Vehicle(
      VEHICLES[this.vehicleType],
      this.physics,
      this.lBankX, this.rBankX, this.groundY,
      this.physics.nodes[0].x,
      this.physics.nodes[0].y,
    );

    this.ui.setMode('TEST');
    this.ui.hint('Тест іде... синій = стиск, червоний = небезпека!');
  }

  _backToBuild() {
    this.mode = 'BUILD';
    this.vehicle = null;
    this.editor.active   = true;
    this.editor.dragFrom = -1;

    for (const e of this.physics.edges) { e.broken = false; e.stress = 0; }
    // Restore the as-built shape (undo any sag/deformation from the test).
    for (const n of this.physics.nodes) {
      if (n.ox !== undefined) { n.x = n.ox; n.y = n.oy; }
      n.px = n.x; n.py = n.y;
    }

    this.ui.setMode('BUILD');
    this.ui.hint('Режим будівництва. Відредагуй і спробуй ще раз.');
  }

  _update() {
    if (this.mode !== 'TEST') return;

    this.physics.step(this.canvas.height);

    if (this.vehicle) {
      const result = this.vehicle.update();
      if (result === 'success' || result === 'fail') {
        this.mode = 'RESULT';
        this.ui.setMode('RESULT');
        this.ui.showResult(result === 'success');
      }
    }
  }

  _draw() {
    this.renderer.draw({
      nodes:    this.physics.nodes,
      edges:    this.physics.edges,
      mode:     this.mode,
      groundY:  this.groundY,
      lBankX:   this.lBankX,
      rBankX:   this.rBankX,
      dragFrom: this.editor.dragFrom,
      hoverN:   this.editor.hoverN,
      curMat:   this.editor.curMat,
      mouse:    this.editor.mouse,
      vehicle:  this.vehicle,
      snap:     (x, y) => this.editor.snap(x, y),
    });
    this.ui.updateHUD(this.physics.getTotalCost(), this.physics.edges.length);
  }

  _loop() {
    this._update();
    this._draw();
    requestAnimationFrame(() => this._loop());
  }
}

window._game = new Game();
