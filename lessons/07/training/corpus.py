"""生成《晨风语料》：第七章两个微型模型的训练材料。

全部句子由本脚本按词表和句式组合生成（固定随机种子，可复现），不取自任何已有出版物。
句式有意写入课程要演示的现象：一词多义、指代、语序，以及校庆新闻的写法。

用法：
    D:\\nova-ml\\venv\\Scripts\\python.exe corpus.py
输出（training/corpus/）：
    sentences.txt   单句，用于完形填空模型与分词器
    paragraphs.txt  两到五句连成的段落，用于接龙模型
    eval.jsonl      另一种子生成的检验句，带现象标签，不参与训练
    stats.json      各类句式的数量
"""
import json
import random
from collections import Counter
from pathlib import Path

OUT = Path(__file__).resolve().parent / "corpus"

# ---------------------------------------------------------------- 词表
MALE = ["哥哥", "弟弟", "爸爸", "爷爷", "叔叔", "舅舅", "外公", "伯伯", "小明", "小刚", "小军", "小强", "小亮", "小宇", "男孩", "王伯伯", "张爷爷", "表哥"]
FEMALE = ["姐姐", "妹妹", "妈妈", "奶奶", "阿姨", "舅妈", "外婆", "姑姑", "小红", "小丽", "小芳", "小敏", "小雪", "小婷", "女孩", "李奶奶", "刘阿姨", "表姐"]
PEOPLE = MALE + FEMALE + ["老师", "班长", "邻居", "我", "王老师", "李老师", "同桌", "校长", "我们", "小朋友"]
PRONOUN = {**{p: "他" for p in MALE}, **{p: "她" for p in FEMALE}}

FRUITS = {  # 量词, 能否削皮, 树上结
    "苹果": ("个", True, True), "香蕉": ("根", False, False), "梨": ("个", True, True),
    "橘子": ("个", False, True), "西瓜": ("块", False, False), "葡萄": ("串", False, False),
    "草莓": ("颗", False, False), "桃子": ("个", True, True),
}
FRUIT_TASTE = ["甜", "脆", "香", "新鲜", "多汁", "大", "红", "软"]
DEVICES = {"手机": "部", "平板": "台", "电脑": "台", "耳机": "副", "相机": "台", "手表": "块"}
SCREEN = {"手机", "平板", "电脑", "手表", "苹果"}
PHOTO = {"手机", "平板", "相机", "苹果"}
VIDEO = {"手机", "平板", "电脑", "苹果"}
WEAR = {"耳机", "手表"}
ANIMALS = {
    "小猫": ("只", ["在院子里跑来跑去", "爬到了树上", "在沙发上睡觉", "喵喵地叫", "追着毛线球玩"], "小鱼干"),
    "小狗": ("只", ["摇着尾巴跑过来", "在门口汪汪叫", "在草地上打滚", "叼着皮球跑", "跟在主人身后"], "骨头"),
    "兔子": ("只", ["在草地上蹦蹦跳跳", "竖起了长耳朵", "躲进了窝里", "啃着胡萝卜", "动了动鼻子"], "胡萝卜"),
    "小鸟": ("只", ["在树枝上唱歌", "飞到了屋顶上", "在窗台上跳来跳去", "张开翅膀飞走了", "在屋檐下筑巢"], "小米"),
    "熊猫": ("只", ["抱着竹子啃", "慢慢地爬上了树", "在地上打滚", "躺着晒太阳", "抱着球玩"], "竹子"),
    "金鱼": ("条", ["在鱼缸里游来游去", "吐出一串泡泡", "躲到了水草后面", "摆着尾巴游"], "鱼食"),
    "小鸭": ("只", ["在池塘里游", "嘎嘎地叫", "摇摇摆摆地走", "跟着妈妈下水"], "青菜叶"),
    "松鼠": ("只", ["抱着松果跑", "跳到了另一棵树上", "把松果藏起来", "竖着大尾巴"], "松果"),
    "乌龟": ("只", ["慢慢地往前爬", "把头缩进壳里", "趴在石头上晒太阳", "在水里划水"], "小虾"),
    "鹦鹉": ("只", ["学着大人说话", "在笼子里跳", "梳理自己的羽毛", "叫着你好"], "瓜子"),
}
FOODS = {"面包": "个", "米饭": "碗", "牛奶": "杯", "饺子": "盘", "面条": "碗", "鸡蛋": "个", "蛋糕": "块", "包子": "个"}
BALLS = ["篮球", "乒乓球", "羽毛球", "排球"]
VEHICLES = {"自行车": "骑", "公交车": "坐", "地铁": "坐", "汽车": "坐", "火车": "坐", "轮船": "坐", "飞机": "坐"}
SCHOOL_THINGS = ["课本", "铅笔", "作业本", "文具盒", "尺子", "橡皮", "书包", "笔记本"]
FLOWERS = ["桃花", "梨花", "杏花", "迎春花", "樱花", "油菜花", "荷花", "菊花"]
PLACES = ["公园", "超市", "学校", "家里", "操场", "图书馆", "动物园", "广场", "食堂", "礼堂", "教室", "河边"]
TIMES = ["早上", "中午", "下午", "晚上", "周末", "放学后", "星期天", "今天", "昨天", "上午", "傍晚"]
LEND = {"伞": "把", "铅笔": "支", "尺子": "把", "橡皮": "块", "课本": "本", "笔记本": "本", "水杯": "个"}
NUM = ["一", "两", "三", "四", "五", "六", "七", "八", "九", "十"]


def cn(n):
    """1–99 的中文数字。"""
    digits = "零一二三四五六七八九"
    tens, ones = divmod(n, 10)
    if n < 10:
        return digits[n]
    return ("" if tens == 1 else digits[tens]) + "十" + ("" if ones == 0 else digits[ones])


class Gen:
    def __init__(self, seed):
        self.r = random.Random(seed)

    def c(self, seq):
        return self.r.choice(list(seq))

    def person(self):
        return self.c(PEOPLE)

    def gendered_pair(self):
        a, b = self.c(MALE), self.c(FEMALE)
        return (a, b) if self.r.random() < 0.5 else (b, a)

    # ------------------------------------------------------- 水果（含“苹果”的水果义）
    def fruit(self, word=None):
        f = word or self.c(FRUITS)
        mw, peel, tree = FRUITS[f]
        p, q = self.person(), self.person()
        forms = [
            lambda: f"这{mw}{f}又{self.c(FRUIT_TASTE)}又{self.c(FRUIT_TASTE)}。",
            lambda: f"{p}在{self.c(['超市', '水果店', '菜市场'])}买了{self.c(NUM[1:5])}斤{f}。",
            lambda: f"妈妈把{f}洗干净，切成了小块。",
            lambda: f"{p}最喜欢吃{f}和{self.c([x for x in FRUITS if x != f])}。",
            lambda: f"{p}给{q}带了一袋{f}。",
            lambda: f"桌上的果盘里放着{f}。",
            lambda: f"{f}放久了就不新鲜了。",
            lambda: f"{p}吃了一{mw}{f}，觉得很{self.c(['甜', '酸', '好吃', '解渴'])}。",
            lambda: f"{p}把一{mw}{f}分给了{q}。",
            lambda: f"超市里的{f}今天打折。",
            lambda: f"{f}里有很多水分。",
        ]
        if peel:
            forms += [lambda: f"{p}削了一个{f}。", lambda: f"{p}把{f}的皮削掉了。", lambda: f"这个{f}削了皮再吃。",
                      lambda: f"{p}用小刀削{f}皮。"]
        if tree:
            forms += [lambda: f"果园里的{f}熟了。", lambda: f"树上结满了{f}。", lambda: f"秋天，{f}树上挂满了果子。",
                      lambda: f"{p}在果园里摘{f}。"]
        return self.c(forms)(), "fruit"

    # ------------------------------------------------------- 电子产品（含“苹果”的手机义）
    def device(self, word=None):
        d = word or self.c(list(DEVICES) + ["苹果"])
        mw = DEVICES.get(d, "部")
        p, q = self.person(), self.person()
        forms = [
            lambda: f"我的{d}没电了，得赶快充电。",
            lambda: f"{d}开不了机了，只好拿去修。",
            lambda: f"新出的{d}很贵。",
            lambda: f"{p}给{d}换了一块新电池。",
            lambda: f"{p}把{d}忘在了{self.c(PLACES)}。",
            lambda: f"{p}买了一{mw}{d}。",
            lambda: f"{d}的电池用了一年就不耐用了。",
            lambda: f"{p}把{d}借给了{q}。",
        ]
        if d in SCREEN:
            forms += [lambda: f"{p}的{d}屏幕摔裂了。", lambda: f"{d}的屏幕很清楚。",
                      lambda: f"{p}不小心把{d}的屏幕摔碎了。", lambda: f"{d}的屏幕上有一道划痕。"]
        if d in PHOTO:
            forms += [lambda: f"{p}用{d}拍了一张照片。", lambda: f"{p}用{d}给{q}拍照。"]
        if d in VIDEO:
            forms += [lambda: f"{p}在{d}上看了一部电影。", lambda: f"{p}在{d}上装了一个新软件。"]
        if d in WEAR:
            forms += [lambda: f"{p}戴着{d}去跑步。", lambda: f"{p}的{d}是新买的。"]
        if d in ("手机", "苹果"):
            forms += [lambda: f"{p}用{d}给{q}打了一个电话。"]
        if d == "苹果":
            forms += [lambda: f"{p}买了一部苹果手机。", lambda: "苹果新出的手机很贵。", lambda: f"{p}的苹果手机没电了。"]
        return self.c(forms)(), "device"

    # ------------------------------------------------------- 动物（含“它”）
    def animal(self):
        a = self.c(ANIMALS)
        mw, acts, food = ANIMALS[a]
        p = self.person()
        forms = [
            lambda: f"{p}家养了一{mw}{a}。",
            lambda: f"{a}{self.c(acts)}。",
            lambda: f"动物园里的{a}很可爱。",
            lambda: f"{p}给{a}喂了一些{food}。",
            lambda: f"{p}养了一{mw}{a}，它每天都{self.c(acts)}。",
            lambda: f"那{mw}{a}{self.c(acts)}，它看起来很开心。",
            lambda: f"{p}在{self.c(['公园', '动物园', '河边', '院子里'])}看见了一{mw}{a}。",
            lambda: f"{a}最爱吃{food}。",
            lambda: f"{p}画了一{mw}{a}。",
        ]
        return self.c(forms)(), "animal"

    # ------------------------------------------------------- 天气
    def weather(self):
        p = self.person()
        forms = [
            lambda: f"今天是晴天，{p}去{self.c(['公园', '操场', '河边'])}散步。",
            lambda: f"今天是雨天，{p}待在家里看书。",
            lambda: f"外面下雨了，{p}赶紧关上了窗户。",
            lambda: f"外面下雪了，{p}穿上了厚外套。",
            lambda: "外面刮风了，树叶沙沙作响。",
            lambda: f"天上打雷了，{p}吓了一跳。",
            lambda: "雨停了，天上出现了一道彩虹。",
            lambda: "天上飘来一片乌云，看样子要下雨了。",
            lambda: "早上起了大雾，路上看不清楚。",
            lambda: f"天气预报说明天会{self.c(['下雪', '下雨', '刮风', '降温'])}。",
            lambda: "天气预报说明天是晴天。",
            lambda: "刮了一整天的风，晚上终于停了。",
            lambda: f"下雪了，{p}在院子里堆雪人。",
            lambda: "太阳出来了，地上的水慢慢干了。",
        ]
        return self.c(forms)(), "weather"

    # ------------------------------------------------------- 学校
    def school(self):
        p = self.person()
        t = self.c(SCHOOL_THINGS)
        forms = [
            lambda: f"{p}在教室里写作业。",
            lambda: "老师在黑板上写字。",
            lambda: f"明天要考试，{p}在认真复习。",
            lambda: "图书馆里很安静，大家都在看书。",
            lambda: f"{p}把{t}放进了书包。",
            lambda: "下课了，同学们跑到操场上玩。",
            lambda: f"{p}的{t}找不到了。",
            lambda: f"老师表扬了{p}的作业。",
            lambda: f"{p}去图书馆借了一本书。",
            lambda: f"考试结束了，{p}松了一口气。",
            lambda: f"{p}在操场上做早操。",
            lambda: f"{p}举手回答了老师的问题。",
        ]
        return self.c(forms)(), "school"

    # ------------------------------------------------------- 交通（含“开车”）
    def vehicle(self):
        v = self.c(VEHICLES)
        p = self.person()
        forms = [
            lambda: f"{p}每天{VEHICLES[v]}{v}上学。",
            lambda: f"{p}{VEHICLES[v]}{v}去了{self.c(['公园', '超市', '动物园', '外婆家', '图书馆'])}。",
            lambda: "爸爸开车送我上学。",
            lambda: "妈妈开车去超市买东西。",
            lambda: "飞机在天上飞。",
            lambda: f"{p}在站台上等{self.c(['公交车', '地铁', '火车'])}。",
            lambda: f"{self.c(['火车', '汽车', '轮船', '公交车'])}开得很快。",
            lambda: f"{p}的自行车骑得很快。",
        ]
        return self.c(forms)(), "vehicle"

    # ------------------------------------------------------- 食物
    def food(self):
        f = self.c(FOODS)
        p = self.person()
        forms = [
            lambda: f"早饭{p}吃了一{FOODS[f]}{f}。",
            lambda: f"妈妈做的{f}真好吃。",
            lambda: f"食堂今天有{f}。",
            lambda: f"{p}过生日，大家一起吃蛋糕。",
            lambda: f"{p}把{f}吃得干干净净。",
            lambda: f"{p}喝了一杯牛奶，吃了一个{self.c(['面包', '鸡蛋', '包子'])}。",
            lambda: f"{p}学会了包饺子。",
        ]
        return self.c(forms)(), "food"

    # ------------------------------------------------------- 运动
    def sport(self):
        p = self.person()
        forms = [
            lambda: f"{p}放学后去操场打{self.c(BALLS)}。",
            lambda: f"{p}的{self.c(BALLS)}打得很好。",
            lambda: f"{p}和同学在操场上踢足球。",
            lambda: f"{p}每天早上都去跑步。",
            lambda: f"{p}在游泳池里学游泳。",
            lambda: f"{p}一分钟能跳一百多下绳。",
            lambda: f"运动会上，{p}参加了跑步比赛。",
        ]
        return self.c(forms)(), "sport"

    # ------------------------------------------------------- “打”的几种意思
    def da(self):
        p, q = self.person(), self.person()
        forms = [
            (lambda: f"{p}放学后去操场打{self.c(BALLS)}。", "da-ball"),
            (lambda: f"{p}的{self.c(BALLS)}打得很好。", "da-ball"),
            (lambda: f"{p}给{q}打了一个电话。", "da-phone"),
            (lambda: f"{p}正在打电话，没有听见。", "da-phone"),
            (lambda: f"下雨了，{p}打着伞回家。", "da-umbrella"),
            (lambda: f"外面下着雨，{p}打开伞走了出去。", "da-umbrella"),
            (lambda: f"{p}去河边打了一桶水。", "da-water"),
            (lambda: f"{p}在电脑上打字。", "da-type"),
        ]
        make, tag = self.c(forms)
        return make(), tag

    # ------------------------------------------------------- “开”的几种意思
    def kai(self):
        p = self.person()
        forms = [
            (lambda: f"{p}打开了教室的门。", "kai-door"),
            (lambda: f"{p}开门让客人进来。", "kai-door"),
            (lambda: f"春天到了，{self.c(FLOWERS)}开了。", "kai-flower"),
            (lambda: f"{self.c(FLOWERS)}开得正好。", "kai-flower"),
            (lambda: "老师们在会议室开会。", "kai-meeting"),
            (lambda: "班长召集大家开了一个班会。", "kai-meeting"),
            (lambda: f"天黑了，{p}开了灯。", "kai-light"),
            (lambda: f"{p}开了空调，屋里凉快多了。", "kai-light"),
        ]
        make, tag = self.c(forms)
        return make(), tag

    # ------------------------------------------------------- “花”的两种意思
    def hua(self):
        p = self.person()
        forms = [
            (lambda: "公园里的花开得正好。", "hua-flower"),
            (lambda: f"{p}在阳台上种了几盆花。", "hua-flower"),
            (lambda: "蜜蜂在花丛里飞来飞去。", "hua-flower"),
            (lambda: f"{p}花了{cn(self.r.randint(5, 60))}元买了一本书。", "hua-money"),
            (lambda: "买东西不要乱花钱。", "hua-money"),
            (lambda: f"{p}把零花钱存了起来。", "hua-money"),
        ]
        make, tag = self.c(forms)
        return make(), tag

    # ------------------------------------------------------- 指代：他、她（性别线索）
    def pronoun(self):
        r = self.r.random()
        if r < 0.35:  # 一个人：代词跟着这个人
            p = self.c(MALE + FEMALE)
            ach = self.c(["考了一百分", "学会了游泳", "交到了新朋友", "得到了老师的表扬", "找到了丢失的钥匙", "赢了跳绳比赛", "画了一幅好看的画"])
            return f"{p}今天很开心，因为{PRONOUN[p]}{ach}。", "pron-single"
        a, b = self.gendered_pair()
        if r < 0.6:  # 借东西：没带的是接受者，多带的是借出的人
            obj = self.c(LEND)
            if self.r.random() < 0.5:
                return f"{a}把{obj}借给了{b}，因为{PRONOUN[b]}忘了带{obj}。", "pron-receiver"
            return f"{a}把{obj}借给了{b}，因为{PRONOUN[a]}多带了一{LEND[obj]}。", "pron-giver"
        if r < 0.8:  # 讲故事：讲的人与听的人
            if self.r.random() < 0.5:
                return f"{a}给{b}讲故事，{PRONOUN[b]}听得很认真。", "pron-listener"
            return f"{a}给{b}讲故事，{PRONOUN[a]}讲得很生动。", "pron-speaker"
        if self.r.random() < 0.5:  # 帮忙：请人帮忙的人搬不动
            return f"{a}请{b}帮忙，因为{PRONOUN[a]}搬不动箱子。", "pron-asker"
        return f"{a}帮{b}搬箱子，{PRONOUN[b]}说了声谢谢。", "pron-helped"

    # ------------------------------------------------------- 语序：谁追谁、谁送谁
    def order(self):
        chase = ["小猫", "小狗", "老鼠", "小鸡", "松鼠", "兔子"]
        if self.r.random() < 0.5:
            x, y = self.r.sample(chase, 2)
            esc = self.c(["吓得躲了起来", "吓得爬上了树", "赶紧跑开了", "吓得钻进了洞里"])
            return f"{x}追着{y}跑，{y}{esc}。", "order-chase"
        a, b = self.r.sample(MALE + FEMALE, 2)
        gift = self.c(["一本书", "一支笔", "一张贺卡", "一盒彩笔", "一个书签"])
        return f"{a}送给{b}{gift}，{b}高兴地说了声谢谢。", "order-gift"

    # ------------------------------------------------------- 日常
    def daily(self):
        p = self.person()
        place = self.c(PLACES)
        act = {
            "公园": ["散步", "放风筝", "看花", "跑步"], "超市": ["买东西", "买水果", "买牛奶"],
            "学校": ["上课", "写作业", "参加活动"], "家里": ["看书", "画画", "做作业", "帮妈妈做饭"],
            "操场": ["跑步", "踢足球", "跳绳", "打篮球"], "图书馆": ["看书", "借书", "写作业"],
            "动物园": ["看熊猫", "看猴子", "喂小鸭"], "广场": ["放风筝", "跳舞", "散步"],
            "食堂": ["吃午饭", "排队打饭"], "礼堂": ["看演出", "排练节目"], "教室": ["读书", "画黑板报", "打扫卫生"],
            "河边": ["钓鱼", "散步", "捡石头"],
        }[place]
        return f"{self.c(TIMES)}，{p}在{place}{self.c(act)}。", "daily"

    # ------------------------------------------------------- 校园新闻
    def news_facts(self):
        group, program = self.c([
            ("合唱团", "歌曲《晨风》"), ("合唱团", "合唱《我和我的祖国》"), ("舞蹈队", "舞蹈《春天来了》"),
            ("鼓号队", "鼓乐《欢庆》"), ("戏剧社", "话剧《小英雄》"), ("民乐团", "民乐《茉莉花》"), ("朗诵队", "诗朗诵《少年》"),
        ])
        event, event_venue = self.c([
            ("运动会", "操场"), ("运动会", "体育馆"), ("读书节", "图书馆"), ("科技节", "体育馆"), ("书法比赛", "报告厅"),
            ("朗诵比赛", "礼堂"), ("植树活动", "后山"), ("歌咏比赛", "礼堂"),
        ])
        return {
            "school": self.c(["晨风中学"] * 4 + ["明德中学", "春晖小学", "实验中学"]),
            "n": cn(self.r.randint(10, 80)),
            "day": self.c(["周一", "周二", "周三", "周四", "周五", "周六", "周日"]),
            "month": cn(self.r.randint(1, 12)),
            "date": cn(self.r.randint(1, 30)),
            "group": group, "program": program, "event": event, "event_venue": event_venue,
            "venue": self.c(["礼堂", "操场", "体育馆", "大厅", "报告厅"]),
            "grade": self.c(["初一", "初二", "初三", "六年级", "五年级"]),
            "cls": self.c(["一", "二", "三", "四", "五", "六"]),
            "award": self.c(["一等奖", "二等奖", "冠军", "优秀奖", "最佳表演奖"]),
            "num": cn(self.r.randint(20, 99)),
            "person": self.c(["校长", "李老师", "王老师", "班长", "学生代表"]),
            "quote": self.c(["希望同学们好好学习", "感谢老师们的辛勤付出", "祝学校越办越好", "大家要互相帮助", "今天是难忘的一天"]),
        }

    def news_sentence(self, f, kind):
        return {
            "open": f"本{f['day']}，{f['school']}举行了第{f['n']}届校庆。",
            "date": f"{f['month']}月{f['date']}日，{f['school']}迎来了{f['n']}岁生日。",
            "show": f"校庆当天，{f['group']}在{f['venue']}表演了{f['program']}。",
            "speech": f"{f['person']}在{f['venue']}讲话，说{f['quote']}。",
            "event": f"{f['event']}在{f['event_venue']}举行，共有{f['num']}名同学参加。",
            "award": f"最后，{f['grade']}（{f['cls']}）班获得了{f['award']}。",
            "photo": f"活动结束后，大家在{f['venue']}门口合影留念。",
            "guest": "许多老校友也回到学校，参加了这次活动。",
            "weather": f"那天{self.c(['天气晴朗', '下着小雨', '秋高气爽', '阳光明媚'])}，校园里非常热闹。",
        }[kind]

    def news_paragraph(self):
        f = self.news_facts()
        order = [self.c(["open", "date"]), self.c(["show", "event", "weather"])]
        order += self.r.sample(["show", "speech", "event", "award", "guest", "photo"], self.r.randint(1, 3))
        seen, sents = set(), []
        for k in order:
            if k not in seen:
                seen.add(k)
                sents.append(self.news_sentence(f, k))
        return "".join(sents)


WEIGHTS = {  # 每类句式在单句语料中的占比
    "fruit": 11, "device": 10, "animal": 9, "weather": 6, "school": 7, "vehicle": 4, "food": 5, "sport": 4,
    "da": 6, "kai": 6, "hua": 4, "pronoun": 14, "order": 6, "daily": 5, "news": 4,
}
PREFIXABLE = {"fruit", "device", "school", "food", "sport", "da", "hua", "animal"}


def sentence(g, kind=None):
    kind = kind or g.r.choices(list(WEIGHTS), weights=list(WEIGHTS.values()))[0]
    if kind == "news":
        f = g.news_facts()
        return g.news_sentence(f, g.c(["open", "date", "show", "speech", "event", "award", "photo", "guest", "weather"])), "news"
    s, tag = getattr(g, kind)()
    if kind in PREFIXABLE and g.r.random() < 0.22 and not s.startswith(tuple(TIMES)):
        s = f"{g.c(TIMES)}，{s}"
    return s, tag


def main():
    OUT.mkdir(exist_ok=True)
    g = Gen(20261011)
    sentences, tags = [], Counter()
    for _ in range(160_000):
        s, t = sentence(g)
        sentences.append(s)
        tags[t] += 1
    # 段落：同一话题的两三句连写，新闻按完整段落写，供接龙模型学习前后连贯
    paragraphs = [g.news_paragraph() for _ in range(30_000)]
    topics = [k for k in WEIGHTS if k != "news"]
    for _ in range(50_000):
        kind = g.c(topics)
        paragraphs.append("".join(sentence(g, kind)[0] for _ in range(g.r.randint(2, 3))))
    g.r.shuffle(paragraphs)

    (OUT / "sentences.txt").write_text("\n".join(sentences) + "\n", encoding="utf-8")
    (OUT / "paragraphs.txt").write_text("\n".join(paragraphs) + "\n", encoding="utf-8")

    # 检验句：换一个种子生成，不进入训练；记录是否恰好与训练句重合
    e = Gen(77)
    rows = []
    for fn, n in [("pronoun", 600), ("order", 300), ("da", 200), ("kai", 200), ("hua", 120)]:
        for _ in range(n):
            s, t = getattr(e, fn)()
            rows.append({"text": s, "tag": t})
    for _ in range(200):
        rows.append({"text": e.fruit("苹果")[0], "tag": "apple-fruit"})
        rows.append({"text": e.device("苹果")[0], "tag": "apple-device"})
    train_set = set(sentences)
    for row in rows:
        row["seen"] = row["text"] in train_set
    with (OUT / "eval.jsonl").open("w", encoding="utf-8") as fh:
        for row in rows:
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")

    chars = Counter("".join(sentences) + "".join(paragraphs))
    stats = {
        "sentences": len(sentences), "unique_sentences": len(set(sentences)), "paragraphs": len(paragraphs),
        "characters": sum(chars.values()), "distinct_characters": len(chars), "tags": dict(tags.most_common()),
        "eval_rows": len(rows), "eval_seen_in_training": sum(r["seen"] for r in rows),
    }
    (OUT / "stats.json").write_text(json.dumps(stats, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in stats.items() if k != "tags"}, ensure_ascii=False))


if __name__ == "__main__":
    main()
