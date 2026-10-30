/* Media integration point. Set src to assets/videos/<file>.mp4 or .webm when approved course films arrive.
 * Never assign learning evidence on playback or ended: films supplement the student's own actions. */
(function (g) {
  function localAsset(value) {
    if (
      typeof value !== "string" ||
      !value.startsWith("assets/videos/") ||
      value.includes("..") ||
      /[\\%?#:]/.test(value)
    )
      return null;
    return /^assets\/videos\/[\w\u3400-\u9fff /.-]+$/.test(value)
      ? value
      : null;
  }
  const clips = {
    welcome: {
      title: "欢迎来到春汀",
      subtitle: "把好奇心，带进生活。",
      mode: "cinema",
      src: null,
      poster: null,
      captions: null,
    },
    arrival: {
      title: "一朵花，怎样被认出来？",
      subtitle: "先留下自己的照片，再认识识图。",
      mode: "companion",
      src: null,
      poster: null,
      captions: null,
    },
    distinguish: {
      title: "会自动做事，就一定是 AI 吗？",
      subtitle: "观察它怎样做，比看它长什么样更重要。",
      mode: "companion",
      src: null,
      poster: null,
      captions: null,
    },
    everyday: {
      title: "原来，这些也是 AI",
      subtitle: "生活里的帮助，也需要我们的判断。",
      mode: "companion",
      src: null,
      poster: null,
      captions: null,
    },
    create: {
      title: "把你的想法，画进春天",
      subtitle: "AI 给出可能，选择由你来做。",
      mode: "companion",
      src: null,
      poster: null,
      captions: null,
    },
    farewell: {
      title: "下一段好奇，从这里出发",
      subtitle: "带着自己的发现，继续探索。",
      mode: "cinema",
      src: null,
      poster: null,
      captions: null,
    },
  };
  const api = { clips, localAsset };
  g.TownVideos = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
