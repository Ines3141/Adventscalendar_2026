// Lumi Advent Calendar — edit riddle instructions in RIDDLE_TEXT below.
// Edit leaderboard names in leaderboard.js.

"use strict";
const EDITOR_MODE = false;
/** Original, synthesized sound effects. All sound requires an explicit opt-in. */
let context;
let enabled = localStorage.getItem('winter-sound') !== 'off';
function soundEnabled() { return enabled; }
function toggleSound() {
    enabled = !enabled;
    localStorage.setItem('winter-sound', enabled ? 'on' : 'off');
    if (enabled)
        playSound('arrival');
    return enabled;
}
function tone(ctx, hz, start, duration, volume, shape = 'sine', endHz) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = shape;
    osc.frequency.setValueAtTime(hz, start);
    if (endHz)
        osc.frequency.exponentialRampToValueAtTime(endHz, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(.035, duration / 4));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + .01);
}
const files = { door: 'wooden-door-creak.wav', magic: 'magic-chime.wav', success: 'success-chime.wav', choir: 'angelic-ahh.wav' };
function playSound(kind) {
    if (!enabled)
        return;
    const file = files[kind];
    if (file) {
        const a = new Audio(`${'./'}audio/${file}`);
        a.volume = kind === 'door' ? .55 : kind === 'choir' ? .48 : .32;
        void a.play().catch(() => { });
        return;
    }
    try {
        context ?? (context = new AudioContext());
        const ctx = context;
        if (ctx.state === 'suspended')
            void ctx.resume();
        const now = ctx.currentTime + .025;
        if (kind === 'door') {
            // Low, wavering wooden-hinge creak, synthesized locally (no external recording).
            const osc = ctx.createOscillator();
            const filter = ctx.createBiquadFilter();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(105, now);
            osc.frequency.linearRampToValueAtTime(78, now + .28);
            osc.frequency.linearRampToValueAtTime(137, now + .49);
            osc.frequency.linearRampToValueAtTime(88, now + .68);
            filter.type = 'lowpass';
            filter.frequency.value = 420;
            gain.gain.setValueAtTime(.0001, now);
            gain.gain.linearRampToValueAtTime(.045, now + .12);
            gain.gain.linearRampToValueAtTime(.022, now + .42);
            gain.gain.exponentialRampToValueAtTime(.0001, now + .7);
            osc.connect(filter).connect(gain).connect(ctx.destination);
            osc.start(now);
            osc.stop(now + .71);
            return;
        }
        const melodies = {
            door: [330, 440, 554, 659], success: [523, 659, 784, 1047, 1319],
            hint: [880, 740, 988], toggle: [523, 784], wrong: [330, 294],
            arrival: [392, 494, 587, 784, 988, 1175], flutter: [660, 880, 740, 1047, 880],
            magic: [784, 988, 1175, 1568], return: [784, 587, 494], choir: [392, 494, 587, 784]
        };
        const step = kind === 'arrival' ? .16 : kind === 'success' ? .13 : .105;
        const duration = kind === 'arrival' ? .62 : kind === 'wrong' ? .23 : .39;
        melodies[kind].forEach((hz, i) => tone(ctx, hz, now + i * step, duration, kind === 'arrival' ? .038 : .035, kind === 'wrong' ? 'triangle' : 'sine'));
        if (kind === 'flutter' || kind === 'arrival') {
            for (let i = 0; i < 6; i++)
                tone(ctx, 1100 + i * 130, now + i * .085, .16, .008, 'triangle', 1700 + i * 120);
        }
        if (kind === 'success' || kind === 'magic') {
            for (let i = 0; i < 9; i++)
                tone(ctx, 850 + i * 85, now + i * .06, .24, .007, 'sine');
        }
    }
    catch { /* Sound is optional; never interrupt gameplay. */ }
}


const root = document.querySelector('#app');
const base = './';
let lang = localStorage.getItem('winter-lang') === 'en' ? 'en' : 'de';
let name = localStorage.getItem('winter-player-name') || '';
let welcomed = localStorage.getItem('winter-new-welcome') === 'yes';
let active = 0;
let riddleOpen = false;
let cinematic = false;
let peeking = false;
let sent = new Set(JSON.parse(localStorage.getItem('winter-sent-days') || '[]'));
let preview = EDITOR_MODE && localStorage.getItem('winter-preview') === 'yes';
let leaders = [];
let leaderboardOpen = false;
function countdownDays() { const now = new Date(); const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear(); const target = new Date(year, 11, 1); return Math.max(0, Math.ceil((target.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000)); }
function countdown() {
    const n = countdownDays(); if (n === 0)
        return ''; const de = lang === 'de'; return `<section class="tear-countdown" aria-label="${de ? 'Countdown bis Dezember' : 'Countdown to December'}"><div class="tear-pin">✦</div><div class="tear-top">${de ? 'NOCH' : 'ONLY'}</div><div class="tear-number">${n}</div><div class="tear-bottom">${de ? (n === 1 ? 'TAG BIS ZUM ADVENT' : 'TAGE BIS ZUM ADVENT') : (n === 1 ? 'DAY UNTIL ADVENT' : 'DAYS UNTIL ADVENT')}</div><div class="tear-perforation">✂ ┄ ┄ ┄ ┄ ┄ ┄</div><p>${de ? 'Lumi zählt die Tage bis zum ersten Türchen!' : 'Lumi is counting down to the first door!'}</p><button class="countdown-share" id="share-countdown">${de ? '✉ Einladung teilen' : '✉ Share invitation'}</button></section>`;
}
function leaderboard() { const de = lang === 'de'; return `<section class="leaderboard" id="leaderboard"><div class="leaderboard-heading"><div><span class="eyebrow">✦ ${de ? 'STERNENRANGLISTE' : 'STAR RANKINGS'} ✦</span><h2>🏆 ${de ? 'Lumis Sternen-Champions' : 'Lumi’s Star Champions'}</h2></div><button id="toggle-leaderboard" aria-expanded="${leaderboardOpen}">${leaderboardOpen ? (de ? 'Weniger' : 'Less') : (de ? 'Rangliste ansehen' : 'View rankings')} ${leaderboardOpen ? '⌃' : '⌄'}</button></div><p>${de ? 'Schick Ines deinen Namen und deine gesammelten Sterne. Die Rangliste wird von Hand aktualisiert.' : 'Send Ines your name and the stars you have collected. The leaderboard is updated manually.'}</p>${leaderboardOpen ? `<div class="leaderboard-list">${leaders.length ? leaders.map((entry, i) => `<div class="leaderboard-entry"><span class="leaderboard-rank">${['🥇', '🥈', '🥉'][i] || '#' + (i + 1)}</span><strong>${esc(entry.name)}</strong><span>⭐ ${entry.stars}</span></div>`).join('') : `<div class="leaderboard-empty">${de ? 'Noch keine Champions! Sei dabei und sichere dir deinen Platz.' : 'No champions yet! Join in and claim your place.'}</div>`}</div>` : ''}</section>`; }
function loadLeaderboard() {
    leaders = (window.LUMI_LEADERBOARD || [])
        .filter(x => x && typeof x.name === 'string' && Number.isInteger(x.stars) && x.stars >= 0 && x.stars <= 24)
        .map(x => ({ name: x.name.slice(0, 28), stars: x.stars }))
        .sort((a, b) => b.stars - a.stars).slice(0, 50);
}
const tr = {
    en: { title: 'The Three Lost Winter Stars', subtitle: 'A little winter mystery, just for you', hello: 'A winter adventure is waiting for you.', welcome: 'Oh no! Lumi dropped the three stars, and their magical pieces scattered across the winter world! Help her find the missing star fragments. Behind each Advent door, a new riddle brings you one step closer to making the Winter Star shine again.', enter: 'Enter your name', placeholder: 'Your name', begin: 'Begin the adventure', skip: 'Skip', calendar: 'Your Advent Calendar', doors: 'Choose a door to discover today’s surprise', preview: 'Preview all doors', door: 'Door', locked: 'Opens in December', back: 'Back to calendar', story: 'A little message from Lumi', storyText: 'A new piece of winter magic is waiting behind this door. Are you ready to take a closer look?', open: 'Open riddle', send: 'Send to me', sent: 'A little sparkle for you! ✨', sentNote: 'This is a celebration only — nothing is sent yet.', close: 'Close', riddle: 'Your A4 riddle will appear here', empty: 'Add your finished PowerPoint puzzle as an image when you are ready.', print: 'Print A4', nameNote: 'Your name stays on this device.', change: 'Change name', replay: 'Welcome page', language: 'Deutsch', day: 'Day', hint: 'Click the small × to return to the door.', noName: 'Winter guest', watch: 'Watch the film', skipFilm: 'Skip film', filmTitle: 'The Three Lost Winter Stars', filmHelp: 'oh no! Lumi dropped the stars, and their pieces scattered everywhere! Help her find the missing fragments and make the Winter Star shine again.', replayFilm: 'Replay film' },
    de: { title: 'Die drei verlorenen Wintersterne', subtitle: 'Ein kleines Wintergeheimnis nur für dich', hello: 'Ein Winterabenteuer wartet auf dich.', welcome: 'Oh nein! Lumi hat die drei Sterne fallen lassen! Ihre magischen Splitter sind überall in der Winterwelt verstreut. Hilf Lumi, die verlorenen Sternensplitter wiederzufinden! Hinter jedem Adventstürchen wartet ein Rätsel, das euch dem leuchtenden Winterstern ein Stück näherbringt.', enter: 'Wie heißt du?', placeholder: 'Dein Name', begin: 'Abenteuer beginnen', skip: 'Überspringen', calendar: 'Dein Adventskalender', doors: 'Wähle ein Türchen und entdecke die Überraschung', preview: 'Alle Türchen ansehen', door: 'Türchen', locked: 'Öffnet im Dezember', back: 'Zurück zum Kalender', story: 'Eine Nachricht von Lumi', storyText: 'Hinter diesem Türchen wartet ein neuer Funke Wintermagie. Bist du bereit?', open: 'Rätsel öffnen', send: 'An mich senden', sent: 'Ein kleiner Zauberfunke für dich! ✨', sentNote: 'Das ist nur eine Animation – es wird noch nichts verschickt.', close: 'Schließen', riddle: 'Hier erscheint dein A4-Rätsel', empty: 'Füge später dein fertiges PowerPoint-Rätsel als Bild ein.', print: 'A4 drucken', nameNote: 'Dein Name bleibt auf diesem Gerät.', change: 'Namen ändern', replay: 'Willkommensseite', language: 'English', day: 'Tag', hint: 'Mit dem kleinen × kommst du zurück.', noName: 'Wintergast', watch: 'Film ansehen', skipFilm: 'Film überspringen', filmTitle: 'Die drei verlorenen Wintersterne', filmHelp: 'oh nein! Lumi hat die Sterne fallen lassen! Hilf ihr, die verlorenen Sternensplitter wiederzufinden, damit der Winterstern wieder leuchten kann.', replayFilm: 'Film erneut ansehen' }
};
const esc = (v) => v.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function available(day) {
    const now = new Date();
    return preview || (
        now.getMonth() === 11 &&
        now.getDate() >= day
    );
}

// Secret testing command for Lumi's creator
window.lumiEditor = function (enabled = true) {
    preview = enabled;
    render();
    console.log(
        enabled
            ? "🎄 Lumi editor mode ON — all doors unlocked!"
            : "🎄 Lumi editor mode OFF — normal calendar!"
    );
};
function elf(size = 'small') { return `<img class="elf elf-${size}" src="${base}lumi-illustrated.png" alt="Lumi, the winter elf" />`; }
function snow() { return `<div class="floating-snow" aria-hidden="true">${Array.from({ length: 22 }, (_, i) => `<i style="--i:${i};--x:${(i * 37) % 100}%;--d:${(i * 7) % 15}s;--t:${12 + (i % 8) * 2}s">${i % 3 === 0 ? '❄' : '✧'}</i>`).join('')}</div>`; }
function soundButton() { return `<button id="sound-toggle" class="sound-toggle" aria-label="Toggle sounds" aria-pressed="${soundEnabled()}">${soundEnabled() ? '🔊' : '🔇'}</button>`; }
function welcome() { const t = tr[lang]; return `<main class="welcome-page">${snow()}<div class="snow-fall" aria-hidden="true">✧ ❄ ✦ ❄ ✧</div><div class="welcome-panel"><div class="brand">✦ ${esc(t.title)} ✦</div>${elf('big')}<h1>${t.hello}</h1><p>${t.welcome}</p><label for="name-input">${t.enter}</label><input id="name-input" maxlength="28" autocomplete="nickname" placeholder="${t.placeholder}" value="${esc(name)}" /><small>${t.nameNote}</small>${countdown()}<div class="welcome-actions"><button id="begin" class="gold-button">${t.begin} ✨</button><button id="peek-calendar" class="text-button">${lang === 'de' ? 'Möchtest du schon mal lunsen? 👀' : 'Want a little sneak peek? 👀'}</button></div><button id="language" class="language-button">${t.language}</button>${soundButton()}<audio id="intro-music" loop preload="none" src="${base}audio/intro-clarinet.mp3"></audio></div></main>`; }
function film() { const t = tr[lang]; const person = esc(name || t.noName); return `<main class="film-page"><section class="film-panel"><video id="lumi-film" controls playsinline autoplay preload="auto" aria-label="${t.filmTitle}"><source src="${base}cinematics/lumi-${lang}.mp4" type="video/mp4" /></video><button id="finish-film" class="film-skip-button">${t.skipFilm}</button></section></main>`; }
function calendar() {
    const t = tr[lang]; return `<main class="calendar-page">${snow()}<header class="topbar"><div class="brand">✦ ${esc(t.title)} ✦</div><div class="top-actions">${soundButton()}<button id="language">${t.language}</button><button id="replay-film">${t.replayFilm}</button><button id="replay">${t.replay}</button></div></header><section class="calendar-heading">${elf()}<div><p class="eyebrow">✧ ${esc(name || t.noName)} ✧</p><h1>${t.calendar}</h1><p>${t.doors}</p></div></section>${peeking ? `<div class="peek-banner">${lang === 'de' ? 'Psst … nur mal lunsen! Die Türchen öffnen sich im Dezember.' : 'Psst … just a sneak peek! The doors open in December.'} <button id="back-to-countdown">${lang === 'de' ? 'Zurück zum Countdown' : 'Back to countdown'}</button></div>` : ''}${leaderboard()}<div class="doors">${Array.from({ length: 24 }, (_, i) => { const d = i + 1, enabled = available(d); return `<button class="door ${enabled ? '' : 'locked'} ${sent.has(d) ? 'sent' : ''}" data-day="${d}" ${enabled ? '' : 'disabled'} aria-label="${t.door} ${d}"><span class="door-face"><span class="door-ornament">✦</span><strong>${d}</strong><span class="door-bottom">${sent.has(d) ? '♥' : enabled ? '✧' : '❄'}</span><span class="door-knob"></span></span></button>`; }).join('')}</div>

<div class="calendar-footer">
  ${EDITOR_MODE ? `<label><input id="preview" type="checkbox" ${preview ? 'checked' : ''}/> ${t.preview}</label>` : ''}
  <button id="change-name">${t.change}</button>
</div></main>`;
}

// EDIT HERE: Each day's riddle title and instructions. Keep story text separate.
const RIDDLE_TEXT = {
    1: {
        en: [
            'Lumi’s Word Labyrinth',
            'Oh no! Lumi has knocked over the word shaker, and now these words are missing:\n\nTREE · EVENT · TRAVEL · KIND · GIFT · FAIR · SAND · CANDY · TEAR\n\nCan you help her find them?\n\nColour in the squares containing the words using any colour you like.\n\nSuddenly, a labyrinth appears! Find the shortest path through it to discover the final missing word.\n\nWhat is it? Send your answer to Lumi!'
        ],
        de: [
            'Lumis Wörterlabyrinth',
            'Oh nein! Lumi hat den Wörterstreuer umgeschüttet! Nun sind diese Wörter verschwunden:\n\nBAUM · UMZUG · WUNSCH · LIED · MOND · LIEB · JAHR · STERN · LAUB\n\nKannst du Lumi helfen, sie wiederzufinden?\n\nMale die Kästchen mit den gefundenen Wörtern in einer Farbe deiner Wahl aus.\n\nPlötzlich erscheint ein Labyrinth! Finde den kürzesten Weg hindurch und entdecke das letzte vermisste Wort.\n\nWelches ist es? Schicke deine Lösung an Lumi!'
        ]
    },
    2: { en: ['The Hidden Connection', 'What do these four pictures have in common? Look closely — it is not the frame!'], de: ['Die verborgene Gemeinsamkeit', 'Was haben diese vier Bilder gemeinsam? Schau genau hin – es ist nicht der Rahmen!'] },
    3: { en: ['Lines Through Time', 'Connect each historical event to the correct year. What do your lines cross out?'], de: ['Linien durch die Zeit', 'Verbinde jedes historische Ereignis mit dem richtigen Jahr. Was streichen deine Verbindungslinien durch?'] },
    4: { en: ['One Left Behind', 'Find all matching pairs. One item has no partner. Which is it?'], de: ['Eines bleibt übrig', 'Finde alle zusammengehörenden Paare. Ein Element hat keinen Partner. Welches?'] },
    5: { en: ['Snowflake Nonogram', 'Use the row and column numbers to fill consecutive groups of squares; separate groups by at least one empty square. Bright snowflakes stand out against the dark grid. What letter appears?'], de: ['Schneeflocken-Nonogramm', 'Fülle anhand der Zeilen- und Spaltenzahlen zusammenhängende Felder aus; zwischen Gruppen bleibt mindestens ein Feld frei. Helle Schneeflocken leuchten auf dunklem Grund. Welcher Buchstabe entsteht?'] },
    6: { en: ['The Last Gear', 'In which direction does the final gear turn?'], de: ['Das letzte Zahnrad', 'In welche Richtung dreht sich das letzte Zahnrad?'] },
    7: { en: ['Lumi’s Paper Disaster', 'Oh no! Lumi cut everything into pieces. Help put them back together. What do you find?'], de: ['Lumis Papierschlamassel', 'Oh nein! Lumi hat alles zerschnitten. Hilf ihr, die Teile wieder zusammenzusetzen. Was entdeckst du?'] },
    8: { en: ['Sudoku', 'Complete the Sudoku using the clues in the grid.'], de: ['Sudoku', 'Vervollständige das Sudoku mithilfe der vorgegebenen Zahlen.'] },
    9: { en: ['A Puzzle in the Instructions', 'The instructions on your puzzle are part of the riddle. Read them carefully.'], de: ['Ein Rätsel in der Anleitung', 'Die Anweisungen auf deinem Rätsel gehören zur Aufgabe. Lies sie aufmerksam.'] },
};
function riddleCopy(day) { return RIDDLE_TEXT[day]?.[lang] || (lang === 'de' ? ['Dein Rätsel', 'Sieh dir das Rätsel genau an und finde die Lösung.'] : ['Your Riddle', 'Study the puzzle carefully and find the answer.']); }
const backgroundMusic = new Audio(`${base}audio/intro-clarinet.mp3`);
backgroundMusic.loop = true;
backgroundMusic.volume = .10;
function syncBackgroundMusic() {
    if (cinematic || !soundEnabled()) {
        backgroundMusic.pause();
        return;
    }
    // A browser permits playback after the visitor's first interaction.
    if (!backgroundMusic.paused)
        return;
}
function startBackgroundMusic() {
    if (!cinematic && soundEnabled())
        void backgroundMusic.play().catch(() => { });
}
function modal() {
    if (!active)
        return ''; const t = tr[lang]; const pad = String(active).padStart(2, '0'); return `<div class="modal-backdrop ${riddleOpen ? 'riddle-view' : 'story-view'}" id="modal-backdrop"><section class="modal-card" role="dialog" aria-modal="true" aria-label="${t.door} ${active}"><button class="close" id="close-modal" aria-label="${t.close}">×</button>${riddleOpen ? `<div class="paper-tools"><button id="back-to-story" type="button">← ${lang === 'de' ? 'Zu Lumis Geschichte' : 'Back to Lumi'}</button><span>✦ ${t.day} ${pad} ✦</span><button id="print">🖨 ${t.print}</button></div><p class="rotate-hint">↻ ${lang === 'de' ? 'Drehe dein Handy ins Querformat, um das Rätsel größer zu sehen.' : 'Turn your phone sideways for a larger puzzle.'}</p><div class="riddle-sheet" id="a4-paper"><div class="riddle-sheet-header"><span class="riddle-day">✦ ${t.day} ${pad} ✦</span><h2>${esc(riddleCopy(active)[0])}</h2><p>${esc(riddleCopy(active)[1])}</p></div><div class="riddle-sheet-art"><img id="riddle-image" alt="${t.day} ${active}" src="${base}riddles/day-${pad}-${lang}.png" /><div class="a4-placeholder" id="a4-placeholder"><span>${t.riddle}</span></div></div></div><p class="modal-hint">${t.hint}</p>` : `<div class="door-modal-heading"><span class="eyebrow">✦ ${t.door} ${pad} ✦</span>${elf()}<h2>${esc(t.story)}</h2><p>${esc(t.storyText)}</p></div><button class="gold-button open-riddle" id="open-riddle">${t.open} ✧</button><button class="story-back" id="back-to-calendar">← ${t.back}</button><label class="send-row"><input id="send" type="checkbox" ${sent.has(active) ? 'checked' : ''}/><span>${t.send}</span></label><div class="send-celebration ${sent.has(active) ? 'show' : ''}" id="send-celebration"><span class="sparkles">✧ ✦ ✧</span><strong>${t.sent}</strong><small>${t.sentNote}</small></div>`}</section></div>`;
}
function render() { document.documentElement.lang = lang; document.body.classList.toggle('modal-open', !!active); root.innerHTML = (cinematic ? film() : !welcomed ? welcome() : calendar()) + modal(); syncBackgroundMusic(); bind(); }
function bind() {
    document.querySelector('#peek-calendar')?.addEventListener('click', () => { peeking = true; welcomed = true; cinematic = false; render(); startBackgroundMusic(); });
    document.querySelector('#back-to-countdown')?.addEventListener('click', () => { peeking = false; welcomed = false; cinematic = false; render(); });
    document.querySelector('#toggle-leaderboard')?.addEventListener('click', () => { leaderboardOpen = !leaderboardOpen; render(); });
    document.querySelector('#share-countdown')?.addEventListener('click', async () => {
        const de = lang === 'de'; const message = de ? '✨ Lumi lädt dich zu einem magischen Adventsabenteuer ein! Schick mir deinen Namen, damit du bei Lumis Sternen-Champions mitmachen kannst. 🎄' : '✨ Lumi invites you to a magical Advent adventure! Send me your name to join Lumi’s Star Champions. 🎄'; const text = message + ' ' + location.href; try {
            if (navigator.share) {
                await navigator.share({ title: tr[lang].title, text: message, url: location.href });
                return;
            }
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
                const b = document.querySelector('#share-countdown');
                if (b)
                    b.textContent = de ? '✓ Einladung kopiert' : '✓ Invitation copied';
                return;
            }
        }
            catch { /* user cancelled or clipboard unavailable */ } window.prompt(de ? 'Einladung kopieren:' : 'Copy invitation:', text);
    });
    document.querySelector('#sound-toggle')?.addEventListener('click', () => {
        const on = toggleSound(); const btn = document.querySelector('#sound-toggle'); if (btn) {
            btn.textContent = on ? '🔊' : '🔇';
            btn.setAttribute('aria-pressed', String(on));
        } if (on)
            startBackgroundMusic();
        else
            backgroundMusic.pause();
    });
    document.querySelector('#language')?.addEventListener('click', () => { lang = lang === 'en' ? 'de' : 'en'; localStorage.setItem('winter-lang', lang); render(); });
    document.querySelector('#name-input')?.addEventListener('input', e => { name = e.target.value.slice(0, 28); });
    const finish = () => { backgroundMusic.pause(); name = name.trim(); localStorage.setItem('winter-player-name', name); welcomed = true; peeking = false; localStorage.setItem('winter-new-welcome', 'yes'); cinematic = true; playSound('magic'); render(); };
    document.querySelector('#begin')?.addEventListener('click', finish);
    document.querySelector('#name-input')?.addEventListener('focus', startBackgroundMusic);
    document.querySelector('#skip')?.addEventListener('click', finish);
    document.querySelector('#replay')?.addEventListener('click', () => { cinematic = false; welcomed = false; render(); startBackgroundMusic(); });
    document.querySelector('#replay-film')?.addEventListener('click', () => { cinematic = true; backgroundMusic.pause(); render(); });
    const doneFilm = () => { cinematic = false; render(); startBackgroundMusic(); };
    document.querySelector('#finish-film')?.addEventListener('click', doneFilm);
    document.querySelector('#lumi-film')?.addEventListener('ended', doneFilm);
    document.querySelector('#change-name')?.addEventListener('click', () => { welcomed = false; render(); });
    document.querySelector('#preview')?.addEventListener('change', e => {
        if (!EDITOR_MODE) return;
        preview = e.target.checked;
        localStorage.setItem('winter-preview', preview ? 'yes' : 'no');
        render();
    });
    document.querySelectorAll('[data-day]').forEach(b => b.addEventListener('click', () => {
        if (b.classList.contains('opening'))
            return;
        startBackgroundMusic();
        const d = Number(b.dataset.day);
        b.classList.add('opening');
        b.disabled = true;
        playSound('door');
        // Shorter reveal: creak, a brief beat, then the choir.
        window.setTimeout(() => playSound('choir'), 1050);
        // Show Lumi's task page first. Never open the A4 riddle automatically.
        window.setTimeout(() => { active = d; riddleOpen = false; render(); }, 1550);
    }));
    const close = () => {
        if (riddleOpen) {
            riddleOpen = false;
        }
        else {
            active = 0;
        } render();
    };
    document.querySelector('#close-modal')?.addEventListener('click', close);
    document.querySelector('#modal-backdrop')?.addEventListener('click', e => {
        if (e.target === e.currentTarget) {
            active = 0;
            riddleOpen = false;
            render();
        }
    });
    document.querySelector('#open-riddle')?.addEventListener('click', () => { riddleOpen = true; render(); });
    document.querySelector('#back-to-story')?.addEventListener('click', () => { riddleOpen = false; render(); });
    document.querySelector('#back-to-calendar')?.addEventListener('click', () => { active = 0; riddleOpen = false; render(); });
    document.querySelector('#send')?.addEventListener('change', e => {
        if (e.target.checked)
            sent.add(active);
        else
            sent.delete(active); localStorage.setItem('winter-sent-days', JSON.stringify([...sent])); if (sent.has(active))
            playSound('success'); render();
    });
    const img = document.querySelector('#riddle-image');
    if (img) {
        const fail = () => { img.style.display = 'none'; document.querySelector('#a4-placeholder').style.display = 'flex'; };
        img.addEventListener('error', fail);
        img.addEventListener('load', () => { img.style.display = 'block'; document.querySelector('#a4-placeholder').style.display = 'none'; });
        if (img.complete) {
            if (img.naturalWidth)
                document.querySelector('#a4-placeholder').style.display = 'none';
            else
                fail();
        }
    }
    document.querySelector('#print')?.addEventListener('click', () => window.print());
    document.addEventListener('keydown', onEscape, { once: true });
}
function onEscape(e) {
    if (e.key === 'Escape' && active) {
        active = 0;
        riddleOpen = false;
        render();
    }
}
render();
void loadLeaderboard();
