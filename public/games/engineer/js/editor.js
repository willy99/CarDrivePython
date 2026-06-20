import { GRID, TOP_BAR } from './constants.js';

export class Editor {
  constructor(canvas, physics) {
    this.canvas   = canvas;
    this.physics  = physics;
    this.curMat   = 'steel';
    this.dragFrom = -1;
    this.mouse    = { x: 0, y: 0 };
    this.hoverN   = -1;
    this.lBankX   = 0;
    this.rBankX   = 0;
    this.groundY  = 0;
    this.active   = true;  // false during test/result

    this._bind();
  }

  setZone(lBankX, rBankX, groundY) {
    this.lBankX  = lBankX;
    this.rBankX  = rBankX;
    this.groundY = groundY;
  }

  snap(x, y) {
    return { x: Math.round(x / GRID) * GRID, y: Math.round(y / GRID) * GRID };
  }

  _bind() {
    this.canvas.addEventListener('mousemove', e => {
      const r = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left;
      this.mouse.y = e.clientY - r.top;
      this.hoverN  = this.active ? this.physics.findNodeAt(this.mouse.x, this.mouse.y) : -1;
    });

    this.canvas.addEventListener('mousedown', e => {
      if (!this.active || e.button !== 0) return;
      const { x, y } = this.mouse;

      const ni = this.physics.findNodeAt(x, y);
      if (ni >= 0) { this.dragFrom = ni; return; }

      if (this.curMat === 'del') return;

      const inZone = x > this.lBankX && x < this.rBankX && y > TOP_BAR + 4 && y < this.groundY - 4;
      if (!inZone) return;

      const sp    = this.snap(x, y);
      const exist = this.physics.findNodeAt(sp.x, sp.y, 5);
      this.dragFrom = exist >= 0 ? exist : this.physics.addNode(sp.x, sp.y);
    });

    this.canvas.addEventListener('mouseup', () => {
      if (!this.active) return;
      const { x, y } = this.mouse;

      if (this.curMat === 'del') {
        const ni = this.physics.findNodeAt(x, y);
        if (ni >= 0 && !this.physics.nodes[ni].pinned) {
          this.physics.removeNode(ni);
        } else {
          const ei = this.physics.findEdgeAt(x, y);
          if (ei >= 0) this.physics.removeEdge(ei);
        }
        this.dragFrom = -1;
        return;
      }

      if (this.dragFrom < 0) return;

      let target = this.physics.findNodeAt(x, y);
      const inZone = x >= this.lBankX && x <= this.rBankX && y >= TOP_BAR && y <= this.groundY;
      if (target < 0 && inZone) {
        const sp    = this.snap(x, y);
        const exist = this.physics.findNodeAt(sp.x, sp.y, 5);
        target      = exist >= 0 ? exist : this.physics.addNode(sp.x, sp.y);
      }
      if (target >= 0 && target !== this.dragFrom) {
        this.physics.addEdge(this.dragFrom, target, this.curMat);
      }
      this.dragFrom = -1;
    });

    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
  }
}
