import { useState, useEffect, useMemo } from 'react'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { pl } from 'date-fns/locale'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Transaction, type Category } from '../db/database'
import { useSettings } from '../hooks/useSettings'
import { formatCurrency } from '../utils/calculations'
import { Icon } from './ui/Icon'
import { GROUP_COLORS } from '../utils/colors'

const SETTING_KEY = 'lastMonthlyAuditSeen'

// ─── Helpers ────────────────────────────────────────────────────────────

function getPreviousMonth() {
  const prev = subMonths(new Date(), 1)
  return {
    key: format(prev, 'yyyy-MM'),
    label: format(prev, 'LLLL yyyy', { locale: pl }),
    start: format(startOfMonth(prev), 'yyyy-MM-dd'),
    end: format(endOfMonth(prev), 'yyyy-MM-dd'),
  }
}

function pick<T>(items: T[], seed: number): T {
  return items[Math.abs(seed) % items.length]
}
// Polish plural form for "transakcja"
function pluralizeTransakcje(n: number): string {
  if (n === 1) return 'transakcja'
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return 'transakcje'
  return 'transakcji'
}
function hashSeed(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}

interface AuditData {
  totalBudget: number
  totalSpent: number
  totalIncome: number
  budgetPct: number
  overBudget: boolean
  remaining: number
  topExpenses: { description: string; amount: number; category: string }[]
  topCategories: { name: string; group: string; total: number }[]
  biggestUnnecessary: { description: string; amount: number; category: string } | null
}

// ─── Spending habit detection ───────────────────────────────────────────

interface SpendingHabit {
  id: string
  label: string
  icon: string
  color: string        // tailwind text color
  bgColor: string      // tailwind bg color
  borderColor: string  // tailwind border color
  total: number
  count: number
  commentary: string[]  // seeded pick
}

interface HabitPattern {
  id: string
  label: string
  icon: string
  color: string
  bgColor: string
  borderColor: string
  /** Match against lowercase description */
  keywords: string[]
  /** Match against category name (exact, case-insensitive) */
  categoryNames: string[]
  commentary: string[]
}

const HABIT_PATTERNS: HabitPattern[] = [
  {
    id: 'delivery',
    label: 'Jedzenie z dostawą',
    icon: 'Car',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-800/40',
    keywords: ['ubereats', 'uber eats', 'doordash', 'door dash', 'postmates', 'deliveroo', 'grubhub', 'seamless', 'instacart', 'gopuff', 'caviar', 'food delivery', 'just eat', 'menulog', 'skip the dishes', 'favor delivery', 'pyszne', 'pyszne.pl', 'glovo', 'wolt', 'bolt food'],
    categoryNames: [],
    commentary: [
      'Aplikacje z dostawą to cichy zabójca budżetu. Opłaty, napiwki i narzuty sprawiają, że płacisz 2-3 razy więcej, niż gdybyś ugotował to sam.',
      'Każde zamówienie ma ukryty podatek: opłata serwisowa, opłata za dostawę, napiwek i zawyżone ceny z menu. To się szybko sumuje.',
      'Wygoda ma swoją cenę. Te same dania ugotowane w domu zostawiłyby Ci w kieszeni sporą część tej kwoty.',
      'Aplikacje są zaprojektowane tak, żeby zamawianie było łatwe — ale łatwe wydawanie to drogie wydawanie. Spróbuj gotować z wyprzedzeniem.',
      'Pomyśl: opłata za dostawę + napiwek + narzut = jakieś 40% więcej do każdego zamówienia. To pieniądze wyrzucone w błoto.',
      'Twoje przyszłe „ja” wolałoby mieć te pieniądze zainwestowane. Garnek i wolnowar zastąpią większość tych zamówień.',
      'Dostawa to dzisiejszy odpowiednik palenia pieniędzy dla wygody. Ugotuj raz w niedzielę i jedz jak król przez cały tydzień.',
      'Średnie zamówienie z dostawą kosztuje 60-90 zł, gdy doliczysz wszystko. Wersja domowa? 12-20 zł. Policz to sobie.',
    ],
  },
  {
    id: 'coffee',
    label: 'Kawa i kawiarnie',
    icon: 'UtensilsCrossed',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-800/40',
    keywords: ['starbucks', 'dunkin', 'coffee', 'cafe', 'kawa', 'kawiarnia', 'latte', 'espresso', 'cappuccino', 'frappuccino', 'dutch bros', 'peets', 'peet\'s', 'tim hortons', 'caribou coffee', 'blue bottle', 'philz', 'costa', 'green caffe'],
    categoryNames: [],
    commentary: [
      'Codzienna kawa na mieście to klasyczny przeciek w budżecie. Przy 15-22 zł za kubek to 450-660 zł miesięcznie, które mógłbyś inwestować.',
      'Nikt nie zabrania kofeiny — ale paczka dobrych ziaren kosztuje 50 zł i starcza na 30+ filiżanek. Porównaj to z tym, co tu wydałeś.',
      '„Efekt latte” jest prawdziwy. Każdy zakup wydaje się drobny, ale w skali roku zbiera się z tego poważna kwota.',
      'Parzenie kawy w domu przez cały miesiąc kosztuje tyle, co 3 wizyty w kawiarni. Tak tylko mówię.',
      'Twój nawyk kawowy kosztuje więcej niż niejedna rata. Kafetiera czy french press zwracają się w tydzień.',
      'Gdybyś te pieniądze na kawę zainwestował, po 10 latach miałbyś już na coś, co naprawdę ma znaczenie.',
      'Nie mówię, żeby rzucać kawę — mówię, żeby przestać za nią przepłacać. Domowa smakuje tak samo dobrze, gdy znajdziesz swój sposób.',
      'Każde wyjście do kawiarni to 15 zł i więcej. Pomnóż to przez dni w miesiącu, a zobaczysz, czemu to ma znaczenie.',
    ],
  },
  {
    id: 'dining',
    label: 'Jedzenie na mieście',
    icon: 'UtensilsCrossed',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-800/40',
    keywords: ['restaurant', 'restauracja', 'dining', 'dinner out', 'lunch out', 'obiad na mieście', 'kolacja', 'brunch', 'takeout', 'take out', 'na wynos', 'chipotle', 'mcdonald', 'chick-fil-a', 'subway', 'wendy', 'taco bell', 'burger king', 'popeyes', 'kfc', 'pizza hut', 'sphinx', 'pizzeria', 'kebab', 'bistro'],
    categoryNames: ['jedzenie na mieście'],
    commentary: [
      'Jedzenie na mieście to jeden z najszybszych sposobów na wydrenowanie budżetu. Narzut w restauracji to 3-4 razy koszt samych składników.',
      'Wspólne wyjścia od czasu do czasu są spoko, ale gdy stają się normą, budżet płaci rachunek. Ustal sobie limit na jedzenie poza domem.',
      'Każdy posiłek w restauracji to równowartość 3-4 posiłków ugotowanych w domu. Sama ta matematyka powinna zmienić Twoje nawyki.',
      'Jedzenie na mieście to nie tylko jedzenie — to napoje, napiwki i dojazd. Realny koszt zawsze jest wyższy niż cena z menu.',
      'Jeśli to Twój sposób na spotkania, spróbuj gotowania razem albo wspólnego obiadu „w składkę”. Tyle samo frajdy za ułamek ceny.',
      'To pewnie Twój największy wydatek, który masz pod kontrolą. Zetnij go o połowę i patrz, jak rosną oszczędności.',
      'Restauracje to luksus, a nie grupa żywieniowa. Traktuj je tak, a budżet Ci podziękuje.',
      'Pół godziny planowania posiłków w niedzielę oszczędza godziny zastanawiania się i setki złotych przez cały miesiąc.',
    ],
  },
  {
    id: 'fastfood',
    label: 'Fast food',
    icon: 'ShoppingBag',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-800/40',
    keywords: ['fast food', 'drive thru', 'drive-thru', 'mcdonalds', 'burger king', 'wendys', 'taco bell', 'kfc', 'popeyes', 'sonic', 'jack in the box', 'in-n-out', 'whataburger', 'rally', 'checkers', 'arby', 'hardee', 'carl\'s jr', 'del taco', 'long john silver', 'maxburger', 'pasibus'],
    categoryNames: [],
    commentary: [
      'Fast food wydaje się tani przy jednej wizycie, ale sumuje się zaskakująco szybko. Spójrz na miesięczny rachunek, a zobaczysz.',
      '„Zestaw w promocji” przestaje być promocyjny, gdy kupujesz go 15 razy w miesiącu. Zakupy w sklepie są tańsze i zdrowsze.',
      'Fast food to definicja wydawania na rzeczy, które nie zostają z Tobą. Dosłownie — znikają w 10 minut.',
      'Jeśli regularnie podjeżdżasz do okienka, to już nie oszczędzanie czasu — to nawyk. A nawyki da się zmienić.',
      'Zrób sobie kanapki do pracy. Serio. To 5 minut, a oszczędza 20-30 zł dziennie. To ponad 500 zł miesięcznie.',
      'Wydatki na fast food to zwykle wydatki impulsywne. Jeśli wyeliminujesz impuls, eliminujesz koszt.',
      'Płacisz wysoką cenę za najgorszej jakości jedzenie. Pieczony kurczak ze sklepu istnieje nie bez powodu.',
      'Każdy fast food to stracona okazja, żeby zjeść lepiej za mniej. Tracą i Twój portfel, i Twoje ciało.',
    ],
  },
  {
    id: 'subscriptions',
    label: 'Subskrypcje',
    icon: 'Smartphone',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-800/40',
    keywords: ['netflix', 'spotify', 'hulu', 'disney+', 'disney plus', 'hbo', 'hbo max', 'max', 'paramount', 'peacock', 'apple tv', 'youtube premium', 'amazon prime', 'audible', 'crunchyroll', 'subscription', 'subskrypcja', 'abonament', 'player', 'canal+', 'storytel', 'legimi'],
    categoryNames: ['subskrypcje'],
    commentary: [
      'Subskrypcje to cisi zabójcy budżetu. Każda z osobna na tyle mała, by ją zignorować, ale razem robią różnicę.',
      'Z ilu z nich faktycznie korzystasz w tygodniu? Anuluj te, których nie używasz, a resztą żongluj co miesiąc.',
      'Cała ta gospodarka abonamentowa jest zaprojektowana tak, żebyś zapomniał, że płacisz. Nie daj się — przeglądaj je regularnie.',
      'Wybierz maks. 2-3 subskrypcje. Reszta idzie pod nóż. Zawsze możesz wrócić później.',
      'Większość ludzi ma 3-5 subskrypcji, o których zapomniała. To 40-150 zł miesięcznie wyrzucane w błoto. Sprawdź wyciąg.',
      'Stosy subskrypcji to nowoczesna pułapka na pieniądze. Każda wygląda na drobną, ale 25 zł × 8 usług = 200 zł/mies. = 2400 zł rocznie.',
      'Jeśli nie kupiłbyś tego dzisiaj jeszcze raz — anuluj. To, ile już wydałeś, nie jest powodem, żeby płacić dalej.',
      'Dziel konta tam, gdzie się da, korzystaj z darmowych planów i rotuj usługi. Nie potrzebujesz wszystkiego naraz.',
    ],
  },
  {
    id: 'rideshare',
    label: 'Przejazdy na aplikację',
    icon: 'Car',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-800/40',
    keywords: ['uber', 'lyft', 'taxi', 'taksówka', 'cab', 'rideshare', 'ride share', 'bolt', 'free now', 'freenow', 'itaxi'],
    categoryNames: [],
    commentary: [
      'Przejazdy na aplikację sumują się błyskawicznie — zwłaszcza przy cenach w godzinach szczytu. Rozważ komunikację miejską albo rower na stałych trasach.',
      'Każdy kurs Uberem czy Boltem to mniej więcej 3-5 razy koszt biletu komunikacji miejskiej. Jeśli jeździsz tak codziennie, ta różnica robi się ogromna.',
      'Aplikacje powinny być od święta, a nie na co dzień. Jeśli to rutyna, czas przemyśleć, jak się przemieszczasz.',
      'Same ceny w godzinach szczytu potrafią podwoić koszt przejazdu. Planuj wokół godzin szczytu albo szukaj alternatyw.',
      'Jeśli regularnie jeździsz tak do pracy, policz, ile kosztuje bilet miesięczny albo używany rower. Oszczędności są ogromne.',
      'Wygodne przejazdy to jeden z tych kosztów, które wydają się konieczne, a zwykle nie są. Większość tras ma tańsze opcje.',
    ],
  },
  {
    id: 'alcohol',
    label: 'Alkohol i bary',
    icon: 'UtensilsCrossed',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-800/40',
    keywords: ['bar', 'pub', 'brewery', 'browar', 'wine', 'wino', 'beer', 'piwo', 'liquor', 'cocktail', 'drink', 'drinks', 'happy hour', 'nightclub', 'klub', 'club', 'bottle service', 'alcohol', 'alkohol', 'spirits', 'wódka', 'total wine', 'bevmo'],
    categoryNames: [],
    commentary: [
      'Rachunki w barze to budżetowe czarne dziury. Jedno wyjście potrafi kosztować więcej niż tygodniowe zakupy spożywcze.',
      'Drinki w lokalu mają narzut rzędu 300-500%. Jeśli już pijesz, zacznij w domu albo kup w sklepie.',
      'Picie towarzysko to picie drogie. Ustal twardy limit, zanim wyjdziesz, i się go trzymaj.',
      'Połączenie alkohol + osłabiony osąd + otwarty rachunek to przepis na śmierć budżetu. Zasada „tylko gotówka” pomaga.',
      'Zsumuj koszt każdego wyjścia do baru, a możesz się zdziwić. Często jest to znacznie więcej, niż pamiętasz.',
      'Spotkanie u siebie zamiast wyjścia oszczędza 70-80% kosztów alkoholu. I rozmowy bywają lepsze.',
    ],
  },
  {
    id: 'shopping',
    label: 'Zakupy online',
    icon: 'ShoppingBag',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-800/40',
    keywords: ['amazon', 'walmart', 'target', 'best buy', 'ebay', 'etsy', 'shein', 'temu', 'aliexpress', 'wish', 'online order', 'online purchase', 'allegro', 'zalando', 'olx', 'empik', 'media markt', 'rtv euro agd', 'x-kom'],
    categoryNames: ['zakupy'],
    commentary: [
      'Zakupy „za jednym kliknięciem” to wróg budżetu. Wprowadź zasadę 24 godzin zwłoki przed każdym zakupem powyżej 100 zł.',
      'Zakupy online sprawiają, że wydawanie wydaje się bezbolesne — i właśnie dlatego są groźne. Pieniądze są tak samo prawdziwe.',
      'Następnym razem, gdy będziesz coś kupować online, dorzuć to najpierw do listy. Wróć za tydzień. Połowy z tego już nie będziesz chciał.',
      'Progi darmowej dostawy są po to, żebyś wydał więcej, a nie zaoszczędził. Nie daj się na to nabrać.',
      'Jeśli nie potrafisz wyjaśnić, po co Ci to, nie używając słowa „chcę”, to może poczekać.',
      'Suma w Twoim koszyku w tym miesiącu sugeruje trochę impulsywnych zakupów. Spróbuj odinstalować aplikacje zakupowe na 30 dni.',
    ],
  },
  {
    id: 'gaming',
    label: 'Gry',
    icon: 'Package',
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-800/40',
    keywords: ['steam', 'playstation', 'xbox', 'nintendo', 'epic games', 'game pass', 'twitch', 'v-bucks', 'robux', 'in-app purchase', 'microtransaction', 'mikrotransakcja', 'gaming', 'video game', 'gry', 'gra'],
    categoryNames: [],
    commentary: [
      'Granie jako hobby jest w porządku, ale mikrotransakcje i zakupy pod wpływem chwili się sumują. Ustal miesięczny budżet na gry i się go trzymaj.',
      'Zakupy w grach są projektowane przez psychologów tak, żeby skłonić Cię do wydawania. Bądź świadomy tej manipulacji.',
      'Poczekaj na promocje. Większość gier tanieje o 40-75% w ciągu kilku miesięcy. Cierpliwość to finansowa supermoc.',
      'Gry zalegające w Twojej bibliotece to darmowa rozrywka. Zagraj w to, co już masz, zanim kupisz więcej.',
      'Game Pass i abonamenty potrafią oszczędzić pieniądze — ale tylko jeśli odpuścisz gry, które kupowałeś osobno.',
      'Skórki i DLC to czyste zachcianki. Są okej, jeśli zaplanowane w budżecie, ale nie mogą być impulsem.',
    ],
  },
]

/** Detect spending habits from transactions */
function detectHabits(
  transactions: Transaction[],
  categories: Category[],
  _seed: number,
): SpendingHabit[] {
  const catMap = new Map(categories.map((c) => [c.id!, c]))
  const habits: SpendingHabit[] = []

  for (const pattern of HABIT_PATTERNS) {
    let total = 0
    let count = 0

    for (const t of transactions) {
      if (t.type !== 'expense') continue
      const desc = (t.description ?? '').toLowerCase()
      const catName = (catMap.get(t.categoryId)?.name ?? '').toLowerCase()

      const matchesKeyword = pattern.keywords.some((kw) => desc.includes(kw))
      const matchesCategory = pattern.categoryNames.some((cn) => catName === cn.toLowerCase())

      if (matchesKeyword || matchesCategory) {
        total += t.amount
        count++
      }
    }

    if (count > 0 && total > 0) {
      habits.push({
        id: pattern.id,
        label: pattern.label,
        icon: pattern.icon,
        color: pattern.color,
        bgColor: pattern.bgColor,
        borderColor: pattern.borderColor,
        total,
        count,
        commentary: pattern.commentary,
      })
    }
  }

  // Sort by total descending, keep top 4
  return habits.sort((a, b) => b.total - a.total).slice(0, 4)
}

// ─── Response variations ────────────────────────────────────────────────

const OVERVIEW_OVER = [
  (spent: string, budget: string, pct: string) =>
    `Musimy porozmawiać. Wydałeś ${spent} przy budżecie ${budget}. To ${pct}% Twojego celu.`,
  (spent: string, budget: string, pct: string) =>
    `Bądźmy szczerzy — ${spent} wydane przy budżecie ${budget} (${pct}%) to problem. Czas na korektę kursu.`,
  (spent: string, budget: string, pct: string) =>
    `${spent} wyparowało przy limicie ${budget} — czyli ${pct}%. Twój portfel macha białą flagą.`,
  (spent: string, budget: string, pct: string) =>
    `Przepuściłeś ${spent} przy budżecie ${budget} — ${pct}%. To nie plan, to problem.`,
  (spent: string, budget: string, pct: string) =>
    `${spent} wydane. ${budget} to był limit. Zużyte ${pct}%. Liczby nie kłamią — coś musi się zmienić.`,
  (spent: string, budget: string, pct: string) =>
    `Auć. ${spent} przy celu ${budget} daje ${pct}%. Zobaczmy, gdzie poszło nie tak.`,
  (spent: string, budget: string, pct: string) =>
    `Twoje wydatki dobiły do ${spent} przy budżecie ${budget} — to ${pct}%. Czas spojrzeć liczbom w oczy i to naprawić.`,
  (spent: string, budget: string, pct: string) =>
    `${pct}% Twojego budżetu ${budget} już nie ma — łącznie ${spent}. Każde przekroczenie utrudnia kolejny miesiąc.`,
]

const OVERVIEW_UNDER = [
  (spent: string, budget: string) =>
    `Świetna robota. Wydałeś ${spent} przy budżecie ${budget}. Taka dyscyplina buduje majątek.`,
  (spent: string, budget: string) =>
    `No proszę. ${spent} wydane przy budżecie ${budget} — tak właśnie buduje się wolność finansową.`,
  (spent: string, budget: string) =>
    `${spent} przy budżecie ${budget}. Czysto, pod kontrolą i z głową. Tak trzymaj.`,
  (spent: string, budget: string) =>
    `Zmieściłeś się w ${spent} przy limicie ${budget}. Ta różnica? To Twoja jaśniejsza przyszłość.`,
  (spent: string, budget: string) =>
    `${spent} wydane, ${budget} w budżecie. Zostawiłeś sobie zapas — i to jest mistrzowskie zagranie.`,
  (spent: string, budget: string) =>
    `Budżet wynosił ${budget}. Wydałeś tylko ${spent}. Taka samokontrola to rzadkość — nie bierz jej za pewnik.`,
  (spent: string, budget: string) =>
    `${spent} przy ${budget} — zagrałeś sprytnie. Ta nadwyżka to dowód, że masz wszystko pod kontrolą.`,
  (spent: string, budget: string) =>
    `Znów poniżej budżetu. ${spent} z ${budget}. To właśnie ta konsekwencja zmienia życie.`,
]

const TOP_EXP_HEADER = [
  'Te trzy transakcje uderzyły Cię po portfelu najmocniej.',
  'Twoje trzy największe ubytki gotówki. Przed liczbami nie ma ucieczki.',
  'Wielka trójka. Każda złotówka tutaj to złotówka, która nie poszła na Twoje cele.',
  'Oto gdzie poszła większość Twoich pieniędzy. Jakieś niespodzianki?',
  'Twoje trzy najcięższe ciosy. Czy każdy był tego wart?',
  'Te zakupy zrobiły największą wyrwę. Przyjrzyjmy się im bliżej.',
  'Wielka trójka. Czasem zobaczenie ich razem opowiada całą historię.',
  'Trzy transakcje, maksymalny wpływ. Wiedza to potęga.',
]

const OUCH_PROMPT = [
  'Bez oceniania — ale zadaj sobie pytanie: „Gdybym mógł cofnąć czas, wydałbym to jeszcze raz?”. Jeśli nie, to właśnie znalazłeś swoją pierwszą rzecz do wycięcia w tym miesiącu.',
  'Szczerze — czy ten zakup nadal cieszył Cię tydzień później? Jeśli nie, to sygnał, żeby odpuścić go w przyszłym miesiącu.',
  'Pomyśl o tym uczciwie. Twoje przyszłe „ja” podziękowałoby Ci za to czy pokręciłoby głową? Ta odpowiedź to Twój plan działania.',
  'Test jest prosty: czy ten zakup wniósł coś do Twojego życia, czy był tylko chwilą? Bądź ze sobą szczery.',
  'Wyobraź sobie siebie za rok. Czy ten wydatek ma znaczenie? Jeśli nie, to wiesz, co robić inaczej.',
  'Nie każdy wydatek jest zły — ale czy ten był konieczny, czy tylko wygodny? Właśnie w tej różnicy kryją się oszczędności.',
  'Zapytaj siebie: czy to była potrzeba, prawdziwa zachcianka, czy tylko impuls? Odpowiedź mówi wiele o Twoich nawykach.',
  'Zamknij oczy i pomyśl o tym zakupie. Czujesz satysfakcję? Zostaw go. Czujesz nic? To początek Twojej listy do wycięcia.',
]

const NO_DISCRETIONARY = [
  'Brak wydatków na zachcianki, do których można by się przyczepić. Trzymałeś budżet krótko!',
  'Zero wydatków na zachcianki wartych odnotowania. To wymaga poważnej dyscypliny.',
  'Nie ma się tu z czego nabijać — Twoje zachcianki były pod pełną kontrolą.',
  'Czysta karta, jeśli chodzi o zachcianki. To naprawdę imponujące.',
  'Ani jednej zachcianki, którą trzeba by kwestionować. Trzymasz wszystko twardą ręką.',
  'Twoje wydatki na zachcianki praktycznie nie istniały. Ta powściągliwość się opłaca.',
  'Żadnych zakupów pod wpływem chwili, żadnego zbędnego balastu. Potraktowałeś budżet jak kontrakt.',
  'Zachcianki? Jakie zachcianki? No właśnie.',
]

const VERDICT_A = [
  'Wybitnie. Zostałeś sporo poniżej budżetu i pokazałeś prawdziwą dyscyplinę. Trzymaj tę energię — to konsekwencja buduje majątek. Nie pozwól, żeby w tym miesiącu wkradła się inflacja stylu życia.',
  'Tak wygląda kontrola nad finansami. Zostawiłeś pieniądze na stole i jest się czym chwalić. Pozostań głodny i zdyscyplinowany.',
  'Budżetowanie na najwyższym poziomie. Nie tylko oszczędzasz — budujesz nawyki, które procentują latami. Nie spoczywaj na laurach, działaj dalej.',
  'Robisz to, czego 90% ludzi nie potrafi — wydajesz mniej, niż zaplanowałeś. Ta nadwyżka to podziękowanie od Twojego przyszłego „ja”.',
  'Wykonanie wzorcowe. Poniżej budżetu, i to z zapasem. To taki miesiąc, który buduje fundusze awaryjne i emerytury.',
  'Gdyby budżetowanie było sportem, właśnie rozegrałeś mecz gwiazd. To w różnicy między wydatkami a budżetem rośnie majątek.',
  'Pozamiatałeś. Zejście tak daleko poniżej budżetu nie jest łatwe — oznacza, że powiedziałeś czemuś „nie”. To wymaga siły. Tak dalej.',
  'Tak właśnie wygrywa się z pieniędzmi. Nie jednym szczęśliwym miesiącem, ale zdyscyplinowanymi miesiącami jak ten. Dorzuć kolejny.',
]

const VERDICT_B = [
  'Solidny miesiąc. Zmieściłeś się w budżecie, a to jest cel. Jest miejsce, żeby trochę przykręcić śrubę, ale idziesz w dobrym kierunku. Drobne poprawki się sumują.',
  'Dobrze, choć nie rewelacyjnie — i to jest okej. Zmieściłeś się w ramach. Teraz zastanów się, jakie małe cięcia zamieniłyby tę czwórkę w piątkę w przyszłym miesiącu.',
  'Utrzymałeś linię i panowałeś nad wydatkami. To wygrana. Ale zawsze jest kolejny poziom — znajdź jeden obszar do przycięcia i wskocz wyżej.',
  'Zmieściłeś się w budżecie i to ma znaczenie. Margines był jednak cienki — jedno czy dwa cięcia i byłbyś na piątkę.',
  'Przyzwoity miesiąc. Nie przekroczyłeś budżetu, a to fundament. Teraz poszukaj tych 5-10%, które możesz zetrzeć, żeby naprawdę przyspieszyć.',
  'Poniżej budżetu to poniżej budżetu — odtrąb ten sukces. Ale nie odpuszczaj. Najlepsi w budżetowaniu zawsze szukają kolejnej przewagi.',
  'Zaliczyłeś test, ale rzutem na taśmę. Przejrzyj wydatki na zachcianki — niemal na pewno jest miejsce, żeby wbić się na piątkę.',
  'Czwórka oznacza, że jesteś na dobrej drodze, ale jeszcze nie do końca skupiony. Znajdź jeden stały wydatek do wycięcia i patrz, jak zmienia się przyszły miesiąc.',
]

const VERDICT_C = [
  (over: string) => `Musimy popracować. Przekroczyłeś budżet o ${over}. Przyjrzyj się krytycznie wydatkom na zachcianki. Każda złotówka ponad budżet to złotówka oddalająca Cię od celów. Skup się w tym miesiącu.`,
  (over: string) => `Powinęła Ci się noga — ${over} ponad budżet. Zdarza się, ale nie pozwól, żeby to weszło w nawyk. Znajdź swój największy przeciek i załataj go w tym miesiącu. Bez wymówek.`,
  (over: string) => `${over} ponad limit. To nie katastrofa, ale to sygnał ostrzegawczy. Różnica między budowaniem majątku a dreptaniem w miejscu jest właśnie tutaj. Przykręć śrubę.`,
  (over: string) => `Ponad budżet o ${over}. To nie koniec świata, ale to trend, który musisz zabić, zanim on zabije Twoje cele. Wskaż dwa wydatki do wyeliminowania.`,
  (over: string) => `${over} ponad — wystarczająco blisko, by to naprawić, wystarczająco daleko, by się martwić. To taki miesiąc, który odróżnia tych, którzy mówią o budżetowaniu, od tych, którzy je robią.`,
  (over: string) => `Rozminąłeś się z celem o ${over}. Dobra wiadomość? Tę lukę da się załatać. Pytanie, czy faktycznie to zrobisz, czy znów odpuścisz.`,
  (over: string) => `${over} na minusie. Byłeś blisko, co oznacza, że dyscyplina jest — trzeba ją tylko wyostrzyć. Odetnij jeden nawyk i będzie pięknie.`,
  (over: string) => `Budżet rozbity o ${over}. Nie biczuj się, ale też tego nie ignoruj. Wypisz trzy rzeczy, które odpuścisz w tym miesiącu, i się ich trzymaj.`,
]

const VERDICT_F = [
  (over: string, pct: string) => `To wymaga resetu. Przekroczyłeś budżet o ${over} — to ${pct}% Twojego celu. Czas wyciąć zbędne wydatki i wziąć się do roboty. Twoje przyszłe „ja” na Ciebie liczy. Koniec wymówek.`,
  (over: string, pct: string) => `${over} ponad budżet przy ${pct}% — to pożar na całego. Każde stuknięcie kartą ma znaczenie. Usiądź, prześwietl każdą subskrypcję, każdy impulsywny zakup i tnij. Da się to odwrócić.`,
  (over: string, pct: string) => `Gorzka prawda: ${over} ponad przy zużyciu ${pct}% jest nie do utrzymania. Gdyby to był cudzy budżet, kazałbyś mu przestać. Potraktuj swój tak samo. Ten miesiąc to nowy start — zachowuj się jak ktoś, kto zaczyna od nowa.`,
  (over: string, pct: string) => `${over} ponad limit — zużyte ${pct}% budżetu. To nie potknięcie, to swobodny upadek. Potrzebujesz twardego resetu: anuluj, czego nie potrzebujesz, gotuj w domu i traktuj budżet jak obietnicę.`,
  (over: string, pct: string) => `Przy ${pct}% zużycia budżetu i ${over} na minusie coś jest fundamentalnie zepsute. Nie przycinaj — przebuduj. Prześwietl każdą cykliczną opłatę i każdą kategorię. Zacznij od zera.`,
  (over: string, pct: string) => `${over} ponad. Wydane ${pct}%. Te liczby powinny Cię uwierać — i ten dyskomfort jest przydatny. Zamień go w działanie. W tym miesiącu zapisuj każdą złotówkę.`,
  (over: string, pct: string) => `Przepaliłeś budżet o ${over}, lądując na ${pct}%. Nie ma co tego osładzać. Ale jest jedno „ale” — świadomość to pierwszy krok, a Ty właśnie patrzysz na liczby. Teraz coś z tym zrób.`,
  (over: string, pct: string) => `${pct}% Twojego budżetu, ${over} ponad kreskę. Wydajesz tak, jakby budżet nie istniał. W tym miesiącu udowodnij, że istnieje. Napisz to sobie na lustrze, jeśli trzeba.`,
]

const DISMISS_LABEL = [
  'Rozbijmy ten miesiąc',
  'Czas się skupić',
  'Nowy miesiąc, nowy cel',
  'Jestem gotów — działamy',
  'Wyzwanie przyjęte',
  'No to jazda',
  'Świeży start, ruszamy',
  'Gramy dalej',
]

// ─── Component ──────────────────────────────────────────────────────────

export function MonthlyAudit({ forceOpen, onForceClose }: { forceOpen?: boolean; onForceClose?: () => void }) {
  const { getSetting, setSetting, getMonthlyBudget } = useSettings()
  const [dismissed, setDismissed] = useState(false)
  const [step, setStep] = useState(0)

  const prev = useMemo(() => getPreviousMonth(), [])
  const lastSeen = getSetting(SETTING_KEY)
  const currentMonth = format(new Date(), 'yyyy-MM')

  const seed = useMemo(() => hashSeed(currentMonth), [currentMonth])

  const cur = useMemo(() => {
    const now = new Date()
    return {
      key: format(now, 'yyyy-MM'),
      label: format(now, 'LLLL yyyy', { locale: pl }),
      start: format(startOfMonth(now), 'yyyy-MM-dd'),
      end: format(endOfMonth(now), 'yyyy-MM-dd'),
    }
  }, [])

  const prevTransactions = useLiveQuery(
    () => db.transactions.where('date').between(prev.start, prev.end, true, true).toArray(),
    [prev.start, prev.end],
  ) ?? []

  const curTransactions = useLiveQuery(
    () => forceOpen ? db.transactions.where('date').between(cur.start, cur.end, true, true).toArray() : Promise.resolve([] as Transaction[]),
    [cur.start, cur.end, forceOpen],
  ) ?? []

  const transactions = prevTransactions.length > 0 ? prevTransactions : curTransactions
  const reviewMonth = prevTransactions.length > 0 ? prev : cur

  const categories = useLiveQuery(() => db.categories.toArray()) ?? []

  const shouldShow = forceOpen || (!dismissed && lastSeen !== currentMonth && prevTransactions.length > 0)

  // Build audit data
  const audit = useMemo<AuditData | null>(() => {
    if (transactions.length === 0) return null

    const catMap = new Map(categories.map((c) => [c.id!, c]))
    const totalBudget = getMonthlyBudget(reviewMonth.key)

    let totalSpent = 0
    let totalIncome = 0
    const categoryTotals = new Map<number, number>()

    for (const t of transactions) {
      if (t.type === 'expense') {
        totalSpent += t.amount
        categoryTotals.set(t.categoryId, (categoryTotals.get(t.categoryId) ?? 0) + t.amount)
      } else {
        totalIncome += t.amount
      }
    }

    const expenses = transactions
      .filter((t) => t.type === 'expense')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3)
      .map((t) => ({
        description: t.description || 'Wydatek bez nazwy',
        amount: t.amount,
        category: catMap.get(t.categoryId)?.name ?? 'Nieznane',
      }))

    const topCats = [...categoryTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([catId, total]) => {
        const cat = catMap.get(catId)
        return { name: cat?.name ?? 'Nieznane', group: cat?.group ?? 'needs', total }
      })

    const wantsExpenses = transactions
      .filter((t) => t.type === 'expense' && catMap.get(t.categoryId)?.group === 'wants')
      .sort((a, b) => b.amount - a.amount)

    const biggestUnnecessary = wantsExpenses.length > 0 ? {
      description: wantsExpenses[0].description || 'Wydatek bez nazwy',
      amount: wantsExpenses[0].amount,
      category: catMap.get(wantsExpenses[0].categoryId)?.name ?? 'Nieznane',
    } : null

    const budgetPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
    return {
      totalBudget, totalSpent, totalIncome, budgetPct,
      overBudget: totalSpent > totalBudget,
      remaining: totalBudget - totalSpent,
      topExpenses: expenses, topCategories: topCats, biggestUnnecessary,
    }
  }, [transactions, categories, reviewMonth.key, getMonthlyBudget])

  // Detect spending habits
  const habits = useMemo(
    () => detectHabits(transactions, categories, seed),
    [transactions, categories, seed],
  )
  const hasHabits = habits.length > 0

  // Steps: 0 = overview, 1 = top expenses, 2 = habits (conditional), 3 = ouch, 4 = final
  const stepIds = useMemo(() => {
    const ids = ['overview', 'top-expenses']
    if (hasHabits) ids.push('habits')
    ids.push('ouch', 'verdict')
    return ids
  }, [hasHabits])
  const totalSteps = stepIds.length
  const currentStepId = stepIds[step] ?? 'overview'

  useEffect(() => {
    if (shouldShow) {
      document.body.style.overflow = 'hidden'
    }
    return () => { document.body.style.overflow = '' }
  }, [shouldShow])

  if (!shouldShow || !audit) return null

  const dismiss = async () => {
    if (!forceOpen) {
      await setSetting(SETTING_KEY, currentMonth)
    }
    setDismissed(true)
    onForceClose?.()
  }

  const grade = audit.budgetPct <= 85 ? 'A' : audit.budgetPct <= 100 ? 'B' : audit.budgetPct <= 115 ? 'C' : 'F'
  const gradeColor = { A: 'text-green-400', B: 'text-blue-400', C: 'text-amber-400', F: 'text-red-400' }[grade]
  const gradeBg = { A: 'bg-green-500/15', B: 'bg-blue-500/15', C: 'bg-amber-500/15', F: 'bg-red-500/15' }[grade]

  const barColor = audit.overBudget ? 'bg-red-500' : audit.budgetPct > 85 ? 'bg-amber-500' : 'bg-green-500'
  const barWidth = Math.min(audit.budgetPct, 100)

  const spentStr = formatCurrency(audit.totalSpent)
  const budgetStr = formatCurrency(audit.totalBudget)
  const pctStr = audit.budgetPct.toFixed(0)
  const overStr = formatCurrency(Math.abs(audit.remaining))

  // Next button label
  const nextStepId = stepIds[step + 1]
  const nextLabel =
    nextStepId === 'top-expenses' ? 'Zobacz największe wydatki' :
    nextStepId === 'habits' ? 'Nawyki wydatkowe' :
    nextStepId === 'ouch' ? 'Gorzka prawda' :
    nextStepId === 'verdict' ? 'Werdykt końcowy' : 'Dalej'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-20 md:pb-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative w-full max-w-md max-h-[85dvh] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="shrink-0 px-6 pt-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15">
              <Icon name="ClipboardCheck" size={18} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Przegląd miesiąca</h2>
              <p className="text-xs text-slate-500">{reviewMonth.label}</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-green-500' : 'w-1.5 bg-slate-700'}`}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5">

          {/* Overview */}
          {currentStepId === 'overview' && (
            <div className="space-y-5">
              <div className="text-center">
                {audit.overBudget ? (
                  <>
                    <p className="text-xl font-bold text-red-400 mb-1">{overStr} ponad budżet</p>
                    <p className="text-sm text-slate-400">{pick(OVERVIEW_OVER, seed)(spentStr, budgetStr, pctStr)}</p>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-bold text-green-400 mb-1">{overStr} poniżej budżetu</p>
                    <p className="text-sm text-slate-400">{pick(OVERVIEW_UNDER, seed)(spentStr, budgetStr)}</p>
                  </>
                )}
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span>Wydane</span><span>{pctStr}%</span>
                </div>
                <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${barWidth}%` }} />
                </div>
                <div className="flex justify-between text-xs text-slate-600 mt-1">
                  <span>{formatCurrency(0)}</span><span>{budgetStr}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-800 p-3 text-center">
                  <p className="text-xs text-slate-500 mb-0.5">Przychód</p>
                  <p className="text-lg font-bold text-green-400">{formatCurrency(audit.totalIncome)}</p>
                </div>
                <div className="rounded-xl bg-slate-800 p-3 text-center">
                  <p className="text-xs text-slate-500 mb-0.5">Wydatki</p>
                  <p className="text-lg font-bold text-red-400">{spentStr}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">Główne kategorie</p>
                <div className="space-y-2">
                  {audit.topCategories.map((cat, i) => {
                    const pct = audit.totalSpent > 0 ? (cat.total / audit.totalSpent) * 100 : 0
                    const color = GROUP_COLORS[cat.group as keyof typeof GROUP_COLORS] ?? '#94a3b8'
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-sm text-slate-300">{cat.name}</span>
                          <span className="text-sm font-medium text-slate-200">{formatCurrency(cat.total)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Top expenses */}
          {currentStepId === 'top-expenses' && (
            <div className="space-y-5">
              <div className="text-center">
                <p className="text-lg font-bold text-slate-100 mb-1">Twoje największe wydatki</p>
                <p className="text-sm text-slate-400">{pick(TOP_EXP_HEADER, seed)}</p>
              </div>
              <div className="space-y-3">
                {audit.topExpenses.map((exp, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl bg-slate-800 p-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
                      <span className="text-lg font-black text-red-400">#{i + 1}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-200 truncate">{exp.description}</p>
                      <p className="text-xs text-slate-500">{exp.category}</p>
                    </div>
                    <p className="text-sm font-bold text-red-400 shrink-0">{formatCurrency(exp.amount)}</p>
                  </div>
                ))}
              </div>
              {audit.topExpenses.length > 0 && (
                <p className="text-sm text-slate-500 text-center">
                  Same te trzy to aż{' '}
                  <span className="text-slate-300 font-medium">
                    {formatCurrency(audit.topExpenses.reduce((s, e) => s + e.amount, 0))}
                  </span>
                  {' '}— {audit.totalSpent > 0
                    ? `${((audit.topExpenses.reduce((s, e) => s + e.amount, 0) / audit.totalSpent) * 100).toFixed(0)}% wszystkich wydatków.`
                    : ''}
                </p>
              )}
            </div>
          )}

          {/* Spending habits callout */}
          {currentStepId === 'habits' && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 mx-auto mb-3">
                  <Icon name="AlertTriangle" size={28} className="text-orange-400" />
                </div>
                <p className="text-lg font-bold text-slate-100 mb-1">Wykryto nawyki wydatkowe</p>
                <p className="text-sm text-slate-400">Znaleźliśmy w Twoich wydatkach kilka schematów, o których warto wspomnieć.</p>
              </div>
              <div className="space-y-3">
                {habits.map((habit) => {
                  const budgetPct = audit.totalBudget > 0 ? ((habit.total / audit.totalBudget) * 100).toFixed(1) : '0'
                  return (
                    <div key={habit.id} className={`rounded-xl border ${habit.borderColor} ${habit.bgColor} p-4`}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${habit.bgColor}`}>
                          <Icon name={habit.icon} size={18} className={habit.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold ${habit.color}`}>{habit.label}</p>
                          <p className="text-xs text-slate-500">
                            {habit.count} {pluralizeTransakcje(habit.count)} · {budgetPct}% budżetu
                          </p>
                        </div>
                        <p className={`text-lg font-black ${habit.color} shrink-0`}>
                          {formatCurrency(habit.total)}
                        </p>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {pick(habit.commentary, seed + hashSeed(habit.id))}
                      </p>
                    </div>
                  )
                })}
              </div>
              {habits.length > 0 && (
                <div className="rounded-xl bg-slate-800 p-3 text-center">
                  <p className="text-xs text-slate-500 mb-0.5">Łącznie na te nawyki</p>
                  <p className="text-lg font-bold text-orange-400">
                    {formatCurrency(habits.reduce((s, h) => s + h.total, 0))}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {audit.totalBudget > 0
                      ? `${((habits.reduce((s, h) => s + h.total, 0) / audit.totalBudget) * 100).toFixed(0)}% Twojego miesięcznego budżetu`
                      : ''}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Ouch moment */}
          {currentStepId === 'ouch' && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 mx-auto mb-3">
                  <Icon name="AlertTriangle" size={28} className="text-amber-400" />
                </div>
                <p className="text-lg font-bold text-slate-100 mb-1">Test „Czy było warto?”</p>
              </div>
              {audit.biggestUnnecessary ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-amber-800/40 bg-amber-900/15 p-4 text-center">
                    <p className="text-xs text-amber-400/80 mb-1 uppercase tracking-wider">Największa zachcianka</p>
                    <p className="text-2xl font-black text-amber-400">{formatCurrency(audit.biggestUnnecessary.amount)}</p>
                    <p className="text-sm text-slate-300 mt-1">{audit.biggestUnnecessary.description}</p>
                    <p className="text-xs text-slate-500">{audit.biggestUnnecessary.category}</p>
                  </div>
                  <p className="text-sm text-slate-400 text-center leading-relaxed">{pick(OUCH_PROMPT, seed)}</p>
                  {audit.overBudget && (
                    <p className="text-sm text-red-400/80 text-center">
                      Sama rezygnacja z tego zaoszczędziłaby Ci {formatCurrency(audit.biggestUnnecessary.amount)}.
                      {audit.biggestUnnecessary.amount >= Math.abs(audit.remaining) && (
                        <span className="block mt-1 text-green-400">To pozwoliłoby Ci zmieścić się w budżecie.</span>
                      )}
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-xl bg-green-500/10 border border-green-800/30 p-5 text-center">
                  <Icon name="Sparkles" size={32} className="text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-green-400 font-medium">{pick(NO_DISCRETIONARY, seed)}</p>
                </div>
              )}
            </div>
          )}

          {/* Final verdict */}
          {currentStepId === 'verdict' && (
            <div className="space-y-5">
              <div className="text-center">
                <div className={`flex h-20 w-20 items-center justify-center rounded-3xl ${gradeBg} mx-auto mb-3`}>
                  <span className={`text-4xl font-black ${gradeColor}`}>{grade}</span>
                </div>
                <p className="text-lg font-bold text-slate-100 mb-2">Werdykt za {reviewMonth.label}</p>
              </div>
              <div className="rounded-xl bg-slate-800 p-4 space-y-3">
                {grade === 'A' && (
                  <p className="text-sm text-slate-300 leading-relaxed">
                    <span className="text-green-400 font-bold">Ocena: A.</span>{' '}{pick(VERDICT_A, seed)}
                  </p>
                )}
                {grade === 'B' && (
                  <p className="text-sm text-slate-300 leading-relaxed">
                    <span className="text-blue-400 font-bold">Ocena: B.</span>{' '}{pick(VERDICT_B, seed)}
                  </p>
                )}
                {grade === 'C' && (
                  <p className="text-sm text-slate-300 leading-relaxed">
                    <span className="text-amber-400 font-bold">Ocena: C.</span>{' '}{pick(VERDICT_C, seed)(overStr)}
                  </p>
                )}
                {grade === 'F' && (
                  <p className="text-sm text-slate-300 leading-relaxed">
                    <span className="text-red-400 font-bold">Ocena: F.</span>{' '}{pick(VERDICT_F, seed)(overStr, pctStr)}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-slate-800 p-2.5 text-center">
                  <p className="text-[10px] text-slate-500 mb-0.5">Budżet</p>
                  <p className="text-sm font-bold text-slate-200">{budgetStr}</p>
                </div>
                <div className="rounded-xl bg-slate-800 p-2.5 text-center">
                  <p className="text-[10px] text-slate-500 mb-0.5">Wydane</p>
                  <p className={`text-sm font-bold ${audit.overBudget ? 'text-red-400' : 'text-green-400'}`}>{spentStr}</p>
                </div>
                <div className="rounded-xl bg-slate-800 p-2.5 text-center">
                  <p className="text-[10px] text-slate-500 mb-0.5">Przychód</p>
                  <p className="text-sm font-bold text-green-400">{formatCurrency(audit.totalIncome)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-slate-800 flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 rounded-xl bg-slate-800 py-3 text-sm font-medium text-slate-300 transition-colors active:bg-slate-700"
            >
              Wstecz
            </button>
          )}
          {step < totalSteps - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex-1 rounded-xl bg-green-600 py-3 text-sm font-bold text-white transition-colors active:bg-green-700"
            >
              {nextLabel}
            </button>
          ) : (
            <button
              onClick={dismiss}
              className="flex-1 rounded-xl bg-green-600 py-3 text-sm font-bold text-white transition-colors active:bg-green-700"
            >
              {pick(DISMISS_LABEL, seed)}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
