// Main Application Logic

// Check if players data is loaded
if (typeof players === 'undefined') {
  console.error('Players data not loaded!');
  throw new Error('Players data must be loaded before main.js');
}

// 1. 선수 노드 생성
const playerNodes = players ? players.map(player => {
  const node = {
    name: player.Profile,
    category: 'player',
    symbolSize: 11,
    itemStyle: { color: 'rgba(255,255,255,1)', borderColor: 'transparent', borderWidth: 0, opacity: 1 },
    emphasis: {
      itemStyle: { color: '#32BEFF', opacity: 1, scale: 1.3 },
      label: {
        show: true,
        rich: {
          b: {
            backgroundColor: '#32BEFF',
            color: '#000000'
          }
        }
      },
      scale: true
    },
    label: {
      show: true,
      position: 'right',
      formatter: '{b|{b}}',
      rich: {
        b: {
          color: '#222',
          backgroundColor: 'rgba(255,255,255,1)',
          borderRadius: 8,
          padding: [4, 12, 4, 12],
          fontSize: 12,
          fontWeight: 500,
          lineHeight: 22
        }
      }
    }
  };
  
  // 이미지가 있는 경우 심볼 설정 (주석 처리 - 상세뷰에서만 표시)
  // if (player.Image && player.Image !== null) {
  //   node.symbol = 'image://' + player.Image;
  //   node.symbolSize = 40; // 이미지가 있을 때 크기를 키움
  // }
  
  return node;
}) : [];

// 2. 그래프 옵션
const option = {
  tooltip: {
    show: false // 툴팁 비활성화
  },
  series: [{
    type: 'graph',
    layout: 'force',
    roam: true,
    draggable: true,
    label: {
      show: true,
      position: 'right',
      formatter: '{b}'
    },
    force: {
      repulsion: 600,
      edgeLength: 350,
      gravity: 0.1,
      center: ['50%', '50%']
    },
    center: ['50%', '50%'],
    data: playerNodes,
    links: [],
    lineStyle: {
      color: 'rgba(255,255,255,0.85)',
      curveness: 0.3
    }
  }]
};

let chart = echarts.init(document.getElementById('main'));

// 초기 차트 옵션 설정
chart.setOption(option);

// 상태 관리
let currentView = 'main';
let currentPlayer = null;
let currentTagKey = null;
let currentTagValue = null;
let isSearchExpanded = false;
let previousPlayerForTagView = null; // 태그 뷰로 오기 이전의 선수 정보 저장

// 네비게이션 렌더 함수 (pill 형태)
function renderBreadcrumb() {
  const breadcrumb = document.getElementById('breadcrumb');
  let html = '<div class="breadcrumb-pills">';
  html += `<span class="pill player${currentView === 'player' || currentView === 'tag' || currentView === 'search' || currentView === 'list' ? ' selected' : ''}" id="bc-player">Player</span>`;
  
  if (currentView === 'player' && currentPlayer) {
    html += `<span class="pill name" id="bc-playername">${currentPlayer}</span>`;
  }
  
  if (currentView === 'tag' && previousPlayerForTagView && currentTagKey && currentTagValue) {
    html += `<span class="pill name" id="bc-playername">${previousPlayerForTagView}</span>`;
    html += `<span class="pill name" id="bc-tag">${currentTagKey}: ${currentTagValue}</span>`;
  }
  
  if (currentView === 'search') {
    html += `<span class="pill name" id="bc-search">Search Results</span>`;
  }
  
  if (currentView === 'list') {
    html += `<span class="pill name" id="bc-list">List View</span>`;
  }
  
  html += '</div>';
  breadcrumb.innerHTML = html;
  
  // Player pill 상태/클릭 이벤트
  const playerPillEl = document.getElementById('bc-player');
  if (playerPillEl) {
    if (currentView === 'home') {
      // Home에서는 비활성화
      playerPillEl.onclick = null;
      playerPillEl.style.pointerEvents = 'none';
      playerPillEl.style.opacity = '0';
    } else {
      playerPillEl.style.pointerEvents = '';
      playerPillEl.style.opacity = '';
      playerPillEl.onclick = function() {
        showMainView();
      };
    }
  }
  
  // Player name pill 클릭 이벤트 (선수 상세뷰로 돌아가기)
  const playerNamePill = document.getElementById('bc-playername');
  if (playerNamePill && currentView === 'tag') {
    playerNamePill.onclick = function() {
      showPlayerDetailView(previousPlayerForTagView);
    };
  }
  
  // Tag pill 클릭 이벤트 (태그뷰 유지)
  const tagPill = document.getElementById('bc-tag');
  if (tagPill) {
    tagPill.onclick = function() {
      // 이미 태그뷰에 있으므로 아무것도 하지 않음
    };
  }
  
  // Search pill 클릭 이벤트
  const searchPill = document.getElementById('bc-search');
  if (searchPill) {
    searchPill.onclick = function() {
      showMainView();
    };
  }
  
  // List pill 클릭 이벤트
  const listPill = document.getElementById('bc-list');
  if (listPill) {
    listPill.onclick = function() {
      showListView();
    };
  }
}

// 사이드바 토글 함수
function toggleSidebar() {
  const sidebar = document.querySelector('.player-detail-sidebar');
  if (sidebar.classList.contains('hidden')) {
    sidebar.classList.remove('hidden');
    document.body.classList.add('sidebar-open');
  } else {
    sidebar.classList.add('hidden');
    document.body.classList.remove('sidebar-open');
  }
}

// 공통 태그 사이드바 토글 함수
function toggleCommonTagSidebar() {
  const sidebar = document.querySelector('#common-tag-sidebar');
  if (sidebar.classList.contains('hidden')) {
    sidebar.classList.remove('hidden');
    document.body.classList.add('sidebar-open');
  } else {
    sidebar.classList.add('hidden');
    document.body.classList.remove('sidebar-open');
  }
}

// 사이드바 마우스 이벤트 처리
function setupSidebarHoverEvents() {
  const sidebar = document.querySelector('.player-detail-sidebar');
  const hoverArea = document.querySelector('.sidebar-hover-area');
  
  // 호버 영역에 마우스가 들어오면 사이드바 표시 (태그 뷰에서는 작동하지 않음)
  hoverArea.addEventListener('mouseenter', function() {
    if (currentView !== 'tag' && sidebar.classList.contains('hidden')) {
      sidebar.classList.remove('hidden');
    }
  });
}

// 메인 뷰로 복귀 함수
function showMainView() {
  currentView = 'main';
  currentPlayer = null;
  currentTagKey = null;
  currentTagValue = null;
  document.body.classList.remove('player-detail-view');
  
  // List 뷰에서 온 경우 처리
  const listContainer = document.getElementById('list-container');
  if (listContainer) {
    listContainer.remove();
  }
  
  // Home(PDF) 뷰에서 온 경우 처리
  const homeContainer = document.getElementById('home-container');
  if (homeContainer) {
    homeContainer.remove();
  }

  // Media 뷰에서 온 경우 처리
  const mediaContainer = document.getElementById('media-container');
  if (mediaContainer) {
    mediaContainer.remove();
  }
  
  // 차트 컨테이너 다시 표시
  const mainContainer = document.getElementById('main');
  mainContainer.style.display = 'block';

  // Home 뷰에서 숨겼던 UI 복원
  const filterSidebarFromHome = document.querySelector('.sidebar');
  if (filterSidebarFromHome) filterSidebarFromHome.style.display = '';
  const filterFabFromHome = document.getElementById('filterFab');
  if (filterFabFromHome) filterFabFromHome.style.display = '';
  const hoverAreaFromHome = document.querySelector('.sidebar-hover-area');
  if (hoverAreaFromHome) hoverAreaFromHome.style.display = '';
  const playerDetailSidebarFromHome = document.querySelector('.player-detail-sidebar');
  if (playerDetailSidebarFromHome) playerDetailSidebarFromHome.style.display = '';
  
  // 차트 크기 조정 및 렌더링 갱신
  if (chart) {
    chart.resize();
  }
  
  // 흩뿌려지는 애니메이션을 위한 초기 설정
  const animatedPlayerNodes = playerNodes.map((node, index) => {
    return {
      ...node,
      // 모든 노드를 흰색으로 유지
      itemStyle: { 
        color: 'rgba(255,255,255,1)', 
        borderColor: 'transparent', 
        borderWidth: 0, 
        opacity: 1 
      },
      // 레이블 배경색도 흰색으로 유지
      label: {
        ...node.label,
        rich: {
          b: {
            ...node.label.rich.b,
            backgroundColor: 'rgba(255,255,255,1)',
            color: '#222'
          }
        }
      },
      // 화면 전체에 랜덤하게 배치
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight
    };
  });
  
  chart.setOption({
    series: [{
      type: 'graph',
      layout: 'force',
      roam: true,
      draggable: true,
      animation: true,
      animationDuration: 1500,
      animationEasing: 'cubicOut',
      label: { show: true, position: 'right', formatter: '{b}' },
      force: { repulsion: 600, edgeLength: 350, gravity: 0.1, center: ['50%', '50%'] },
      data: animatedPlayerNodes,
      links: [],
      lineStyle: { color: 'rgba(255,255,255,0.85)', curveness: 0.3 }
    }]
  });
  renderBreadcrumb();
  
  // Home(메인) 진입 시 필터 사이드바 자동 오픈
  const filterSidebarOnHome = document.querySelector('.sidebar');
  if (filterSidebarOnHome) {
    filterSidebarOnHome.classList.add('active');
    filterSidebarOnHome.classList.remove('collapsed');
    document.body.classList.add('sidebar-open');
  }
  
  // 검색창 축소
  const searchWrapper = document.getElementById('searchWrapper');
  if (searchWrapper) {
    searchWrapper.classList.remove('expanded');
    isSearchExpanded = false;
  }
  
  // 공통 태그 사이드바 닫기
  const commonTagSidebar = document.querySelector('#common-tag-sidebar');
  if (commonTagSidebar) {
    commonTagSidebar.classList.add('hidden');
  }
}

// 최초 진입 시 메인 뷰
showMainView();





// 그래프 컨테이너에 트랜지션 스타일 추가
const mainDiv = document.getElementById('main');
mainDiv.style.transition = 'opacity 0.35s cubic-bezier(0.4,0,0.2,1)';
mainDiv.style.opacity = 1;

// 선수 상세 뷰 표시 함수
function showPlayerDetailView(playerName) {
  console.log('showPlayerDetailView 호출됨, playerName:', playerName);
  // 1. 페이드 아웃
  mainDiv.style.opacity = 0;
  setTimeout(() => {
    // 2. 상세 뷰로 전환
    const player = players.find(p => p.Profile === playerName);
    if (!player) return;
    currentView = 'player';
    currentPlayer = player.Profile;
    currentTagKey = null;
    currentTagValue = null;
    document.body.classList.add('player-detail-view');
    
    // List 뷰에서 온 경우 처리
    const listContainer = document.getElementById('list-container');
    if (listContainer) {
      listContainer.remove();
      mainDiv.style.display = 'block';
    }
    
    // 사이드바 데이터 업데이트 및 표시
    updatePlayerDetailSidebar(player);
    const sidebar = document.querySelector('.player-detail-sidebar');
    sidebar.classList.remove('hidden');
    
    chart.setOption(createPlayerDetailGraph(player));
    renderBreadcrumb();
    
    // 3. 페이드 인
    setTimeout(() => {
      mainDiv.style.opacity = 1;
    }, 30);
  }, 350);
}

// 노드 클릭 이벤트
chart.on('click', function(params) {
  if (currentView === 'main' && params.data.category === 'player') {
    showPlayerDetailView(params.data.name);
    return;
  }
  
  // 태그 노드 클릭 시 관련 선수들 연결하여 표시
  if ((currentView === 'player' || currentView === 'tag') && params.data.category === 'info') {
    const tagText = params.data.name;
    const [key, value] = tagText.split(': ');
    
    if (key && value) {
      // 선수 상세 사이드바가 열려있다면 닫기
      const playerDetailSidebar = document.querySelector('.player-detail-sidebar');
      if (playerDetailSidebar && !playerDetailSidebar.classList.contains('hidden')) {
        playerDetailSidebar.classList.add('hidden');
        document.body.classList.remove('sidebar-open');
      }
      
      showRelatedPlayersByTag(key, value);
      return;
    }
  }
  
  // 태그 뷰에서 태그 노드 클릭 시 공통 태그 사이드바 표시
  if (currentView === 'tag' && params.data.category === 'tag') {
    const tagText = params.data.name;
    const match = tagText.match(/^(.+): (.+) \((\d+) players\)$/);
    if (match) {
      const [, key, value, count] = match;
      
      // 태그 클릭 - 공통 태그 사이드바 표시
      showCommonTagSidebar(key, value, parseInt(count));
      return;
    }
  }
  
  // 태그 뷰에서 선수 노드 클릭 시 선수 상세뷰로 전환
  if (currentView === 'tag' && params.data.category === 'player') {
    // 공통 태그 사이드바 닫기
    const commonTagSidebar = document.querySelector('#common-tag-sidebar');
    if (commonTagSidebar) {
      commonTagSidebar.classList.add('hidden');
      document.body.classList.remove('sidebar-open');
    }
    // 선수 상세뷰로 전환
    showPlayerDetailView(params.data.name);
    return;
  }
  
  // 검색 결과 뷰에서 선수 노드 클릭 시 선수 상세뷰로 전환
  if (currentView === 'search' && params.data.category === 'player') {
    showPlayerDetailView(params.data.name);
    return;
  }
  
  // 기존 상세 뷰 클릭 등 나머지 로직
  if (params.data.category === 'player') {
    const player = players.find(p => p.Profile === params.data.name);
    if (!player) return;
    currentView = 'player';
    currentPlayer = player.Profile;
    document.body.classList.add('player-detail-view');
    
    // 사이드바 데이터 업데이트 및 표시
    updatePlayerDetailSidebar(player);
    const sidebar = document.querySelector('.player-detail-sidebar');
    sidebar.classList.remove('hidden');
    
    chart.setOption(createPlayerDetailGraph(player));
    renderBreadcrumb();
  }
});

// 노드 더블클릭 이벤트
chart.on('dblclick', function(params) {
  // 선수 상세뷰에서 선수 노드 더블클릭 시 메인 뷰로 돌아가기
  if (currentView === 'player' && params.data.category === 'player') {
    showMainView();
    return;
  }
});

// chips 동적 활성화/비활성화 및 숫자 표시
const chipCategories = [
  {
    field: 'Position',
    chips: [
      'ST', 'RW', 'LW',
      'CM', 'CDM', 'CAM',
      'CB', 'RB', 'LB', 'GK'
    ]
  },
  {
    field: 'First League',
    chips: [
      'Austria', 'Belgium', 'China', 'Croatia', 'Denmark', 'England', 'France', 'Germany', 'Ireland', 'Italy', 'Japan', 'Netherlands', 'Portugal', 'Russia', 'Scotland', 'Serbia', 'Spain', 'Sweden', 'Switzerland', 'Thailand', 'Turkey', 'UAE', 'USA'
    ]
  },
  {
    field: 'Tier Mobility',
    chips: [
      'AlwaysUpward', 'PeakThenDrop', 'YoYoMoves(2-3)', 'FlatCareer(1)', 'FlatCareer(2)', 'FlatCareer(3)'
    ]
  },
  {
    field: 'Player Status',
    chips: [
      'CurrentlyPlayingAbroad', 'CurrentlyPlayingInKorea', 'Retired'
    ]
  }
];

// chips 상태 관리
const selectedChips = {};
chipCategories.forEach(cat => {
  selectedChips[cat.field] = new Set();
});

// chips 렌더링 함수
function renderChips() {
  const sidebar = document.querySelector('.sidebar .section');
  sidebar.innerHTML = '';
  chipCategories.forEach(cat => {
    const group = document.createElement('div');
    group.className = 'meta-group';
    const h2 = document.createElement('h2');
    h2.textContent = cat.field === 'First League' ? 'First Overseas Destination' : cat.field;
    group.appendChild(h2);
    const chipsDiv = document.createElement('div');
    chipsDiv.className = 'chips';
    cat.chips.forEach(chipValue => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = chipValue;
      if (selectedChips[cat.field].has(chipValue)) chip.classList.add('selected');
      chip.onclick = () => {
        if (selectedChips[cat.field].has(chipValue)) {
          selectedChips[cat.field].delete(chipValue);
        } else {
          selectedChips[cat.field].add(chipValue);
        }
        renderChips();
        updateGraphByChips();
      };
      chipsDiv.appendChild(chip);
    });
    group.appendChild(chipsDiv);
    sidebar.appendChild(group);
  });
}

// chips 선택 상태에 따라 그래프 필터링
function updateGraphByChips() {
  const activeFilters = {};
  chipCategories.forEach(cat => {
    if (selectedChips[cat.field].size > 0) {
      activeFilters[cat.field] = Array.from(selectedChips[cat.field]);
    }
  });
  
  let filteredPlayers = players;
  Object.keys(activeFilters).forEach(field => {
    filteredPlayers = filteredPlayers.filter(p => {
      if (field === 'First League') {
        return activeFilters[field].some(val => (p['First League']||'').toLowerCase().includes(val.toLowerCase()));
      } else {
        return activeFilters[field].some(val => (p[field]||'').replace(/[#()]/g,'').toLowerCase().includes(val.replace(/[#()]/g,'').toLowerCase()));
      }
    });
  });
  
  const isNoFilter = Object.keys(activeFilters).length === 0;
  const filteredNodes = players.map(player => {
    const isSelected = filteredPlayers.some(fp => fp.Profile === player.Profile);
    const nodeColor = isNoFilter ? 'rgba(255,255,255,0.95)' : (isSelected ? '#32BEFF' : 'rgba(255,255,255,0.95)');
    const labelBackgroundColor = isNoFilter ? 'rgba(255,255,255,1)' : (isSelected ? '#32BEFF' : 'rgba(255,255,255,1)');
    const labelTextColor = isNoFilter ? '#222' : (isSelected ? '#000000' : '#222');
    
    const node = {
      name: player.Profile,
      category: 'player',
      itemStyle: { color: nodeColor, borderColor: 'transparent', borderWidth: 0, opacity: 0.85 },
      symbolSize: 11,
      emphasis: {
        itemStyle: { color: '#32BEFF', opacity: 1 },
        label: {
          show: true,
          rich: {
            b: {
              backgroundColor: '#32BEFF',
              color: '#000000'
            }
          }
        },
        scale: false
      },
      label: {
        show: true,
        position: 'right',
        formatter: '{b|{b}}',
        rich: {
          b: {
            color: labelTextColor,
            backgroundColor: labelBackgroundColor,
            borderRadius: 8,
            padding: [4, 12, 4, 12],
            fontSize: 12,
            fontWeight: 500,
            lineHeight: 22
          }
        }
      }
    };
    
    // 이미지가 있는 경우 심볼 설정 (주석 처리 - 상세뷰에서만 표시)
    // if (player.Image && player.Image !== null) {
    //   node.symbol = 'image://' + player.Image;
    //   node.symbolSize = 40; // 이미지가 있을 때 크기를 키움
    // }
    
    return node;
  });
  
  chart.setOption({
    series: [{
      type: 'graph',
      layout: 'force',
      roam: true,
      draggable: true,
      label: { show: true, position: 'right', formatter: '{b}' },
      force: { repulsion: 600, edgeLength: 350, gravity: 0.1, center: ['50%', '50%'] },
      center: ['50%', '50%'],
      data: isNoFilter ? filteredNodes : filteredNodes.filter(n => filteredPlayers.some(fp => fp.Profile === n.name)),
      links: [],
      lineStyle: { color: 'rgba(255,255,255,0.85)', curveness: 0.3 }
    }]
  });
  
  currentView = 'main';
  currentPlayer = null;
  renderBreadcrumb();
}

// 선수 상세 사이드바 데이터 업데이트 함수
function updatePlayerDetailSidebar(player) {
  // 이미지 컨테이너 숨기기 (이미지가 없으므로)
  const playerImageContainer = document.getElementById('player-image-container');
  playerImageContainer.style.display = 'none';
  
  // 기본 정보 업데이트
  document.getElementById('player-full-name').textContent = player.Profile;
  document.getElementById('player-birth').textContent = player['Birth Year'] ? `${player['Birth Year']}` : 'N/A';
  document.getElementById('player-birthplace').textContent = player['Place of birth'] || 'N/A';
  document.getElementById('player-height').textContent = player.Height ? `${player.Height} cm` : 'N/A';
  document.getElementById('player-position').textContent = player.Position || 'N/A';
  document.getElementById('player-nationality').textContent = 'South Korea';
  
  // 첫 해외 진출 정보
  const firstOverseas = player['First Overseas Experience'];
  const firstClub = player['First Club'];
  document.getElementById('player-first-overseas').textContent = 
    firstOverseas && firstClub ? `${firstOverseas} (${firstClub})` : 'N/A';
  
  // 현재 클럽 및 리그 정보
  const playedLeagues = player['Played Leagues'];
  let currentLeague = 'N/A';
  let currentClub = 'N/A';
  
  if (playedLeagues && Array.isArray(playedLeagues)) {
    const leagues = playedLeagues;
    if (leagues.length > 0) {
      const lastLeague = leagues[leagues.length - 1];
      currentLeague = lastLeague.replace(/\([^)]*\)/g, '').trim();
      
      // 특정 선수에 대한 현재 클럽 정보
      if (player.Profile === 'Son Heung-min') {
        currentClub = 'Tottenham Hotspur';
      } else if (player.Profile === 'Kim Min-jae') {
        currentClub = 'Bayern Munich';
      } else if (player.Profile === 'Hwang Hee-chan') {
        currentClub = 'Wolverhampton';
      } else {
        currentClub = 'N/A';
      }
    }
  }
  
  document.getElementById('player-club').textContent = currentClub;
  document.getElementById('player-league').textContent = currentLeague;
  
  // Career Highlights 업데이트
  const performance = player.Performance;
  
  // Career Highlights 업데이트
  document.getElementById('player-performance').textContent = performance || 'N/A';
  document.getElementById('player-total-transfers').textContent = player['Total Overseas Transfers'] || 'N/A';
  
  // 리그 수 계산
  const leaguesCount = playedLeagues && Array.isArray(playedLeagues) ? playedLeagues.length : 0;
  document.getElementById('player-leagues-count').textContent = leaguesCount > 0 ? `${leaguesCount} leagues` : 'N/A';
  
  // 선수 상태
  document.getElementById('player-status').textContent = player['Player Status'] || 'N/A';
}

// 공통 태그 사이드바 표시 및 데이터 업데이트 함수
function showCommonTagSidebar(key, value, playerCount) {
  // 관련 선수들 찾기
  const relatedPlayers = players.filter(player => {
    if (key === 'First League') {
      return (player[key] || '').toLowerCase().includes(value.toLowerCase());
    } else if (key === 'Played League') {
      // Played Leagues 배열에서 해당 리그를 찾음
      const playedLeagues = player['Played Leagues'];
      if (Array.isArray(playedLeagues)) {
        return playedLeagues.some(league => league.toLowerCase().includes(value.toLowerCase()));
      }
      return false;
    } else {
      const playerValue = (player[key] || '').replace(/[#()]/g, '').toLowerCase();
      const searchValue = value.replace(/[#()]/g, '').toLowerCase();
      return playerValue.includes(searchValue);
    }
  });

  // 태그 정보 업데이트
  document.getElementById('tag-name').textContent = `${key}: ${value}`;
  document.getElementById('tag-player-count').textContent = `${playerCount} players`;
  document.getElementById('tag-category').textContent = key;
  document.getElementById('tag-value').textContent = value;

  // 관련 선수 목록 업데이트
  const relatedPlayersList = document.getElementById('related-players-list');
  relatedPlayersList.innerHTML = '';
  
  relatedPlayers.forEach(player => {
    const playerItem = document.createElement('div');
    playerItem.className = 'player-info-item';
    playerItem.style.cursor = 'pointer';
    playerItem.onclick = () => {
      // 공통 태그 사이드바 닫기
      const commonTagSidebar = document.querySelector('#common-tag-sidebar');
      if (commonTagSidebar) {
        commonTagSidebar.classList.add('hidden');
        document.body.classList.remove('sidebar-open');
      }
      // 선수 상세뷰로 전환
      showPlayerDetailView(player.Profile);
    };
    
    const playerName = document.createElement('span');
    playerName.className = 'player-info-label';
    playerName.textContent = player.Profile;
    
    const playerDetails = document.createElement('span');
    playerDetails.className = 'player-info-value';
    playerDetails.textContent = `${player.Position || 'N/A'} • ${player['First League'] || 'N/A'}`;
    
    playerItem.appendChild(playerName);
    playerItem.appendChild(playerDetails);
    relatedPlayersList.appendChild(playerItem);
  });

  // 공통 태그 사이드바 표시
  const commonTagSidebar = document.querySelector('#common-tag-sidebar');
  commonTagSidebar.classList.remove('hidden');
  document.body.classList.add('sidebar-open');
}

// 태그 클릭 시 관련 선수들을 연결하여 표시하는 함수
function showRelatedPlayersByTag(key, value) {
  // 태그 뷰로 전환하기 전에 현재 선수 정보를 저장
  previousPlayerForTagView = currentPlayer;
  console.log('showRelatedPlayersByTag 호출됨, currentPlayer:', currentPlayer, 'previousPlayerForTagView:', previousPlayerForTagView);
  
      mainDiv.style.opacity = 0;
    setTimeout(() => {
      // List 뷰에서 온 경우 처리
      const listContainer = document.getElementById('list-container');
      if (listContainer) {
        listContainer.remove();
        mainDiv.style.display = 'block';
      }
      
      const relatedPlayers = players.filter(player => {
      if (key === 'First League') {
        return (player[key] || '').toLowerCase().includes(value.toLowerCase());
      } else if (key === 'Played League') {
        // Played Leagues 배열에서 해당 리그를 찾음
        const playedLeagues = player['Played Leagues'];
        if (Array.isArray(playedLeagues)) {
          return playedLeagues.some(league => league.toLowerCase().includes(value.toLowerCase()));
        }
        return false;
      } else {
        const playerValue = (player[key] || '').replace(/[#()]/g, '').toLowerCase();
        const searchValue = value.replace(/[#()]/g, '').toLowerCase();
        return playerValue.includes(searchValue);
      }
    });

    if (relatedPlayers.length === 0) return;

    const tagNode = {
      name: `${key}: ${value} (${relatedPlayers.length} players)`,
      category: 'tag',
      itemStyle: { color: '#FFDD32', borderColor: 'transparent', borderWidth: 0, opacity: 1 },
      symbolSize: 12,

      emphasis: {
        itemStyle: { color: '#FFDD32', opacity: 1, scale: 1.3 },
        label: {
          show: true,
          rich: {
            b: {
              backgroundColor: '#FFDD32',
              color: '#222'
            }
          }
        },
        scale: true
      },
      label: {
        show: true,
        position: 'right',
        formatter: '{b|{b}}',
        rich: {
          b: {
            color: '#222',
            backgroundColor: '#FFDD32',
            borderRadius: 8,
            padding: [4, 12, 4, 12],
            fontSize: 12,
            fontWeight: 500,
            lineHeight: 22
          }
        }
      },
      cursor: 'pointer'
    };

    const relatedPlayerNodes = relatedPlayers.map(player => ({
      name: player.Profile,
      category: 'player',
      itemStyle: { color: '#FFDD32', borderColor: 'transparent', borderWidth: 0, opacity: 1 },
      symbolSize: 11,
      emphasis: {
        itemStyle: { color: '#FFDD32', opacity: 1, scale: 1.3 },
        label: {
          show: true,
          rich: {
            b: {
              backgroundColor: '#FFDD32',
              color: '#222'
            }
          }
        },
        scale: true
      },
      label: {
        show: true,
        position: 'right',
        formatter: '{b|{b}}',
        rich: {
          b: {
            color: '#222',
            backgroundColor: '#FFDD32',
            borderRadius: 8,
            padding: [4, 12, 4, 12],
            fontSize: 12,
            fontWeight: 500,
            lineHeight: 22
          }
        }
      }
    }));

    // 점선으로 표시할 주관적 정보 필드들
    const dashedFields = ['Tier Mobility', 'Transfer Reason'];
    const isDashed = dashedFields.includes(key);
    
    const links = relatedPlayers.map(player => ({
      source: `${key}: ${value} (${relatedPlayers.length} players)`,
      target: player.Profile,
      lineStyle: {
        type: isDashed ? 'dashed' : 'solid',
        color: '#FFDD32',
        width: 1.3,
        curveness: 0.3
      }
    }));

    chart.setOption({
      series: [{
        type: 'graph',
        layout: 'force',
        roam: true,
        draggable: true,
        animation: true,
        animationDuration: 1000,
        animationEasing: 'cubicOut',
        label: {
          show: true,
          position: 'right',
          formatter: '{b|{b}}',
          rich: {
            b: {
              color: '#222',
              backgroundColor: 'rgba(255,255,255,1)',
              borderRadius: 8,
              padding: [4, 12, 4, 12],
              fontSize: 12,
              fontWeight: 500,
              lineHeight: 22
            }
          }
        },
        force: {
          repulsion: 600,
          edgeLength: 350,
          gravity: 0.1,
          center: ['50%', '50%']
        },
        center: ['50%', '50%'],
        data: [tagNode, ...relatedPlayerNodes],
        links: links,
        lineStyle: {
          color: 'rgba(255,255,255,0.85)',
          width: 1.3,
          curveness: 0.3
        }
      }]
    });

    currentView = 'tag';
    currentTagKey = key;
    currentTagValue = value;
    // 태그 뷰에서는 currentPlayer를 null로 설정 (X 버튼 클릭 시 previousPlayerForTagView 사용)
    currentPlayer = null;
    console.log('태그 뷰로 전환, previousPlayerForTagView:', previousPlayerForTagView);
    renderBreadcrumb();
    
    // 공통 태그 사이드바도 동시에 표시
    showCommonTagSidebar(key, value, relatedPlayers.length);
    
    // 태그 뷰에서도 선수 상세 사이드바가 열려있다면 외부 클릭 시 닫기 기능 활성화
    const playerDetailSidebar = document.querySelector('.player-detail-sidebar');
    if (playerDetailSidebar && !playerDetailSidebar.classList.contains('hidden')) {
      // 태그 뷰에서도 사이드바 외부 클릭 시 닫기 기능이 작동하도록 이벤트 리스너는 이미 설정되어 있음
    }
    
    setTimeout(() => {
      mainDiv.style.opacity = 1;
    }, 30);
  }, 350);
}

// Segmented Control
function renderSegmentedControl() {
  const container = document.getElementById('segmented-control-container');
  container.innerHTML = `
    <div class="segmented-control">
      <button class="seg-btn logo-seg-btn" id="logoButton">
        <img src="assets/Logo.png" alt="AA25 ArchiveAtlas" class="logo-icon">
      </button>
      <button class="seg-btn selected" data-value="Home">Home</button>
      <button class="seg-btn" data-value="Overview">Overview</button>
      <button class="seg-btn" data-value="List">List</button>
      <button class="seg-btn" data-value="Media">Media</button>
    </div>
    <div class="search-input-wrapper" id="searchWrapper">
      <input type="text" id="searchInput" placeholder="Search players..." class="search-input">
      <button id="searchButton" class="search-button">
        <img src="assets/Search.png" alt="Search" width="28" height="28">
      </button>
    </div>
  `;
  const btns = container.querySelectorAll('.seg-btn');
  btns.forEach(btn => {
    btn.onclick = function() {
      const logoIcon = document.querySelector('.logo-icon');
      // 로고 클릭: 선택 상태 변경 없이 모달만 표시
      if (btn.id === 'logoButton') {
        // 로고 색상/이미지 변경하지 않음
        showProjectInfoModal();
        return;
      }

      // 탭 버튼 클릭: 선택 상태 갱신
      btns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');

      // 로고는 기본 이미지로 복원
      if (logoIcon) logoIcon.src = 'assets/Logo.png';

      if (btn.dataset.value === 'Home') {
        showMainView();
      } else if (btn.dataset.value === 'List') {
        showListView();
      } else if (btn.dataset.value === 'Overview') {
        showHomeView();
      } else if (btn.dataset.value === 'Media') {
        showMediaView();
      }
    };
  });
}

// 프로젝트 정보 모달
function showProjectInfoModal() {
  // 이미 열려 있으면 재생성하지 않음
  if (document.getElementById('project-info-modal')) return;

  const overlay = document.createElement('div');
  overlay.id = 'project-info-modal';
  overlay.style.cssText = [
    'position:fixed',
    'inset:0',
    'background:rgba(0, 0, 0, 0)',
    'backdrop-filter:blur(0px)',
    '-webkit-backdrop-filter:blur(0px)',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'z-index:9999',
    'transition:background 0.3s ease, backdrop-filter 0.3s ease, -webkit-backdrop-filter 0.3s ease'
  ].join(';');

  const modal = document.createElement('div');
  modal.style.cssText = [
    'background:rgba(255,255,255,0.95)',
    'border:none',
    'box-shadow:0 10px 30px rgba(0,0,0,0.2)',
    'border-radius:70px',
    'padding:30px 8px 20px 24px',
    'max-width:380px',
    'width:92%',
    'color:#000',
    'font-size:16px',
    'line-height:1.8',
    'position:relative',
    'opacity:0',
    'transform:scale(0.9)',
    'transition:opacity 0.3s ease, transform 0.3s ease',
  ].join(';');

  modal.innerHTML = `
    <div style="display:flex; justify-content:flex-start; align-items:center; margin-bottom:30px; margin-left:82px;">
      <img src="assets/Logo Modal.png" alt="ArchiveAtlas" style="max-width:200px; width:100%; height:auto; display:block;">
    </div>

    <div style="margin-bottom:20px; opacity:0.88; color:#000; line-height:1.7;">
      ArchiveAtlas is a graduation project that visually documents the overseas careers of Korean footballers. It takes a narrative approach to data<br>and reconstructs it into an interactive atlas to trace patterns of movement and adaptation.
    </div>
    
    <div style="margin-bottom:80px; padding-top:20px;">
      <div style="display:flex; flex-direction:column; gap:4px;">
        <a href="mailto:johnwkim82@gmail.com" style="color:#000; text-decoration:none; display:flex; align-items:center; gap:30px; font-size:16px;">
          <span style="min-width:80px;">Email.</span>
          <span>johnwkim82@gmail.com</span>
        </a>
        <a href="https://instagram.com/joelkim.82" target="_blank" rel="noopener noreferrer" style="color:#000; text-decoration:none; display:flex; align-items:center; gap:30px; font-size:16px;">
          <span style="min-width:80px;">Instagram</span>
          <span>@joelkim.82</span>
        </a>
      </div>
    </div>
    
    <div style="display:flex; justify-content:flex-start; margin-bottom:10px; margin-left:120px;">
      <button id="overview-button" style="background:#32BEFF; color:#000000; border:none; padding:12px 32px; border-radius:16px; font-size:14px; font-weight:normal; cursor:pointer; transition:background 0.2s;">
        Overview
      </button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  // 애니메이션 시작 - 오버레이와 모달을 애니메이션
  requestAnimationFrame(() => {
    // 오버레이 애니메이션
    overlay.style.background = 'rgba(0, 0, 0, 0.4)';
    overlay.style.backdropFilter = 'blur(5px)';
    overlay.style.webkitBackdropFilter = 'blur(10px)';
    
    // 모달 애니메이션
    modal.style.opacity = '1';
    modal.style.transform = 'scale(1)';
  });

  const close = () => {
    // 애니메이션으로 닫기
    overlay.style.background = 'rgba(0, 0, 0, 0)';
    overlay.style.backdropFilter = 'blur(0px)';
    overlay.style.webkitBackdropFilter = 'blur(0px)';
    modal.style.opacity = '0';
    modal.style.transform = 'scale(0.9)';
    
    setTimeout(() => {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
    }, 300);
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };

  // 클릭 핸들러
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', onKey);
  
  // Overview 버튼 클릭 이벤트
  const overviewButton = document.getElementById('overview-button');
  if (overviewButton) {
    overviewButton.addEventListener('mouseenter', function() {
      this.style.background = '#2AABE8';
    });
    overviewButton.addEventListener('mouseleave', function() {
      this.style.background = '#32BEFF';
    });
    overviewButton.addEventListener('click', function() {
      close();
      // Overview 탭 버튼 선택 상태 업데이트
      const overviewBtn = document.querySelector('.seg-btn[data-value="Overview"]');
      if (overviewBtn) {
        document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('selected'));
        overviewBtn.classList.add('selected');
      }
      showHomeView();
    });
  }
}

// Figma 디자인 임베드 모달
function showFigmaDesignModal(figmaUrl) {
  // 이미 열려 있으면 재생성하지 않음
  if (document.getElementById('figma-design-modal')) return;

  const overlay = document.createElement('div');
  overlay.id = 'figma-design-modal';
  overlay.style.cssText = [
    'position:fixed',
    'inset:0',
    'background:rgba(0,0,0,0.6)',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'z-index:9999'
  ].join(';');

  const modal = document.createElement('div');
  modal.style.cssText = [
    'background:rgba(10,14,20,0.95)',
    'border:1px solid rgba(255,255,255,0.08)',
    'box-shadow:0 10px 30px rgba(0,0,0,0.4)',
    'border-radius:12px',
    'padding:0',
    'width:92%',
    'max-width:1100px',
    'height:80vh',
    'overflow:hidden'
  ].join(';');

  const header = document.createElement('div');
  header.style.cssText = 'display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 12px; color:#fff;';
  header.innerHTML = `
    <div style="display:flex; align-items:center; gap:10px;">
      <img src="assets/Logo.png" alt="AA25" width="20" height="20" style="display:block;">
      <div style="font-weight:600; font-size:14px;">Figma Preview</div>
    </div>
    <button id="figma-design-close" aria-label="Close" style="background:transparent; color:#fff; border:0; font-size:20px; cursor:pointer; line-height:1;">×</button>
  `;

  const iframe = document.createElement('iframe');
  const encoded = encodeURIComponent(figmaUrl);
  iframe.src = `https://www.figma.com/embed?embed_host=share&url=${encoded}`;
  iframe.style.cssText = 'width:100%; height:calc(100% - 42px); border:0; background:#0a0e14;';
  iframe.setAttribute('allowfullscreen', 'true');

  modal.appendChild(header);
  modal.appendChild(iframe);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.getElementById('figma-design-close').addEventListener('click', close);
}

// List 뷰 표시 함수
function showListView() {
  currentView = 'list';
  currentPlayer = null;
  currentTagKey = null;
  currentTagValue = null;
  document.body.classList.remove('player-detail-view');
  
  // 차트를 숨기기
  const mainContainer = document.getElementById('main');
  mainContainer.style.display = 'none';
  
  // Media에서는 필터 UI 숨김
  const mediaFilterSidebar = document.querySelector('.sidebar');
  if (mediaFilterSidebar) mediaFilterSidebar.style.display = 'none';
  const mediaFilterFab = document.getElementById('filterFab');
  if (mediaFilterFab) mediaFilterFab.style.display = 'none';
  const mediaHoverArea = document.querySelector('.sidebar-hover-area');
  if (mediaHoverArea) mediaHoverArea.style.display = 'none';
  document.body.classList.remove('sidebar-open');
  
  // List에서는 필터 UI 숨김
  const listFilterSidebar = document.querySelector('.sidebar');
  if (listFilterSidebar) listFilterSidebar.style.display = 'none';
  const listFilterFab = document.getElementById('filterFab');
  if (listFilterFab) listFilterFab.style.display = 'none';
  const listHoverArea = document.querySelector('.sidebar-hover-area');
  if (listHoverArea) listHoverArea.style.display = 'none';
  document.body.classList.remove('sidebar-open');
  
  // 기존 list-container가 있다면 제거
  const existingListContainer = document.getElementById('list-container');
  if (existingListContainer) {
    existingListContainer.remove();
  }
  
  // Home(PDF) 뷰가 있다면 제거
  const existingHomeContainer = document.getElementById('home-container');
  if (existingHomeContainer) {
    existingHomeContainer.remove();
  }

  // Media 뷰가 있다면 제거
  const existingMediaContainer = document.getElementById('media-container');
  if (existingMediaContainer) {
    existingMediaContainer.remove();
  }

  // List에서는 플레이어 상세 사이드바도 숨김
  const playerDetailSidebarFromHome2 = document.querySelector('.player-detail-sidebar');
  if (playerDetailSidebarFromHome2) playerDetailSidebarFromHome2.style.display = 'none';
  
  // List 뷰를 위한 컨테이너 생성
  const listContainer = document.createElement('div');
  listContainer.id = 'list-container';
  listContainer.style.cssText = 'flex:1; min-width:0; min-height:0; opacity:0; transform:scale(0.9); transition:opacity 0.3s ease, transform 0.3s ease;';
  listContainer.innerHTML = `
    <div class="list-view-layout">
      <div class="player-list-panel">
        <div class="player-list-container" id="playerListContainer">
          <!-- 선수 목록이 여기에 동적으로 생성됩니다 -->
        </div>
      </div>
      
      <div class="player-image-panel">
        <div class="image-container">
          <div class="player-image-placeholder" id="playerImagePlaceholder">
            <div class="placeholder-text">Select a player</div>
          </div>
          <img id="playerImage" class="player-image" src="" alt="Player" style="display: none;">
        </div>
        <div class="player-info-display" id="playerInfoDisplay">
        </div>
      </div>
    </div>
  `;
  
  // main의 부모 요소에 list container 추가
  mainContainer.parentNode.appendChild(listContainer);
  
  // 선수 목록을 렌더링
  renderPlayerList();
  
  // 애니메이션 시작
  requestAnimationFrame(() => {
    listContainer.style.opacity = '1';
    listContainer.style.transform = 'scale(1)';
  });
  
  renderBreadcrumb();
  
  // 검색창 축소
  const searchWrapper = document.getElementById('searchWrapper');
  if (searchWrapper) {
    searchWrapper.classList.remove('expanded');
    isSearchExpanded = false;
  }
  
  // 공통 태그 사이드바 닫기
  const commonTagSidebar = document.querySelector('#common-tag-sidebar');
  if (commonTagSidebar) {
    commonTagSidebar.classList.add('hidden');
  }
}

// Media 뷰 표시 함수 (텍스트 전용 WIP 화면)
function showMediaView() {
  currentView = 'media';
  currentPlayer = null;
  currentTagKey = null;
  currentTagValue = null;
  document.body.classList.remove('player-detail-view');
  
  // 차트를 숨기기
  const mainContainer = document.getElementById('main');
  mainContainer.style.display = 'none';
  
  // 기존 list/media 컨테이너 정리
  const existingListContainer = document.getElementById('list-container');
  if (existingListContainer) existingListContainer.remove();

  // 기존 Home 컨테이너 정리
  const existingHomeContainer2 = document.getElementById('home-container');
  if (existingHomeContainer2) existingHomeContainer2.remove();

  const existingMediaContainer = document.getElementById('media-container');
  if (existingMediaContainer) existingMediaContainer.remove();
  
  // Media 뷰 컨테이너 생성 (텍스트만 표시)
  const mediaContainer = document.createElement('div');
  mediaContainer.id = 'media-container';
  mediaContainer.style.cssText = 'flex:1; min-width:0; min-height:0; display:flex; align-items:center; justify-content:center; opacity:0; transform:scale(0.9); transition:opacity 0.3s ease, transform 0.3s ease;';
  mediaContainer.innerHTML = `
    <div style="text-align:center; color:#ffffff; font-size:30px; line-height:1.6;">Work in progress</div>
  `;
  
  // main의 부모 요소에 media container 추가
  mainContainer.parentNode.appendChild(mediaContainer);
  
  // 애니메이션 시작
  requestAnimationFrame(() => {
    mediaContainer.style.opacity = '1';
    mediaContainer.style.transform = 'scale(1)';
  });
  
  // 공통 태그 사이드바 닫기 및 브레드크럼 갱신
  const commonTagSidebar = document.querySelector('#common-tag-sidebar');
  if (commonTagSidebar) {
    commonTagSidebar.classList.add('hidden');
  }
  renderBreadcrumb();
}

// Home(PDF) 뷰 표시 함수
function showHomeView() {
  currentView = 'home';
  currentPlayer = null;
  currentTagKey = null;
  currentTagValue = null;
  document.body.classList.remove('player-detail-view');

  // 차트를 숨기기
  const mainContainer = document.getElementById('main');
  mainContainer.style.display = 'none';

  // Home 뷰에서 Player/Filter UI 숨김
  const filterSidebar = document.querySelector('.sidebar');
  if (filterSidebar) filterSidebar.style.display = 'none';
  const filterFab = document.getElementById('filterFab');
  if (filterFab) filterFab.style.display = 'none';
  const hoverArea = document.querySelector('.sidebar-hover-area');
  if (hoverArea) hoverArea.style.display = 'none';
  const playerDetailSidebar = document.querySelector('.player-detail-sidebar');
  if (playerDetailSidebar) {
    playerDetailSidebar.classList.add('hidden');
    playerDetailSidebar.style.display = 'none';
  }

  // 기존 컨테이너 정리
  const existingListContainer = document.getElementById('list-container');
  if (existingListContainer) existingListContainer.remove();
  const existingMediaContainer = document.getElementById('media-container');
  if (existingMediaContainer) existingMediaContainer.remove();
  const existingHomeContainer = document.getElementById('home-container');
  if (existingHomeContainer) existingHomeContainer.remove();

  // Home 뷰 컨테이너 생성 (PNG 우선: 화면 너비 맞춤 + 세로 스크롤, 실패 시 PDF)
  const homeContainer = document.createElement('div');
  homeContainer.id = 'home-container';
  homeContainer.style.cssText = 'flex:1; min-width:0; min-height:0; display:flex; opacity:0; transform:scale(0.9); transition:opacity 0.3s ease, transform 0.3s ease;';
  
  // 스크롤 래퍼
  const scrollWrapper = document.createElement('div');
  scrollWrapper.style.cssText = 'width:100%; height:100%; overflow:auto;';
  homeContainer.appendChild(scrollWrapper);
  
  // webp 우선 로드 (프리로드된 이미지가 있으면 즉시 표시)
  if (homeImagePreload && homeImagePreload.complete && homeImagePreload.naturalWidth) {
    const img = new Image();
    img.decoding = 'async';
    img.loading = 'eager';
    img.setAttribute('fetchpriority', 'high');
    img.style.cssText = 'width:100%; height:auto; display:block;';
    img.alt = 'Home Image';
    img.src = homeImagePreload.src;
    scrollWrapper.appendChild(img);
  } else {
    const tryPng = () => {
      const imgPng = new Image();
      imgPng.decoding = 'async';
      imgPng.loading = 'eager';
      imgPng.setAttribute('fetchpriority', 'high');
      imgPng.style.cssText = 'width:100%; height:auto; display:block;';
      imgPng.alt = 'Home Image';
      imgPng.onload = function() {
        scrollWrapper.innerHTML = '';
        scrollWrapper.appendChild(imgPng);
      };
      imgPng.onerror = function() {
        // webp/png 모두 없으면 PDF로 폴백
        scrollWrapper.innerHTML = `
          <iframe src="assets/home.pdf#view=FitH" style="width:100%; height:100%; border:0;" title="Home PDF"></iframe>
        `;
      };
      imgPng.src = 'assets/home.png';
    };

    const imgWebp = new Image();
    imgWebp.decoding = 'async';
    imgWebp.loading = 'eager';
    imgWebp.setAttribute('fetchpriority', 'high');
    imgWebp.style.cssText = 'width:100%; height:auto; display:block;';
    imgWebp.alt = 'Home Image';
    imgWebp.onload = function() {
      scrollWrapper.innerHTML = '';
      scrollWrapper.appendChild(imgWebp);
    };
    imgWebp.onerror = function() {
      tryPng();
    };
    imgWebp.src = 'assets/home.webp';
  }

  // main의 부모 요소에 home container 추가
  mainContainer.parentNode.appendChild(homeContainer);

  // 애니메이션 시작
  requestAnimationFrame(() => {
    homeContainer.style.opacity = '1';
    homeContainer.style.transform = 'scale(1)';
  });

  // 공통 태그 사이드바 닫기 및 브레드크럼 갱신
  const commonTagSidebar = document.querySelector('#common-tag-sidebar');
  if (commonTagSidebar) {
    commonTagSidebar.classList.add('hidden');
  }
  renderBreadcrumb();
}

// 선수 목록 렌더링 함수
function renderPlayerList(filteredPlayers = null) {
  const playerListContainer = document.getElementById('playerListContainer');
  const playersToRender = filteredPlayers || players;
  
  // 이미지가 있는 선수와 없는 선수로 분리
  const playersWithImage = [];
  const playersWithoutImage = [];
  
  playersToRender.forEach(player => {
    if (player.Image && player.Image !== null) {
      playersWithImage.push(player);
    } else {
      playersWithoutImage.push(player);
    }
  });
  
  // 이미지가 있는 선수 먼저, 그 다음 없는 선수
  const sortedPlayers = [...playersWithImage, ...playersWithoutImage];
  
  playerListContainer.innerHTML = '';
  
  sortedPlayers.forEach(player => {
    const listItem = document.createElement('div');
    listItem.className = 'player-list-item';
    listItem.setAttribute('data-player', player.Profile);
    
    // 선수 상태 결정 (기본적으로 숨김)
    let statusIndicator = '<div class="status-dot status-hidden"></div>';
    
    listItem.innerHTML = `
      ${statusIndicator}
      <div class="player-list-info">
        <div class="player-list-name">${player.Profile}</div>
      </div>
    `;
    
    // 호버 이벤트 - 이미지 미리보기
    listItem.addEventListener('mouseenter', function() {
      // 오른쪽 이미지 패널에 호버된 선수 정보 표시
      updatePlayerImagePanelOnHover(player);
    });
    
    // 호버 아웃 이벤트 - 선택된 선수로 복원
    listItem.addEventListener('mouseleave', function() {
      // 현재 선택된 선수가 있으면 해당 선수 정보로 복원
      const selectedItem = document.querySelector('.player-list-item.selected');
      if (selectedItem) {
        const selectedPlayerName = selectedItem.getAttribute('data-player');
        const selectedPlayer = players.find(p => p.Profile === selectedPlayerName);
        if (selectedPlayer) {
          updatePlayerImagePanel(selectedPlayer);
        }
      } else {
        // 선택된 선수가 없으면 기본 상태로 복원
        resetPlayerImagePanel();
      }
    });
    
    // 클릭 이벤트
    listItem.addEventListener('click', function() {
      // 모든 아이템에서 선택 상태 제거
      document.querySelectorAll('.player-list-item').forEach(item => {
        item.classList.remove('selected');
      });
      
      // 현재 아이템 선택 상태 추가
      this.classList.add('selected');
      
      // 오른쪽 이미지 패널 업데이트
      updatePlayerImagePanel(player);
      
      // 노드에서 해당 선수만 흰색으로 변경
      updateNodeHighlight(player.Profile);
    });
    
    playerListContainer.appendChild(listItem);
  });
}

// 노드 하이라이트 함수
function updateNodeHighlight(selectedPlayerName) {
  // 모든 노드를 기본 상태로 리셋
  const option = chart.getOption();
  option.series[0].data.forEach(node => {
    node.itemStyle = { 
      color: 'rgba(255,255,255,0.3)', 
      borderColor: 'transparent', 
      borderWidth: 0, 
      opacity: 0.6 
    };
    
    // 레이블 배경색도 기본 상태로 리셋
    if (node.label && node.label.rich && node.label.rich.b) {
      node.label.rich.b.backgroundColor = 'rgba(255,255,255,0.3)';
      node.label.rich.b.color = '#222';
    }
  });
  
  // 선택된 선수 노드만 흰색으로 변경
  const selectedNode = option.series[0].data.find(node => node.name === selectedPlayerName);
  if (selectedNode) {
    selectedNode.itemStyle = { 
      color: 'rgba(255,255,255,1)', 
      borderColor: 'transparent', 
      borderWidth: 0, 
      opacity: 1 
    };
    
    // 선택된 노드의 레이블 배경색도 흰색으로 변경
    if (selectedNode.label && selectedNode.label.rich && selectedNode.label.rich.b) {
      selectedNode.label.rich.b.backgroundColor = 'rgba(255,255,255,1)';
      selectedNode.label.rich.b.color = '#222';
    }
  }
  
  // 차트 업데이트
  chart.setOption(option);
}

// 호버 시 이미지 패널 업데이트 함수
function updatePlayerImagePanelOnHover(player) {
  const playerImage = document.getElementById('playerImage');
  const playerImagePlaceholder = document.getElementById('playerImagePlaceholder');
  
  // 이미지 처리
  if (player.Image && player.Image !== null) {
    playerImage.src = player.Image;
    playerImage.style.display = 'block';
    playerImagePlaceholder.style.display = 'none';
  } else {
    // 이미지가 없으면 플레이스홀더 표시
    playerImage.style.display = 'none';
    playerImagePlaceholder.style.display = 'flex';
    
    // 플레이스홀더에 선수 이름 첫 글자 표시
    const placeholderText = document.querySelector('.placeholder-text');
    placeholderText.textContent = player.Profile.charAt(0);
  }
}

// 기본 상태로 이미지 패널 리셋 함수
function resetPlayerImagePanel() {
  const playerImage = document.getElementById('playerImage');
  const playerImagePlaceholder = document.getElementById('playerImagePlaceholder');
  
  // 이미지 숨기기
  playerImage.style.display = 'none';
  playerImagePlaceholder.style.display = 'flex';
  
  // 플레이스홀더 텍스트 복원
  const placeholderText = document.querySelector('.placeholder-text');
  placeholderText.textContent = 'Select a player';
}

// 오른쪽 이미지 패널 업데이트 함수
function updatePlayerImagePanel(player) {
  const playerImage = document.getElementById('playerImage');
  const playerImagePlaceholder = document.getElementById('playerImagePlaceholder');
  
  // 이미지 처리
  if (player.Image && player.Image !== null) {
    playerImage.src = player.Image;
    playerImage.style.display = 'block';
    playerImagePlaceholder.style.display = 'none';
  } else {
    // 이미지가 없으면 플레이스홀더 표시
    playerImage.style.display = 'none';
    playerImagePlaceholder.style.display = 'flex';
    
    // 플레이스홀더에 선수 이름 첫 글자 표시
    const placeholderText = document.querySelector('.placeholder-text');
    placeholderText.textContent = player.Profile.charAt(0);
  }
}



// 필터 플로팅 버튼 및 사이드바 오버레이 UX
document.addEventListener('DOMContentLoaded', function() {
  const sidebar = document.querySelector('.sidebar');
  
  // 필터 플로팅 버튼 동작
  const fab = document.getElementById('filterFab');
  fab.onclick = function() {
    sidebar.classList.add('active');
    sidebar.classList.remove('collapsed');
    document.body.classList.add('sidebar-open');
  };
  
  // pill 버튼 생성 및 추가
  let filterPill = sidebar.querySelector('.filter-pill');
  if (!filterPill) {
    filterPill = document.createElement('button');
    filterPill.className = 'filter-pill';
    filterPill.textContent = 'Filter';
    sidebar.appendChild(filterPill);
  }
  
  // 닫기 버튼 생성 및 추가
  let closeButton = sidebar.querySelector('.sidebar-close-btn');
  if (!closeButton) {
    closeButton = document.createElement('button');
    closeButton.className = 'sidebar-close-btn';
    closeButton.innerHTML = '×';
    closeButton.title = '닫기';
    sidebar.appendChild(closeButton);
    
    closeButton.addEventListener('click', () => {
      if (currentView === 'main') {
        sidebar.classList.remove('active');
        sidebar.classList.add('collapsed');
        document.body.classList.remove('sidebar-open');
      }
    });
  }
  
  // 사이드바 외부 클릭 시 닫기 기능
  document.addEventListener('click', function(e) {
    // 메인 뷰에서 사이드바가 활성화된 경우
    if (currentView === 'main' && sidebar.classList.contains('active')) {
      // 사이드바 영역이나 필터 FAB 버튼을 클릭한 경우가 아닌지 확인
      const isClickingSidebar = sidebar.contains(e.target);
      const isClickingFab = fab.contains(e.target);
      
      if (!isClickingSidebar && !isClickingFab) {
        sidebar.classList.remove('active');
        sidebar.classList.add('collapsed');
        document.body.classList.remove('sidebar-open');
      }
    }
    
    // 선수 상세뷰에서 선수 상세 사이드바가 열린 경우
    if (currentView === 'player') {
      const playerDetailSidebar = document.querySelector('.player-detail-sidebar');
      if (playerDetailSidebar && !playerDetailSidebar.classList.contains('hidden')) {
        const isClickingPlayerSidebar = playerDetailSidebar.contains(e.target);
        const isClickingHoverArea = document.querySelector('.sidebar-hover-area')?.contains(e.target);
        
        if (!isClickingPlayerSidebar && !isClickingHoverArea) {
          playerDetailSidebar.classList.add('hidden');
          document.body.classList.remove('sidebar-open');
        }
      }
    }
    
    // 태그 뷰에서 선수 상세 사이드바가 열린 경우
    if (currentView === 'tag') {
      const playerDetailSidebar = document.querySelector('.player-detail-sidebar');
      if (playerDetailSidebar && !playerDetailSidebar.classList.contains('hidden')) {
        const isClickingPlayerSidebar = playerDetailSidebar.contains(e.target);
        const isClickingHoverArea = document.querySelector('.sidebar-hover-area')?.contains(e.target);
        
        if (!isClickingPlayerSidebar && !isClickingHoverArea) {
          playerDetailSidebar.classList.add('hidden');
          document.body.classList.remove('sidebar-open');
        }
      }
      
      // 태그 뷰에서 공통 태그 사이드바가 열린 경우
      const commonTagSidebar = document.querySelector('#common-tag-sidebar');
      if (commonTagSidebar && !commonTagSidebar.classList.contains('hidden')) {
        const isClickingCommonTagSidebar = commonTagSidebar.contains(e.target);
        
        if (!isClickingCommonTagSidebar) {
          commonTagSidebar.classList.add('hidden');
          document.body.classList.remove('sidebar-open');
        }
      }
    }
  });
  
  // 마우스 진입 시 자동 토글
  sidebar.addEventListener('mouseenter', () => {
    // 모달이 열려있으면 사이드바 자동 오픈 비활성화
    const projectModal = document.getElementById('project-info-modal');
    if (projectModal) return;
    
    if (currentView === 'main') {
      sidebar.classList.add('active');
      sidebar.classList.remove('collapsed');
      document.body.classList.add('sidebar-open');
    }
  });
  
  filterPill.onclick = () => {
    if (currentView === 'main') {
      sidebar.classList.add('active');
      sidebar.classList.remove('collapsed');
      document.body.classList.add('sidebar-open');
    }
  };
  
  // 페이지 진입 시: Home(메인)이라면 사이드바 오픈, 아니면 접힌 상태로 시작
  if (currentView === 'main') {
    sidebar.classList.add('active');
    sidebar.classList.remove('collapsed');
    document.body.classList.add('sidebar-open');
  } else {
    sidebar.classList.add('collapsed');
  }
  
  // 오른쪽 엣지 진입 시 자동 오픈
  document.addEventListener('mousemove', function(e) {
    // 모달이 열려있으면 사이드바 자동 오픈 비활성화
    const projectModal = document.getElementById('project-info-modal');
    if (projectModal) return;
    
    if (currentView === 'main' && e.clientX >= window.innerWidth - 10) {
      sidebar.classList.add('active');
      sidebar.classList.remove('collapsed');
      document.body.classList.add('sidebar-open');
    }
    
    // 태그 뷰에서 오른쪽 엣지 진입 시 공통 태그 사이드바 자동 오픈
    if (currentView === 'tag' && e.clientX >= window.innerWidth - 10) {
      const commonTagSidebar = document.querySelector('#common-tag-sidebar');
      if (commonTagSidebar && commonTagSidebar.classList.contains('hidden')) {
        commonTagSidebar.classList.remove('hidden');
        document.body.classList.add('sidebar-open');
      }
    }
  });
});

// 검색 기능
function setupSearchFunctionality() {
  const searchInput = document.getElementById('searchInput');
  const searchButton = document.getElementById('searchButton');
  const searchWrapper = document.getElementById('searchWrapper');
  
  // 검색창 확장/축소 함수
  function toggleSearchExpansion() {
    if (!isSearchExpanded) {
      // 확장
      searchWrapper.classList.add('expanded');
      searchInput.focus();
      isSearchExpanded = true;
    } else {
      // 축소
      searchWrapper.classList.remove('expanded');
      searchInput.blur();
      searchInput.value = '';
      isSearchExpanded = false;
      
      // 현재 뷰에 따라 적절한 뷰로 복귀
      if (currentView === 'player') {
        // 선수 상세뷰에서 검색 취소 시 현재 선수 상세뷰 유지
        const player = players.find(p => p.Profile === currentPlayer);
        if (player) {
          chart.setOption(createPlayerDetailGraph(player));
        }
      } else if (currentView === 'search') {
        // 검색 결과 뷰에서는 현재 뷰 유지
        // 아무것도 하지 않음
      } else {
        // 다른 뷰에서는 메인 뷰로 복귀
        showMainView();
      }
    }
  }
  
  // 검색 함수
  function performSearch() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    if (searchTerm === '') {
      // 검색어가 없으면 검색창 축소
      toggleSearchExpansion();
      return;
    }
    
    // 선수 검색 (선수 이름만)
    const matchedPlayers = players.filter(player => 
      player.Profile.toLowerCase().includes(searchTerm)
    );
    
    if (matchedPlayers.length === 0) {
      // 검색 결과가 없을 때
      showNoResultsView(searchTerm);
      return;
    }
    
    // 검색 결과가 있으면 항상 검색 결과 뷰 표시 (1개든 여러 개든)
    showSearchResultsView(matchedPlayers, searchTerm);
  }
  
  // 검색 버튼 클릭 이벤트
  searchButton.addEventListener('click', function(e) {
    e.stopPropagation();
    if (!isSearchExpanded) {
      toggleSearchExpansion();
    } else {
      performSearch();
    }
  });
  
  // 검색창 클릭 시 확장
  searchWrapper.addEventListener('click', function(e) {
    if (!isSearchExpanded) {
      toggleSearchExpansion();
    }
  });
  
  // 엔터 키 이벤트
  searchInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      performSearch();
    }
  });
  
  // ESC 키로 검색창 축소
  searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      toggleSearchExpansion();
    }
  });
  
  // 검색어 입력 시 자동 검색 제거 - 엔터 키나 검색 버튼 클릭 시에만 검색 실행
  searchInput.addEventListener('input', function() {
    const searchTerm = searchInput.value.trim();
    
    if (searchTerm === '') {
      // 검색어가 비어있으면 검색 필드 축소
      if (isSearchExpanded) {
        searchWrapper.classList.remove('expanded');
        searchInput.blur();
        isSearchExpanded = false;
      }
      
      // 현재 뷰에 따라 적절한 뷰로 복귀
      if (currentView === 'player') {
        // 선수 상세뷰에서 검색어 삭제 시 현재 선수 상세뷰 유지
        const player = players.find(p => p.Profile === currentPlayer);
        if (player) {
          chart.setOption(createPlayerDetailGraph(player));
        }
      } else if (currentView === 'search') {
        // 검색 결과 뷰에서 검색어를 지우면 메인 뷰로 돌아감
        showMainView();
      } else {
        // 다른 뷰에서는 메인 뷰로 복귀
        showMainView();
      }
    }
  });
  
  // 검색창 외부 클릭 시 축소 (검색 결과 뷰에서는 축소하지 않음)
  document.addEventListener('click', function(e) {
    if (isSearchExpanded && !searchWrapper.contains(e.target)) {
      // 검색 결과 뷰에서는 검색창을 축소하지 않음
      if (currentView !== 'search') {
        toggleSearchExpansion();
      }
    }
  });
}

// 검색 결과가 없을 때 표시할 뷰
function showNoResultsView(searchTerm) {
  mainDiv.style.opacity = 0;
  setTimeout(() => {
    // List 뷰에서 온 경우 처리
    const listContainer = document.getElementById('list-container');
    if (listContainer) {
      listContainer.remove();
      mainDiv.style.display = 'block';
    }
    
    const noResultsNode = {
      name: `No results found for "${searchTerm}"`,
      category: 'no-results',
      itemStyle: { color: '#ff6b6b', borderColor: 'transparent', borderWidth: 0, opacity: 1 },
      symbolSize: 15,
      label: {
        show: true,
        position: 'center',
        formatter: '{b|{b}}',
        rich: {
          b: {
            color: '#fff',
            backgroundColor: '#ff6b6b',
            borderRadius: 8,
            padding: [8, 16, 8, 16],
            fontSize: 14,
            fontWeight: 500,
            lineHeight: 22
          }
        }
      }
    };
    
    chart.setOption({
      series: [{
        type: 'graph',
        layout: 'force',
        roam: true,
        draggable: true,
        label: { show: true, position: 'center', formatter: '{b}' },
        force: { repulsion: 600, edgeLength: 350, gravity: 0.1, center: ['50%', '50%'] },
        data: [noResultsNode],
        links: [],
        lineStyle: { color: 'rgba(255,255,255,0.85)', curveness: 0.3 }
      }]
    });
    
    currentView = 'search';
    renderBreadcrumb();
    
    // main div를 표시 상태로 설정
    mainDiv.style.display = 'block';
    
    setTimeout(() => {
      mainDiv.style.opacity = 1;
    }, 30);
  }, 350);
}

// 검색 결과 뷰 표시
function showSearchResultsView(matchedPlayers, searchTerm) {
  mainDiv.style.opacity = 0;
  setTimeout(() => {
    // List 뷰에서 온 경우 처리
    const listContainer = document.getElementById('list-container');
    if (listContainer) {
      listContainer.remove();
      mainDiv.style.display = 'block';
    }
    
    const searchNode = {
      name: `Search: "${searchTerm}" (${matchedPlayers.length} results)`,
      category: 'search',
      itemStyle: { color: '#FFD700', borderColor: 'transparent', borderWidth: 0, opacity: 1 },
      symbolSize: 12,
      emphasis: {
        itemStyle: { color: '#FFD700', opacity: 1, scale: 1.3 },
        label: {
          show: true,
          rich: {
            b: {
              backgroundColor: '#FFD700',
              color: '#000000'
            }
          }
        },
        scale: true
      },
      label: {
        show: true,
        position: 'right',
        formatter: '{b|{b}}',
        rich: {
          b: {
            color: '#222',
            backgroundColor: '#FFD700',
            borderRadius: 8,
            padding: [4, 12, 4, 12],
            fontSize: 12,
            fontWeight: 500,
            lineHeight: 22
          }
        }
      }
    };

    const matchedPlayerNodes = matchedPlayers.map(player => ({
      name: player.Profile,
      category: 'player',
      itemStyle: { color: '#FFD700', borderColor: 'transparent', borderWidth: 0, opacity: 1 },
      symbolSize: 11,
      emphasis: {
        itemStyle: { color: '#FFD700', opacity: 1, scale: 1.3 },
        label: {
          show: true,
          rich: {
            b: {
              backgroundColor: '#FFD700',
              color: '#fff'
            }
          }
        },
        scale: true
      },
      label: {
        show: true,
        position: 'right',
        formatter: '{b|{b}}',
        rich: {
          b: {
            color: '#222',
            backgroundColor: '#FFD700',
            borderRadius: 8,
            padding: [4, 12, 4, 12],
            fontSize: 12,
            fontWeight: 500,
            lineHeight: 22
          }
        }
      }
    }));

    const links = matchedPlayers.map(player => ({
      source: `Search: "${searchTerm}" (${matchedPlayers.length} results)`,
      target: player.Profile,
      lineStyle: {
        color: '#FFD700',
        width: 1.3,
        curveness: 0.3
      }
    }));

    chart.setOption({
      series: [{
        type: 'graph',
        layout: 'force',
        roam: true,
        draggable: true,
        animation: true,
        animationDuration: 1000,
        animationEasing: 'cubicOut',
        label: {
          show: true,
          position: 'right',
          formatter: '{b|{b}}',
          rich: {
            b: {
              color: '#222',
              backgroundColor: 'rgba(255,255,255,1)',
              borderRadius: 8,
              padding: [4, 12, 4, 12],
              fontSize: 12,
              fontWeight: 500,
              lineHeight: 22
            }
          }
        },
        force: {
          repulsion: 600,
          edgeLength: 350,
          gravity: 0.1,
          center: ['50%', '50%']
        },
        data: [searchNode, ...matchedPlayerNodes],
        links: links,
        lineStyle: {
          color: 'rgba(255,255,255,0.85)',
          width: 1.3,
          curveness: 0.3
        }
      }]
    });

    currentView = 'search';
    renderBreadcrumb();
    
    // 검색창 축소
    const searchWrapper = document.getElementById('searchWrapper');
    if (searchWrapper) {
      searchWrapper.classList.remove('expanded');
    }
    
    setTimeout(() => {
      mainDiv.style.opacity = 1;
    }, 30);
  }, 350);
}

// 초기화
renderSegmentedControl();
setupSearchFunctionality(); // renderSegmentedControl 후에 실행
setupSidebarHoverEvents();
renderChips();
updateGraphByChips(); 

// Home 이미지 프리로드로 전환 지연 최소화 (webp 우선, 실패 시 png)
let homeImagePreload = null;
function preloadHomeImage() {
  const tryPngFallback = () => {
    const imgPng = new Image();
    imgPng.decoding = 'async';
    imgPng.loading = 'eager';
    imgPng.setAttribute('fetchpriority', 'high');
    imgPng.src = 'assets/home.png';
    imgPng.onload = () => { homeImagePreload = imgPng; };
  };

  const imgWebp = new Image();
  imgWebp.decoding = 'async';
  imgWebp.loading = 'eager';
  imgWebp.setAttribute('fetchpriority', 'high');
  imgWebp.src = 'assets/home.webp';
  imgWebp.onload = () => { homeImagePreload = imgWebp; };
  imgWebp.onerror = () => { tryPngFallback(); };
}
preloadHomeImage();

// 선수 상세 뷰 그래프 생성 함수 (공통 로직)
function createPlayerDetailGraph(player) {
  const infoNodes = [];
  const infoLinks = [];
  
  // 점선으로 표시할 주관적 정보 필드들
  const dashedFields = ['Tier Mobility', 'Transfer Reason'];
  
  // 선수 이미지 노드 추가
  if (player.Image && player.Image !== null) {
    infoNodes.push({
      name: 'Player Photo',
      category: 'info',
      symbol: 'image://' + player.Image,
      symbolSize: 80,
      itemStyle: { borderColor: '#32BEFF', borderWidth: 2, opacity: 1 },
      label: {
        show: false  // 이미지 노드는 라벨 숨김
      }
    });
    
    infoLinks.push({
      source: player.Profile,
      target: 'Player Photo',
      lineStyle: {
        type: 'solid',
        width: 1.3,
        color: 'rgba(255,255,255,0.85)',
        curveness: 0.3
      }
    });
  }
  
  Object.keys(player).forEach(key => {
    if (
      key !== 'Profile' &&
      key !== 'Image' &&  // Image 필드는 제외
      player[key] !== undefined &&
      player[key] !== null &&
      player[key] !== ''
    ) {
      const isDashed = dashedFields.includes(key);
      
      // Played Leagues를 배열로 처리
      if (key === 'Played Leagues' && Array.isArray(player[key])) {
        // 각 리그를 개별 노드로 추가
        player[key].forEach(league => {
          infoNodes.push({
            name: `Played League: ${league}`,
            category: 'info',
            itemStyle: { color: '#32BEFF', borderColor: 'transparent', borderWidth: 0, opacity: 0.85 },
            symbolSize: 12,
            emphasis: {
              itemStyle: { color: '#32BEFF', opacity: 1, scale: 1.3 },
              label: {
                show: true,
                rich: {
                  b: {
                    backgroundColor: '#32BEFF',
                    color: '#000000'
                  }
                }
              },
              scale: true
            },
            label: {
              show: true,
              position: 'right',
              formatter: '{b|{b}}',
              rich: {
                b: {
                  color: '#222',
                  backgroundColor: 'rgba(255,255,255,1)',
                  borderRadius: 8,
                  padding: [4, 12, 4, 12],
                  fontSize: 12,
                  fontWeight: 500,
                  lineHeight: 22
                }
              }
            }
          });
          
          infoLinks.push({
            source: player.Profile,
            target: `Played League: ${league}`,
            lineStyle: {
              type: 'solid',
              width: 1.3,
              color: 'rgba(255,255,255,0.85)',
              curveness: 0.3
            }
          });
        });
      } else {
        // 기존 방식대로 처리
        infoNodes.push({
          name: `${key}: ${player[key]}`,
          category: 'info',
          itemStyle: { color: '#32BEFF', borderColor: 'transparent', borderWidth: 0, opacity: 0.85 },
          symbolSize: 12,
          emphasis: {
            itemStyle: { color: '#32BEFF', opacity: 1, scale: 1.3 },
            label: {
              show: true,
              rich: {
                b: {
                  backgroundColor: '#32BEFF',
                  color: '#000000'
                }
              }
            },
            scale: true
          },
          label: {
            show: true,
            position: 'right',
            formatter: '{b|{b}}',
            rich: {
              b: {
                color: '#222',
                backgroundColor: 'rgba(255,255,255,1)',
                borderRadius: 8,
                padding: [4, 12, 4, 12],
                fontSize: 12,
                fontWeight: 500,
                lineHeight: 22
              }
            }
          }
        });
        
        infoLinks.push({
          source: player.Profile,
          target: `${key}: ${player[key]}`,
          lineStyle: {
            type: isDashed ? 'dashed' : 'solid',
            width: 1.3,
            color: 'rgba(255,255,255,0.85)',
            curveness: 0.3
          }
        });
      }
    }
  });
  
  return {
    series: [{
      type: 'graph',
      layout: 'force',
      roam: true,
      draggable: true,
      label: {
        show: true,
        position: 'right',
        formatter: '{b|{b}}',
        rich: {
          b: {
            color: '#fff',
            backgroundColor: '#32BEFF',
            borderRadius: 8,
            padding: [4, 12, 4, 12],
            fontSize: 12,
            fontWeight: 500,
            lineHeight: 22
          }
        }
      },
      force: {
        repulsion: 600,
        edgeLength: 350,
        gravity: 0.1,
        center: ['50%', '50%']
      },
      center: ['50%', '50%'],
      data: [
        {
          name: player.Profile,
          category: 'player',
          itemStyle: { color: '#32BEFF', borderColor: 'transparent', borderWidth: 0, opacity: 1 },
          symbolSize: 12,
          label: {
            show: true,
            position: 'right',
            formatter: '{b|{b}}',
            rich: {
              b: {
                color: '#000000',
                backgroundColor: '#32BEFF',
                borderRadius: 8,
                padding: [4, 12, 4, 12],
                fontSize: 12,
                fontWeight: 500,
                lineHeight: 22
              }
            }
          },
          cursor: 'pointer'
        },
        ...infoNodes
      ],
      links: infoLinks,
      lineStyle: {
        color: 'rgba(255,255,255,0.85)',
        width: 1.3,
        curveness: 0.3
      }
    }]
  };
} 