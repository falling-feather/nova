import type { Project } from './types.ts';

export function createProject(): Project {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(), title: '有据可查 · 校园信息助手', createdAt: now, updatedAt: now, briefConfirmedAt: null,
    brief: {
      audience: '第一次参加校园共创展的同学与家长',
      scenario: '在校门口用问询台查活动地点、图书馆时间和失物招领。',
      need: '得到当前有效的校园安排，并能找到原通知核对。',
      failureCost: '过期通知可能让访客走错场地；没有资料时不应猜测。',
      success: '能回答常见问题、显示通知来源和日期；无资料或冲突无法判断时转交服务台。',
      boundary: '只回答资料库中的校园安排。无法查询个人信息、实时天气或紧急求助。'
    },
    decision: '',
    draft: {
      name: '校园问询台', welcome: '你好，你想了解哪一项校园安排？', method: 'rules',
      topics: [{ id: 'opening', name: '共创展开幕安排' }, { id: 'library', name: '图书馆开放安排' }, { id: 'lost', name: '失物招领办理' }],
      showSources: false, useLatest: false, conflict: 'first',
      fallback: '现有资料不足，暂时无法确认。请到校门口服务台向值班老师核实。',
      knowledge: [
        { id: 'opening-old', title: '共创展开幕安排（初稿）', topic: 'opening', keywords: ['开幕', '开幕式', '下雨', '雨天'], answer: '共创展开幕式在操场举行，时间为周五 14:00。', source: '教学材料 · 共创展筹备组 / 初稿第1条', date: '2026-10-10', status: 'active' },
        { id: 'opening-new', title: '共创展开幕安排（更新）', topic: 'opening', keywords: ['开幕', '开幕式', '下雨', '雨天'], answer: '由于降雨预报，共创展开幕式改在体育馆举行，时间仍为周五 14:00。', source: '教学材料 · 共创展筹备组 / 更新通知第2条', date: '2026-10-13', status: 'active' },
        { id: 'library', title: '图书馆开放时间', topic: 'library', keywords: ['图书馆', '借书', '还书'], answer: '图书馆周一至周五 08:30—17:30 开放；周末暂不开放。借还书请携带校园卡。', source: '教学材料 · 图书馆 / 开放说明第1条', date: '2026-10-12', status: 'active' },
        { id: 'lost', title: '失物招领办理', topic: 'lost', keywords: ['失物', '丢了', '遗失', '捡到'], answer: '失物招领设在教学楼一层服务台，工作日 09:00—16:00 办理。领取时需描述物品特征。', source: '教学材料 · 校园服务台 / 办事说明第3条', date: '2026-10-11', status: 'active' }
      ]
    }, releases: [], cases: [], runs: [], reflection: ''
  };
}
