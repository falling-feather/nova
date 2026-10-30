// 植物园人物的姓名与身份；正式立绘由 art.ts 按同一编号加载。
export interface Person {
  name: string;
  role: string;
}
export const CAST = {
  director: { name: '许园长', role: '四季植物园园长' },
  chen: { name: '陈师傅', role: '温室管理员' },
  zhou: { name: '小周', role: '讲解员' },
  zhao: { name: '赵奶奶', role: '爱养月季的老人' },
  he: { name: '小禾', role: '来研学的小学生' },
  feng: { name: '阿峰', role: '摄影爱好者' },
  lin: { name: '林姐姐', role: '外地来的背包客' },
  susu: { name: '苏苏', role: '园艺社的中学生' },
  doudou: { name: '豆豆', role: '爱捣蛋的小朋友' },
  li: { name: '李阿姨', role: '带孙子散步的老人' },
  wang: { name: '王叔叔', role: '推婴儿车的爸爸' },
  guest: { name: '游客', role: '来逛植物园的人' },
} satisfies Record<string, Person>;
export type CastId = keyof typeof CAST;
