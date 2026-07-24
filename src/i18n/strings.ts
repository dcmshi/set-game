import type { Lang } from './detectLang';

const en = {
  'start.tagline': 'Clear the deck. Beat the clock.',
  'start.rule1': 'Find 3 cards where each feature is all-same or all-different.',
  'start.rule2': 'Wrong pick: +5s. Hint: +15s.',
  'start.rule3': 'Empty the whole deck as fast as you can.',
  'start.best': 'Best time {time}',
  'start.startBtn': 'Start',
  'start.howToPlayBtn': 'How to Play',

  'howto.title': 'How to Play',
  'howto.intro':
    'A Set is 3 cards where, for each of the four features, the values are either all the same or all different.',
  'howto.featuresTitle': 'The four features',
  'howto.feature.count': 'Count',
  'howto.feature.color': 'Color',
  'howto.feature.shape': 'Shape',
  'howto.feature.shading': 'Shading',
  'howto.validTitle': 'This is a Set ✓',
  'howto.validWhy':
    'Every feature is all-different — counts 1·2·3, three colors, three shapes, three shadings.',
  'howto.invalidTitle': 'Not a Set ✗',
  'howto.invalidAWhy':
    'Colors are red, red, purple — two the same and one different. Each feature must be all-same or all-different.',
  'howto.invalidBWhy':
    'Shadings are solid, solid, striped — neither all-same nor all-different.',
  'howto.close': 'Got it',
  'howto.closeAria': 'Close',

  'hud.deck': 'Deck',
  'hud.mistakes': 'Mistakes',
  'hud.hint': 'Hint (+15s)',

  'topbar.howToAria': 'How to play',
  'lang.groupAria': 'Language',

  'timer.aria': 'elapsed time',

  'win.eyebrow': 'Deck cleared',
  'win.title': 'Nice run!',
  'win.record': 'New record! 🎉',
  'win.best': 'Best time {time}',
  'win.playAgain': 'Play Again',
  'win.dialogLabel': 'You won',

  'feedback.won': 'Deck cleared! Final time {time}.',
  'feedback.setFound': 'Set found!',
  'feedback.notSet': 'Not a Set. Five second penalty.',
  'feedback.hint': 'Hint shown.',

  'color.red': 'red',
  'color.green': 'green',
  'color.purple': 'purple',
  'shape.diamond': 'diamond',
  'shape.squiggle': 'squiggle',
  'shape.oval': 'oval',
  'shading.solid': 'solid',
  'shading.striped': 'striped',
  'shading.open': 'open',
} as const;

export type StringKey = keyof typeof en;

const zh: Record<StringKey, string> = {
  'start.tagline': '清空牌堆，挑战最快速度。',
  'start.rule1': '找出 3 张卡片，使每种特征都完全相同或完全不同。',
  'start.rule2': '选错：+5秒。提示：+15秒。',
  'start.rule3': '尽快清空整个牌堆。',
  'start.best': '最佳时间 {time}',
  'start.startBtn': '开始',
  'start.howToPlayBtn': '玩法说明',

  'howto.title': '玩法说明',
  'howto.intro':
    '一组「Set」由 3 张卡片组成：四种特征中的每一种，都必须完全相同或完全不同。',
  'howto.featuresTitle': '四种特征',
  'howto.feature.count': '数量',
  'howto.feature.color': '颜色',
  'howto.feature.shape': '形状',
  'howto.feature.shading': '填充',
  'howto.validTitle': '这是一组 Set ✓',
  'howto.validWhy':
    '每种特征都完全不同——数量 1·2·3、三种颜色、三种形状、三种填充。',
  'howto.invalidTitle': '不是一组 Set ✗',
  'howto.invalidAWhy':
    '颜色是红、红、紫——两张相同、一张不同。每种特征都必须完全相同或完全不同。',
  'howto.invalidBWhy':
    '填充是实心、实心、条纹——既不完全相同也不完全不同。',
  'howto.close': '明白了',
  'howto.closeAria': '关闭',

  'hud.deck': '牌堆',
  'hud.mistakes': '错误',
  'hud.hint': '提示 (+15秒)',

  'topbar.howToAria': '玩法说明',
  'lang.groupAria': '语言',

  'timer.aria': '已用时间',

  'win.eyebrow': '牌堆已清空',
  'win.title': '干得漂亮！',
  'win.record': '新纪录！🎉',
  'win.best': '最佳时间 {time}',
  'win.playAgain': '再玩一次',
  'win.dialogLabel': '你赢了',

  'feedback.won': '牌堆已清空！最终用时 {time}。',
  'feedback.setFound': '找到一组 Set！',
  'feedback.notSet': '不是一组 Set，加罚五秒。',
  'feedback.hint': '已显示提示。',

  'color.red': '红色',
  'color.green': '绿色',
  'color.purple': '紫色',
  'shape.diamond': '菱形',
  'shape.squiggle': '波浪形',
  'shape.oval': '椭圆形',
  'shading.solid': '实心',
  'shading.striped': '条纹',
  'shading.open': '空心',
};

export const strings: Record<Lang, Record<StringKey, string>> = { en, zh };
