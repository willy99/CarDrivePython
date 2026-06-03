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

import random


class QBrain:
    N_ACTIONS = 4   # straight, left, right, back

    def __init__(self, alpha=0.35, gamma=0.85, eps=0.12,
                 eps_min=0.03, eps_decay=0.99990):
        self.q: dict[tuple, list] = {}
        self.alpha = alpha
        self.gamma = gamma
        self.eps = eps
        self.eps_min = eps_min
        self.eps_decay = eps_decay
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
        """ε-greedy among the currently-valid actions."""
        if not valid:
            return 0
        if random.random() < self.eps:
            return random.choice(valid)
        row = self._row(state)
        return max(valid, key=lambda a: row[a])

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
