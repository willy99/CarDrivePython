"""
A tiny shared reinforcement-learning brain for the traffic.

This is real Q-learning — just compact (a dict-based Q-table over a small
discretised state) so it runs at 60 fps in the browser with no ML libraries.

* All NPC cars share ONE brain (BRAIN), so they learn from each other.
* The player can also teach it (demonstrate()) by driving well through traffic.
* It only chooses the "smart" decisions — which way to turn at a junction and
  how to escape a deadlock.  Safety rules (red lights, pedestrians) stay hard
  constraints in npc_car, so learning can never make the traffic dangerous.

State  : (forward_open, left_space, right_space, back_open, in_conflict)
Actions: 0=straight  1=left  2=right  3=back/U-turn
Reward : progress made, minus time spent stuck, plus a bonus for escaping a jam.
"""

import math
import random


class QBrain:
    N_ACTIONS = 4   # straight, left, right, back

    def __init__(self, alpha=0.35, gamma=0.85, eps=0.12,
                 eps_min=0.03, eps_decay=0.99990, temp=0.35):
        self.q: dict[tuple, list] = {}
        self.alpha = alpha
        self.gamma = gamma
        self.eps = eps
        self.eps_min = eps_min
        self.eps_decay = eps_decay
        self.temp = temp           # softmax temperature (higher = more variety)
        # telemetry
        self.updates = 0
        self.resolved = 0          # jams successfully escaped
        self.demos = 0             # player demonstrations absorbed

    # ------------------------------------------------------------------

    def _row(self, state):
        return self.q.setdefault(state, [0.0] * self.N_ACTIONS)

    def ensure(self, state, prior):
        """Initialise an unseen state with a sensible prior (so untrained
        behaviour already matches good rule-of-thumb driving)."""
        if state not in self.q:
            self.q[state] = list(prior)

    def choose(self, state, valid):
        """
        Softmax (Boltzmann) sampling over the valid actions.

        Unlike a greedy argmax this keeps VARIETY: when two options are about
        equally good (e.g. turn left vs. right at a crossroads) cars split
        roughly 50/50 instead of the whole shared-brain fleet herding onto the
        same route — while better-valued actions are still preferred.
        """
        if not valid:
            return 0
        row = self._row(state)
        m = max(row[a] for a in valid)
        weights = [math.exp((row[a] - m) / self.temp) for a in valid]
        total = sum(weights)
        r = random.random() * total
        acc = 0.0
        for a, w in zip(valid, weights):
            acc += w
            if r <= acc:
                return a
        return valid[-1]

    def learn(self, s, a, reward, s2, valid2):
        row = self._row(s)
        future = max((self._row(s2)[b] for b in valid2), default=0.0)
        row[a] += self.alpha * (reward + self.gamma * future - row[a])
        self.updates += 1
        if self.eps > self.eps_min:
            self.eps *= self.eps_decay

    def demonstrate(self, s, a):
        """Player showed that action `a` works in state `s` — nudge it up."""
        row = self._row(s)
        row[a] += self.alpha * 0.6 * (1.2 - row[a])
        self.demos += 1

    # ------------------------------------------------------------------

    @property
    def skill(self) -> int:
        """A rough 'Traffic IQ': how many situations the fleet has learned."""
        return len(self.q)


# Module-level singleton shared by every NPC car (collective memory that
# survives level changes within a session).
BRAIN = QBrain()


def bucket(space: int) -> int:
    """Discretise an open-space measurement into 0 / 1 / 2."""
    if space <= 0:
        return 0
    if space <= 2:
        return 1
    return 2
