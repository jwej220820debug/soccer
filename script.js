const teams = [
    "전기 1-1", "전기 1-2",
    "기계 1-1", "기계 1-2",
    "로봇소재융합 1-1", "로봇소재융합 1-2",
    "로봇기계 1-1", "로봇기계 1-2",
    "반도체 1-1", "반도체 1-2",
    "건축토목 1-1", "건축토목 1-2"
];

// 12 teams -> 16 slots. 4 Byes.
// Structure:
// Round 1 (16 slots, 8 matches). 
// Since we have 4 byes, 4 matches in round 1 will be "Team vs Bye".
// When "Team vs Bye" happens, the Team automatically advances to Round 2.
// So visually:
// Round 1 will show the matches that actually happen + the byes feeding in.

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
    const slots = 16;
    const byesCount = slots - shuffledTeams.length; // 4

    // We need to distribute byes. 
    // Usually byes are placed to give the highest seeds an advantage, but here it's random.
    // We'll place byes at indices 0, 4, 8, 12 (every 4th slot? or just pair them up?)
    // A standard bracket pairs: (0,1), (2,3), (4,5), (6,7)...
    // Detailed match structure:
    // Match 1: Slot 0 vs Slot 1
    // Match 2: Slot 2 vs Slot 3
    // ...
    // Match 8: Slot 14 vs Slot 15

    // If we have 4 byes, we want 4 matches to be "Team vs BYE".
    // This allows 4 teams to advance directly.
    // We should distribute the 'BYE's somewhat evenly so they don't all happen on one side of the bracket if possible, 
    // but random placement is fair too.

    // Create the initial 16 slots with 'BYE' placeholders
    let initialSlots = [...shuffledTeams];
    for (let i = 0; i < byesCount; i++) {
        initialSlots.push("BYE");
    }

    // Shuffle again to randomize where the BYEs land? 
    // No, "BYE" isn't a team. If we have: "Team A" vs "BYE", Team A wins.
    // If we have "BYE" vs "BYE", that shouldn't happen ideally if we have enough teams.
    // With 12 teams and 4 byes, we can ensure every BYE is paired with a real team.
    // There are 8 matches. 4 matches will be Team vs Team. 4 matches will be Team vs BYE.
    // Team vs Team -> Winner goes to QF.
    // Team vs Bye -> Team goes to QF.

    // Total 12 teams.
    // 4 matches of 2 teams = 8 teams used.
    // 4 matches of 1 team + 1 bye = 4 teams used.
    // Total 12 teams used. Correct.

    // So we need to construct pairings:
    // 4 pairs of (Team, Team)
    // 4 pairs of (Team, BYE)

    let pairings = [];

    // Take first 8 teams and make 4 matches? 
    // Or just randomize all 12 teams and 4 BYEs, then check pairings.
    // Be careful not to pair BYE vs BYE.
    // If we just shuffle the array including BYEs, it's possible to get BYE vs BYE.
    // We must constrain it.

    // Algorithm:
    // 1. Array of 4 "BYE"s.
    // 2. Array of 12 Teams.
    // 3. We need 8 matches.
    // 4. M matches must have a BYE. (Assume we want to distribute BYEs randomly).
    //    Actually, simpler logic:
    //    Pop a BYE, Pop a Team -> Pair them. (4 pairings)
    //    Remaining 8 Teams -> Pair them up (4 pairings).
    //    Then shuffle the ORDER of these 8 matches in the bracket tree.

    const byes = Array(4).fill("BYE");
    const realTeams = shuffle([...teams]); // Randomize teams list

    const round1Matches = [];

    // Create 4 matches with Byes
    for (let i = 0; i < 4; i++) {
        const team = realTeams.pop();
        // A match object
        round1Matches.push({
            p1: team,
            p2: "부전승(BYE)", // Korean for Bye
            winner: team, // Auto winner
            status: 'decided' // Already decided
        });
    }

    // Create 4 matches with remaining 8 teams
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

    // Now we have 8 matches. Shuffle their positions in the bracket (Slot 1 to 8)
    const shuffledMatches = shuffle(round1Matches);

    // Render
    renderBracket(shuffledMatches);
}

function renderBracket(round1Matches) {
    const r1Div = document.getElementById('round1');
    const r2Div = document.getElementById('round2');
    const r3Div = document.getElementById('round3');
    const r4Div = document.getElementById('round4');
    const winnerDiv = document.getElementById('winner');

    r1Div.innerHTML = '';
    r2Div.innerHTML = '';
    r3Div.innerHTML = '';
    r4Div.innerHTML = '';

    // We need to maintain state. We can attach data to DOM or keep a state object.
    // Let's keep a global state for the active tournament.
    window.tournamentState = {
        r1: round1Matches, // 8 matches
        r2: Array(4).fill({ p1: null, p2: null, winner: null }), // 4 matches (QF)
        r3: Array(2).fill({ p1: null, p2: null, winner: null }), // 2 matches (SF)
        r4: Array(1).fill({ p1: null, p2: null, winner: null }), // 1 match (F)
        champion: null
    };

    renderRound1();
    renderRound2(); // Placeholders
    renderRound3(); // Placeholders
    renderRound4(); // Placeholders
}

function createMatchElement(matchData, matchIndex, roundName, nextRoundIndex) {
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
}

function renderRound4() {
    const container = document.getElementById('round4');
    container.innerHTML = '';
    window.tournamentState.r4.forEach((match, idx) => {
        const el = createMatchElement(match, idx, 'r4');
        container.appendChild(el);
    });

    // Update Winner Box
    const winBox = document.querySelector('.winner-box');
    winBox.textContent = window.tournamentState.champion ? `🏆 ${window.tournamentState.champion}` : '🏆 우승';
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

    // Propagate R1 -> R2
    // R1 matches 0,1 -> R2 match 0
    // R1 matches 2,3 -> R2 match 1
    // ...
    for (let i = 0; i < 4; i++) {
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

    // Propagate R2 -> R3
    for (let i = 0; i < 2; i++) {
        const m1 = s.r2[i * 2];
        const m2 = s.r2[i * 2 + 1];

        s.r3[i] = {
            p1: m1.winner || null,
            p2: m2.winner || null,
            winner: s.r3[i].winner
        };
        if (s.r3[i].winner && s.r3[i].winner !== s.r3[i].p1 && s.r3[i].winner !== s.r3[i].p2) {
            s.r3[i].winner = null;
        }
    }

    // Propagate R3 -> R4
    {
        const m1 = s.r3[0];
        const m2 = s.r3[1];

        s.r4[0] = {
            p1: m1.winner || null,
            p2: m2.winner || null,
            winner: s.r4[0].winner
        };
        if (s.r4[0].winner && s.r4[0].winner !== s.r4[0].p1 && s.r4[0].winner !== s.r4[0].p2) {
            s.r4[0].winner = null;
        }
    }

    // Champion
    if (s.r4[0].winner) {
        s.champion = s.r4[0].winner;
    } else {
        s.champion = null;
    }
}

function reRenderAll() {
    renderRound1();
    renderRound2();
    renderRound3();
    renderRound4();
}

document.getElementById('shuffleBtn').addEventListener('click', initBracket);
document.getElementById('resetBtn').addEventListener('click', () => {
    document.getElementById('round1').innerHTML = '';
    document.getElementById('round2').innerHTML = '';
    document.getElementById('round3').innerHTML = '';
    document.getElementById('round4').innerHTML = '';
    document.querySelector('.winner-box').textContent = '🏆 우승';
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
