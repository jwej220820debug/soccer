const teams = [
    "전기과", "기계과",
    "로봇소재융합과", "로봇기계과",
    "반도체과", "건축토목과"
];

// 6 teams -> 8 slots. 2 Byes.
// Structure:
// Round 1 (8 slots, 4 matches). (Quarter-Finals)
// Round 2 (4 slots, 2 matches). (Semi-Finals)
// Round 3 (2 slots, 1 match). (Final)

let bracketData = [];

function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

function initBracket() {
    const shuffledTeams = shuffle([...teams]);
    const slots = 8;
    const byesCount = slots - shuffledTeams.length; // 2

    // We need 4 matches in R1.
    // 2 matches will be "Team vs BYE" (2 teams involved)
    // 2 matches will be "Team vs Team" (4 teams involved)
    // Total 6 teams.

    const realTeams = [...shuffledTeams];
    const round1Matches = [];

    // Create 2 matches with Byes
    for (let i = 0; i < byesCount; i++) {
        const team = realTeams.pop();
        round1Matches.push({
            p1: team,
            p2: "부전승(BYE)",
            winner: team,
            status: 'decided'
        });
    }

    // Create remaining matches (should be 2 matches for remaining 4 teams)
    while (realTeams.length > 0) {
        const t1 = realTeams.pop();
        const t2 = realTeams.pop();
        round1Matches.push({
            p1: t1,
            p2: t2,
            winner: null,
            status: 'pending'
        });
    }

    // Shuffle the order of matches for bracket positions
    const shuffledMatches = shuffle(round1Matches);

    renderBracket(shuffledMatches);
}

function renderBracket(round1Matches) {
    const r1Div = document.getElementById('round1');
    const r2Div = document.getElementById('round2');
    const r3Div = document.getElementById('round3');
    const winnerDiv = document.getElementById('winner');

    r1Div.innerHTML = '';
    r2Div.innerHTML = '';
    r3Div.innerHTML = '';
    if (winnerDiv) winnerDiv.innerHTML = '<div class="match-winner"><div class="team-box winner-box">🏆 우승</div></div>';

    // We need to maintain state. We can attach data to DOM or keep a state object.
    // Let's keep a global state for the active tournament.
    window.tournamentState = {
        r1: round1Matches, // 4 matches
        r2: Array(2).fill({ p1: null, p2: null, winner: null }), // 2 matches
        r3: Array(1).fill({ p1: null, p2: null, winner: null }), // 1 match
        champion: null
    };

    renderRound1();
    renderRound2();
    renderRound3();
    updateWinnerBox();
}

function createMatchElement(matchData, matchIndex, roundName) {
    const el = document.createElement('div');
    el.className = 'match';
    el.dataset.index = matchIndex;
    el.dataset.round = roundName;

    // Player 1
    const p1 = document.createElement('div');
    p1.className = `team ${matchData.winner === matchData.p1 && matchData.p1 ? 'winner' : ''} ${matchData.p1 === '부전승(BYE)' ? 'bye' : ''}`;
    p1.textContent = matchData.p1 || '-';
    p1.onclick = () => handleMatchClick(roundName, matchIndex, 'p1');

    // Player 2
    const p2 = document.createElement('div');
    p2.className = `team ${matchData.winner === matchData.p2 && matchData.p2 ? 'winner' : ''} ${matchData.p2 === '부전승(BYE)' ? 'bye' : ''}`;
    p2.textContent = matchData.p2 || '-';
    p2.onclick = () => handleMatchClick(roundName, matchIndex, 'p2');

    el.appendChild(p1);
    el.appendChild(p2);

    // Connector (Visual mainly, using CSS now)
    return el;
}

function renderRound1() {
    const container = document.getElementById('round1');
    container.innerHTML = '';
    window.tournamentState.r1.forEach((match, idx) => {
        const el = createMatchElement(match, idx, 'r1');
        container.appendChild(el);

        // If auto-win (bye), propagate immediately if not already done?
        // Actually, we should propagate recursively at the end of render or on click.
        // Let's just render what we have.
        // But for the initial state where Byes exist, we must ensure Round 2 has those winners.
    });
    updateNextRounds();
}

function renderRound2() {
    const container = document.getElementById('round2');
    container.innerHTML = '';
    window.tournamentState.r2.forEach((match, idx) => {
        const el = createMatchElement(match, idx, 'r2');
        container.appendChild(el);
    });
}

function renderRound3() {
    const container = document.getElementById('round3');
    container.innerHTML = '';
    window.tournamentState.r3.forEach((match, idx) => {
        const el = createMatchElement(match, idx, 'r3');
        container.appendChild(el);
    });
    updateWinnerBox();
}

function updateWinnerBox() {
    const winBox = document.querySelector('.winner-box');
    if (winBox) {
        winBox.textContent = window.tournamentState.champion ? `🏆 ${window.tournamentState.champion}` : '🏆 우승';
    }
}

function handleMatchClick(round, idx, player) {
    const state = window.tournamentState;
    const match = state[round][idx];

    // If match is not ready (missing players), ignore
    if (!match.p1 || !match.p2) return;
    if (match.p1 === '부전승(BYE)' || match.p2 === '부전승(BYE)') return; // Should be auto-handled, but user might click

    const winnerName = player === 'p1' ? match.p1 : match.p2;

    // Toggle winner or set winner
    if (match.winner === winnerName) {
        match.winner = null; // Deselect
    } else {
        match.winner = winnerName;
    }

    updateNextRounds();
    reRenderAll();
}

function updateNextRounds() {
    const s = window.tournamentState;

    // Propagate R1 -> R2 (4 matches -> 2 matches)
    for (let i = 0; i < 2; i++) {
        const m1 = s.r1[i * 2];
        const m2 = s.r1[i * 2 + 1];

        // Determine winners of previous round matches to populate this round's players
        s.r2[i] = {
            p1: m1.winner || null,
            p2: m2.winner || null,
            winner: s.r2[i].winner // Keep existing winner if valid? tricky.
        };

        // If the current winner is no longer one of the players (because a previous selection changed), reset it.
        if (s.r2[i].winner && s.r2[i].winner !== s.r2[i].p1 && s.r2[i].winner !== s.r2[i].p2) {
            s.r2[i].winner = null;
        }
    }

    // Propagate R2 -> R3 (2 matches -> 1 match)
    {
        const m1 = s.r2[0];
        const m2 = s.r2[1];

        s.r3[0] = {
            p1: m1.winner || null,
            p2: m2.winner || null,
            winner: s.r3[0].winner
        };
        if (s.r3[0].winner && s.r3[0].winner !== s.r3[0].p1 && s.r3[0].winner !== s.r3[0].p2) {
            s.r3[0].winner = null;
        }
    }

    // Champion
    if (s.r3[0].winner) {
        s.champion = s.r3[0].winner;
    } else {
        s.champion = null;
    }
}

function reRenderAll() {
    renderRound1();
    renderRound2();
    renderRound3();
    updateWinnerBox();
}

document.getElementById('shuffleBtn').addEventListener('click', initBracket);
document.getElementById('resetBtn').addEventListener('click', () => {
    document.getElementById('round1').innerHTML = '';
    document.getElementById('round2').innerHTML = '';
    document.getElementById('round3').innerHTML = '';
    const winBox = document.querySelector('.winner-box');
    if (winBox) winBox.textContent = '🏆 우승';
});

// Navigation Logic
function showSection(sectionId) {
    // Hide all sections
    const sections = ['bracket-section', 'info-section', 'history-section', 'analysis-section', 'prize-section'];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    // Special mapping for menu items to section IDs
    let targetId = sectionId;
    if (sectionId === 'info') targetId = 'info-section';
    if (sectionId === 'history') targetId = 'history-section';
    if (sectionId === 'analysis') targetId = 'analysis-section';
    if (sectionId === 'prize') targetId = 'prize-section';
    if (sectionId === 'bracket') targetId = 'bracket-section';

    const target = document.getElementById(targetId);
    if (target) {
        target.style.display = 'block';
    }
}

// Init on load
document.addEventListener('DOMContentLoaded', () => {
    initBracket();
    // Default view is bracket
    showSection('bracket');
});
