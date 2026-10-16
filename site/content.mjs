// Text and page bodies of the website, in English and Arabic. Structure (head, header, footer, JSON-LD) lives in tools/build_site.mjs.
// A page body is a function of `x` = { u(slug), m(file), lang }: u() gives the URL of a page of the same language, m() the URL of a media file.

const shot = (x, file, w, h, alt, extra = '') => `<img src="${x.m(file)}" width="${w}" height="${h}" alt="${alt}" loading="lazy" decoding="async"${extra}>`;

export const SITE = {
  en: {
    lang: 'en', dir: 'ltr', name: 'MathTypeX', locale: 'en_US',
    tagline: 'Free online math equation editor – English and Arabic',
    skip: 'Skip to the content', menu: 'Menu', home: 'Home', switchTo: 'العربية', switchLabel: 'قراءة هذه الصفحة بالعربية',
    openEditor: 'Open the editor', footerAbout: 'MathTypeX is a free visual equation editor that runs in your browser. Build math with clicks or the keyboard and download it as a PNG image – in English or Arabic.',
    footProduct: 'Product', footLearn: 'Learn', footProject: 'Project', github: 'GitHub',
    rights: '© 2026 MathTypeX · an independent project · your formulas stay in your browser',
    breadcrumbHome: 'Home',
    nav: [['', 'Home'], ['features', 'Features'], ['arabic-math-editor', 'Arabic math editor'], ['guide', 'Guide'], ['faq', 'FAQ'], ['embed', 'For websites'], ['about', 'About']],
  },
  ar: {
    lang: 'ar', dir: 'rtl', name: 'MathTypeX', locale: 'ar_AR',
    tagline: 'محرر معادلات رياضية مجاني على الإنترنت – عربي وإنجليزي',
    skip: 'انتقل إلى المحتوى', menu: 'القائمة', home: 'الرئيسية', switchTo: 'English', switchLabel: 'Read this page in English',
    openEditor: 'افتح المحرر', footerAbout: 'MathTypeX محرر معادلات مرئي مجاني يعمل في متصفحك. ابنِ المعادلات بالنقر أو بلوحة المفاتيح ونزّلها صورة PNG – بالعربية أو الإنجليزية.',
    footProduct: 'المنتج', footLearn: 'تعلّم', footProject: 'المشروع', github: 'جيت هب',
    rights: '© 2026 MathTypeX · مشروع مستقل · تبقى معادلاتك داخل متصفحك',
    breadcrumbHome: 'الرئيسية',
    nav: [['', 'الرئيسية'], ['features', 'المزايا'], ['arabic-math-editor', 'محرر المعادلات العربي'], ['guide', 'الدليل'], ['faq', 'الأسئلة الشائعة'], ['embed', 'للمواقع'], ['about', 'عن المشروع']],
  },
};

// ---- the pages -------------------------------------------------------------------------------------------------------------

export const FAQ = {
  en: [
    ['What is MathTypeX?', 'MathTypeX is an equation editor that runs in your web browser. You build a formula by clicking buttons or typing, see it drawn the way it is printed, and download it as a PNG image to use in documents, slides, worksheets or websites.'],
    ['Is MathTypeX free?', 'Yes. Using MathTypeX in your browser is free: no sign-up, no payment and no trial period.'],
    ['Do I need to install anything or create an account?', 'No. Open the page and start typing. There is nothing to install and no sign-up. It works in current versions of Chrome, Edge, Firefox and Safari, on computers, tablets and phones.'],
    ['Can I write equations in Arabic?', 'Yes – this is one of the main features. MathTypeX writes right to left, has a fully translated Arabic interface, Arabic-Indic digits, Arabic fonts, and a palette of Arabic mathematical letters with derivative marks. See the <a href="{arabic}">Arabic math editor page</a>.'],
    ['How do I turn on Arabic?', 'Open the <a href="{editorAr}">Arabic version of the editor</a> for a fully Arabic interface. If you are already using the English editor, click the “Right to left editing” button in the General tab. The <a href="{guide}#arabic">guide</a> shows exactly where the buttons are.'],
    ['How do I save my equation as an image?', 'Build the equation, open the PNG tab under the editor and click Download. You get a PNG image with a white background that you can paste into Word, Google Docs, PowerPoint or any web page.'],
    ['Does MathTypeX upload my equations?', 'No. The editor and the image export run inside your browser, so your formulas are not sent to a server.'],
    ['Does it work on a phone or tablet?', 'Yes. On small screens the editor switches to a touch layout with larger buttons, an on-screen arrow pad and a slide-up export bar.'],
    ['What are the Arabic math letters?', 'They are the letter shapes used in printed Arabic mathematics, such as the letter forms used for variables and functions. MathTypeX includes a palette of them, drawn as vector shapes, so they look the same on every device and in every exported image.'],
    ['Can I move a symbol by a pixel or two?', 'Yes. Select a letter, a mark or a group, open the contextual tab and use the four arrows – or press Ctrl + Shift + an arrow key. The position is saved inside the formula.'],
    ['Can I put the editor on my own website?', 'Yes. It is a small script that you add to a page. See <a href="{embed}">for websites</a> for the short version.'],
  ],
  ar: [
    ['ما هو MathTypeX؟', 'MathTypeX محرر معادلات يعمل داخل متصفح الويب. تبني المعادلة بالنقر على الأزرار أو بالكتابة، فتراها مرسومة كما تُطبع، ثم تنزّلها صورة PNG لتستخدمها في المستندات والعروض وأوراق العمل والمواقع.'],
    ['هل MathTypeX مجاني؟', 'نعم. استخدام MathTypeX في متصفحك مجاني: بلا تسجيل ولا دفع ولا فترة تجريبية.'],
    ['هل أحتاج إلى تثبيت شيء أو إنشاء حساب؟', 'لا. افتح الصفحة وابدأ الكتابة. لا يوجد تثبيت ولا تسجيل. يعمل في الإصدارات الحديثة من Chrome وEdge وFirefox وSafari، على الحاسوب والجهاز اللوحي والهاتف.'],
    ['هل يمكنني كتابة المعادلات بالعربية؟', 'نعم، وهذه من أهم ميزاته. يكتب MathTypeX من اليمين إلى اليسار، وله واجهة عربية مترجمة بالكامل، وأرقام هندية عربية، وخطوط عربية، ولوحة بالحروف الرياضية العربية مع علامات المشتقة. راجع <a href="{arabic}">صفحة محرر المعادلات العربي</a>.'],
    ['كيف أفعّل اللغة العربية؟', 'افتح <a href="{editorAr}">النسخة العربية من المحرر</a> لتحصل على واجهة عربية كاملة. وإن كنت تستخدم المحرر الإنجليزي فانقر زر «الكتابة من اليمين إلى اليسار» في التبويب العام. ويوضح <a href="{guide}#arabic">الدليل</a> مكان الأزرار بالضبط.'],
    ['كيف أحفظ المعادلة صورة؟', 'ابنِ المعادلة، ثم افتح تبويب PNG أسفل المحرر وانقر «تنزيل». ستحصل على صورة PNG بخلفية بيضاء يمكنك لصقها في Word أو مستندات Google أو PowerPoint أو أي صفحة ويب.'],
    ['هل يرفع MathTypeX معادلاتي إلى خادم؟', 'لا. يعمل المحرر وتصدير الصور داخل متصفحك، فلا تُرسل معادلاتك إلى أي خادم.'],
    ['هل يعمل على الهاتف أو الجهاز اللوحي؟', 'نعم. على الشاشات الصغيرة يتحول المحرر إلى تخطيط للمس بأزرار أكبر ولوحة أسهم على الشاشة وشريط تصدير ينزلق من الأسفل.'],
    ['ما الحروف الرياضية العربية؟', 'هي أشكال الحروف المستخدمة في الرياضيات العربية المطبوعة، مثل الأشكال التي تُستعمل للمتغيرات والدوال. يضم MathTypeX لوحة بها، مرسومة أشكالًا متجهة، فتظهر بالشكل نفسه على كل جهاز وفي كل صورة مصدَّرة.'],
    ['هل يمكنني تحريك رمز بمقدار بكسل أو بكسلين؟', 'نعم. حدّد حرفًا أو علامة أو مجموعة، وافتح التبويب السياقي واستخدم الأسهم الأربعة، أو اضغط Ctrl + Shift مع مفتاح سهم. يُحفظ الموضع داخل المعادلة.'],
    ['هل يمكنني وضع المحرر في موقعي؟', 'نعم. هو سكربت صغير تضيفه إلى الصفحة. راجع <a href="{embed}">صفحة المواقع</a> للنسخة المختصرة.'],
  ],
};

const faqHtml = (x, list) => list.map(([q, a]) => `<details class="faq"><summary>${q}</summary><p>${a.replace(/\{arabic\}/g, x.u('arabic-math-editor')).replace(/\{editorAr\}/g, x.uLang('ar', 'editor')).replace(/\{guide\}/g, x.u('guide')).replace(/\{embed\}/g, x.u('embed'))}</p></details>`).join('\n');
export const faqPlain = (x, lang) => FAQ[lang].map(([q, a]) => [q, a.replace(/<[^>]+>/g, '').replace(/\{[a-zA-Z]+\}/g, '')]);

const EXAMPLES = {
  fraction: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mrow><mi>a</mi><mo>+</mo><mi>b</mi></mrow><mn>2</mn></mfrac></math>',
  quadratic: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>=</mo><mfrac><mrow><mo>-</mo><mi>b</mi><mo>±</mo><msqrt><msup><mi>b</mi><mn>2</mn></msup><mo>-</mo><mn>4</mn><mi>a</mi><mi>c</mi></msqrt></mrow><mrow><mn>2</mn><mi>a</mi></mrow></mfrac></math>',
  arabic: '<math xmlns="http://www.w3.org/1998/Math/MathML" dir="rtl"><mover><mi>&#xE199;</mi><mi>&#xE19A;</mi></mover><mo>(</mo><mi>&#x633;</mi><mo>)</mo></math>',
  arabicQuadratic: '<math xmlns="http://www.w3.org/1998/Math/MathML" dir="rtl"><mi>&#x635;</mi><mo>=</mo><mfrac><mrow><mo>-</mo><mi>&#x628;</mi><mo>&#xB1;</mo><msqrt><msup><mi>&#x628;</mi><mn>&#x662;</mn></msup><mo>-</mo><mn>&#x664;</mn><mi>&#x623;</mi><mi>&#x62C;</mi></msqrt></mrow><mrow><mn>&#x662;</mn><mi>&#x623;</mi></mrow></mfrac></math>',
};
export const EX = EXAMPLES;

// decorative shapes (our own): a blob behind the hero screenshot and two thick swirls behind the demo
const BLOB = '<svg class="blob" viewBox="0 0 600 460" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M70 150C110 40 280 -10 420 40c120 44 190 150 160 250-30 100-150 150-270 140C170 420 40 400 20 300 5 235 40 215 70 150z" fill="#3d6ae6"/><path d="M40 360c60 40 120 20 150-30" stroke="#ff4d5e" stroke-width="34" stroke-linecap="round" fill="none"/></svg>';
const SWIRL = '<svg class="swirl" viewBox="0 0 1100 560" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M60 420C40 300 120 170 250 150c60-8 60 40 10 60" stroke="#ff4d5e" stroke-width="72" stroke-linecap="round" fill="none"/><path d="M1000 130c60 60 70 160 20 240-40 60-120 70-150 20 30 60 20 120-20 150" stroke="#a8123a" stroke-width="72" stroke-linecap="round" fill="none"/></svg>';

// the playground (live editor) of the home page
const playground = (x, t) => `
<section id="try" class="gray" aria-labelledby="try-h">
  <div class="wrap">
    <div class="sec-head">
      <h2 id="try-h">${t.tryTitle}</h2>
      <p class="lead">${t.tryLead}</p>
      <ul class="hands">${t.tryHow.map((s, i) => `<li><b>${i + 1}</b>${s}</li>`).join('')}</ul>
    </div>
    <div class="stage">${SWIRL}
    <div class="pg" id="playground" data-lang="${x.lang}">
      <div class="pg-top">
        <strong>${t.pgStart}</strong>
        <button class="chip" type="button" data-ex="fraction">${t.exFraction}</button>
        <button class="chip" type="button" data-ex="quadratic">${t.exQuadratic}</button>
        <button class="chip" type="button" data-ex="arabic">${t.exArabic}</button>
        <button class="chip" type="button" data-ex="arabicQuadratic">${t.exArabicQ}</button>
        <button class="chip" type="button" data-ex="clear">${t.exClear}</button>
      </div>
      <div class="pg-stage">
        <div id="pgEditor" aria-label="${t.pgLabel}"></div>
        <div class="pg-load" id="pgLoad">
          <img src="${x.m('hero-' + (x.lang === 'ar' ? 'ar' : 'en') + '.webp')}" width="1100" height="446" alt="" loading="lazy" decoding="async">
          <button class="btn btn-dark" type="button" id="pgStartBtn">${t.pgLoad}</button>
          <noscript><p class="noscript-note">${t.noscript}</p></noscript>
        </div>
      </div>
      <div class="pg-bottom">
        <button class="btn btn-dark btn-sm" type="button" id="pgPng" disabled hidden>${t.pgDownload}</button>
        <button class="btn btn-outline btn-sm" type="button" id="pgCopy" hidden>${t.pgCopy}</button>
        <a class="btn btn-outline btn-sm" id="pgFull" href="${x.u('editor')}">${t.pgFull}</a>
        <span class="pg-status" id="pgStatus" role="status" aria-live="polite"></span>
        <span class="hint">${t.pgHint}</span>
      </div>
    </div></div>
  </div>
</section>`;

// the blue call-to-action band that ends every page
const cta = (x, t) => `
<section class="blue-cta" aria-labelledby="cta-h" style="padding-bottom:clamp(48px,7vw,84px)"><div class="wrap">
  <div><h2 id="cta-h">${t.ctaTitle}</h2><p>${t.ctaText}</p>
  <div class="btn-row"><a class="btn btn-dark" href="${x.u('editor')}">${t.ctaPrimary}</a><a class="btn btn-white" href="${x.u('guide')}">${t.ctaSecondary}</a></div></div>
  <div class="art">${shot(x, 'hero-' + (x.lang === 'ar' ? 'ar' : 'en') + '.webp', 1100, 446, t.heroAlt)}</div>
</div></section>`;

const T = {
  en: {
    stepWatch: 'Step 1 · Watch', stepTry: 'Step 2 · Try it', stepUse: 'Step 3 · Use it',
    heroTitle: 'Free online equation editor – in English and Arabic',
    heroLead: 'MathTypeX is a free visual equation editor that runs in your browser. Click or type to build fractions, roots, matrices and more, then download the result as a PNG image. Arabic is a first-class feature: right-to-left writing, Arabic math letters and exact positioning.',
    heroTry: 'Try it now – no sign-up', heroFull: 'Open the full editor', heroBadge: 'Arabic math letters', bandTitle: 'Made for everyone who writes mathematics', band: ['Teachers', 'Students', 'Researchers', 'Web publishers'],
    trust: ['Nothing to install', 'Works in your browser', 'English and Arabic', 'Phone, tablet and computer'],
    heroAlt: 'The MathTypeX equation editor showing the quadratic formula',
    watchTitle: 'See it in 60 seconds',
    watchLead: 'A short tour without sound: building a formula, turning on Arabic, the Arabic math letters, exact positioning and the PNG export.',
    videoLabel: 'Demo video of the MathTypeX equation editor', transcriptSummary: 'What happens in the video (text version)',
    transcript: ['The editor opens in English and the quadratic formula is built from the toolbar: a fraction, a square root and a power.', 'Three buttons turn on Arabic: right-to-left editing, Arabic ligature and the special characters palette with the Arabic math letters.', 'The same editor in Arabic: the formula is written from right to left and the interface is translated.', 'A letter from the Arabic math letters palette receives a derivative mark above it, followed by ( س ).', 'The contextual tab moves the mark one pixel at a time; the exact offset is saved in the formula.', 'The finished formula is exported as a PNG image.'],
    tryTitle: 'Try it yourself – right on this page', tryHow: ['Pick an example or click a toolbar button', 'Type or edit the equation', 'Download it as a PNG image'],
    tryLead: 'This is the real editor, not a picture. Click a button above the white area, or just type. Pick a ready-made example if you prefer, then download your equation as an image.',
    pgStart: 'Start with an example:', exFraction: 'A fraction', exQuadratic: 'Quadratic formula', exArabic: 'Arabic letter with a mark', exArabicQ: 'Arabic quadratic formula', exClear: 'Clear',
    pgLabel: 'Live equation editor', pgLoad: 'Start the editor', noscript: 'The live editor needs JavaScript. You can still read about every feature on this site.',
    pgDownload: 'Download as PNG image', pgCopy: 'Copy image', pgFull: 'Continue in the full editor', pgHint: 'Nothing is uploaded – your equation stays in your browser.',
    doTitle: 'What you can do with MathTypeX', doLead: 'Everything you need to write mathematics for school, university, research or publishing – without learning any code.',
    cards: [
      ['∑', 'Build with clicks or keys', 'Fractions, roots, powers, matrices, integrals, sums and limits are one click away on the toolbar. Prefer the keyboard? Type your formula and use shortcuts.', 'The toolbar of the MathTypeX editor'],
      ['ع', 'Arabic mathematics', 'Right-to-left editing, a translated interface, Arabic-Indic digits, Arabic fonts and a palette of Arabic math letters with derivative marks.'],
      ['⇩', 'Download as an image', 'Export your equation as a crisp PNG with a white background. Paste it into Word, Google Docs, PowerPoint or a web page.', 'The export panel showing the PNG image of an equation'],
      ['↔', 'Exact positioning', 'Move any letter or mark pixel by pixel when printed mathematics needs it. The position is saved with the formula.', 'Moving a mark above a letter pixel by pixel'],
      ['📱', 'Works on every screen', 'On phones and tablets the editor switches to a touch layout with big buttons and an on-screen arrow pad.'],
      ['🔒', 'Private by design', 'The editor and the image export run in your browser. Your formulas are not uploaded anywhere.'],
    ],
    shotCap1: 'The General tab: the most-used structures and symbols.', shotCap2: 'Export: the finished equation as a PNG image.',
    arabicTitle: 'Built for Arabic mathematics', arabicLead: 'Most equation editors treat Arabic as an afterthought. MathTypeX was designed for it.',
    arabicPoints: ['Formulas grow from the right, and fractions, roots and brackets are mirrored the way Arabic mathematics is printed.', 'A fully translated Arabic interface.', 'Arabic-Indic digits (٠١٢٣…), and Arabic fonts that match in the editor and in exported images.', 'A palette of Arabic mathematical letters, plus derivative marks that stand clear above a letter.'],
    arabicLink: 'Explore the Arabic math editor', arabicShotAlt: 'The palette of Arabic math letters in the MathTypeX editor',
    moreInfo: 'More info', rowsTitle: 'Everything in one editor', rows: [['Arabic is three buttons away', 'Switch on right-to-left writing, join Arabic letters into words and open the Arabic math letters – all from the General tab.', 'The three buttons that turn Arabic on'], ['Arabic mathematics, done properly', 'Mirrored structures, Arabic-Indic digits, Arabic fonts and a palette of Arabic math letters.', ''], ['Phone, tablet or computer', 'The same editor adapts to your screen: big touch buttons and an on-screen arrow pad on small devices.', 'The MathTypeX editor on a phone']],
    howTitle: 'How it works', howLead: 'Three steps, no learning curve.',
    how: [['Build your equation', 'Click the toolbar buttons or type. The equation is drawn the way it is printed as you work.'], ['Check it', 'Switch to Arabic, move a symbol, or undo and redo – all from the same editor.'], ['Download the image', 'Open the PNG tab and click Download. Paste the picture wherever you need it.']],
    whoTitle: 'Who it is for',
    who: [['Teachers and tutors', 'Prepare worksheets, exams and slides with clean equations – in English or Arabic.'], ['Students', 'Write homework, reports and theses without fighting with formatting.'], ['Researchers and authors', 'Produce equation images for papers, books and posters, with exact control over positions.'], ['Web publishers', 'Add the editor to a learning site or blog with a small script.']],
    faqTitle: 'Questions people ask', faqMore: 'See all questions',
    ctaTitle: 'Ready to write your first equation?', ctaText: 'Open the full-page editor. It is the same editor you just tried, with the whole window to work in.', ctaPrimary: 'Open the full editor', ctaSecondary: 'Read the guide',
  },
  ar: {
    stepWatch: 'الخطوة ١ · شاهد', stepTry: 'الخطوة ٢ · جرّب', stepUse: 'الخطوة ٣ · استخدم',
    heroTitle: 'محرر معادلات رياضية مجاني – بالعربية والإنجليزية',
    heroLead: 'MathTypeX محرر معادلات مرئي مجاني يعمل في متصفحك. انقر أو اكتب لتبني الكسور والجذور والمصفوفات وغيرها، ثم نزّل النتيجة صورة PNG. والعربية فيه ميزة أساسية: كتابة من اليمين إلى اليسار، وحروف رياضية عربية، وضبط دقيق للمواضع.',
    heroTry: 'جرّبه الآن – بلا تسجيل', heroFull: 'افتح المحرر الكامل', heroBadge: 'حروف رياضية عربية', bandTitle: 'لكل من يكتب الرياضيات', band: ['المعلمون', 'الطلاب', 'الباحثون', 'ناشرو المواقع'],
    trust: ['لا حاجة إلى تثبيت', 'يعمل في متصفحك', 'بالعربية والإنجليزية', 'هاتف وجهاز لوحي وحاسوب'],
    heroAlt: 'محرر المعادلات MathTypeX يعرض معادلة الدرجة الثانية',
    watchTitle: 'شاهده في ٦٠ ثانية',
    watchLead: 'جولة قصيرة بلا صوت: بناء معادلة، وتفعيل العربية، والحروف الرياضية العربية، والضبط الدقيق للمواضع، وتصدير PNG.',
    videoLabel: 'فيديو توضيحي لمحرر المعادلات MathTypeX', transcriptSummary: 'ماذا يحدث في الفيديو (نص مكتوب)',
    transcript: ['يُفتح المحرر بالإنجليزية وتُبنى معادلة الدرجة الثانية من شريط الأدوات: كسر وجذر تربيعي وأس.', 'ثلاثة أزرار تفعّل العربية: الكتابة من اليمين إلى اليسار، وربط الأحرف العربية، ولوحة الرموز الخاصة بالحروف الرياضية العربية.', 'المحرر نفسه بالعربية: تُكتب المعادلة من اليمين إلى اليسار وتظهر الواجهة مترجمة.', 'حرف من لوحة الحروف الرياضية العربية تُضاف فوقه علامة مشتقة، يليها ( س ).', 'يحرّك التبويب السياقي العلامة بكسل بكسل، ويُحفظ الإزاحة الدقيقة في المعادلة.', 'تُصدَّر المعادلة النهائية صورة PNG.'],
    tryTitle: 'جرّب بنفسك – هنا في هذه الصفحة', tryHow: ['اختر مثالًا أو انقر زرًا في الشريط', 'اكتب المعادلة أو عدّلها', 'نزّلها صورة PNG'],
    tryLead: 'هذا هو المحرر الحقيقي وليس صورة. انقر زرًا فوق المساحة البيضاء أو اكتب مباشرة. اختر مثالًا جاهزًا إن شئت، ثم نزّل معادلتك صورة.',
    pgStart: 'ابدأ بمثال:', exFraction: 'كسر', exQuadratic: 'معادلة الدرجة الثانية', exArabic: 'حرف عربي مع علامة', exArabicQ: 'معادلة الدرجة الثانية بالعربية', exClear: 'مسح',
    pgLabel: 'محرر المعادلات التفاعلي', pgLoad: 'ابدأ المحرر', noscript: 'يحتاج المحرر التفاعلي إلى JavaScript. ما زال بإمكانك قراءة كل المزايا في هذا الموقع.',
    pgDownload: 'تنزيل كصورة PNG', pgCopy: 'نسخ الصورة', pgFull: 'تابع في المحرر الكامل', pgHint: 'لا يُرفع شيء – تبقى معادلتك في متصفحك.',
    doTitle: 'ماذا يمكنك أن تفعل بـ MathTypeX', doLead: 'كل ما تحتاجه لكتابة الرياضيات للمدرسة أو الجامعة أو البحث أو النشر – دون تعلّم أي برمجة.',
    cards: [
      ['∑', 'ابنِ بالنقر أو بالمفاتيح', 'الكسور والجذور والأسس والمصفوفات والتكاملات والمجاميع والنهايات على بُعد نقرة في شريط الأدوات. تفضّل لوحة المفاتيح؟ اكتب معادلتك واستخدم الاختصارات.', 'شريط أدوات محرر MathTypeX'],
      ['ع', 'رياضيات عربية', 'تحرير من اليمين إلى اليسار، وواجهة مترجمة، وأرقام هندية عربية، وخطوط عربية، ولوحة حروف رياضية عربية مع علامات المشتقة.'],
      ['⇩', 'نزّل صورة', 'صدّر معادلتك صورة PNG واضحة بخلفية بيضاء. الصقها في Word أو مستندات Google أو PowerPoint أو صفحة ويب.', 'لوحة التصدير تعرض صورة PNG لمعادلة'],
      ['↔', 'ضبط دقيق للموضع', 'حرّك أي حرف أو علامة بكسل بكسل حين تتطلب الرياضيات المطبوعة ذلك. يُحفظ الموضع مع المعادلة.', 'تحريك علامة فوق حرف بكسل بكسل'],
      ['📱', 'يعمل على كل شاشة', 'على الهاتف والجهاز اللوحي يتحول المحرر إلى تخطيط للمس بأزرار كبيرة ولوحة أسهم على الشاشة.'],
      ['🔒', 'خصوصية أولًا', 'يعمل المحرر وتصدير الصور في متصفحك. لا تُرفع معادلاتك إلى أي مكان.'],
    ],
    shotCap1: 'التبويب العام: أكثر البنى والرموز استخدامًا.', shotCap2: 'التصدير: المعادلة النهائية صورة PNG.',
    arabicTitle: 'مصمَّم للرياضيات العربية', arabicLead: 'تتعامل معظم محررات المعادلات مع العربية كأنها إضافة لاحقة. أما MathTypeX فصُمّم لها.',
    arabicPoints: ['تنمو المعادلات من اليمين، وتُعكس الكسور والجذور والأقواس كما تُطبع الرياضيات العربية.', 'واجهة عربية مترجمة بالكامل.', 'أرقام هندية عربية (٠١٢٣…)، وخطوط عربية متطابقة في المحرر وفي الصور المصدَّرة.', 'لوحة بالحروف الرياضية العربية، وعلامات مشتقة تقف فوق الحرف دون أن تلمسه.'],
    arabicLink: 'اكتشف محرر المعادلات العربي', arabicShotAlt: 'لوحة الحروف الرياضية العربية في محرر MathTypeX',
    moreInfo: 'المزيد', rowsTitle: 'كل شيء في محرر واحد', rows: [['العربية على بُعد ثلاثة أزرار', 'فعّل الكتابة من اليمين إلى اليسار، واربط الأحرف العربية في كلمات، وافتح الحروف الرياضية العربية – كله من التبويب العام.', 'الأزرار الثلاثة التي تفعّل العربية'], ['رياضيات عربية كما ينبغي', 'بنى معكوسة وأرقام هندية عربية وخطوط عربية ولوحة بالحروف الرياضية العربية.', ''], ['هاتف أو جهاز لوحي أو حاسوب', 'يتكيّف المحرر نفسه مع شاشتك: أزرار لمس كبيرة ولوحة أسهم على الشاشة في الأجهزة الصغيرة.', 'محرر MathTypeX على هاتف']],
    howTitle: 'كيف يعمل', howLead: 'ثلاث خطوات، بلا منحنى تعلّم.',
    how: [['ابنِ معادلتك', 'انقر أزرار الشريط أو اكتب. تُرسم المعادلة كما تُطبع أثناء عملك.'], ['راجعها', 'بدّل إلى العربية أو حرّك رمزًا أو تراجع وأعد – كله من المحرر نفسه.'], ['نزّل الصورة', 'افتح تبويب PNG وانقر «تنزيل». ثم الصق الصورة حيث تحتاجها.']],
    whoTitle: 'لمن هو؟',
    who: [['المعلمون والمدرّسون', 'جهّز أوراق العمل والاختبارات والعروض بمعادلات نظيفة – بالعربية أو الإنجليزية.'], ['الطلاب', 'اكتب الواجبات والتقارير والرسائل دون عناء التنسيق.'], ['الباحثون والمؤلفون', 'أنتج صور معادلات للأوراق العلمية والكتب والملصقات مع تحكم دقيق بالمواضع.'], ['ناشرو المواقع', 'أضف المحرر إلى موقع تعليمي أو مدونة بسكربت صغير.']],
    faqTitle: 'أسئلة يطرحها الناس', faqMore: 'عرض كل الأسئلة',
    ctaTitle: 'جاهز لكتابة أول معادلة؟', ctaText: 'افتح المحرر بملء الصفحة. هو المحرر نفسه الذي جرّبته للتو، مع النافذة كلها للعمل.', ctaPrimary: 'افتح المحرر الكامل', ctaSecondary: 'اقرأ الدليل',
  },
};

export const PAGES = {
  // ---------------------------------------------------------------------------------------------------------------- home
  '': {
    en: { title: 'MathTypeX – Free Online Equation Editor (English & Arabic)', description: 'MathTypeX is a free online equation editor: write math in English or Arabic, see it as printed and download a PNG. Nothing to install.', og: 'og-home.png', breadcrumb: null },
    ar: { title: 'MathTypeX – محرر معادلات رياضية مجاني على الإنترنت (عربي وإنجليزي)', description: 'اكتب المعادلات الرياضية على الإنترنت بالعربية أو الإنجليزية. انقر أو اكتب، وشاهدها كما تُطبع، ثم نزّلها PNG. MathTypeX مجاني ولا يحتاج إلى تثبيت ويعمل في متصفحك.', og: 'og-home-ar.png', breadcrumb: null },
    body: (x) => {
      const t = T[x.lang];
      const ed = 'hero-' + (x.lang === 'ar' ? 'ar' : 'en') + '.webp';
      return `
<header class="hero"><div class="wrap hero-grid">
  <div>
    <div class="product"><img src="${x.m('icon-192.png')}" width="42" height="42" alt="">MathTypeX</div>
    <h1>${t.heroTitle}</h1>
    <p class="lead">${t.heroLead}</p>
    <div class="btn-row"><a class="btn btn-dark" href="#try">${t.heroTry}</a><a class="btn btn-outline" href="${x.u('editor')}">${t.heroFull}</a></div>
  </div>
  <div class="hero-visual">${BLOB}
    <div class="shot">${shot(x, ed, 1100, 446, t.heroAlt, ' fetchpriority="high"').replace(' loading="lazy"', '')}</div>
    <div class="badge">${t.heroBadge}</div>
    <div class="mini">${shot(x, 'arabic-math-letters.webp', 1000, 80, t.arabicShotAlt)}</div>
  </div>
</div></header>

<div class="band"><div class="wrap"><h2>${t.bandTitle}</h2><ul>${t.band.map((s) => `<li>${s}</li>`).join('')}</ul></div></div>

<main id="main">
<section aria-labelledby="watch-h"><div class="wrap">
  <div class="sec-head"><h2 id="watch-h">${t.watchTitle}</h2><p class="lead">${t.watchLead}</p></div>
  <div class="stage">${SWIRL}<div class="video-box"><video controls preload="none" playsinline poster="${x.m('demo-poster.webp')}" width="1280" height="829" aria-label="${t.videoLabel}"><source src="${x.m('demo.mp4')}" type="video/mp4"><a href="${x.m('demo.mp4')}">${t.videoLabel}</a></video></div></div>
  <details class="transcript"><summary>${t.transcriptSummary}</summary><ol>${t.transcript.map((s) => `<li>${s}</li>`).join('')}</ol></details>
</div></section>

${playground(x, t)}

<section class="white" aria-labelledby="do-h"><div class="wrap">
  <div class="sec-head"><h2 id="do-h">${t.doTitle}</h2><p class="lead">${t.doLead}</p></div>
  <div class="wide card" style="padding:20px"><div class="tile">${shot(x, 'toolbar.webp', 1200, 247, t.cards[0][3])}</div>
    <div class="wide-text"><h3>${t.cards[0][1]}</h3><p>${t.cards[0][2]}</p><div class="btn-row"><a class="btn btn-dark" href="${x.u('editor')}">${t.ctaPrimary}</a><a class="btn btn-outline" href="${x.u('features')}">${t.moreInfo}</a></div></div></div>
  <div class="grid g3">
    <div class="card"><div class="tile coral">${shot(x, 'arabic-math-letters.webp', 1000, 80, t.arabicShotAlt)}</div><h3 style="margin-top:18px">${t.cards[1][1]}</h3><p>${t.cards[1][2]}</p><a class="more" href="${x.u('arabic-math-editor')}">${t.moreInfo}</a></div>
    <div class="card"><div class="tile teal">${shot(x, 'position-poster.webp', 960, 622, t.cards[3][3])}</div><h3 style="margin-top:18px">${t.cards[3][1]}</h3><p>${t.cards[3][2]}</p><a class="more" href="${x.u('features')}">${t.moreInfo}</a></div>
    <div class="card"><div class="tile navy">${shot(x, 'export-png.webp', 1200, 740, t.cards[2][3])}</div><h3 style="margin-top:18px">${t.cards[2][1]}</h3><p>${t.cards[2][2]}</p><a class="more" href="${x.u('guide')}#export">${t.moreInfo}</a></div>
  </div>
</div></section>

<section class="gray" aria-labelledby="rows-h"><div class="wrap">
  <div class="sec-head"><h2 id="rows-h">${t.rowsTitle}</h2></div>
  <div class="rows">
    <div class="row"><div><h3>${t.rows[0][0]}</h3><p>${t.rows[0][1]}</p><a class="more" href="${x.u('features')}">${t.moreInfo}</a></div><figure>${shot(x, 'enable-arabic.webp', 1200, 211, t.rows[0][2])}</figure></div>
    <div class="row rev"><div><h3>${t.rows[1][0]}</h3><p>${t.rows[1][1]}</p><ul class="checks">${t.arabicPoints.map((s) => `<li>${s}</li>`).join('')}</ul><a class="more" href="${x.u('arabic-math-editor')}">${t.arabicLink}</a></div><figure>${shot(x, 'arabic-letters-palette.webp', 1000, 600, t.arabicShotAlt)}</figure></div>
    <div class="row"><div><h3>${t.rows[2][0]}</h3><p>${t.rows[2][1]}</p><a class="more" href="${x.u('features')}#phone">${t.moreInfo}</a></div><figure style="max-width:300px;margin-inline:auto">${shot(x, 'phone.webp', 420, 840, t.rows[2][2])}</figure></div>
  </div>
</div></section>

<section aria-labelledby="how-h"><div class="wrap">
  <div class="sec-head"><h2 id="how-h">${t.howTitle}</h2><p class="lead">${t.howLead}</p></div>
  <ol class="steps narrow">${t.how.map(([h, p]) => `<li><h3>${h}</h3><p>${p}</p></li>`).join('')}</ol>
</div></section>

<section class="gray" aria-labelledby="who-h"><div class="wrap">
  <div class="sec-head"><h2 id="who-h">${t.whoTitle}</h2></div>
  <div class="grid g4">${t.who.map(([h, p]) => `<div class="card"><h3>${h}</h3><p>${p}</p></div>`).join('')}</div>
</div></section>

<section aria-labelledby="faq-h"><div class="narrow">
  <div class="sec-head"><h2 id="faq-h">${t.faqTitle}</h2></div>
  ${faqHtml(x, FAQ[x.lang].slice(0, 5))}
  <p style="text-align:center;margin-top:24px"><a class="btn btn-outline" href="${x.u('faq')}">${t.faqMore}</a></p>
</div></section>
${cta(x, t)}
</main>`;
    },
    scripts: 'playground',
  },

  // ---------------------------------------------------------------------------------------------------------------- features
  features: {
    en: { title: 'Features – Equation Editor with Arabic Support | MathTypeX', description: 'Everything MathTypeX can do: build fractions, roots and matrices, write Arabic math right to left, position symbols exactly and export PNG images.', h1: 'Features', lead: 'Everything you can do with the MathTypeX equation editor.', crumb: 'Features', og: 'og-home.png' },
    ar: { title: 'المزايا – محرر معادلات يدعم العربية | MathTypeX', description: 'كل ما يستطيعه MathTypeX: بناء الكسور والجذور والمصفوفات، وكتابة الرياضيات العربية من اليمين إلى اليسار، وضبط الرموز بدقة، وتصدير صور PNG.', h1: 'المزايا', lead: 'كل ما يمكنك فعله بمحرر المعادلات MathTypeX.', crumb: 'المزايا', og: 'og-home-ar.png' },
    body: (x) => (x.lang === 'ar' ? `
<section><div class="wrap prose">
  <div class="row"><div><h2>بناء المعادلات بسهولة</h2><p>يضم شريط الأدوات أكثر من ٧٠٠ بنية جاهزة موزعة على تبويبات واضحة: الكسور والجذور والأسس والأقواس والمصفوفات والتكاملات والمجاميع والنهايات والأسهم واليونانية وغيرها. انقر الزر فتظهر البنية في المعادلة، ثم اكتب في الخانات الفارغة.</p>
  <ul class="checks"><li>تبويبات: عام، رموز، أسهم، يونانية وأرقام، مصفوفات، أسس وتخطيط، زخارف، عوامل كبيرة، تفاضل وتكامل.</li><li>تبويب سياقي يعرض الأزرار المناسبة لما حدّدته فقط.</li><li>اختصارات للوحة المفاتيح لأكثر البنى استخدامًا.</li><li>تراجع وإعادة ونسخ ولصق وخط عريض ومائل وألوان وأحجام.</li></ul></div>
  <figure>${shot(x, 'toolbar.webp', 1200, 247, 'تبويب الأسس والتخطيط في شريط أدوات MathTypeX')}<figcaption>تبويب «أسس وتخطيط» يضم الأسس والجذور والكسور وعناصر الأقواس.</figcaption></figure></div>

  <div class="row rev"><div><h2>الرياضيات العربية من اليمين إلى اليسار</h2><p>يكتب المحرر المعادلات من اليمين، وتنعكس البنى كما تُطبع الرياضيات العربية. الواجهة مترجمة بالكامل، والأرقام الهندية العربية جاهزة، والخطوط العربية متطابقة بين المحرر والصور المصدَّرة.</p><p><a class="btn btn-teal btn-sm" href="${x.u('arabic-math-editor')}">اقرأ عن المحرر العربي</a></p></div>
  <figure>${shot(x, 'editor-ar.webp', 1200, 740, 'محرر MathTypeX بالواجهة العربية ومعادلة الدرجة الثانية')}</figure></div>

  <div class="row"><div><h2>حروف رياضية عربية وعلامات مشتقة</h2><p>لوحة بالحروف الرياضية العربية تُرسم أشكالًا متجهة فلا تحتاج إلى خط مثبّت. وتقف علامات المشتقة (١ و٢ و٣) فوق الحرف دون أن تلمسه.</p></div>
  <figure>${shot(x, 'arabic-math-letters.webp', 1000, 80, 'حروف عربية يتبع كلًّا منها حرفها الرياضي')}</figure></div>

  <div class="row rev"><div><h2>ضبط دقيق للموضع</h2><p>حدّد أي حرف أو علامة أو مجموعة، وحرّكها بكسل واحد في كل مرة بالأسهم الأربعة في التبويب السياقي (أو Ctrl + Shift مع مفتاح سهم). يُحفظ الموضع داخل المعادلة ويظهر في الصورة المصدَّرة.</p></div>
  <figure><video controls preload="none" playsinline poster="${x.m('position-poster.webp')}" width="960" height="622" aria-label="تحريك علامة بكسل بكسل"><source src="${x.m('position.mp4')}" type="video/mp4"></video><figcaption>تحريك علامة المشتقة ثلاثة بكسلات يمينًا وثلاثة للأعلى.</figcaption></figure></div>

  <div class="row"><div><h2>صدّر الصورة</h2><p>افتح تبويب PNG وانقر «تنزيل» لتحصل على صورة واضحة بخلفية بيضاء. الصق الصورة في Word أو مستندات Google أو PowerPoint أو أي صفحة.</p></div>
  <figure>${shot(x, 'export-png.webp', 1200, 740, 'لوحة التصدير تعرض صورة PNG للمعادلة')}</figure></div>

  <div class="row rev"><div><h2>على الهاتف والجهاز اللوحي</h2><p>على الشاشات الصغيرة يتحول المحرر إلى تخطيط للمس: أزرار أكبر، وشريط تبويبات قابل للتمرير، ولوحة أسهم على الشاشة (لأن لوحة مفاتيح الهاتف بلا أسهم)، وشريط تصدير ينزلق من الأسفل.</p></div>
  <figure style="max-width:260px;margin-inline:auto">${shot(x, 'phone.webp', 420, 840, 'محرر MathTypeX على هاتف')}</figure></div>
</div></section>
${cta(x, T.ar)}` : `
<section><div class="wrap prose">
  <div class="row"><div><h2>Build equations the easy way</h2><p>The toolbar holds more than 700 ready-made structures, grouped into clear tabs: fractions, roots, powers, brackets, matrices, integrals, sums, limits, arrows, Greek letters and more. Click a button and the structure appears in your equation; then type into the empty boxes.</p>
  <ul class="checks"><li>Tabs: General, Symbols, Arrows, Greek, Matrices, Scripts and layout, Decorations, Big operators, Calculus.</li><li>A contextual tab that shows only the buttons that make sense for your selection.</li><li>Keyboard shortcuts for the most-used structures.</li><li>Undo, redo, copy, paste, bold, italic, colours and sizes.</li></ul></div>
  <figure>${shot(x, 'toolbar.webp', 1200, 247, 'The Scripts and layout tab of the MathTypeX toolbar')}<figcaption>The “Scripts and layout” tab: powers, roots, fractions and bracket structures.</figcaption></figure></div>

  <div class="row rev"><div><h2>Arabic mathematics, right to left</h2><p>The editor writes from the right and mirrors structures the way Arabic mathematics is printed. The interface is fully translated, Arabic-Indic digits are ready, and the Arabic fonts match between the editor and exported images.</p><p><a class="btn btn-teal btn-sm" href="${x.u('arabic-math-editor')}">Read about the Arabic editor</a></p></div>
  <figure>${shot(x, 'editor-ar.webp', 1200, 740, 'The MathTypeX editor with the Arabic interface and the quadratic formula')}</figure></div>

  <div class="row"><div><h2>Arabic math letters and derivative marks</h2><p>A palette of Arabic mathematical letters, drawn as vector shapes so no font is needed. Derivative marks (1, 2 and 3) stand clear above a letter without touching it.</p></div>
  <figure>${shot(x, 'arabic-math-letters.webp', 1000, 80, 'Ordinary Arabic letters, each followed by its Arabic math letter')}</figure></div>

  <div class="row rev"><div><h2>Exact positioning</h2><p>Select a letter, a mark or a whole group and move it one pixel at a time with the four arrows of the contextual tab (or Ctrl + Shift + an arrow key). The position is saved inside the formula and appears in the exported image.</p></div>
  <figure><video controls preload="none" playsinline poster="${x.m('position-poster.webp')}" width="960" height="622" aria-label="Moving a mark pixel by pixel"><source src="${x.m('position.mp4')}" type="video/mp4"></video><figcaption>Moving a derivative mark three pixels right and three up.</figcaption></figure></div>

  <div class="row"><div><h2>Export as an image</h2><p>Open the PNG tab and click Download to get a crisp image with a white background. Paste it into Word, Google Docs, PowerPoint or any web page.</p></div>
  <figure>${shot(x, 'export-png.webp', 1200, 740, 'The export panel showing the PNG image of the formula')}</figure></div>

  <div class="row rev"><div><h2>On phones and tablets</h2><p>On small screens the editor switches to a touch layout: bigger buttons, a scrolling tab strip, an on-screen arrow pad (phone keyboards have no arrows) and a slide-up export bar.</p></div>
  <figure style="max-width:260px;margin-inline:auto">${shot(x, 'phone.webp', 420, 840, 'The MathTypeX editor on a phone')}</figure></div>
</div></section>
${cta(x, T.en)}`),
  },

  // ---------------------------------------------------------------------------------------------------------------- arabic
  'arabic-math-editor': {
    en: { title: 'Arabic Math Editor – Right-to-Left Equations Online | MathTypeX', description: 'Write Arabic mathematics online: right-to-left equations, Arabic-Indic digits, Arabic math letters and derivative marks, with exact positioning.', h1: 'Arabic math editor', lead: 'Write equations right to left, with Arabic math letters, derivative marks and exact positioning.', crumb: 'Arabic math editor', og: 'og-home.png' },
    ar: { title: 'محرر المعادلات الرياضية العربي – من اليمين إلى اليسار | MathTypeX', description: 'اكتب الرياضيات العربية على الإنترنت: معادلات من اليمين إلى اليسار، أرقام هندية عربية، حروف رياضية عربية وعلامات مشتقة، مع ضبط دقيق.', h1: 'محرر المعادلات الرياضية العربي', lead: 'اكتب المعادلات من اليمين إلى اليسار، بحروف رياضية عربية وعلامات مشتقة وضبط دقيق للمواضع.', crumb: 'محرر المعادلات العربي', og: 'og-home-ar.png' },
    body: (x) => (x.lang === 'ar' ? `
<section><div class="wrap prose">
  <div class="narrow" style="margin-bottom:34px"><h2>لماذا الرياضيات العربية مختلفة؟</h2><p>تُكتب الرياضيات العربية من اليمين إلى اليسار، وتنعكس فيها بنى كثيرة: الكسور والجذور والأس والأقواس. ولها حروفها الرياضية الخاصة وعلاماتها، مثل علامات المشتقة التي تقف فوق الحرف. أما معظم محررات المعادلات فمبنية للغة اللاتينية، وتجعل العربية مهمة شاقة. صُمّم MathTypeX ليجعلها بسيطة.</p></div>

  <div class="grid g2">
    <div class="card"><h3>كتابة من اليمين إلى اليسار</h3><p>تنمو المعادلة من اليمين، وتُعكس البنى كما تُطبع. يمكنك التبديل بين الاتجاهين بنقرة.</p></div>
    <div class="card"><h3>واجهة عربية كاملة</h3><p>كل التبويبات والتلميحات والنوافذ مترجمة، ولوحة الأزرار نفسها تنعكس.</p></div>
    <div class="card"><h3>الأرقام الهندية العربية</h3><p>تُكتب الأرقام بالشكل ٠١٢٣٤٥٦٧٨٩ افتراضيًا في الواجهة العربية، ويمكنك اختيار الأرقام الشرقية أو الغربية.</p></div>
    <div class="card"><h3>خطوط عربية متطابقة</h3><p>اختر نسخ أو سانس أو كوفي أو تجوّل، وتظهر النتيجة نفسها في المحرر وفي الصورة المصدَّرة.</p></div>
  </div>

  <h2 id="letters">الحروف الرياضية العربية</h2>
  <div class="row"><div><p>لوحة بالأشكال المستخدمة في الرياضيات العربية المطبوعة. تُرسم أشكالًا متجهة، فتظهر متطابقة على كل جهاز وفي كل صورة، دون خط يُثبَّت. افتح «إدراج أحرف خاصة» واختر «الحروف الرياضية العربية».</p></div>
  <figure>${shot(x, 'arabic-letters-palette.webp', 1000, 600, 'لوحة الحروف الرياضية العربية')}</figure></div>
  <figure>${shot(x, 'arabic-math-letters.webp', 1000, 80, 'حروف عربية يتبع كلًّا منها حرفها الرياضي')}<figcaption>كل حرف عادي يتبعه حرفه الرياضي، على السطر نفسه.</figcaption></figure>

  <h2 id="marks">علامات المشتقة</h2>
  <div class="row"><div><p>توجد علامات المشتقة بدرجاتها الأولى والثانية والثالثة. ضعها فوق حرف فتقف فوقه دون أن تلمسه أو تتقاطع معه، ويمكنك إضافة علامات أكثر.</p></div>
  <figure>${shot(x, 'arabic-marks.webp', 600, 100, 'حروف عربية فوقها علامة مشتقة واحدة واثنتان وثلاث')}</figure></div>

  <h2 id="enable">كيف تفعّل العربية</h2>
  <p>الطريقة الأسهل أن تفتح <a href="${x.u('editor')}">المحرر بالنسخة العربية</a>. وإن كنت تستخدم المحرر الإنجليزي فاستخدم الأزرار الثلاثة في التبويب العام:</p>
  <figure>${shot(x, 'enable-arabic.webp', 1200, 211, 'تبويب عام عليه ثلاثة أزرار مرقمة: الكتابة من اليمين إلى اليسار وربط الأحرف العربية وإدراج أحرف خاصة')}</figure>
  <ol><li><strong>الكتابة من اليمين إلى اليسار</strong> – تنمو المعادلة من اليمين، وتنعكس البنى. انقر مرة أخرى للعودة.</li><li><strong>ربط الأحرف العربية</strong> – تتصل الحروف التي تكتبها في كلمة واحدة. اتركه مغلقًا لتبقى الحروف منفصلة كالمتغيرات.</li><li><strong>إدراج أحرف خاصة</strong> – يفتح اللوحة؛ اختر «الحروف الرياضية العربية».</li></ol>
  <p class="note">للأرقام الهندية العربية افتح تبويب «يونانية وأرقام» واستخدم أزرار الأرقام.</p>

  <h2 id="position">الضبط الدقيق للموضع</h2>
  <p>تتطلب الرياضيات المطبوعة أحيانًا أن يبتعد حرف أو علامة بكسل أو بكسلين عن مكانه التلقائي. حدّد العنصر وافتح التبويب السياقي: أربعة أسهم تحرّكه بكسل واحد في كل نقرة، ويُحفظ الإزاحة مع المعادلة. وتجدها كذلك بالاختصار Ctrl + Shift + سهم.</p>
</div></section>
${cta(x, T.ar)}` : `
<section><div class="wrap prose">
  <div class="narrow" style="margin-bottom:34px"><h2>Why Arabic mathematics is different</h2><p>Arabic mathematics is written right to left, and many structures are mirrored: fractions, roots, powers and brackets. It has its own mathematical letters and marks, such as the derivative marks that stand above a letter. Most equation editors are built for Latin text and make Arabic a struggle. MathTypeX is built to make it simple.</p></div>

  <div class="grid g2">
    <div class="card"><h3>Right-to-left writing</h3><p>The equation grows from the right and structures are mirrored the way they are printed. Switch direction with one click.</p></div>
    <div class="card"><h3>A fully Arabic interface</h3><p>Every tab, tooltip and dialog is translated, and the toolbar layout mirrors too.</p></div>
    <div class="card"><h3>Arabic-Indic digits</h3><p>Digits appear as ٠١٢٣٤٥٦٧٨٩ by default in the Arabic interface; Eastern Arabic-Indic and Western digits are one click away.</p></div>
    <div class="card"><h3>Matching Arabic fonts</h3><p>Choose Naskh, Sans, Kufi or Tajawal, and the result is identical in the editor and in the exported image.</p></div>
  </div>

  <h2 id="letters">Arabic math letters</h2>
  <div class="row"><div><p>A palette of the shapes used in printed Arabic mathematics. They are drawn as vector shapes, so they look the same on every device and in every exported image, with no font to install. Open <em>Insert special characters</em> and choose <em>Arabic math letters</em>.</p></div>
  <figure>${shot(x, 'arabic-letters-palette.webp', 1000, 600, 'The palette of Arabic math letters')}</figure></div>
  <figure>${shot(x, 'arabic-math-letters.webp', 1000, 80, 'Ordinary Arabic letters, each followed by its Arabic math letter')}<figcaption>Each ordinary letter followed by its math letter, on the same line.</figcaption></figure>

  <h2 id="marks">Derivative marks</h2>
  <div class="row"><div><p>First, second and third derivative marks are included. Put one above a letter and it stands clear without touching or crossing it; add as many as you need.</p></div>
  <figure>${shot(x, 'arabic-marks.webp', 600, 100, 'Arabic letters with one, two and three derivative marks above them')}</figure></div>

  <h2 id="enable">How to turn Arabic on</h2>
  <p>The easiest way is to open the <a href="${x.uLang('ar', 'editor')}">Arabic version of the editor</a>. If you are using the English editor, use the three buttons of the General tab:</p>
  <figure>${shot(x, 'enable-arabic.webp', 1200, 211, 'The General tab with three numbered buttons: Right to left editing, Arabic ligature and Insert special characters')}</figure>
  <ol><li><strong>Right to left editing</strong> – the equation grows from the right and structures are mirrored. Click again to go back.</li><li><strong>Arabic ligature</strong> – the Arabic letters you type join into one connected word. Leave it off to keep letters separate, like variables.</li><li><strong>Insert special characters</strong> – opens the panel; choose <em>Arabic math letters</em>.</li></ol>
  <p class="note">For Arabic-Indic digits, open the “Greek, letters and numbers” tab and use the numeral buttons.</p>

  <h2 id="position">Exact positioning</h2>
  <p>Printed mathematics sometimes needs a letter or a mark a pixel or two away from where an automatic layout puts it. Select the element and open the contextual tab: four arrows move it one pixel per click, and the offset is saved with the formula. The shortcut is Ctrl + Shift + an arrow key.</p>
</div></section>
${cta(x, T.en)}`),
  },

  // ---------------------------------------------------------------------------------------------------------------- guide
  guide: {
    en: { title: 'How to Write Equations Online – Step-by-Step Guide | MathTypeX', description: 'A simple guide: build an equation, type in Arabic, move a symbol exactly, use keyboard shortcuts and download your equation as a PNG image.', h1: 'Guide: how to write equations online', lead: 'Step-by-step help for beginners. No technical knowledge needed.', crumb: 'Guide', og: 'og-home.png' },
    ar: { title: 'دليل كتابة المعادلات على الإنترنت خطوة بخطوة | MathTypeX', description: 'دليل بسيط: ابنِ معادلة، واكتب بالعربية، وحرّك رمزًا بدقة، واستخدم اختصارات لوحة المفاتيح، ونزّل معادلتك صورة PNG.', h1: 'الدليل: كيف تكتب المعادلات على الإنترنت', lead: 'مساعدة خطوة بخطوة للمبتدئين. لا حاجة إلى معرفة تقنية.', crumb: 'الدليل', og: 'og-home-ar.png' },
    body: (x) => (x.lang === 'ar' ? `
<section><div class="narrow prose">
  <nav aria-label="محتويات الصفحة" class="note"><strong>في هذه الصفحة:</strong> <a href="#build">بناء معادلة</a> · <a href="#arabic">الكتابة بالعربية</a> · <a href="#export">تنزيل صورة</a> · <a href="#position">تحريك رمز</a> · <a href="#keys">الاختصارات</a></nav>

  <h2 id="build">١. ابنِ معادلتك الأولى</h2>
  <ol class="steps">
    <li><h3>افتح المحرر</h3><p>انقر <a href="${x.u('editor')}">افتح المحرر</a>. تظهر مساحة بيضاء وفوقها شريط أدوات.</p></li>
    <li><h3>انقر بنية من الشريط</h3><p>مثلًا زر الكسر. يظهر كسر في المعادلة وفيه مربعان فارغان.</p></li>
    <li><h3>اكتب في المربعات</h3><p>اكتب بلوحة المفاتيح. انتقل بين المربعات بأسهم لوحة المفاتيح أو بالنقر.</p></li>
    <li><h3>أكمل بالمزيد</h3><p>أضف جذرًا أو أسًّا أو مصفوفة من الشريط. وإن أخطأت فاضغط Ctrl + Z للتراجع.</p></li>
  </ol>
  <figure>${shot(x, 'editor-ar.webp', 1200, 740, 'المحرر العربي مع معادلة الدرجة الثانية')}</figure>

  <h2 id="arabic">٢. اكتب بالعربية</h2>
  <p>أسهل طريقة أن تفتح <a href="${x.uLang('ar', 'editor')}">المحرر بالنسخة العربية</a>: الواجهة عربية والكتابة من اليمين إلى اليسار منذ البداية.</p>
  <p>وإن كنت في الإنجليزي فاستخدم الأزرار المرقمة في التبويب العام:</p>
  <figure>${shot(x, 'enable-arabic.webp', 1200, 211, 'ثلاثة أزرار مرقمة في التبويب العام')}</figure>
  <ol><li><strong>الكتابة من اليمين إلى اليسار</strong> لتنمو المعادلة من اليمين.</li><li><strong>ربط الأحرف العربية</strong> لتتصل الأحرف في كلمة. اتركه مغلقًا إذا كانت أحرفك متغيرات منفصلة.</li><li><strong>إدراج أحرف خاصة</strong> ثم «الحروف الرياضية العربية» لإدراج الحروف الرياضية وعلامات المشتقة.</li></ol>

  <h2 id="export">٣. نزّل معادلتك صورة</h2>
  <ol class="steps"><li><h3>افتح تبويب PNG</h3><p>تحت المحرر شريط تبويبات؛ انقر «PNG».</p></li><li><h3>انقر تنزيل</h3><p>تُحفظ الصورة في جهازك بخلفية بيضاء.</p></li><li><h3>الصقها حيث تريد</h3><p>في Word أو مستندات Google أو PowerPoint أو صفحة ويب.</p></li></ol>
  <figure>${shot(x, 'export-png.webp', 1200, 740, 'لوحة التصدير تعرض صورة PNG')}</figure>

  <h2 id="position">٤. حرّك رمزًا بدقة</h2>
  <p>حدّد الحرف أو العلامة بالنقر عليه مع السحب أو بـ Shift + الأسهم. ثم افتح <strong>التبويب السياقي</strong> (آخر تبويب) وانقر الأسهم الأربعة لتحريكه بكسلًا في كل مرة.</p>

  <h2 id="keys">اختصارات لوحة المفاتيح</h2>
  <div class="tbl-wrap"><table class="tbl"><tr><th>الاختصار</th><th>الوظيفة</th></tr>
  <tr><td><kbd>Alt</kbd> + <kbd>1</kbd> … <kbd>9</kbd>، <kbd>0</kbd></td><td>تبديل تبويب شريط الأدوات (٠ للتبويب السياقي)</td></tr>
  <tr><td><kbd>Ctrl</kbd> + <kbd>/</kbd></td><td>كسر</td></tr>
  <tr><td><kbd>Ctrl</kbd> + <kbd>↑</kbd> / <kbd>↓</kbd></td><td>أس / رمز سفلي</td></tr>
  <tr><td><kbd>Shift</kbd> + الأسهم</td><td>تحديد</td></tr>
  <tr><td><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + الأسهم</td><td>تحريك المحدَّد بكسل واحد</td></tr>
  <tr><td><kbd>Ctrl</kbd> + <kbd>Z</kbd></td><td>تراجع</td></tr></table></div>
</div></section>
${cta(x, T.ar)}` : `
<section><div class="narrow prose">
  <nav aria-label="On this page" class="note"><strong>On this page:</strong> <a href="#build">Build an equation</a> · <a href="#arabic">Type in Arabic</a> · <a href="#export">Download an image</a> · <a href="#position">Move a symbol</a> · <a href="#keys">Shortcuts</a></nav>

  <h2 id="build">1. Build your first equation</h2>
  <ol class="steps">
    <li><h3>Open the editor</h3><p>Click <a href="${x.u('editor')}">Open the editor</a>. You see a white area with a toolbar above it.</p></li>
    <li><h3>Click a structure on the toolbar</h3><p>For example the fraction button. A fraction appears in your equation with two empty boxes.</p></li>
    <li><h3>Type into the boxes</h3><p>Type with your keyboard. Move between the boxes with the arrow keys or by clicking.</p></li>
    <li><h3>Add more</h3><p>Add a root, a power or a matrix from the toolbar. If you make a mistake, press Ctrl + Z to undo.</p></li>
  </ol>
  <figure>${shot(x, 'editor-en.webp', 1200, 740, 'The MathTypeX editor with the quadratic formula')}</figure>

  <h2 id="arabic">2. Type in Arabic</h2>
  <p>The easiest way is to open the <a href="${x.uLang('ar', 'editor')}">Arabic version of the editor</a>: the interface is Arabic and writing is right to left from the start.</p>
  <p>If you are in the English editor, use the numbered buttons of the General tab:</p>
  <figure>${shot(x, 'enable-arabic.webp', 1200, 211, 'The General tab with three numbered buttons')}</figure>
  <ol><li><strong>Right to left editing</strong> so the equation grows from the right.</li><li><strong>Arabic ligature</strong> so the Arabic letters you type connect into a word. Leave it off if your letters are separate variables.</li><li><strong>Insert special characters</strong>, then <em>Arabic math letters</em>, to insert Arabic mathematical letters and derivative marks.</li></ol>

  <h2 id="export">3. Download your equation as an image</h2>
  <ol class="steps"><li><h3>Open the PNG tab</h3><p>Under the editor there is a row of tabs; click “PNG”.</p></li><li><h3>Click Download</h3><p>The image is saved to your device with a white background.</p></li><li><h3>Paste it where you need it</h3><p>In Word, Google Docs, PowerPoint or a web page.</p></li></ol>
  <figure>${shot(x, 'export-png.webp', 1200, 740, 'The export panel showing the PNG image')}</figure>

  <h2 id="position">4. Move a symbol exactly</h2>
  <p>Select the letter or mark by clicking and dragging over it, or with Shift + the arrow keys. Then open the <strong>contextual tab</strong> (the last tab) and click the four arrows to move it one pixel per click.</p>

  <h2 id="keys">Keyboard shortcuts</h2>
  <div class="tbl-wrap"><table class="tbl"><tr><th>Shortcut</th><th>What it does</th></tr>
  <tr><td><kbd>Alt</kbd> + <kbd>1</kbd> … <kbd>9</kbd>, <kbd>0</kbd></td><td>Switch toolbar tab (0 is the contextual tab)</td></tr>
  <tr><td><kbd>Ctrl</kbd> + <kbd>/</kbd></td><td>Fraction</td></tr>
  <tr><td><kbd>Ctrl</kbd> + <kbd>↑</kbd> / <kbd>↓</kbd></td><td>Superscript / subscript</td></tr>
  <tr><td><kbd>Shift</kbd> + arrows</td><td>Select</td></tr>
  <tr><td><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + arrows</td><td>Move the selection by one pixel</td></tr>
  <tr><td><kbd>Ctrl</kbd> + <kbd>Z</kbd></td><td>Undo</td></tr></table></div>
</div></section>
${cta(x, T.en)}`),
  },

  // ---------------------------------------------------------------------------------------------------------------- faq
  faq: {
    en: { title: 'FAQ – MathTypeX Equation Editor Questions Answered', description: 'Answers about MathTypeX: how to type Arabic equations, how to save an equation as an image, privacy, phones and adding it to your website.', h1: 'Frequently asked questions', lead: 'Short, plain answers.', crumb: 'FAQ', og: 'og-home.png' },
    ar: { title: 'الأسئلة الشائعة – محرر المعادلات MathTypeX', description: 'إجابات عن MathTypeX: كيف تكتب المعادلات بالعربية، وكيف تحفظ المعادلة صورة، والخصوصية، والهاتف، وإضافته إلى موقعك.', h1: 'الأسئلة الشائعة', lead: 'إجابات قصيرة وواضحة.', crumb: 'الأسئلة الشائعة', og: 'og-home-ar.png' },
    body: (x) => `<section><div class="narrow">${faqHtml(x, FAQ[x.lang])}</div></section>${cta(x, T[x.lang])}`,
    faq: true,
  },

  // ---------------------------------------------------------------------------------------------------------------- embed
  embed: {
    en: { title: 'Add an Equation Editor to Your Website | MathTypeX', description: 'Add the MathTypeX equation editor to a web page with a small script. Read the formula as MathML or export a PNG image. Simple steps for web publishers.', h1: 'Add the editor to your website', lead: 'For teachers, bloggers and developers who want an equation editor on their own page.', crumb: 'For websites', og: 'og-home.png' },
    ar: { title: 'أضف محرر معادلات إلى موقعك | MathTypeX', description: 'أضف محرر MathTypeX إلى صفحة ويب بسكربت صغير. اقرأ المعادلة بصيغة MathML أو صدّر صورة PNG. خطوات بسيطة لناشري المواقع.', h1: 'أضف المحرر إلى موقعك', lead: 'للمعلمين والمدوّنين والمطورين الذين يريدون محرر معادلات في صفحتهم.', crumb: 'للمواقع', og: 'og-home-ar.png' },
    body: (x) => (x.lang === 'ar' ? `
<section><div class="narrow prose">
  <p>يُضاف MathTypeX إلى أي صفحة بسكربت واحد. خطوات مختصرة:</p>
  <ol class="steps"><li><h3>ضع حاوية في صفحتك</h3><p>عنصر فارغ يظهر فيه المحرر.</p></li><li><h3>حمّل السكربت</h3><p>ملف <code>editor.js</code> من نسخة MathTypeX الخاصة بك.</p></li><li><h3>أنشئ المحرر</h3><p>اختر اللغة <code>'ar'</code> أو <code>'en'</code>.</p></li></ol>
<pre><code>&lt;div id="editorContainer"&gt;&lt;/div&gt;
&lt;script src="editor.js"&gt;&lt;/script&gt;
&lt;script&gt;
  const editor = MathTypeX.JsEditor.newInstance({ language: 'ar' });
  editor.insertInto(document.getElementById('editorContainer'));
  editor.on('change', (e) =&gt; console.log(e.mathml));   // المعادلة بصيغة MathML
&lt;/script&gt;</code></pre>
  <p>تقرأ المعادلة بـ <code>getMathML()</code> وتحصل على صورة بـ <code>getPNG()</code>، وتضع معادلة بـ <code>setMathML()</code>.</p>
  <p class="note">يعمل المحرر بالكامل في متصفح الزائر دون خادم، لذا يكفي استضافة ملفات ثابتة.</p>
  <p><a class="btn btn-teal" href="https://github.com/Mohammad-Erhim/math-type-x#use-it-on-your-website">التفاصيل الكاملة على جيت هب</a></p>
</div></section>
${cta(x, T.ar)}` : `
<section><div class="narrow prose">
  <p>MathTypeX goes on any page with one script. The short version:</p>
  <ol class="steps"><li><h3>Put a container on your page</h3><p>An empty element where the editor will appear.</p></li><li><h3>Load the script</h3><p>The <code>editor.js</code> file from your copy of MathTypeX.</p></li><li><h3>Create the editor</h3><p>Choose the language <code>'en'</code> or <code>'ar'</code>.</p></li></ol>
<pre><code>&lt;div id="editorContainer"&gt;&lt;/div&gt;
&lt;script src="editor.js"&gt;&lt;/script&gt;
&lt;script&gt;
  const editor = MathTypeX.JsEditor.newInstance({ language: 'en' });
  editor.insertInto(document.getElementById('editorContainer'));
  editor.on('change', (e) =&gt; console.log(e.mathml));   // the formula as MathML
&lt;/script&gt;</code></pre>
  <p>Read the formula with <code>getMathML()</code>, get an image with <code>getPNG()</code>, and set a formula with <code>setMathML()</code>.</p>
  <p class="note">The editor runs entirely in the visitor's browser with no server, so plain static hosting is enough.</p>
  <p><a class="btn btn-teal" href="https://github.com/Mohammad-Erhim/math-type-x#use-it-on-your-website">Full details on GitHub</a></p>
</div></section>
${cta(x, T.en)}`),
  },

  // ---------------------------------------------------------------------------------------------------------------- about
  about: {
    en: { title: 'About MathTypeX – A Visual Equation Editor', description: 'About MathTypeX: why it exists, who builds it, how your privacy is protected, and the credits behind the Arabic math letters.', h1: 'About MathTypeX', lead: 'Why we built it and what we care about.', crumb: 'About', og: 'og-home.png' },
    ar: { title: 'عن MathTypeX – محرر معادلات مرئي', description: 'عن MathTypeX: لماذا وُجد، ومن يبنيه، وكيف تُحمى خصوصيتك، والشكر على أصول الحروف الرياضية العربية.', h1: 'عن MathTypeX', lead: 'لماذا بنيناه وما الذي يهمنا.', crumb: 'عن المشروع', og: 'og-home-ar.png' },
    body: (x) => (x.lang === 'ar' ? `
<section><div class="narrow prose">
  <h2>لماذا MathTypeX؟</h2>
  <p>كتابة الرياضيات على الحاسوب ينبغي أن تكون سهلة. وكتابة الرياضيات العربية ينبغي ألّا تكون استثناءً صعبًا. بنينا MathTypeX محررًا مرئيًا يعمل في المتصفح، يتعامل مع العربية والإنجليزية بجدية متساوية، ويدعم ما تحتاجه الرياضيات العربية المطبوعة: الكتابة من اليمين إلى اليسار، والحروف الرياضية، وعلامات المشتقة، والتحكم الدقيق بالمواضع.</p>
  <h2>الخصوصية</h2>
  <p>يعمل المحرر وتصدير الصور داخل متصفحك، فلا تُرسل معادلاتك إلى أي خادم، ولا يتطلب الموقع تسجيلًا.</p>
  <h2>الشكر</h2>
  <p>أشكال الحروف الرياضية العربية مأخوذة من جداول رموز لوحات المفاتيح الرياضية العربية <em>Zulfi Math</em>. وتُرسم المعادلات بخطوط STIX Two Math وLiberation Sans وNoto العربية المضمَّنة.</p>
  <h2>مشروع مستقل</h2>
  <p>MathTypeX مشروع مستقل. وليس تابعًا لأي شركة محررات معادلات أخرى ولا معتمدًا منها ولا منتجًا من منتجاتها، ولا يشترك معها في أي شيفرة.</p>
  <h2>المشروع والتواصل</h2>
  <p>المشروع متاح على <a href="https://github.com/Mohammad-Erhim/math-type-x">جيت هب</a>؛ يمكنك فتح مسألة هناك لطلب ميزة أو الإبلاغ عن خلل.</p>
</div></section>${cta(x, T.ar)}` : `
<section><div class="narrow prose">
  <h2>Why MathTypeX?</h2>
  <p>Writing mathematics on a computer should be easy. Writing Arabic mathematics should not be a hard exception. We built MathTypeX as a visual editor that runs in the browser, treats English and Arabic with equal seriousness, and supports what printed Arabic mathematics needs: right-to-left writing, mathematical letters, derivative marks and exact control over positions.</p>
  <h2>Privacy</h2>
  <p>The editor and the image export run inside your browser. Your formulas are not sent to a server, and the site needs no sign-up.</p>
  <h2>Credits</h2>
  <p>The shapes of the Arabic math letters come from the symbol tables of the <em>Zulfi Math</em> Arabic keyboard maps. Equations are drawn with the bundled STIX Two Math, Liberation Sans and Noto Arabic faces.</p>
  <h2>An independent project</h2>
  <p>MathTypeX is an independent project. It is not affiliated with, endorsed by or a product of any other equation-editor company, and it shares no code with one.</p>
  <h2>Project and contact</h2>
  <p>The project lives on <a href="https://github.com/Mohammad-Erhim/math-type-x">GitHub</a>; open an issue there to ask for a feature or report a problem.</p>
</div></section>${cta(x, T.en)}`),
  },
};

export { T, faqHtml };
