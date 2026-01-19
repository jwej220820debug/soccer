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

// --- Power Analysis Logic ---

const analysisData = {
    "전기과": {
        summary: "번개같은 스피드와 폭발적인 득점력을 자랑하지만, 수비 조직력이 다소 아쉬운 '닥공' 스타일의 팀입니다.",
        stats: [90, 60, 70, 75, 85], // [공격, 수비, 조직력, 전술, 기세]
        players: [
            { name: "박썬더", pos: "FW", overall: 92, trait: "순간 가속도 1위, 침투의 달인", img: "player_fw.png" },
            { name: "이전류", pos: "MF", overall: 85, trait: "정확한 롱패스 공급, 팀의 배터리", img: "player_mf.png" },
            { name: "김저항", pos: "DF", overall: 78, trait: "몸싸움은 약하지만 지능적인 수비", img: "player_df.png" }
        ]
    },
    "기계과": {
        summary: "완벽한 피지컬과 톱니바퀴처럼 맞물리는 조직력이 강점이며, 후반전에도 지치지 않는 강철 체력을 보유했습니다.",
        stats: [75, 95, 90, 80, 85],
        players: [
            { name: "최강철", pos: "FW", overall: 84, trait: "헤더 경합 승률 90%, 타겟형 스트라이커", img: "player_fw.png" },
            { name: "정엔진", pos: "MF", overall: 88, trait: "왕성한 활동량, 중원을 장악하는 힘", img: "player_mf.png" },
            { name: "박기어", pos: "DF", overall: 96, trait: "통곡의 벽, 1:1 돌파 허용 제로", img: "player_df.png" }
        ]
    },
    "로봇소재융합과": {
        summary: "다양한 전술 변화에 능하며, 예상치 못한 변칙적인 플레이로 상대의 허를 찌르는 도깨비 팀입니다.",
        stats: [80, 75, 85, 95, 80],
        players: [
            { name: "오카본", pos: "FW", overall: 86, trait: "유연한 드리블, 예측 불가한 슛 타이밍", img: "player_fw.png" },
            { name: "김알루", pos: "MF", overall: 82, trait: "안정적인 볼 키핑, 템포 조절의 마법사", img: "player_mf.png" },
            { name: "이티탄", pos: "DF", overall: 89, trait: "가벼운 몸놀림, 빠른 커버 플레이", img: "player_df.png" }
        ]
    },
    "로봇기계과": {
        summary: "정교한 패스 워크와 기계적인 움직임으로 실수를 최소화하며, 안정적인 경기 운영을 보여줍니다.",
        stats: [70, 85, 95, 85, 75],
        players: [
            { name: "한메카", pos: "FW", overall: 83, trait: "골 결정력 85%, 찬스를 놓치지 않음", img: "player_fw.png" },
            { name: "조서보", pos: "MF", overall: 90, trait: "칼각 패스, 오차 없는 경기 조율", img: "player_mf.png" },
            { name: "강프레", pos: "DF", overall: 87, trait: "압박 수비의 정석, 빈틈없는 라인 유지", img: "player_df.png" }
        ]
    },
    "반도체과": {
        summary: "작은 실수도 용납하지 않는 정밀한 축구를 구사하며, 중요 승부처에서 집중력이 매우 뛰어납니다.",
        stats: [85, 70, 80, 90, 95],
        players: [
            { name: "금웨이", pos: "FW", overall: 89, trait: "빠른 판단력, 공간 창출 능력 탁월", img: "player_fw.png" },
            { name: "은도핑", pos: "MF", overall: 93, trait: "전술의 핵심, 팀의 시스템 칩", img: "player_mf.png" },
            { name: "동실리", pos: "DF", overall: 75, trait: "기복이 있지만 한방이 있는 수비수", img: "player_df.png" }
        ]
    },
    "건축토목과": {
        summary: "탄탄한 수비 라인을 기반으로 한 역습 한 방이 강력하며, 쉽게 무너지지 않는 견고함을 자랑합니다.",
        stats: [65, 90, 85, 75, 80],
        players: [
            { name: "장빌드", pos: "FW", overall: 80, trait: "역습의 선봉장, 라인 브레이커", img: "player_fw.png" },
            { name: "고기초", pos: "MF", overall: 85, trait: "든든한 중원 살림꾼, 볼 배급 담당", img: "player_mf.png" },
            { name: "왕콘크", pos: "DF", overall: 94, trait: "공중볼 장악, 절대 밀리지 않는 힘", img: "player_df.png" }
        ]
    }
};

let analysisChart = null;

function initAnalysis() {
    const select = document.getElementById('analysisDeptSelect');
    if (!select) return;

    // Clear existing options
    select.innerHTML = '';

    // Populate options
    teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team;
        option.textContent = team;
        select.appendChild(option);
    });

    // Initial render for the first team
    if (teams.length > 0) {
        renderAnalysis();
    }
}

function renderAnalysis() {
    const select = document.getElementById('analysisDeptSelect');
    const deptName = select.value;
    const data = analysisData[deptName];

    if (!data) return;

    // 1. Update Summary
    document.getElementById('analysis-team-name').textContent = deptName;
    document.getElementById('analysis-team-desc').textContent = data.summary;

    // 2. Render Radar Chart
    const ctx = document.getElementById('radarChart').getContext('2d');

    if (analysisChart) {
        analysisChart.destroy();
    }

    analysisChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['공격력', '수비력', '조직력', '전술', '기세'],
            datasets: [{
                label: '전력 스탯',
                data: data.stats,
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderColor: '#3b82f6',
                borderWidth: 2,
                pointBackgroundColor: '#10b981',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#10b981'
            }]
        },
        options: {
            scales: {
                r: {
                    angleLines: { color: 'rgba(255, 255, 255, 0.2)' },
                    grid: { color: 'rgba(255, 255, 255, 0.2)' },
                    pointLabels: {
                        color: 'white',
                        font: { size: 14 }
                    },
                    ticks: {
                        backdropColor: 'transparent',
                        color: 'rgba(255, 255, 255, 0.5)'
                    },
                    suggestedMin: 0,
                    suggestedMax: 100
                }
            },
            plugins: {
                legend: { display: false }
            },
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // 3. Render Players
    const playersList = document.getElementById('players-list');
    playersList.innerHTML = '';

    data.players.forEach(p => {
        const card = document.createElement('div');
        card.className = 'player-card';

        card.innerHTML = `
            <div class="player-img-wrapper">
                <img src="${p.img}" alt="${p.name}" class="player-img">
                <div class="player-pos-badge">${p.pos}</div>
            </div>
            <div class="player-info">
                <div class="player-header">
                    <span class="player-name">${p.name}</span>
                    <span class="player-ovr">OVR <span class="score">${p.overall}</span></span>
                </div>
                <div class="player-trait">"${p.trait}"</div>
            </div>
        `;
        playersList.appendChild(card);
    });
}


// Init on load
document.addEventListener('DOMContentLoaded', () => {
    initBracket();
    // Default view is bracket
    showSection('bracket'); // Changed to show bracket first as per user flow

    // Initialize Analysis too
    initAnalysis();
});
