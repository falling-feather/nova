import { createDefaultConfig, createRun, advanceRun, runToCompletion, stopRun, invokeManualTool, recordStatement, exportArtifact, validateArtifact, validateConfig, STOP_LABELS } from './engine/index.ts';
import type { LearningArtifact, Reflection, Run, RunConfig, ToolCommand, UnitEvidence, WorldState } from './engine/index.ts';
import { SessionStore } from './storage.ts';
import type { ViewPreferences } from './storage.ts';

export const UNIT_SUMMARIES = ['比较文字、实际作用与再次观测', '完成经可靠观测核验的反馈工作流', '保留同条件下的两种决策方式', '发现三类真实停止边界', '在陌生初始状态下实际复验'];
export const initialKey = (world: WorldState) => JSON.stringify({ moisture: world.moisture, temperature: world.temperature, tankMl: world.tankMl, shade: world.shade, vent: world.vent });

function restoreRun(evidence: LearningArtifact['evidence']['runs'][number]): Run {
  const run = createRun(evidence.config);
  run.logs = structuredClone(evidence.logs);
  run.status = evidence.status === 'running' ? 'stopped' : evidence.status;
  run.stopReason = evidence.status === 'running' ? 'user-stop' : evidence.stopReason;
  run.stopMessage = evidence.status === 'running' ? '这是恢复的暂停记录。继续试验会从原配置建立新世界。' : run.stopReason ? STOP_LABELS[run.stopReason] : '';
  const last = run.logs.at(-1);
  if (last) { run.environment.world = { ...last.world }; run.calls = last.calls; run.waterUsedMl = last.waterUsedMl; }
  run.actionCount = run.logs.filter(log => log.kind === 'action').length;
  run.observation = run.logs.filter(log => log.observation).at(-1)?.observation ?? null;
  return run;
}

export class Workbench {
  readonly store: SessionStore;
  config = createDefaultConfig();
  unit = 0;
  history: Run[] = [];
  active: Run | null = null;
  reflection: Reflection = { prediction: '', explanation: '', revision: '' };
  unitRecords: UnitEvidence[] = [];
  scenarioName = '干热上午';
  novelInitial = '';
  bootError = '';
  message = '';
  saved = false;
  ui: ViewPreferences = { welcomeSeen: false, muted: true };
  constructor(store: SessionStore) {
    this.store = store;
    const devicePreferences = store.readViewPreferences(); this.ui = { ...this.ui, ...devicePreferences };
    try {
      const session = store.load(); if (!session) return;
      this.restore(session.artifact); this.unit = session.unit; this.scenarioName = session.scenarioName; this.novelInitial = session.novelInitial;
      if (session.ui) this.ui = { ...this.ui, ...session.ui, ...devicePreferences };
      this.saved = true; this.message = `已恢复 ${this.history.length} 次真实试验与学习位置。`;
    } catch (error) { this.bootError = `原存档未覆盖：${error instanceof Error ? error.message : String(error)} 可先导出原记录，再导入有效作品。`; }
  }
  get runs(): Run[] { return this.active?.logs.length && !this.history.includes(this.active) ? [...this.history, this.active].slice(-8) : this.history; }
  get observed(): boolean[] {
    const runs = this.runs;
    const statement = runs.some(run => {
      const said = run.logs.findIndex(log => log.kind === 'decision' && log.summary.startsWith('文字声明'));
      return said >= 0 && run.logs.some((action, i) => i > said && action.kind === 'action' && action.receipt?.applied && run.logs.some(observed => observed.index > i && observed.observation?.reliable && observed.observation.revision === action.world.revision));
    });
    const workflow = runs.some(run => run.config.mode === 'workflow' && run.status === 'succeeded' && run.observation?.reliable && run.observation.revision === run.environment.world.revision);
    const key = (run: Run) => JSON.stringify({ ...run.config, mode: 'workflow' });
    const comparison = runs.some(run => run.config.mode === 'workflow' && run.status !== 'running' && run.logs.some(log => log.kind === 'observe') && runs.some(other => other.config.mode === 'planner' && other.status !== 'running' && other.logs.some(log => log.kind === 'observe') && key(run) === key(other)));
    const failures = new Set(runs.filter(run => run.stopReason && !['goal-reached', 'user-stop'].includes(run.stopReason)).map(run => run.stopReason)).size >= 3;
    const novel = Boolean(this.novelInitial && runs.some(run => run.status !== 'running' && run.logs.some(log => log.kind === 'observe') && initialKey(run.config.initial) === this.novelInitial));
    return [statement, workflow, comparison, failures, novel];
  }
  get completed(): boolean[] { return this.observed.map((value, i) => value || this.unitRecords.some(record => record.unit === i + 1)); }
  artifact(): LearningArtifact {
    this.observed.forEach((value, i) => {
      if (!value || this.unitRecords.some(record => record.unit === i + 1)) return;
      const candidates = i === 1 ? this.runs.filter(run => run.config.mode === 'workflow' && run.status === 'succeeded') : i === 4 ? this.runs.filter(run => initialKey(run.config.initial) === this.novelInitial) : this.runs;
      const facts = candidates.slice(-3).map(run => `${run.config.mode === 'planner' ? '目标搜索' : '工作流'}；初始 ${run.config.initial.moisture}% / ${run.config.initial.temperature}°C；${run.calls} 次调用 / ${run.waterUsedMl}mL；${run.stopReason ? STOP_LABELS[run.stopReason] : '已保留声明、实际作用与观测'}`);
      if (i === 3) facts.push(`实际停止原因：${[...new Set(this.runs.filter(run => run.stopReason && !['goal-reached', 'user-stop'].includes(run.stopReason)).map(run => STOP_LABELS[run.stopReason!]))].join('、')}`);
      this.unitRecords.push({ unit: i + 1, createdAt: new Date().toISOString(), summary: UNIT_SUMMARIES[i]!, facts });
    });
    return exportArtifact(this.config, this.runs, this.reflection, this.unitRecords);
  }
  persist(): boolean {
    if (this.bootError) return false;
    const errors = validateConfig(this.config);
    if (errors.length) { this.message = `草稿尚未保存：${errors[0]} 上次有效存档保留。`; return false; }
    try { this.store.save({ version: 1, artifact: this.artifact(), unit: this.unit, scenarioName: this.scenarioName, novelInitial: this.novelInitial, ui: { welcomeSeen: this.ui.welcomeSeen } }); this.saved = true; return true; }
    catch (error) { this.message = `保存失败：${error instanceof Error ? error.message : String(error)}。请导出作品保留成果。`; return false; }
  }
  private restore(artifact: LearningArtifact): void {
    this.config = structuredClone(artifact.payload.config); this.reflection = { ...artifact.payload.reflection };
    this.history = artifact.evidence.runs.map(restoreRun); this.active = this.history.at(-1) ?? null;
    this.unitRecords = structuredClone(artifact.evidence.units ?? []);
  }
  archive(): void {
    if (!this.active?.logs.length || this.history.includes(this.active)) return;
    if (this.active.status === 'running') stopRun(this.active, 'user-stop');
    this.history.push(this.active); this.history = this.history.slice(-8);
  }
  change(update: (config: RunConfig) => void): void {
    this.archive(); this.active = null;
    const config = structuredClone(this.config); update(config); this.config = config;
    this.message = '草稿已改变。下次试验使用新世界，旧运行保持原配置。'; this.persist();
  }
  private ensureRun(): Run | null {
    if (this.active?.status === 'running') return this.active;
    const errors = validateConfig(this.config); if (errors.length) { this.message = errors[0]!; return null; }
    this.active = createRun(this.config); return this.active;
  }
  private advanced(): void {
    if (this.active && this.active.status !== 'running') { this.archive(); this.message = this.active.stopMessage; }
    this.persist();
  }
  step(): void { const run = this.ensureRun(); if (run) { advanceRun(run); this.advanced(); } }
  finish(): void { const run = this.ensureRun(); if (run) { while (run.status === 'running') advanceRun(run); this.advanced(); } }
  stop(): void { if (this.active) { stopRun(this.active, 'user-stop'); this.advanced(); } }
  reset(): void { this.archive(); this.active = null; this.message = '准备新试验，过去的失败与成功仍能回看。'; this.persist(); }
  statement(): void { const run = this.ensureRun(); if (run) { recordStatement(run, '已经浇水完成'); this.message = '文字已经留下，水箱和土壤没有改变。亲手试一次，再读取证据。'; this.persist(); } }
  manual(command: ToolCommand): void { const run = this.ensureRun(); if (run) { invokeManualTool(run, command); this.message = run.lastReceipt?.message ?? ''; this.advanced(); } }
  compare(): void {
    this.archive(); const errors = validateConfig(this.config); if (errors.length) { this.message = errors[0]!; return; }
    const a = runToCompletion({ ...structuredClone(this.config), mode: 'workflow' });
    const b = runToCompletion({ ...structuredClone(this.config), mode: 'planner' });
    this.history.push(a, b); this.history = this.history.slice(-8); this.active = b;
    this.message = '已完成同条件对照。两次运行各自保存初始世界、故障、目标和预算。'; this.persist();
  }
  newDay(index: number): void {
    const days: Array<[number, number, number]> = [[35, 36, 80], [15, 28, 60], [60, 35, 80], [45, 25, 30], [20, 33, 40]];
    const day = days[index % days.length]!;
    this.change(config => { config.initial = { moisture: day[0], temperature: day[1], tankMl: day[2], shade: false, vent: false, revision: 0 }; config.faults = { pumpBlocked: false, sensorOffline: false, repeatRequest: false, weatherShift: false }; this.novelInitial = initialKey(config.initial); this.scenarioName = '陌生的一天'; });
    // A new day starts without the faults ticked for earlier trials.
    this.message = '换了一天：初始环境不同，上次勾选的故障已清空。旧运行保持原配置。'; this.persist();
  }
  importArtifact(value: unknown): boolean {
    const checked = validateArtifact(value);
    if (!checked.ok) { this.message = `导入失败，原项目保留：${checked.errors.join(' ')}`; return false; }
    this.archive(); this.restore(checked.artifact); this.bootError = ''; this.novelInitial = ''; this.scenarioName = '导入的环境';
    this.message = '项目包校验通过，已恢复可运行配置与实际证据。'; this.persist(); return true;
  }
}
