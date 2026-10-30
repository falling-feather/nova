// 园历、公告栏与“今天的真实情况”。封存（春分）之后发生的事只在这里和资料馆里出现，园园没有读过。
export interface Day {
  n: number;
  date: string;
  week: string;
  weather: string;
  title: string;
}
export const DAYS: Day[] = [
  { n: 1, date: '4月14日', week: '周二', weather: '晴', title: '记忆之书' },
  { n: 2, date: '4月15日', week: '周三', weather: '多云', title: '便签窗口' },
  { n: 3, date: '4月16日', week: '周四', weather: '晴', title: '窗口就这么大' },
  { n: 4, date: '4月17日', week: '周五', weather: '阴', title: '资料馆与传送管' },
  { n: 5, date: '4月18日', week: '周六', weather: '小雨', title: '值班一天' },
];

export interface Notice {
  id: string;
  title: string;
  body: string; // 公告栏上的原文（给人看）
  note: string; // 抄成便签时的写法（园园读过的句式）
  fact: string;
  posted: string;
  from: number;
  to: number;
  late?: boolean; // 第五天午后才贴出来
}
export const NOTICES: Notice[] = [
  {
    id: 'show',
    title: '春季花展改期',
    body: '原定4月18日（周六）的春季花展，因为天气预报说那天有雨，改到4月25日（周六）举行。地点不变，仍在花展广场。',
    note: '【通知】春季花展改到4月25日（周六）举行。',
    fact: 'after.show.date',
    posted: '4月10日',
    from: 1,
    to: 5,
  },
  {
    id: 'pitcher',
    title: '新朋友：瓶子草',
    body: '4月8日，食虫植物家族来了新成员——瓶子草。它暂时住在热带温室入口的新展台，叶子长成细长的喇叭筒。',
    note: '瓶子草在热带温室入口的新展台。',
    fact: 'after.pitcher.where',
    posted: '4月8日',
    from: 1,
    to: 5,
  },
  {
    id: 'boardwalk',
    title: '竹林木栈道开通',
    body: '竹林小径北头新修的木栈道，已经在4月12日开通，欢迎来竹林里走一走。',
    note: '竹林木栈道在竹林小径北头。',
    fact: 'after.boardwalk.where',
    posted: '4月12日',
    from: 1,
    to: 5,
  },
  {
    id: 'summer',
    title: '夏季开放时间',
    body: '从5月1日起，植物园改为傍晚6点关门，早上仍是8点开门。4月份照旧下午5点半关门。',
    note: '从5月1日起，植物园改为傍晚6点关门。',
    fact: 'after.close',
    posted: '4月12日',
    from: 1,
    to: 5,
  },
  {
    id: 'glass',
    title: '今天温室提前关门',
    body: '今天要给瓶子草布置正式展台，热带温室下午3点关门，请大家抓紧时间参观。',
    note: '热带温室下午3点关门。',
    fact: 'after.glass.close',
    posted: '4月15日',
    from: 2,
    to: 2,
  },
  {
    id: 'tour',
    title: '讲解时间调整',
    body: '从4月17日起，下午场的免费讲解提前到下午2点，上午场仍是10点，都在问讯亭门口集合。',
    note: '免费讲解的时间是每天上午10点和下午2点。',
    fact: 'after.tour.time',
    posted: '4月17日',
    from: 4,
    to: 5,
  },
  {
    id: 'aphid',
    title: '月季园暂停开放',
    body: '今天午后在月季园发现了蚜虫，4月18日下午暂停开放，喷药期间请不要靠近。',
    note: '月季园发现了蚜虫，4月18日下午暂停开放，请先去别处参观。',
    fact: 'after.aphid',
    posted: '4月18日',
    from: 5,
    to: 5,
    late: true,
  },
];

/** 封存之后的事从哪天起、到哪天为止是“真的”。不在表里的封存后事实，在课程期间都不算数（例如5月1日起才执行的夏季时间）。 */
export const AFTER_VALID: Record<string, [number, number]> = {
  'after.show.date': [1, 5],
  'after.pitcher.where': [1, 5],
  'after.pitcher.feature': [1, 5],
  'after.boardwalk.where': [1, 5],
  'after.glass.close': [2, 2],
  'after.tour.time': [4, 5],
  'after.aphid': [5, 5],
};
