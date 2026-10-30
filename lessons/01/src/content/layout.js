/* D01–D03 spatial plan. +Y is up, north is -Z; distances use approximately metre-sized units. */
(function (g) {
  "use strict";
  const buildings = [
    {
      id: "photo",
      code: "B01",
      name: "光影照相馆",
      x: -20,
      z: -15,
      w: 12,
      d: 9,
      wall: 0xf1e5ce,
      roof: 0x75989c,
    },
    {
      id: "service",
      code: "B02",
      name: "南风服务社",
      x: 20,
      z: -16,
      w: 12,
      d: 9,
      wall: 0xf4e4c8,
      roof: 0xc78b68,
    },
    {
      id: "bakery",
      code: "B03",
      name: "面包与晚风",
      x: -36,
      z: 10,
      w: 9,
      d: 8,
      wall: 0xf3debd,
      roof: 0xc8986b,
    },
    {
      id: "florist",
      code: "B04",
      name: "花间小铺",
      x: 36,
      z: -3,
      w: 10,
      d: 9,
      wall: 0xf0e0d3,
      roof: 0xb695ab,
    },
    {
      id: "attic",
      code: "B05",
      name: "牧叶旧物阁楼",
      x: -37,
      z: -29,
      w: 9,
      d: 8,
      wall: 0xebdec8,
      roof: 0xb38c70,
    },
    {
      id: "shop",
      code: "B06",
      name: "春汀杂货铺",
      x: -6,
      z: 32,
      w: 10,
      d: 8,
      wall: 0xf1e6cb,
      roof: 0x94a375,
    },
    {
      id: "library",
      code: "B07",
      name: "风语阅读馆",
      x: 35,
      z: 16,
      w: 10,
      d: 9,
      wall: 0xeae6d5,
      roof: 0x739b8b,
    },
    {
      id: "workshop",
      code: "B08",
      name: "小镇工坊",
      x: -38,
      z: -7,
      w: 10,
      d: 8,
      wall: 0xebe0cd,
      roof: 0x85a18f,
    },
    {
      id: "journal",
      code: "B09",
      name: "春汀游记馆",
      x: 0,
      z: -30,
      w: 14,
      d: 10,
      wall: 0xefeadb,
      roof: 0x7595a4,
    },
  ];
  const activities = {
    arrival: {
      x: -20.6,
      z: 21.6,
      place: "初见花圃",
      zone: "入口花园",
      from: [-20.6, 3.3, 25.4],
      to: [-20.6, 0.9, 14.2],
    },
    distinguish: {
      x: -20,
      z: -12.2,
      place: "光影照相馆",
      zone: "主街",
      from: [-21.75, 1.8, -16.1],
      to: [-19.7, 1.3, -17.8],
    },
    everyday: {
      x: 20,
      z: -13.2,
      place: "南风服务社",
      zone: "主街",
      from: [20, 2.15, -10.8],
      to: [20, 1.5, -18.5],
    },
    create: {
      x: 17,
      z: 21,
      place: "共创花园",
      zone: "广场东岸",
      from: [19, 3.1, 25],
      to: [14, 1.4, 19],
    },
    birds: {
      x: 34,
      z: -22,
      place: "池塘听音台",
      zone: "北岸",
      from: [34, 2.05, -20.1],
      to: [37, 0.6, -30],
    },
    ocr: {
      x: -36,
      z: 11.5,
      place: "面包与晚风",
      zone: "西街",
      from: [-34.9, 1.9, 11.45],
      to: [-36.1, 1.2, 9.15],
    },
    music: {
      x: 33,
      z: 32,
      place: "草地音乐厅",
      zone: "东南草地",
      from: [33, 2.6, 34.6],
      to: [33, 1.25, 29.8],
    },
    sources: {
      x: -27.6,
      z: -13.2,
      place: "照相馆侧廊",
      zone: "主街",
      from: [-28, 2.2, -10.8],
      to: [-27.8, 1.5, -16.7],
    },
    colorize: {
      x: -37,
      z: -27,
      place: "牧叶旧物阁楼",
      zone: "西北街",
      from: [-37, 2.15, -24.6],
      to: [-37, 1.9, -31.8],
    },
    offline: {
      x: -6,
      z: 33.3,
      place: "春汀杂货铺",
      zone: "入口街",
      from: [-6, 2.2, 36.2],
      to: [-6, 1.4, 30],
    },
    clarify: {
      x: 36,
      z: -0.5,
      place: "花间小铺",
      zone: "东街",
      from: [36, 2.2, 2.2],
      to: [36, 1.4, -3.7],
    },
    access: {
      x: 35,
      z: 18,
      place: "风语阅读馆",
      zone: "东岸",
      from: [35, 2.2, 21.3],
      to: [35, 1.9, 12.1],
    },
    simple: {
      x: -40,
      z: 24,
      place: "风车花房",
      zone: "西南草地",
      from: [-37.6, 2.5, 26.8],
      to: [-40, 1.2, 21],
    },
    summary: {
      x: 0,
      z: -27.6,
      place: "春汀游记馆",
      zone: "北街",
      from: [0, 2.2, -24.6],
      to: [0, 1.6, -33],
    },
  };
  const roads = [
    {
      // A gentle promenade connects the bridge and square without a grass gap.
      w: 3.8,
      p: [
        [0, 39],
        [2.2, 34],
        [2.7, 27],
        [1.6, 20],
        [0, 14],
      ],
    },
    {
      w: 3.6,
      p: [
        [0, 46],
        [0, 39],
        [-23, 39],
        [-23, 24],
        [-12, 24],
        [-10, 14],
        [-8, 1],
        [-10, -7],
      ],
    },
    {
      // Ends flush with the east cross street, short of the florist's wall.
      w: 4.8,
      p: [
        [-29.5, -7],
        [28, -7],
      ],
    },
    {
      w: 3.8,
      p: [
        [0, -7],
        [0, -23],
      ],
    },
    {
      // Narrower on the terrace, to fit the journal hall's doorway.
      w: 2.4,
      p: [
        [0, -23],
        [0, -25],
      ],
    },
    {
      // The west avenue runs beside the bakery and workshop, not under them.
      w: 3.4,
      p: [
        [-23, 39],
        [-32.5, 34],
        [-29.5, 25],
        [-29.5, -22],
        [-37, -22],
        [-37, -25],
      ],
    },
    {
      w: 2.8,
      p: [
        [-29.5, 16.7],
        [-36, 16.7],
        [-36, 14],
      ],
    },
    {
      w: 2.8,
      p: [
        [-29.5, -1.4],
        [-38, -1.4],
        [-38, -3],
      ],
    },
    {
      w: 3.4,
      p: [
        [20, -7],
        [22, 4],
        [32, 7],
        [43, 7],
        [43, 24],
        [42.2, 31],
        [38.6, 36.2],
        [27.4, 36.2],
        [20.8, 33.2],
        [17, 26],
        [17, 21],
      ],
    },
    {
      w: 3.4,
      p: [
        [22, 4],
        [17, 13],
        [11, 13],
        [11, 21],
        [17, 21],
      ],
    },
    {
      w: 2.8,
      p: [
        [29, -7],
        [29, -17],
        [34, -22],
        [34, -28],
      ],
    },
    {
      w: 2.8,
      p: [
        [36, 1.5],
        [36, 5],
        [29, 5],
        [29, -7],
      ],
    },
    {
      // Clear of the reading room's pergola posts.
      w: 2.8,
      p: [
        [43, 24],
        [35, 24],
        [35, 20.5],
      ],
    },
    {
      // Steps up to the music pavilion.
      w: 2.4,
      p: [
        [33, 36.2],
        [33, 33.8],
      ],
    },
    {
      w: 2.8,
      p: [
        [-6, 39],
        [-6, 36],
      ],
    },
    {
      w: 2.8,
      p: [
        [-20, -7],
        [-20, -10.5],
      ],
    },
    {
      w: 2.8,
      p: [
        [20, -7],
        [20, -11.5],
      ],
    },
    {
      w: 2.8,
      p: [
        [-29.5, 24],
        [-40, 24],
      ],
    },
    {
      // Into the first garden through its rose arch, and the brick walk in
      // front of the three teaching flowers.
      w: 2,
      p: [
        [-20.6, 24],
        [-20.6, 17.3],
      ],
    },
    {
      w: 1.6,
      p: [
        [-25.4, 17.3],
        [-15.8, 17.3],
      ],
    },
  ];
  // 初见花圃: a fenced cottage garden set back from all three roads around it.
  // A clipped hedge closes the north side, a picket fence the others, with a
  // rose-arch gate on the south. The teaching flowers stand in one row.
  const firstGarden = {
    x0: -26.6,
    x1: -14.6,
    z0: 10.6,
    z1: 20,
    gate: [-20.6, 20],
    gateWidth: 1.7,
    // The three flowers the AI has learned, then the gardener's new one,
    // planted beside the flower it resembles. 2.8 m apart, so no lesson
    // photo of one flower catches another or a side fence.
    plants: [
      [-24.8, 14.4],
      [-19.2, 14.4],
      [-16.4, 14.4],
      [-22, 14.4],
    ],
  };
  function walls(b) {
    const front = b.z + b.d / 2,
      door = 2.7,
      half = (b.w - door) / 2;
    return [
      { x: b.x, z: b.z - b.d / 2, w: b.w, d: 0.25 },
      { x: b.x - b.w / 2, z: b.z, w: 0.25, d: b.d },
      { x: b.x + b.w / 2, z: b.z, w: 0.25, d: b.d },
      { x: b.x - (door / 2 + half / 2), z: front, w: half, d: 0.25 },
      { x: b.x + (door / 2 + half / 2), z: front, w: half, d: 0.25 },
    ];
  }
  function segmentDistance(x, z, a, b) {
    const dx = b[0] - a[0],
      dz = b[1] - a[1],
      t = Math.max(
        0,
        Math.min(
          1,
          ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1),
        ),
      );
    return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
  }
  function roadDistance(x, z) {
    let d = Infinity;
    for (const r of roads)
      for (let i = 1; i < r.p.length; i++)
        d = Math.min(d, segmentDistance(x, z, r.p[i - 1], r.p[i]) - r.w / 2);
    return d;
  }
  function navigationCost(x, z) {
    let cost = Infinity;
    for (const r of roads)
      for (let i = 1; i < r.p.length; i++) {
        const d = segmentDistance(x, z, r.p[i - 1], r.p[i]),
          half = r.w / 2;
        cost = Math.min(
          cost,
          d <= half
            ? 1 + 0.9 * (d / half) ** 2
            : 1.9 + Math.min(5, d - half) * 0.8,
        );
      }
    return cost;
  }
  // Local north-garden relief; all coordinates and route semantics remain X/Z.
  // These parameters also define the physical masonry approach in landscape.js.
  const northTerrace = Object.freeze({
    height: 1.2,
    halfWidth: 8,
    edgeWidth: 11,
    rear: -36,
    rearEdge: -40,
    front: -23,
    stairFront: -18.2,
    stairHalfWidth: 2.4,
    stairBlendWidth: 3.3,
    steps: 8,
    stepRise: 0.15,
    stepDepth: 0.6,
  });
  const smoothUnit = (value) => {
    const t = Math.max(0, Math.min(1, value));
    return t * t * (3 - 2 * t);
  };
  function terrainHeight(x, z) {
    const n = northTerrace;
    if (Math.abs(x) >= n.edgeWidth || z >= n.stairFront || z <= n.rearEdge)
      return 0;
    const side =
        1 -
        smoothUnit((Math.abs(x) - n.halfWidth) / (n.edgeWidth - n.halfWidth)),
      rear = smoothUnit((z - n.rearEdge) / (n.rear - n.rearEdge)),
      progress = (n.stairFront - z) / (n.stairFront - n.front),
      ramp = smoothUnit(progress) * n.height;
    if (z <= n.front) return n.height * side * rear;
    const stair =
        Math.min(n.steps, Math.floor((n.stairFront - z) / n.stepDepth) + 1) *
        n.stepRise,
      blend =
        1 -
        smoothUnit(
          (Math.abs(x) - n.stairHalfWidth) /
            (n.stairBlendWidth - n.stairHalfWidth),
        );
    return (ramp + (stair - ramp) * blend) * side * rear;
  }
  // Camera heights are authored relative to their own ground sample. Convert
  // once here; downstream runtime uses these as world-space coordinates.
  for (const activity of Object.values(activities))
    for (const point of [activity.from, activity.to])
      point[1] += terrainHeight(point[0], point[2]);
  const Layout = {
    buildings,
    photoCounter: { x: -20, z: -17, w: 3.6, d: 1 },
    activities,
    roads,
    firstGarden,
    spawn: { x: 0, z: 43 },
    plaza: { x: 0, z: 8, r: 7.7 },
    pond: { x: 37, z: -31, rx: 9.5, rz: 7.5 },
    gallerySlots: [
      [10, 18],
      [10, 21],
      [10, 24],
      [13, 25],
      [16, 27],
      [20, 27],
      [23, 25],
      [25, 22],
      [25, 19],
      [22, 15],
      [18, 14],
      [14, 15],
    ],
    walls,
    colliders: () => buildings.flatMap(walls),
    roadDistance,
    navigationCost,
    terrainHeight,
    northTerrace,
  };
  g.TownLayout = Layout;
  if (typeof module !== "undefined") module.exports = Layout;
})(globalThis);
