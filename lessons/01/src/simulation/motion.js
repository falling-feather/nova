/* Frame-rate independent motion. No renderer or input state is kept here. */
(function (g) {
  const damp = (value, target, rate, dt) =>
    target + (value - target) * Math.exp(-rate * Math.max(0, dt));
  const turn = (value, target, rate, dt) =>
    value +
    Math.atan2(Math.sin(target - value), Math.cos(target - value)) *
      (1 - Math.exp(-rate * Math.max(0, dt)));
  const Motion = { damp, turn };
  g.TownMotion = Motion;
  if (typeof module !== "undefined") module.exports = Motion;
})(globalThis);
