// LK Furniture Maker v0.8.0 - 냉장고 설치장 + 실행취소(Ctrl+Z)
/* SCRIPT.JS - 가구 도면 제작 및 배치 시스템 핵심 로직 */

// 전역 애플리케이션 상태
const state = {
    room: {
        width: 5000,
        depth: 4000,
        height: 2400
    },
    cabinets: [],
    selectedId: null,
    currentTab: 'plan', // 'plan', 'elevation', 'wireframe', '3d'
    
    // 2D 캔버스 뷰포트 상태
    plan: {
        zoom: 0.15,
        panX: 100,
        panY: 80
    },
    elevation: {
        zoom: 0.20,
        panX: 100,
        panY: 350 // Y-up 이므로 캔버스 하단 기준 조정을 위해 아래쪽에 위치
    },
    
    gridEnabled: true,
    snapEnabled: true,
    
    // 드래그 상태
    isDragging: false,
    dragStartMouseX: 0,
    dragStartMouseY: 0,
    dragStartCabX: 0,
    dragStartCabY: 0,
    dragStartCabZ: 0,
    isPanning: false,
    panStartMouseX: 0,
    panStartMouseY: 0,
    panStartPanX: 0,
    panStartPanY: 0,
    
    detailsEnabled: true,
    isExporting: false,
    
    // 3D 상태 관리
    three: {
        scene: null,
        camera: null,
        renderer: null,
        controls: null,
        cabinetsGroup: null,
        wireframe: false,
        doorsOpen: false,
        lockRotate: false,
        techStyle: false,
        wireAngle: 30,
        wireDistance: null,
        wireToolbarCollapsed: false,
        wireDimensions: { enabled: false, fontSize: 18, width: true, height: true, depth: true, support: true, molding: true },
        resizeObserver: null,
        raycaster: null,
        pointer: null,
        dragPlane: null,
        isObjectDragging: false,
        dragCabinetId: null,
        dragOffsetX: 0,
        dragOffsetZ: 0,
        dragMoved: false
    },

    // 실행취소 기록
    history: { undo: [], redo: [], max: 60, restoring: false }
};

// 가구 종류별 기본 스펙 정의 (Default Dimensions)
const CAB_DEFAULTS = {
    sink_base: { name: '싱크대 하부장 (싱크볼)', w: 900, d: 600, h: 850, t: 18, color: '#ffffff', groove: true, grooveDepth: 9, grooveOffset: 15, doorType: 'swing_double', shelves: 0, kickplate: 100, z: 0, fillerSide: 'none', leftFillerWidth: 50, rightFillerWidth: 50, applianceType: 'sink' },
    sink_base_plain: { name: '싱크대 하부장 (기본장)', w: 600, d: 600, h: 850, t: 18, color: '#ffffff', groove: true, grooveDepth: 9, grooveOffset: 15, doorType: 'swing_double', shelves: 0, kickplate: 100, z: 0, fillerSide: 'none', leftFillerWidth: 50, rightFillerWidth: 50, applianceType: 'plain' },
    sink_base_range: { name: '싱크대 하부장 (가스레인지)', w: 600, d: 600, h: 850, t: 18, color: '#ffffff', groove: true, grooveDepth: 9, grooveOffset: 15, doorType: 'swing_double', shelves: 0, kickplate: 100, z: 0, fillerSide: 'none', leftFillerWidth: 50, rightFillerWidth: 50, applianceType: 'range' },
    sink_base_cooktop: { name: '싱크대 하부장 (쿡탑)', w: 600, d: 600, h: 850, t: 18, color: '#ffffff', groove: true, grooveDepth: 9, grooveOffset: 15, doorType: 'swing_double', shelves: 0, kickplate: 100, z: 0, fillerSide: 'none', leftFillerWidth: 50, rightFillerWidth: 50, applianceType: 'cooktop' },
    sink_base_induction: { name: '싱크대 하부장 (인덕션)', w: 600, d: 600, h: 850, t: 18, color: '#ffffff', groove: true, grooveDepth: 9, grooveOffset: 15, doorType: 'swing_double', shelves: 0, kickplate: 100, z: 0, fillerSide: 'none', leftFillerWidth: 50, rightFillerWidth: 50, applianceType: 'induction' },
    sink_base_dishwasher: { name: '식기세척기장', w: 600, d: 600, h: 850, t: 18, color: '#ffffff', groove: true, grooveDepth: 9, grooveOffset: 15, doorType: 'none', shelves: 0, kickplate: 100, z: 0, fillerSide: 'none', leftFillerWidth: 50, rightFillerWidth: 50, applianceType: 'dishwasher' },
    sink_base_washer: { name: '빌트인 드럼세탁기장', w: 600, d: 600, h: 850, t: 18, color: '#ffffff', groove: true, grooveDepth: 9, grooveOffset: 15, doorType: 'none', shelves: 0, kickplate: 100, z: 0, fillerSide: 'none', leftFillerWidth: 50, rightFillerWidth: 50, applianceType: 'washer' },
    sink_base_robot: { name: '로봇청소기장', w: 600, d: 600, h: 850, t: 18, color: '#ffffff', groove: true, grooveDepth: 9, grooveOffset: 15, doorType: 'swing_double', shelves: 0, kickplate: 100, z: 0, fillerSide: 'none', leftFillerWidth: 50, rightFillerWidth: 50, applianceType: 'robot' },
    sink_corner: { name: '싱크대 코너장', w: 900, d: 900, h: 850, t: 18, color: '#ffffff', groove: true, grooveDepth: 9, grooveOffset: 15, doorType: 'swing_single_left', shelves: 1, kickplate: 100, z: 0, isCorner: true, fillerSide: 'none', leftFillerWidth: 50, rightFillerWidth: 50 },
    sink_wall: { name: '싱크대 (상부장)', w: 900, d: 350, h: 700, t: 18, color: '#ffffff', groove: true, grooveDepth: 9, grooveOffset: 15, doorType: 'swing_double', shelves: 2, kickplate: 0, z: 1500 },
    fridge: { name: '냉장고 설치장 (상부장+EP)', w: 1000, d: 650, h: 400, t: 18, color: '#ffffff', groove: true, grooveDepth: 9, grooveOffset: 15, doorType: 'flip_up', shelves: 0, kickplate: 0, z: 0, isFridgeInstall: true },
    island: { name: '아일랜드', w: 1200, d: 800, h: 850, t: 18, color: '#e6d9cc', groove: false, grooveDepth: 0, grooveOffset: 0, doorType: 'swing_double', shelves: 1, kickplate: 100, z: 0 },
    tall_cabinet: { name: '키큰장', w: 600, d: 600, h: 2200, t: 18, color: '#ffffff', groove: true, grooveDepth: 9, grooveOffset: 15, doorType: 'swing_single_left', shelves: 4, kickplate: 100, z: 0 },
    microwave_cabinet: { name: '전자렌지장', w: 600, d: 600, h: 2200, t: 18, color: '#8c6c53', groove: true, grooveDepth: 9, grooveOffset: 15, doorType: 'swing_double', shelves: 3, kickplate: 100, z: 0, hasNiche: true, nicheType: 'microwave' },
    cooker_cabinet: { name: '밥통장', w: 600, d: 600, h: 2200, t: 18, color: '#ffffff', groove: true, grooveDepth: 9, grooveOffset: 15, doorType: 'swing_double', shelves: 3, kickplate: 100, z: 0, hasNiche: true, nicheType: 'cooker' },
    drawer_2: { name: '서랍장 (2단)', w: 800, d: 600, h: 850, t: 18, color: '#ffffff', groove: true, grooveDepth: 9, grooveOffset: 15, doorType: 'drawer_2', shelves: 0, kickplate: 100, z: 0 },
    drawer_3: { name: '서랍장 (3단)', w: 800, d: 600, h: 850, t: 18, color: '#3a3e45', groove: true, grooveDepth: 9, grooveOffset: 15, doorType: 'drawer_3', shelves: 0, kickplate: 100, z: 0 },
    
    wardrobe_swing: { name: '붙박이장 (여닫이)', w: 1000, d: 600, h: 2200, t: 18, color: '#ffffff', groove: true, grooveDepth: 9, grooveOffset: 15, doorType: 'swing_double', shelves: 2, kickplate: 80, z: 0 },
    wardrobe_sliding: { name: '붙박이장 (슬라이딩)', w: 1200, d: 650, h: 2200, t: 18, color: '#e6d9cc', groove: true, grooveDepth: 9, grooveOffset: 15, doorType: 'sliding', shelves: 2, kickplate: 80, z: 0 },
    wardrobe_open: { name: '오픈 옷장', w: 800, d: 600, h: 2200, t: 18, color: '#8c6c53', groove: true, grooveDepth: 9, grooveOffset: 15, doorType: 'none', shelves: 3, kickplate: 80, z: 0 },
    
    shoe_normal: { name: '일반 신발장', w: 800, d: 350, h: 2100, t: 18, color: '#ffffff', groove: true, grooveDepth: 9, grooveOffset: 15, doorType: 'swing_double', shelves: 6, kickplate: 50, z: 0 },
    shoe_hanging: { name: '행잉형 신발장', w: 800, d: 350, h: 2000, t: 18, color: '#3a3e45', groove: true, grooveDepth: 9, grooveOffset: 15, doorType: 'swing_double', shelves: 6, kickplate: 0, z: 150 }, // Z가 바닥에서 떠있음
    
    storage_open: { name: '오픈 수납장', w: 800, d: 400, h: 1800, t: 18, color: '#ffffff', groove: true, grooveDepth: 9, grooveOffset: 15, doorType: 'none', shelves: 4, kickplate: 80, z: 0 },
    storage_door: { name: '도어형 수납장', w: 800, d: 400, h: 1800, t: 18, color: '#e6d9cc', groove: true, grooveDepth: 9, grooveOffset: 15, doorType: 'swing_double', shelves: 4, kickplate: 80, z: 0 },
    shelf_unit: { name: '다용도 선반장', w: 800, d: 300, h: 1200, t: 18, color: '#8c6c53', groove: false, grooveDepth: 0, grooveOffset: 0, doorType: 'none', shelves: 3, kickplate: 0, z: 0 }
};

// 실행취소 / 다시실행 -------------------------------------------------
function makeHistorySnapshot() {
    return JSON.stringify({ room: state.room, cabinets: state.cabinets, selectedId: state.selectedId });
}
function pushHistory() {
    if (state.history.restoring) return;
    const snap = makeHistorySnapshot();
    if (state.history.undo[state.history.undo.length - 1] === snap) return;
    state.history.undo.push(snap);
    if (state.history.undo.length > state.history.max) state.history.undo.shift();
    state.history.redo = [];
}
function restoreHistorySnapshot(raw) {
    const data = JSON.parse(raw);
    state.history.restoring = true;
    state.room = data.room;
    state.cabinets = data.cabinets;
    state.cabinets.forEach(c => { migrateFridgeCabinet(c); ensureCabinetRows(c); });
    state.selectedId = data.selectedId && state.cabinets.some(c => c.id === data.selectedId) ? data.selectedId : null;
    document.getElementById('room-width').value = state.room.width;
    document.getElementById('room-depth').value = state.room.depth;
    document.getElementById('room-height').value = state.room.height;
    selectCabinet(state.selectedId);
    updatePlacedList(); update3DRoomGeometry(); render2D(); update3DScene();
    state.history.restoring = false;
}
function undoAction() {
    if (!state.history.undo.length) { showStatusMessage('되돌릴 작업이 없습니다.'); return; }
    state.history.redo.push(makeHistorySnapshot());
    restoreHistorySnapshot(state.history.undo.pop());
    showStatusMessage('마지막 작업을 되돌렸습니다. (Ctrl+Z)');
}
function redoAction() {
    if (!state.history.redo.length) { showStatusMessage('다시 실행할 작업이 없습니다.'); return; }
    state.history.undo.push(makeHistorySnapshot());
    restoreHistorySnapshot(state.history.redo.pop());
    showStatusMessage('되돌린 작업을 다시 실행했습니다.');
}

const SINK_APPLIANCE_BY_TYPE = {
    sink_base: 'sink',
    sink_base_plain: 'plain',
    sink_base_range: 'range',
    sink_base_cooktop: 'cooktop',
    sink_base_induction: 'induction',
    sink_base_dishwasher: 'dishwasher',
    sink_base_washer: 'washer',
    sink_base_robot: 'robot'
};

function getSinkApplianceType(cab) {
    if (!cab) return 'plain';
    const inferred = SINK_APPLIANCE_BY_TYPE[cab.type];
    if (inferred && cab.applianceType !== inferred) cab.applianceType = inferred;
    return cab.applianceType || inferred || 'plain';
}

function migrateFridgeCabinet(cab) {
    if (!cab || cab.type !== 'fridge') return cab;
    // 예전 한 통짜리 냉장고장을 새 설치장 규격으로 자동 변환
    if (!cab.isFridgeInstall || Number(cab.h) > 1000) {
        cab.name = '냉장고 설치장 (상부장+EP)';
        cab.h = 400;
        cab.d = Math.min(Number(cab.d) || 650, 700);
        cab.doorType = 'flip_up';
        cab.supportType = 'none'; cab.kickplate = 0; cab.shelves = 0;
        cab.isFridgeInstall = true;
    }
    return cab;
}

// DOM 요소 캐싱
const canvas2d = document.getElementById('canvas-2d');
const ctx2d = canvas2d.getContext('2d');
const viewportContainer = document.getElementById('viewport-container');
const wrapper2d = document.getElementById('wrapper-2d');
const wrapper3d = document.getElementById('wrapper-3d');

// 초기화 시작
window.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    setupEventListeners();
    resizeCanvas();
    init3D();
    
    // 기본 가구 몇 개 임시 배치하여 시각화 유도
    addCabinet('sink_base', 'kitchen', 500, 0);
    addCabinet('sink_wall', 'kitchen', 500, 0);
    addCabinet('fridge', 'kitchen', 1500, 0);
    
    selectCabinet(state.cabinets[0].id);
    state.history.undo=[]; state.history.redo=[];
    
    updatePlacedList();
    render2D();
}

// 창 크기 변경에 따른 캔버스 리사이징
window.addEventListener('resize', () => {
    resizeCanvas();
    render2D();
    resize3DViewport();
});

function resizeCanvas() {
    canvas2d.width = wrapper2d.clientWidth;
    canvas2d.height = wrapper2d.clientHeight;
    
    // 눈금(ruler) 오버레이 사이즈 업데이트용
    const rulerX = document.querySelector('.ruler-x');
    const rulerY = document.querySelector('.ruler-y');
    if (rulerX && rulerY) {
        rulerX.style.width = canvas2d.width + 'px';
        rulerY.style.height = canvas2d.height + 'px';
    }
}

// 이벤트 리스너 바인딩
function setupEventListeners() {
    // 툴바 액션
    document.getElementById('btn-new').addEventListener('click', clearProject);
    const partsRefreshBtn = document.getElementById('btn-refresh-parts');
    if (partsRefreshBtn) partsRefreshBtn.addEventListener('click', () => { refreshPartsPanel(); showStatusMessage('선택 가구의 판재를 다시 계산했습니다.'); });
    document.getElementById('btn-save-json').addEventListener('click', saveProjectJSON);
    document.getElementById('input-load-json').addEventListener('change', loadProjectJSON);
    document.getElementById('btn-export-img').addEventListener('click', exportImage);
    document.getElementById('btn-print').addEventListener('click', () => {
        generatePrintData();
        document.getElementById('preview-modal').style.display = 'flex';
    });
    
    document.getElementById('btn-modal-close').addEventListener('click', () => {
        document.getElementById('preview-modal').style.display = 'none';
    });

    ['print-check-plan', 'print-check-elevation', 'print-check-3d', 'print-check-table'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', generatePrintData);
    });
    
    document.getElementById('btn-modal-print').addEventListener('click', () => {
        generatePrintData();
        window.print();
    });
    
    // 현장 치수 변경
    const roomInputs = ['room-width', 'room-depth', 'room-height'];
    roomInputs.forEach(id => {
        document.getElementById(id).addEventListener('focus', pushHistory);
        document.getElementById(id).addEventListener('input', (e) => {
            const prop = id.split('-')[1]; // width, depth, height
            state.room[prop] = Math.max(100, parseInt(e.target.value) || 0);
            update3DRoomGeometry();
            render2D();
            update3DScene();
        });
    });
    
    // 가구 추가 카테고리 탭 전환
    const catButtons = document.querySelectorAll('.tab-sub-btn');
    catButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            catButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            const category = e.target.getAttribute('data-category');
            document.querySelectorAll('.library-grid').forEach(grid => grid.classList.remove('active'));
            document.getElementById(`lib-${category}`).classList.add('active');
        });
    });
    
    // 가구 아이템 라이브러리 추가 액션
    document.querySelectorAll('.lib-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const btn = e.currentTarget;
            const type = btn.getAttribute('data-type');
            const category = btn.getAttribute('data-category');
            
            pushHistory();
            // 기존 가구와 겹치지 않는 뒤벽 빈자리를 우선 탐색해 자동 배치
            const autoPosition = findNextAvailablePosition(type);
            const newCab = addCabinet(type, category, autoPosition.x, autoPosition.y);
            selectCabinet(newCab.id);
            updatePlacedList();
            render2D();
            update3DScene();
            
            // 상태 메시지 출력
            showStatusMessage(`${newCab.name} 가구가 추가되었습니다.`);
        });
    });
    
    // 속성 편집 패널 변경 이벤트
    const propFields = {
        'prop-w': 'w', 'prop-d': 'd', 'prop-h': 'h',
        'prop-t': 't', 'prop-color': 'color',
        'prop-door-type': 'doorType', 'prop-shelves': 'shelves',
        'prop-handle-type': 'handleType',
        'prop-pos-x': 'x', 'prop-pos-y': 'y', 'prop-rotation': 'rotation',
        'prop-groove-depth': 'grooveDepth', 'prop-groove-offset': 'grooveOffset',
        'prop-support-type': 'supportType',
        'prop-plinth-height': 'plinthHeight',
        'prop-plinth-setback': 'plinthSetback',
        'prop-leg-type': 'legType',
        'prop-leg-height': 'legHeight',
        'prop-filler-side': 'fillerSide',
        'prop-left-filler-width': 'leftFillerWidth',
        'prop-right-filler-width': 'rightFillerWidth'
    };
    
    Object.keys(propFields).forEach(id => {
        const el = document.getElementById(id);
        el.addEventListener('focus', pushHistory);
        const eventType = el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input';
        
        el.addEventListener(eventType, (e) => {
            if (!state.selectedId) return;
            const key = propFields[id];
            const cab = state.cabinets.find(c => c.id === state.selectedId);
            if (!cab) return;
            
            if (e.target.type === 'number') {
                cab[key] = parseInt(e.target.value) || 0;
            } else if (e.target.type === 'select-one') {
                cab[key] = (key === 'rotation' || key === 't' || key === 'plinthHeight' || key === 'plinthSetback' || key === 'legHeight') ? parseInt(e.target.value) : e.target.value;
            } else {
                cab[key] = e.target.value;
            }
            
            // 지지 방식 변경 시 서브 설정 화면 갱신
            if (key === 'fillerSide') updateSinkFillerVisibility(cab);
            if (key === 'supportType') {
                document.getElementById('plinth-settings').style.display = cab.supportType === 'plinth' ? 'grid' : 'none';
                document.getElementById('leg-settings').style.display = cab.supportType === 'legs' ? 'grid' : 'none';
            }
            
            // 좌표 이동 제약 조건 및 스냅
            if (key === 'x' || key === 'y' || key === 'rotation' || key === 'w' || key === 'd') {
                const rotated = getCabinetRotatedDims(cab);
                cab.x = Math.max(0, Math.min(state.room.width - rotated.w, cab.x));
                cab.y = Math.max(0, Math.min(state.room.depth - rotated.d, cab.y));
            }
            
            if (['w', 'h', 't', 'd', 'doorType', 'supportType', 'plinthHeight', 'legHeight'].includes(key)) refreshInternalEditor();
            refreshPartsPanel();
            render2D();
            update3DScene();
            updatePlacedList();
        });
    });
    
    // 손잡이 타입 검색 필터 이벤트
    document.getElementById('prop-handle-type-search').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const select = document.getElementById('prop-handle-type');
        const options = select.options;
        for (let i = 0; i < options.length; i++) {
            const text = options[i].text.toLowerCase();
            const val = options[i].value.toLowerCase();
            if (text.includes(query) || val.includes(query)) {
                options[i].style.display = '';
            } else {
                options[i].style.display = 'none';
            }
        }
    });
    
    // 손잡이 검색어 지우기 버튼
    document.getElementById('btn-clear-handle-search').addEventListener('click', () => {
        const searchInput = document.getElementById('prop-handle-type-search');
        searchInput.value = '';
        const select = document.getElementById('prop-handle-type');
        const options = select.options;
        for (let i = 0; i < options.length; i++) {
            options[i].style.display = '';
        }
    });
    
    // 우라홈 체크박스 전용
    document.getElementById('prop-groove').addEventListener('focus', pushHistory);
    document.getElementById('prop-groove').addEventListener('change', (e) => {
        if (!state.selectedId) return;
        const cab = state.cabinets.find(c => c.id === state.selectedId);
        if (!cab) return;
        cab.groove = e.target.checked;
        
        const grooveSettings = document.getElementById('groove-settings');
        if (cab.groove) {
            grooveSettings.style.display = 'grid';
        } else {
            grooveSettings.style.display = 'none';
        }
        
        render2D();
        update3DScene();
    });
    
    // 속성 제어 버튼 (복제/삭제)
    document.getElementById('btn-duplicate').addEventListener('click', () => {
        if (!state.selectedId) return;
        pushHistory();
        const cab = state.cabinets.find(c => c.id === state.selectedId);
        if (!cab) return;
        
        // 겹치지 않게 옆으로 약간 비껴서 생성
        const newX = Math.min(state.room.width - cab.w, cab.x + cab.w);
        const newY = cab.y;
        
        const clone = JSON.parse(JSON.stringify(cab));
        clone.id = 'cab_' + Date.now(); clone.name = cab.name + ' (복사)'; clone.x = newX; clone.y = newY;
        ensureCabinetRows(clone).forEach((row, ri) => {
            row.id = `row_${Date.now()}_${ri}_${Math.floor(Math.random()*1000)}`;
            row.columns.forEach((col, ci) => {
                col.id = `col_${Date.now()}_${ri}_${ci}_${Math.floor(Math.random()*1000)}`;
                col.sections.forEach((sec, si) => sec.id = `sec_${Date.now()}_${ri}_${ci}_${si}_${Math.floor(Math.random()*1000)}`);
            });
        });
        syncLegacySections(clone);
        state.cabinets.push(clone);
        selectCabinet(clone.id);
        
        updatePlacedList();
        render2D();
        update3DScene();
        showStatusMessage(`${clone.name} 가구가 복제되었습니다.`);
    });
    
    document.getElementById('btn-delete').addEventListener('click', () => {
        deleteSelectedCabinet();
    });
    
    // 뷰포트 전환 탭
    document.getElementById('tab-2d-plan').addEventListener('click', (e) => switchTab('plan', e.currentTarget));
    document.getElementById('tab-2d-elevation').addEventListener('click', (e) => switchTab('elevation', e.currentTarget));
    document.getElementById('tab-wireframe').addEventListener('click', (e) => switchTab('wireframe', e.currentTarget));
    document.getElementById('tab-3d').addEventListener('click', (e) => switchTab('3d', e.currentTarget));
    
    // 캔버스 오버레이 컨트롤
    const btnDetails = document.getElementById('btn-toggle-details');
    btnDetails.addEventListener('click', () => {
        state.detailsEnabled = !state.detailsEnabled;
        btnDetails.classList.toggle('active', state.detailsEnabled);
        render2D();
    });

    const btnGrid = document.getElementById('btn-toggle-grid');
    btnGrid.addEventListener('click', () => {
        state.gridEnabled = !state.gridEnabled;
        btnGrid.classList.toggle('active', state.gridEnabled);
        render2D();
    });
    
    const btnSnap = document.getElementById('btn-toggle-snap');
    btnSnap.addEventListener('click', () => {
        state.snapEnabled = !state.snapEnabled;
        btnSnap.classList.toggle('active', state.snapEnabled);
    });
    
    document.getElementById('btn-zoom-in').addEventListener('click', () => handleZoom(1.2));
    document.getElementById('btn-zoom-out').addEventListener('click', () => handleZoom(0.8));
    document.getElementById('btn-zoom-fit').addEventListener('click', zoomToFit);
    
    // 3D 전용 부가 옵션
    const btnLockRotate = document.getElementById('btn-3d-lock-rotate');
    btnLockRotate.addEventListener('click', () => {
        state.three.lockRotate = !state.three.lockRotate;
        btnLockRotate.classList.toggle('active', state.three.lockRotate);
        if (state.three.controls) {
            state.three.controls.enableRotate = !state.three.lockRotate;
        }
    });

    document.getElementById('btn-3d-preset-iso').addEventListener('click', () => applyPresetView('iso'));
    document.getElementById('btn-3d-preset-front').addEventListener('click', () => applyPresetView('front'));
    document.getElementById('btn-3d-preset-top').addEventListener('click', () => applyPresetView('top'));
    document.getElementById('btn-3d-preset-side').addEventListener('click', () => applyPresetView('side'));

    document.getElementById('btn-3d-fit').addEventListener('click', () => fit3DView());
    document.getElementById('btn-wire-fit').addEventListener('click', () => fit3DView({ keepDirection: true }));
    const wireRange = document.getElementById('wire-angle-range');
    const wireNumber = document.getElementById('wire-angle-number');
    const setWireAngle = (value) => {
        const angle = Math.max(-180, Math.min(180, Number(value) || 0));
        state.three.wireAngle = angle;
        wireRange.value = angle;
        wireNumber.value = angle;
        document.querySelectorAll('.wire-angle-btn').forEach(btn => btn.classList.toggle('active', Number(btn.dataset.angle) === angle));
        if (state.currentTab === 'wireframe') applyWireframeAngle(angle);
    };
    wireRange.addEventListener('input', e => setWireAngle(e.target.value));
    wireNumber.addEventListener('input', e => setWireAngle(e.target.value));
    document.getElementById('btn-wire-angle-minus').addEventListener('click', () => setWireAngle(state.three.wireAngle - 1));
    document.getElementById('btn-wire-angle-plus').addEventListener('click', () => setWireAngle(state.three.wireAngle + 1));
    document.querySelectorAll('.wire-angle-btn').forEach(btn => btn.addEventListener('click', () => setWireAngle(btn.dataset.angle)));
    setWireAngle(state.three.wireAngle);

    const toolbarToggle = document.getElementById('btn-wire-toolbar-toggle');
    if (toolbarToggle) toolbarToggle.addEventListener('click', () => {
        state.three.wireToolbarCollapsed = !state.three.wireToolbarCollapsed;
        document.getElementById('wireframe-toolbar').classList.toggle('collapsed', state.three.wireToolbarCollapsed);
        toolbarToggle.innerHTML = state.three.wireToolbarCollapsed ? '<span>설정 펼치기</span> ▼' : '<span>설정 접기</span> ▲';
        setTimeout(() => { resize3DViewport(); }, 30);
    });
    const bindWireDim = (id, key, isNumber=false) => {
        const el=document.getElementById(id); if(!el) return;
        const sync=()=>{ state.three.wireDimensions[key]=isNumber ? Math.max(10,Math.min(48,Number(el.value)||18)) : !!el.checked; updateWireDimensionOverlay(); };
        el.addEventListener(isNumber?'input':'change',sync); sync();
    };
    bindWireDim('wire-dim-enabled','enabled');
    bindWireDim('wire-dim-font','fontSize',true);
    bindWireDim('wire-dim-width','width');
    bindWireDim('wire-dim-height','height');
    bindWireDim('wire-dim-depth','depth');
    bindWireDim('wire-dim-support','support');
    bindWireDim('wire-dim-molding','molding');

    const btnTechStyle = document.getElementById('btn-3d-tech-style');
    btnTechStyle.addEventListener('click', () => {
        state.three.techStyle = !state.three.techStyle;
        btnTechStyle.classList.toggle('active', state.three.techStyle);
        update3DScene();
    });

    document.getElementById('btn-3d-wireframe').addEventListener('click', (e) => {
        state.three.wireframe = !state.three.wireframe;
        e.currentTarget.classList.toggle('active', state.three.wireframe);
        update3DScene();
    });
    document.getElementById('btn-3d-open-doors').addEventListener('click', (e) => {
        state.three.doorsOpen = !state.three.doorsOpen;
        e.currentTarget.classList.toggle('active', state.three.doorsOpen);
        update3DScene();
    });
    
    // 빠른 자동 배치 도구
    document.getElementById('btn-place-right').addEventListener('click', placeSelectedToRight);
    document.getElementById('btn-compact-back-wall').addEventListener('click', compactCabinetsAlongBackWall);
    document.getElementById('btn-space-evenly').addEventListener('click', distributeCabinetsEvenly);
    
    // 내부 구성 편집기 v0.5: 가로 분할(상·하 통) + 각 가로칸별 세로 분할
    document.getElementById('btn-add-row').addEventListener('click', () => {
        const cab = state.cabinets.find(c => c.id === state.selectedId);
        if (!cab) return;
        const rows = ensureCabinetRows(cab);
        rows.push(createCabinetRow(cab, Math.max(250, getCabinetUsableInnerHeight(cab) / (rows.length + 1))));
        autoFitCabinetRows(cab);
        refreshInternalEditor(); render2D(); update3DScene();
    });

    document.getElementById('btn-auto-horizontal-split').addEventListener('click', () => {
        const cab = state.cabinets.find(c => c.id === state.selectedId);
        if (!cab) return;
        const currentRows = ensureCabinetRows(cab);
        if (currentRows.length > 1 && !confirm('현재 가로 분할을 2칸으로 다시 구성할까요?')) return;
        const usable = Math.max(500, getCabinetUsableInnerHeight(cab) - cab.t);
        // 키큰장/수납장은 기본적으로 정확한 정분할, 위·아래 모두 빈칸으로 생성
        const lowerH = Math.round((usable / 2) / 10) * 10;
        const upperH = usable - lowerH;
        const emptyRow = (height) => createCabinetRow(
            cab,
            height,
            [createCabinetColumn(cab, getCabinetUsableInnerWidth(cab), [createInternalSection('open', height)])]
        );
        cab.rows = [emptyRow(lowerH), emptyRow(upperH)];
        cab.rows.forEach(row => { autoFitRowColumns(cab, row); row.columns.forEach(col => autoFitSections(col.sections, row.height)); });
        syncLegacySections(cab);
        refreshInternalEditor(); render2D(); update3DScene();
        showStatusMessage(`가구를 상·하 정분할하고 두 칸 모두 선반 없는 빈칸으로 만들었습니다.`);
    });

    document.getElementById('btn-row-auto-fit').addEventListener('click', () => {
        const cab = state.cabinets.find(c => c.id === state.selectedId);
        if (!cab) return;
        autoFitCabinetRows(cab);
        ensureCabinetRows(cab).forEach(row => {
            autoFitRowColumns(cab, row);
            row.columns.forEach(col => autoFitSections(col.sections, row.height));
        });
        syncLegacySections(cab);
        refreshInternalEditor(); render2D(); update3DScene();
        showStatusMessage('가로칸 높이와 각 세로칸 폭·내부 높이를 모두 맞췄습니다.');
    });

    document.getElementById('internal-row-list').addEventListener('change', (e) => {
        const cab = state.cabinets.find(c => c.id === state.selectedId);
        const rowCard = e.target.closest('.internal-row-card');
        if (!cab || !rowCard) return;
        const row = ensureCabinetRows(cab).find(r => r.id === rowCard.dataset.rowId);
        if (!row) return;
        if (e.target.classList.contains('row-height')) row.height = Math.max(200, parseInt(e.target.value) || 200);
        const colCard = e.target.closest('.internal-column-card');
        const column = colCard ? row.columns.find(c => c.id === colCard.dataset.columnId) : null;
        if (column && e.target.classList.contains('column-width')) column.width = Math.max(150, parseInt(e.target.value) || 150);
        const secRow = e.target.closest('.internal-section-row');
        if (column && secRow) {
            const section = column.sections.find(s => s.id === secRow.dataset.sectionId);
            if (!section) return;
            if (e.target.classList.contains('section-type')) section.type = e.target.value;
            if (e.target.classList.contains('section-height')) section.height = Math.max(80, parseInt(e.target.value) || 80);
            if (e.target.classList.contains('section-drawers')) section.drawers = Math.max(1, Math.min(6, parseInt(e.target.value) || 2));
        }
        syncLegacySections(cab);
        refreshInternalEditor(); render2D(); update3DScene();
    });

    document.getElementById('internal-row-list').addEventListener('click', (e) => {
        const cab = state.cabinets.find(c => c.id === state.selectedId);
        const rowCard = e.target.closest('.internal-row-card');
        if (!cab || !rowCard) return;
        const rows = ensureCabinetRows(cab);
        const rowIndex = rows.findIndex(r => r.id === rowCard.dataset.rowId);
        if (rowIndex < 0) return;
        const row = rows[rowIndex];

        if (e.target.closest('.row-delete')) {
            if (rows.length <= 1) { showStatusMessage('가로칸은 최소 1개가 필요합니다.'); return; }
            rows.splice(rowIndex, 1); autoFitCabinetRows(cab);
        } else if (e.target.closest('.row-move-up') && rowIndex < rows.length - 1) {
            [rows[rowIndex + 1], rows[rowIndex]] = [rows[rowIndex], rows[rowIndex + 1]];
        } else if (e.target.closest('.row-move-down') && rowIndex > 0) {
            [rows[rowIndex - 1], rows[rowIndex]] = [rows[rowIndex], rows[rowIndex - 1]];
        } else if (e.target.closest('.row-add-column')) {
            row.columns.push(createCabinetColumn(cab, Math.max(200, getCabinetUsableInnerWidth(cab) / (row.columns.length + 1)), [createInternalSection('open', row.height)]));
            autoFitRowColumns(cab, row);
        } else if (e.target.closest('.row-column-auto-fit')) {
            autoFitRowColumns(cab, row); row.columns.forEach(col => autoFitSections(col.sections, row.height));
        } else {
            const colCard = e.target.closest('.internal-column-card');
            if (!colCard) return;
            const colIndex = row.columns.findIndex(c => c.id === colCard.dataset.columnId);
            if (colIndex < 0) return;
            const column = row.columns[colIndex];
            const addBtn = e.target.closest('.column-add-section');
            if (addBtn) {
                column.sections.push(createInternalSection(addBtn.dataset.sectionType));
                autoFitSections(column.sections, row.height);
            } else if (e.target.closest('.column-delete')) {
                if (row.columns.length <= 1) { showStatusMessage('각 가로칸에는 최소 1개의 세로칸이 필요합니다.'); return; }
                row.columns.splice(colIndex, 1); autoFitRowColumns(cab, row);
            } else {
                const secRow = e.target.closest('.internal-section-row');
                if (!secRow) return;
                const index = column.sections.findIndex(s => s.id === secRow.dataset.sectionId);
                if (index < 0) return;
                if (e.target.closest('.section-delete')) column.sections.splice(index, 1);
                else if (e.target.closest('.section-move-up') && index > 0) [column.sections[index - 1], column.sections[index]] = [column.sections[index], column.sections[index - 1]];
                else if (e.target.closest('.section-move-down') && index < column.sections.length - 1) [column.sections[index + 1], column.sections[index]] = [column.sections[index], column.sections[index + 1]];
                else return;
                if (!column.sections.length) column.sections.push(createInternalSection('open', row.height));
                autoFitSections(column.sections, row.height);
            }
        }
        syncLegacySections(cab);
        refreshInternalEditor(); render2D(); update3DScene();
    });

    // 내부 구성 편집도 Ctrl+Z로 되돌릴 수 있도록 편집 시작 전 기록
    const internalList = document.getElementById('internal-row-list');
    if (internalList) {
        internalList.addEventListener('focusin', pushHistory);
        internalList.addEventListener('mousedown', (e) => { if (e.target.closest('button')) pushHistory(); }, true);
    }

    // 2D 마우스 드래그 / 팬 제어
    canvas2d.addEventListener('mousedown', onMouseDown);
    canvas2d.addEventListener('mousemove', onMouseMove);
    canvas2d.addEventListener('mouseup', onMouseUp);
    canvas2d.addEventListener('mouseleave', onMouseUp);
    canvas2d.addEventListener('wheel', onWheel);
    
    // 단축키 이벤트
    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            if (e.shiftKey) redoAction(); else undoAction();
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
            e.preventDefault(); redoAction(); return;
        }
        // 인풋 포커스 체크 (인풋 편집 도중 단축키 오동작 방지)
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT')) return;
        if (!state.selectedId) return;
        const cab = state.cabinets.find(c => c.id === state.selectedId);
        if (!cab) return;
        
        switch (e.key) {
            case 'Delete':
            case 'Backspace':
                deleteSelectedCabinet();
                break;
            case 'r':
            case 'R':
                pushHistory();
                // 90도씩 회전
                cab.rotation = (cab.rotation + 90) % 360;
                document.getElementById('prop-rotation').value = cab.rotation.toString();
                render2D();
                update3DScene();
                break;
            case 'd':
            case 'D':
                if (e.ctrlKey) {
                    e.preventDefault();
                    document.getElementById('btn-duplicate').click();
                }
                break;
            case 'ArrowLeft':
                pushHistory();
                cab.x = Math.max(0, cab.x - (e.shiftKey ? 100 : 10));
                syncPropFields(cab);
                render2D();
                update3DScene();
                break;
            case 'ArrowRight':
                pushHistory();
                cab.x = Math.min(state.room.width - cab.w, cab.x + (e.shiftKey ? 100 : 10));
                syncPropFields(cab);
                render2D();
                update3DScene();
                break;
            case 'ArrowUp':
                pushHistory();
                if (state.currentTab === 'plan') {
                    cab.y = Math.max(0, cab.y - (e.shiftKey ? 100 : 10));
                } else if (state.currentTab === 'elevation') {
                    cab.z = Math.min(state.room.height - cab.h, cab.z + (e.shiftKey ? 100 : 10));
                }
                syncPropFields(cab);
                render2D();
                update3DScene();
                break;
            case 'ArrowDown':
                pushHistory();
                if (state.currentTab === 'plan') {
                    cab.y = Math.min(state.room.depth - cab.d, cab.y + (e.shiftKey ? 100 : 10));
                } else if (state.currentTab === 'elevation') {
                    cab.z = Math.max(0, cab.z - (e.shiftKey ? 100 : 10));
                }
                syncPropFields(cab);
                render2D();
                update3DScene();
                break;
        }
    });
}

// 탭 전환 핸들러
function switchTab(tab, tabElement) {
    state.currentTab = tab;

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (tabElement) tabElement.classList.add('active');

    if (tab === 'plan' || tab === 'elevation') {
        wrapper2d.classList.add('active');
        wrapper3d.classList.remove('active');
        wrapper3d.classList.remove('camera-wireframe-mode');
        const legend = document.getElementById('legend-view-type');
        legend.innerText = tab === 'plan' ? '2D 평면도 (TOP VIEW)' : '2D 정면도 (ELEVATION VIEW)';
        resizeCanvas();
        render2D();
        return;
    }

    if (tab === 'wireframe' || tab === '3d') {
        wrapper2d.classList.remove('active');
        wrapper3d.classList.add('active');
        wrapper3d.classList.toggle('camera-wireframe-mode', tab === 'wireframe');
        set3DViewportMode(tab);
        requestAnimationFrame(() => {
            resize3DViewport();
            update3DScene();
            if (tab === 'wireframe') applyWireframeAngle(state.three.wireAngle, true);
            else fit3DView({ keepDirection: true });
        });
    }
}

// 가구가 차지하는 평면 사각형 반환
function getCabinetBounds(cab, x = cab.x, y = cab.y) {
    const dims = getCabinetRotatedDims(cab);
    return { left: x, top: y, right: x + dims.w, bottom: y + dims.d, w: dims.w, d: dims.d };
}

// 두 가구의 평면 영역 겹침 여부
function rectanglesOverlap(a, b, clearance = 0) {
    return !(a.right + clearance <= b.left ||
             a.left >= b.right + clearance ||
             a.bottom + clearance <= b.top ||
             a.top >= b.bottom + clearance);
}

// 라이브러리에서 새 가구를 추가할 때 사용할 빈 위치 탐색
function findNextAvailablePosition(type) {
    const specs = CAB_DEFAULTS[type];
    const temp = { w: specs.w, d: specs.d, rotation: 0 };
    const dims = getCabinetRotatedDims(temp);
    const step = 50;

    // 1차: 뒤벽(y=0)을 왼쪽부터 검색
    for (let x = 0; x <= state.room.width - dims.w; x += step) {
        const candidate = { left: x, top: 0, right: x + dims.w, bottom: dims.d };
        const occupied = state.cabinets.some(other => rectanglesOverlap(candidate, getCabinetBounds(other), 0));
        if (!occupied) return { x, y: 0 };
    }

    // 2차: 방 전체를 그리드 방식으로 검색
    for (let y = step; y <= state.room.depth - dims.d; y += step) {
        for (let x = 0; x <= state.room.width - dims.w; x += step) {
            const candidate = { left: x, top: y, right: x + dims.w, bottom: y + dims.d };
            const occupied = state.cabinets.some(other => rectanglesOverlap(candidate, getCabinetBounds(other), 0));
            if (!occupied) return { x, y };
        }
    }

    // 빈 공간이 없으면 안전하게 방 안 중앙에 배치
    return {
        x: Math.max(0, Math.min(state.room.width - dims.w, Math.floor((state.room.width - dims.w) / 2))),
        y: Math.max(0, Math.min(state.room.depth - dims.d, Math.floor((state.room.depth - dims.d) / 2)))
    };
}

function refreshAfterAutoLayout(message) {
    if (state.selectedId) {
        const cab = state.cabinets.find(c => c.id === state.selectedId);
        if (cab) syncPropFields(cab);
    }
    updatePlacedList();
    render2D();
    update3DScene();
    showStatusMessage(message);
}

// 선택 가구를 같은 뒤벽 라인의 가장 오른쪽에 연속 배치
function placeSelectedToRight() {
    const cab = state.cabinets.find(c => c.id === state.selectedId);
    if (!cab) {
        showStatusMessage('먼저 이동할 가구를 선택하세요.');
        return;
    }

    const others = state.cabinets.filter(c => c.id !== cab.id);
    let targetX = 0;
    others.forEach(other => {
        const bounds = getCabinetBounds(other);
        targetX = Math.max(targetX, bounds.right);
    });

    const dims = getCabinetRotatedDims(cab);
    if (targetX + dims.w > state.room.width) {
        showStatusMessage('오른쪽에 배치할 공간이 부족합니다.');
        return;
    }

    cab.x = Math.round(targetX / 10) * 10;
    cab.y = 0;
    refreshAfterAutoLayout(`${cab.name}을(를) 오른쪽 빈자리에 배치했습니다.`);
}

// 모든 가구를 뒤벽 기준 왼쪽부터 빈틈없이 정렬
function compactCabinetsAlongBackWall() {
    if (state.cabinets.length === 0) {
        showStatusMessage('정렬할 가구가 없습니다.');
        return;
    }

    const ordered = [...state.cabinets].sort((a, b) => a.x - b.x || a.y - b.y);
    const totalWidth = ordered.reduce((sum, cab) => sum + getCabinetRotatedDims(cab).w, 0);
    if (totalWidth > state.room.width) {
        showStatusMessage(`가구 총 폭 ${Math.round(totalWidth)}mm가 현장 폭을 초과합니다.`);
        return;
    }

    let cursorX = 0;
    ordered.forEach(cab => {
        cab.x = cursorX;
        cab.y = 0;
        cursorX += getCabinetRotatedDims(cab).w;
    });

    refreshAfterAutoLayout('모든 가구를 뒤벽에 빈틈없이 정렬했습니다.');
}

// 모든 가구를 뒤벽에 균등 간격으로 배치
function distributeCabinetsEvenly() {
    if (state.cabinets.length === 0) {
        showStatusMessage('배치할 가구가 없습니다.');
        return;
    }

    const ordered = [...state.cabinets].sort((a, b) => a.x - b.x || a.y - b.y);
    const totalWidth = ordered.reduce((sum, cab) => sum + getCabinetRotatedDims(cab).w, 0);
    const remaining = state.room.width - totalWidth;
    if (remaining < 0) {
        showStatusMessage(`가구 총 폭 ${Math.round(totalWidth)}mm가 현장 폭을 초과합니다.`);
        return;
    }

    const gap = remaining / (ordered.length + 1);
    let cursorX = gap;
    ordered.forEach(cab => {
        cab.x = Math.round(cursorX);
        cab.y = 0;
        cursorX += getCabinetRotatedDims(cab).w + gap;
    });

    refreshAfterAutoLayout(`가구 사이를 약 ${Math.round(gap)}mm 간격으로 균등 배치했습니다.`);
}

// 내부 구성 데이터 기본값 및 마이그레이션 v0.5
function createInternalSection(type = 'open', height = null) {
    return { id: `sec_${Date.now()}_${Math.floor(Math.random()*100000)}`, type,
        height: height || (type === 'drawer' ? 360 : type === 'hanger' ? 900 : type === 'umbrella' ? 700 : 300), drawers: 2, label: '' };
}
function createDefaultSections(specs) {
    const count=Math.max(0,Number(specs.shelves)||0), usable=Math.max(300,specs.h-(specs.kickplate||0)-specs.t*2), zones=count+1, zoneH=Math.floor(usable/zones);
    return Array.from({length:zones},(_,i)=>({...createInternalSection(i===0&&specs.h>=1700?'hanger':'shelf',zoneH),id:`sec_${Date.now()}_${i}_${Math.floor(Math.random()*1000)}`}));
}
function createCabinetColumn(cab,width=null,sections=null){return{id:`col_${Date.now()}_${Math.floor(Math.random()*100000)}`,width:Math.max(150,Number(width)||getCabinetUsableInnerWidth(cab)),sections:Array.isArray(sections)&&sections.length?sections:[createInternalSection('open',getCabinetUsableInnerHeight(cab))]};}
function createCabinetRow(cab,height=null,columns=null){const h=Math.max(200,Number(height)||getCabinetUsableInnerHeight(cab));return{id:`row_${Date.now()}_${Math.floor(Math.random()*100000)}`,height:h,columns:Array.isArray(columns)&&columns.length?columns:[createCabinetColumn(cab,getCabinetUsableInnerWidth(cab),[createInternalSection('open',h)])]};}
function getCabinetSupportHeight(cab){if(cab.supportType==='legs')return Number(cab.legHeight)||0;if(cab.supportType==='plinth')return Number(cab.plinthHeight)||0;return 0;}
function getCabinetUsableInnerHeight(cab){return Math.max(0,cab.h-getCabinetSupportHeight(cab)-cab.t*2);}
function getCabinetUsableInnerWidth(cab){return Math.max(0,cab.w-cab.t*2);}
function normalizeSection(section,index=0){if(!section.id)section.id=`sec_${Date.now()}_${index}_${Math.floor(Math.random()*1000)}`;if(!['shelf','hanger','drawer','open','umbrella'].includes(section.type))section.type='open';section.height=Math.max(80,Number(section.height)||300);section.drawers=Math.max(1,Math.min(6,Number(section.drawers)||2));return section;}
function normalizeColumn(cab,column,index=0,rowHeight=null){if(!column.id)column.id=`col_${Date.now()}_${index}_${Math.floor(Math.random()*1000)}`;column.width=Math.max(150,Number(column.width)||getCabinetUsableInnerWidth(cab));if(!Array.isArray(column.sections)||!column.sections.length)column.sections=[createInternalSection('open',rowHeight||getCabinetUsableInnerHeight(cab))];column.sections.forEach(normalizeSection);return column;}
function ensureCabinetRows(cab){
    if(!Array.isArray(cab.rows)||!cab.rows.length){
        let legacyCols=Array.isArray(cab.columns)&&cab.columns.length?cab.columns:null;
        if(!legacyCols){const legacySections=Array.isArray(cab.sections)&&cab.sections.length?cab.sections:createDefaultSections({h:cab.h,t:cab.t,kickplate:cab.kickplate||0,shelves:cab.shelves||0});legacyCols=[createCabinetColumn(cab,getCabinetUsableInnerWidth(cab),legacySections)];}
        cab.rows=[createCabinetRow(cab,getCabinetUsableInnerHeight(cab),legacyCols)];
    }
    cab.rows.forEach((row,ri)=>{if(!row.id)row.id=`row_${Date.now()}_${ri}_${Math.floor(Math.random()*1000)}`;row.height=Math.max(200,Number(row.height)||getCabinetUsableInnerHeight(cab)/cab.rows.length);if(!Array.isArray(row.columns)||!row.columns.length)row.columns=[createCabinetColumn(cab,getCabinetUsableInnerWidth(cab),[createInternalSection('open',row.height)])];row.columns.forEach((c,ci)=>normalizeColumn(cab,c,ci,row.height));});
    syncLegacySections(cab);return cab.rows;
}
function ensureCabinetColumns(cab){return ensureCabinetRows(cab)[0].columns;}
function syncLegacySections(cab){if(Array.isArray(cab.rows)&&cab.rows[0]){cab.columns=cab.rows[0].columns;if(cab.columns[0])cab.sections=cab.columns[0].sections;}}
function ensureCabinetSections(cab){return ensureCabinetColumns(cab)[0].sections;}
function getSectionTypeName(type){return({shelf:'선반칸',hanger:'옷봉칸',drawer:'서랍칸',open:'오픈칸',umbrella:'우산꽂이함'})[type]||'내부칸';}
function autoFitSections(sections,usable){if(!sections.length)return;const min=80,current=sections.reduce((s,x)=>s+Number(x.height||0),0)||1;let assigned=0;sections.forEach((sec,i)=>{if(i===sections.length-1)sec.height=Math.max(min,Math.round(usable-assigned));else{sec.height=Math.max(min,Math.round((sec.height/current)*usable/10)*10);assigned+=sec.height;}});}
function autoFitRowColumns(cab,row){const cols=row.columns,usable=getCabinetUsableInnerWidth(cab)-cab.t*Math.max(0,cols.length-1),current=cols.reduce((s,c)=>s+Number(c.width||0),0)||1;let assigned=0;cols.forEach((c,i)=>{if(i===cols.length-1)c.width=Math.max(150,Math.round(usable-assigned));else{c.width=Math.max(150,Math.round((c.width/current)*usable/10)*10);assigned+=c.width;}});}
function autoFitCabinetColumns(cab){ensureCabinetRows(cab).forEach(r=>autoFitRowColumns(cab,r));syncLegacySections(cab);}
function autoFitCabinetSections(cab){ensureCabinetRows(cab).forEach(r=>r.columns.forEach(c=>autoFitSections(c.sections,r.height)));syncLegacySections(cab);}
function autoFitCabinetRows(cab){const rows=ensureCabinetRows(cab),usable=getCabinetUsableInnerHeight(cab)-cab.t*Math.max(0,rows.length-1),current=rows.reduce((s,r)=>s+Number(r.height||0),0)||1;let assigned=0;rows.forEach((r,i)=>{if(i===rows.length-1)r.height=Math.max(200,Math.round(usable-assigned));else{r.height=Math.max(200,Math.round((r.height/current)*usable/10)*10);assigned+=r.height;}});}
function renderSectionRows(column){return column.sections.map((section,index)=>`<div class="internal-section-row" data-section-id="${section.id}"><div class="section-order">${index+1}</div><select class="section-type"><option value="shelf" ${section.type==='shelf'?'selected':''}>선반칸</option><option value="hanger" ${section.type==='hanger'?'selected':''}>옷봉칸</option><option value="drawer" ${section.type==='drawer'?'selected':''}>서랍칸</option><option value="open" ${section.type==='open'?'selected':''}>오픈칸</option><option value="umbrella" ${section.type==='umbrella'?'selected':''}>우산꽂이함</option></select><label class="section-height-wrap"><input class="section-height" type="number" min="80" step="10" value="${Math.round(section.height)}"><span>mm</span></label>${section.type==='drawer'?`<label class="drawer-count-wrap"><input class="section-drawers" type="number" min="1" max="6" value="${section.drawers}"><span>단</span></label>`:'<span class="drawer-count-placeholder"></span>'}<div class="section-row-actions"><button type="button" class="section-move-up">▲</button><button type="button" class="section-move-down">▼</button><button type="button" class="section-delete">×</button></div></div>`).join('');}
function renderColumnCard(row,column,colIndex){const usedH=Math.round(column.sections.reduce((s,x)=>s+Number(x.height||0),0)),remainH=Math.round(row.height-usedH);return `<div class="internal-column-card" data-column-id="${column.id}"><div class="internal-column-header"><div class="column-order">${colIndex+1}</div><div class="column-title">${colIndex+1}번 세로칸</div><label class="column-width-wrap"><input class="column-width" type="number" min="150" step="10" value="${Math.round(column.width)}"><span>mm</span></label><button type="button" class="column-delete">×</button></div><div class="column-section-toolbar"><button type="button" class="column-add-section" data-section-type="shelf">+ 선반</button><button type="button" class="column-add-section" data-section-type="hanger">+ 옷봉</button><button type="button" class="column-add-section" data-section-type="drawer">+ 서랍</button><button type="button" class="column-add-section" data-section-type="open">+ 오픈</button><button type="button" class="column-add-section" data-section-type="umbrella">+ 우산함</button></div><div class="column-section-list">${renderSectionRows(column)}</div><div class="column-summary"><span>사용높이 ${usedH}mm</span><span class="${remainH===0?'ok':'error'}">${remainH===0?'높이 일치':`차이 ${remainH}mm`}</span></div></div>`;}
function refreshInternalEditor(){const list=document.getElementById('internal-row-list');if(!list)return;const cab=state.cabinets.find(c=>c.id===state.selectedId);if(!cab){list.innerHTML='<div class="internal-empty">가구를 선택하면 내부 구성을 편집할 수 있습니다.</div>';return;}if(cab.type==='fridge'){list.innerHTML='<div class="internal-empty">냉장고 설치장은 상부장 크기만 설정합니다. 하부는 냉장고 빈 공간이며 좌·우 EP가 자동 생성됩니다.</div>';return;}const rows=ensureCabinetRows(cab),totalH=Math.round(getCabinetUsableInnerHeight(cab)),dividerH=cab.t*Math.max(0,rows.length-1),usedH=Math.round(rows.reduce((s,r)=>s+Number(r.height||0),0)+dividerH);list.innerHTML=rows.slice().reverse().map((row,revIndex)=>{const actualIndex=rows.length-1-revIndex;const divT=cab.t*Math.max(0,row.columns.length-1),usedW=Math.round(row.columns.reduce((s,c)=>s+Number(c.width||0),0)+divT),remainW=Math.round(getCabinetUsableInnerWidth(cab)-usedW);return `<div class="internal-row-card" data-row-id="${row.id}"><div class="internal-row-header"><div><strong>${actualIndex+1}번 가로칸 ${actualIndex===0?'(하부)':''}</strong><span>상·하 별도 제작 통</span></div><label class="row-height-wrap"><input class="row-height" type="number" min="200" step="10" value="${Math.round(row.height)}"><span>mm</span></label><div class="row-actions"><button type="button" class="row-move-up" title="위로">▲</button><button type="button" class="row-move-down" title="아래로">▼</button><button type="button" class="row-delete">×</button></div></div><div class="row-column-toolbar"><button type="button" class="row-add-column">+ 세로칸 추가</button><button type="button" class="row-column-auto-fit">세로폭 자동 맞춤</button><span>폭 차이 ${remainW}mm</span></div><div class="internal-column-list">${row.columns.map((c,i)=>renderColumnCard(row,c,i)).join('')}</div></div>`;}).join('');document.getElementById('internal-total-height').textContent=totalH;document.getElementById('internal-used-height').textContent=usedH;const remain=totalH-usedH,w=document.getElementById('internal-height-warning');w.textContent=remain===0?`가로 ${rows.length}칸 높이와 중간판 두께가 정확히 맞습니다.`:remain>0?`${remain}mm가 남습니다. 자동 맞춤을 눌러주세요.`:`${Math.abs(remain)}mm가 초과되었습니다.`;w.className=`internal-height-warning ${remain===0?'ok':remain<0?'error':'notice'}`;lucide.createIcons();}

function addCabinet(type, category, x, y) {
    const specs = CAB_DEFAULTS[type];
    const newCab = {
        id: 'cab_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        type,
        category,
        name: specs.name,
        w: specs.w,
        d: specs.d,
        h: specs.h,
        t: specs.t,
        color: specs.color,
        groove: specs.groove,
        grooveDepth: specs.grooveDepth,
        grooveOffset: specs.grooveOffset,
        doorType: specs.doorType,
        handleType: specs.handleType || 'none',
        shelves: specs.shelves,
        sections: createDefaultSections(specs),
        columns: [],
        rows: [],
        kickplate: specs.kickplate,
        supportType: specs.supportType || (specs.kickplate > 0 ? 'plinth' : 'none'),
        plinthHeight: specs.plinthHeight || specs.kickplate || 100,
        plinthSetback: specs.plinthSetback || 40,
        legType: specs.legType || 'plastic',
        legHeight: specs.legHeight || 100,
        x: x,
        y: y,
        z: specs.z,
        rotation: 0,
        isCorner: !!specs.isCorner,
        fillerSide: specs.fillerSide || 'none',
        leftFillerWidth: specs.leftFillerWidth || 50,
        rightFillerWidth: specs.rightFillerWidth || 50,
        applianceType: specs.applianceType || SINK_APPLIANCE_BY_TYPE[type] || null,
        isFridgeInstall: !!specs.isFridgeInstall
    };
    migrateFridgeCabinet(newCab);
    
    newCab.columns = [createCabinetColumn(newCab, getCabinetUsableInnerWidth(newCab), newCab.sections)];
    state.cabinets.push(newCab);
    return newCab;
}

// 가구 선택 처리
function selectCabinet(id) {
    state.selectedId = id;
    
    const propsPanel = document.getElementById('props-panel');
    const noSelectionPrompt = document.getElementById('no-selection-prompt');
    
    if (id) {
        const cab = state.cabinets.find(c => c.id === id);
        if (cab) {
            migrateFridgeCabinet(cab);
            propsPanel.style.display = 'block';
            noSelectionPrompt.style.display = 'none';
            
            // 속성 필드 갱신
            document.getElementById('prop-type-name').innerText = cab.name;
            syncPropFields(cab);
        }
    } else {
        propsPanel.style.display = 'none';
        noSelectionPrompt.style.display = 'flex';
    }
    
    // 배치 리스트 및 2D 하이라이팅 변경
    updatePlacedList();
    render2D();
}

function syncPropFields(cab) {
    migrateFridgeCabinet(cab);
    const fridgeMode = cab.type === 'fridge';
    const labelW = document.querySelector('label[for="prop-w"]');
    const labelD = document.querySelector('label[for="prop-d"]');
    const labelH = document.querySelector('label[for="prop-h"]');
    if (labelW) labelW.innerHTML = `${fridgeMode ? '상부장 가로 (W)' : '가로 (W)'} <span class="unit">mm</span>`;
    if (labelD) labelD.innerHTML = `${fridgeMode ? '상부장 깊이 (D)' : '깊이 (D)'} <span class="unit">mm</span>`;
    if (labelH) labelH.innerHTML = `${fridgeMode ? '상부장 높이 (H)' : '높이 (H)'} <span class="unit">mm</span>`;
    const doorSelect = document.getElementById('prop-door-type');
    if (doorSelect) doorSelect.disabled = fridgeMode;
    document.getElementById('prop-w').value = cab.w;
    document.getElementById('prop-d').value = cab.d;
    document.getElementById('prop-h').value = cab.h;
    document.getElementById('prop-t').value = cab.t;
    document.getElementById('prop-color').value = cab.color;
    document.getElementById('prop-groove').checked = cab.groove;
    document.getElementById('prop-groove-depth').value = cab.grooveDepth;
    document.getElementById('prop-groove-offset').value = cab.grooveOffset;
    document.getElementById('prop-door-type').value = cab.doorType;
    if (cab.handleType === undefined) {
        cab.handleType = 'none';
    }
    document.getElementById('prop-handle-type').value = cab.handleType;
    document.getElementById('prop-handle-type-search').value = '';
    const handleOptions = document.getElementById('prop-handle-type').options;
    for (let i = 0; i < handleOptions.length; i++) {
        handleOptions[i].style.display = '';
    }
    document.getElementById('prop-shelves').value = cab.shelves;
    // 하부 지지대 기본값 마이그레이션 및 세팅
    if (cab.supportType === undefined) {
        cab.supportType = cab.kickplate > 0 ? 'plinth' : 'none';
        cab.plinthHeight = cab.kickplate || 100;
        cab.plinthSetback = 40;
        cab.legType = 'plastic';
        cab.legHeight = 100;
    }
    
    document.getElementById('prop-support-type').value = cab.supportType;
    document.getElementById('prop-plinth-height').value = cab.plinthHeight;
    document.getElementById('prop-plinth-setback').value = cab.plinthSetback;
    document.getElementById('prop-leg-type').value = cab.legType;
    document.getElementById('prop-leg-height').value = cab.legHeight;
    
    document.getElementById('prop-pos-x').value = Math.round(cab.x);
    document.getElementById('prop-pos-y').value = Math.round(cab.y);
    document.getElementById('prop-rotation').value = cab.rotation.toString();
    cab.fillerSide = cab.fillerSide || 'none';
    cab.leftFillerWidth = Number(cab.leftFillerWidth) || 50;
    cab.rightFillerWidth = Number(cab.rightFillerWidth) || 50;
    document.getElementById('prop-filler-side').value = cab.fillerSide;
    document.getElementById('prop-left-filler-width').value = cab.leftFillerWidth;
    document.getElementById('prop-right-filler-width').value = cab.rightFillerWidth;
    updateSinkFillerVisibility(cab);
    
    // 우라홈 및 하부 지지대 서브패널 동적 노출 제어
    const grooveSettings = document.getElementById('groove-settings');
    grooveSettings.style.display = cab.groove ? 'grid' : 'none';
    
    const plinthSettings = document.getElementById('plinth-settings');
    const legSettings = document.getElementById('leg-settings');
    plinthSettings.style.display = cab.supportType === 'plinth' ? 'grid' : 'none';
    legSettings.style.display = cab.supportType === 'legs' ? 'grid' : 'none';
    refreshInternalEditor();
    refreshPartsPanel();
}

function updateSinkFillerVisibility(cab){
    const wrap=document.getElementById('sink-filler-settings');
    if(!wrap) return;
    const isSinkBase = !!cab && ((cab.type||'').startsWith('sink_base') || cab.type==='sink_corner');
    wrap.style.display = isSinkBase ? 'block' : 'none';
    if(!isSinkBase) return;
    const side=cab.fillerSide||'none';
    const lg=document.getElementById('left-filler-size-group');
    const rg=document.getElementById('right-filler-size-group');
    if(lg) lg.style.display=(side==='left'||side==='both')?'flex':'none';
    if(rg) rg.style.display=(side==='right'||side==='both')?'flex':'none';
}

function deleteSelectedCabinet() {
    if (!state.selectedId) return;
    pushHistory();
    const index = state.cabinets.findIndex(c => c.id === state.selectedId);
    if (index !== -1) {
        const deleted = state.cabinets.splice(index, 1)[0];
        selectCabinet(null);
        updatePlacedList();
        render2D();
        update3DScene();
        showStatusMessage(`${deleted.name} 가구가 삭제되었습니다.`);
    }
}

// 2D 캔버스 드로잉 테마 파서 (내보내기/인쇄 시 강제 라이트 테마 전환용)
function getC2DTheme() {
    const isPrint = state.isExporting;
    return {
        bg: isPrint ? '#ffffff' : '#111827',
        gridMain: isPrint ? '#cbd5e1' : '#374151',
        gridSub: isPrint ? '#eef2f7' : '#1f2937',
        wallFill: isPrint ? '#fbfdff' : 'rgba(255,255,255,0.025)',
        wallBorder: isPrint ? '#334155' : '#64748b',
        dimension: isPrint ? '#1e3a5f' : '#93c5fd',
        cabFill: isPrint ? '#ffffff' : '#f8fafc',
        cabBorder: isPrint ? '#111827' : '#0f172a',
        cabSelectedBorder: isPrint ? '#1d4ed8' : '#60a5fa',
        cabT: isPrint ? '#b91c1c' : '#f87171',
        cabGroove: isPrint ? '#b45309' : '#fbbf24',
        cabShelf: isPrint ? '#047857' : '#34d399',
        boardFill: isPrint ? '#e2e8f0' : '#cbd5e1',
        boardEdge: isPrint ? '#334155' : '#475569',
        doorFill: isPrint ? '#f8fafc' : '#e5e7eb',
        openingFill: isPrint ? '#ffffff' : '#111827',
        textPrimary: isPrint ? '#0f172a' : '#f8fafc',
        textSecondary: isPrint ? '#334155' : '#cbd5e1'
    };
}

// 2D 캔버스 드로잉 엔진 (HTML5 Canvas)
function render2D() {
    const theme = getC2DTheme();
    
    // 바탕 색상 채우기 (인쇄 시 흰색 강제 전환)
    ctx2d.fillStyle = theme.bg;
    ctx2d.fillRect(0, 0, canvas2d.width, canvas2d.height);
    
    const isPlan = state.currentTab === 'plan';
    const view = isPlan ? state.plan : state.elevation;
    
    ctx2d.save();
    // 팬 및 줌 변환 적용
    ctx2d.translate(view.panX, view.panY);
    ctx2d.scale(view.zoom, view.zoom);
    
    // 1. 그리드 렌더링
    if (state.gridEnabled) {
        drawGrid(isPlan);
    }
    
    // 2. 룸 영역(바닥/벽면) 드로잉
    drawRoomBounds(isPlan);
    
    // 3. 배치 가구 렌더링
    state.cabinets.forEach(cab => {
        const isSelected = (cab.id === state.selectedId);
        if (isPlan) {
            drawCabinetPlan(cab, isSelected);
        } else {
            drawCabinetElevation(cab, isSelected);
        }
    });
    
    ctx2d.restore();
    
    // 하단 카운트바 갱신
    document.getElementById('status-furniture-count').innerText = `배치 가구: ${state.cabinets.length}개`;
}

// 그리드 그리기 (100mm 서브그리드, 500mm 메인그리드)
function drawGrid(isPlan) {
    const theme = getC2DTheme();
    const limitX = state.room.width + 1000;
    const limitY = isPlan ? (state.room.depth + 1000) : (state.room.height + 1000);
    const startX = -1000;
    const startY = -1000;
    
    ctx2d.strokeStyle = theme.gridSub;
    ctx2d.lineWidth = 1;
    
    // 세로선 그리기
    for (let x = startX; x <= limitX; x += 100) {
        if (x % 500 === 0) {
            ctx2d.strokeStyle = theme.gridMain;
            ctx2d.lineWidth = 1.5;
        } else {
            ctx2d.strokeStyle = theme.gridSub;
            ctx2d.lineWidth = 0.8;
        }
        ctx2d.beginPath();
        ctx2d.moveTo(x, startY);
        ctx2d.lineTo(x, limitY);
        ctx2d.stroke();
    }
    
    // 가로선 그리기
    for (let y = startY; y <= limitY; y += 100) {
        if (y % 500 === 0) {
            ctx2d.strokeStyle = theme.gridMain;
            ctx2d.lineWidth = 1.5;
        } else {
            ctx2d.strokeStyle = theme.gridSub;
            ctx2d.lineWidth = 0.8;
        }
        
        ctx2d.beginPath();
        if (isPlan) {
            ctx2d.moveTo(startX, y);
            ctx2d.lineTo(limitX, y);
        } else {
            // Elevation은 Z-up이므로 음수 축도 포함하여 그리기
            ctx2d.moveTo(startX, -y);
            ctx2d.lineTo(limitX, -y);
        }
        ctx2d.stroke();
    }
}

// 룸 가이드 그리기 (두꺼운 회색 벽선)
function drawRoomBounds(isPlan) {
    const theme = getC2DTheme();
    ctx2d.strokeStyle = theme.wallBorder;
    ctx2d.lineWidth = 8;
    ctx2d.lineJoin = 'round';
    
    if (isPlan) {
        // 평면도 룸 외각선
        ctx2d.beginPath();
        ctx2d.rect(0, 0, state.room.width, state.room.depth);
        ctx2d.stroke();
        
        // 바닥 면적 약하게 채우기
        ctx2d.fillStyle = theme.wallFill;
        ctx2d.fillRect(0, 0, state.room.width, state.room.depth);
        
        // 외곽 크기 수치
        drawDimensionLine(0, -100, state.room.width, -100, 'top', `${state.room.width} mm`);
        drawDimensionLine(-100, 0, -100, state.room.depth, 'left', `${state.room.depth} mm`);
    } else {
        // 입면도 룸 높이 영역선 (Z축이 위로 가므로 Y를 음수처리)
        ctx2d.beginPath();
        ctx2d.rect(0, 0, state.room.width, -state.room.height);
        ctx2d.stroke();
        
        ctx2d.fillStyle = theme.wallFill;
        ctx2d.fillRect(0, 0, state.room.width, -state.room.height);
        
        drawDimensionLine(0, 100, state.room.width, 100, 'bottom', `${state.room.width} mm`);
        drawDimensionLine(-100, 0, -100, -state.room.height, 'left', `${state.room.height} mm`);
    }
}

// 치수선 유틸 함수
function drawDimensionLine(x1, y1, x2, y2, position, text) {
    const theme = getC2DTheme();
    ctx2d.strokeStyle = theme.dimension;
    ctx2d.fillStyle = theme.dimension;
    ctx2d.lineWidth = 1.5;
    ctx2d.font = '12px Inter';
    ctx2d.textAlign = 'center';
    
    // 메인선
    ctx2d.beginPath();
    ctx2d.moveTo(x1, y1);
    ctx2d.lineTo(x2, y2);
    ctx2d.stroke();
    
    // 보조 지시선 양끝단 눈금선
    const tickLen = 8;
    ctx2d.beginPath();
    if (y1 === y2) { // 가로 치수선
        ctx2d.moveTo(x1, y1 - tickLen/2);
        ctx2d.lineTo(x1, y1 + tickLen/2);
        ctx2d.moveTo(x2, y2 - tickLen/2);
        ctx2d.lineTo(x2, y2 + tickLen/2);
    } else { // 세로 치수선
        ctx2d.moveTo(x1 - tickLen/2, y1);
        ctx2d.lineTo(x1 + tickLen/2, y1);
        ctx2d.moveTo(x2 - tickLen/2, y2);
        ctx2d.lineTo(x2 + tickLen/2, y2);
    }
    ctx2d.stroke();
    
    // 수치 텍스트
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    
    ctx2d.save();
    if (position === 'top') {
        ctx2d.fillText(text, midX, midY - 6);
    } else if (position === 'bottom') {
        ctx2d.fillText(text, midX, midY + 16);
    } else if (position === 'left') {
        ctx2d.translate(midX - 10, midY);
        ctx2d.rotate(-Math.PI / 2);
        ctx2d.fillText(text, 0, 0);
    } else if (position === 'right') {
        ctx2d.translate(midX + 16, midY);
        ctx2d.rotate(Math.PI / 2);
        ctx2d.fillText(text, 0, 0);
    }
    ctx2d.restore();
}

// 전문 도면 스타일 보조: 판재 해칭
function drawBoardHatch(x, y, w, h, theme) {
    ctx2d.save();
    ctx2d.beginPath();
    ctx2d.rect(x, y, w, h);
    ctx2d.clip();
    ctx2d.strokeStyle = state.isExporting ? 'rgba(71,85,105,.28)' : 'rgba(71,85,105,.42)';
    ctx2d.lineWidth = 0.7;
    const span = Math.abs(w) + Math.abs(h) + 40;
    for (let i = -span; i < span * 2; i += 14) {
        ctx2d.beginPath();
        ctx2d.moveTo(x + i, y + h);
        ctx2d.lineTo(x + i + h, y);
        ctx2d.stroke();
    }
    ctx2d.restore();
}

// 전문 도면 스타일 보조: 여닫이 문 열림 궤적
function drawDoorSwingPlan(x, y, width, side, theme) {
    const r = Math.max(20, Math.min(width, 420));
    ctx2d.save();
    ctx2d.strokeStyle = theme.dimension;
    ctx2d.lineWidth = 1.2;
    ctx2d.setLineDash([8, 6]);
    ctx2d.beginPath();
    if (side === 'left') {
        ctx2d.moveTo(x, y); ctx2d.lineTo(x, y + r);
        ctx2d.arc(x, y, r, 0, Math.PI / 2, false);
    } else {
        ctx2d.moveTo(x, y); ctx2d.lineTo(x, y + r);
        ctx2d.arc(x, y, r, Math.PI, Math.PI / 2, true);
    }
    ctx2d.stroke();
    ctx2d.setLineDash([]);
    ctx2d.restore();
}

// 2D 평면도 개별 가구 그리기
function drawCabinetPlan(cab, isSelected) {
    if (cab.type === 'fridge') return drawFridgePlan(cab, isSelected);
    const theme = getC2DTheme();
    // 회전 정보 고려한 경계 크기 구하기
    const rotated = getCabinetRotatedDims(cab);
    const { w, d } = rotated;
    
    ctx2d.save();
    ctx2d.translate(cab.x + w/2, cab.y + d/2);
    ctx2d.rotate((cab.rotation * Math.PI) / 180);
    
    // 로컬 좌표계로 전환: 가구 기준 중심좌표가 (0,0), 가구 크기는 (-W/2, -D/2) ~ (W/2, D/2)
    const localW = cab.w;
    const localD = cab.d;
    const halfW = localW / 2;
    const halfD = localD / 2;
    
    // 기본 몸통: 일반장은 직사각형, 코너장은 ㄱ자 형상
    const selectedFill = state.isExporting ? 'rgba(37,99,235,.10)' : 'rgba(96,165,250,.18)';
    ctx2d.fillStyle = isSelected ? selectedFill : theme.cabFill;
    ctx2d.strokeStyle = isSelected ? theme.cabSelectedBorder : theme.cabBorder;
    ctx2d.lineWidth = isSelected ? 3 : 1.8;
    if (cab.isCorner || cab.type === 'sink_corner') {
        const wing = Math.max(cab.t * 3, Math.min(localW, localD) * 0.42);
        ctx2d.beginPath();
        ctx2d.moveTo(-halfW, -halfD);
        ctx2d.lineTo(halfW, -halfD);
        ctx2d.lineTo(halfW, -halfD + wing);
        ctx2d.lineTo(-halfW + wing, -halfD + wing);
        ctx2d.lineTo(-halfW + wing, halfD);
        ctx2d.lineTo(-halfW, halfD);
        ctx2d.closePath();
        ctx2d.fill(); ctx2d.stroke();
        drawBoardHatch(-halfW, -halfD, localW, cab.t, theme);
        drawBoardHatch(-halfW, -halfD, cab.t, localD, theme);
        ctx2d.strokeStyle = theme.dimension;
        ctx2d.setLineDash([8,6]);
        ctx2d.beginPath();
        ctx2d.moveTo(-halfW + wing, -halfD + wing);
        ctx2d.lineTo(halfW, halfD);
        ctx2d.stroke();
        ctx2d.setLineDash([]);
    } else {
        ctx2d.fillRect(-halfW, -halfD, localW, localD);
        ctx2d.strokeRect(-halfW, -halfD, localW, localD);
        ctx2d.strokeStyle = theme.boardEdge;
        ctx2d.lineWidth = 1;
        ctx2d.strokeRect(-halfW + cab.t, -halfD + cab.t, localW - cab.t*2, localD - cab.t*2);
        drawBoardHatch(-halfW, -halfD, cab.t, localD, theme);
        drawBoardHatch(halfW-cab.t, -halfD, cab.t, localD, theme);
    }
    
    // 우라홈(뒷판 홈) 위치 표시 (배면 뒷판)
    // 회전각도 상, 기본 배치(0도)시 뒤쪽 벽면이 위(-D/2)임
    if (cab.groove) {
        ctx2d.strokeStyle = theme.cabT;
        ctx2d.beginPath();
        // 뒤에서 grooveOffset 만큼 띄우고 그리기
        const grooveY = -halfD + cab.grooveOffset;
        ctx2d.moveTo(-halfW + cab.t, grooveY);
        ctx2d.lineTo(halfW - cab.t, grooveY);
        ctx2d.stroke();
    }
    
    // 도어 전면(아래쪽선 +D/2)을 표시하기 위한 지시자 그리기
    ctx2d.strokeStyle = state.isExporting ? '#3b82f6' : varColorToRgb(cab.color);
    ctx2d.lineWidth = 3;
    ctx2d.beginPath();
    ctx2d.moveTo(-halfW, halfD);
    ctx2d.lineTo(halfW, halfD);
    ctx2d.stroke();
    
    // 문 열림 방향 및 코너장 전면 표시
    if (!(cab.isCorner || cab.type === 'sink_corner')) {
        const frontY = halfD;
        if (cab.doorType === 'swing_double') {
            drawDoorSwingPlan(-halfW, frontY, localW/2, 'left', theme);
            drawDoorSwingPlan(halfW, frontY, localW/2, 'right', theme);
        } else if (cab.doorType === 'swing_single_left') {
            drawDoorSwingPlan(-halfW, frontY, localW, 'left', theme);
        } else if (cab.doorType === 'swing_single_right') {
            drawDoorSwingPlan(halfW, frontY, localW, 'right', theme);
        }
    }

    // 싱크대 하부장 상판 기기 기호
    if ((cab.type || '').startsWith('sink_base')) {
        const appliance = getSinkApplianceType(cab);
        ctx2d.save();
        ctx2d.strokeStyle = theme.dimension;
        ctx2d.fillStyle = theme.textPrimary;
        ctx2d.lineWidth = 1.5;
        if (appliance === 'sink') {
            ctx2d.strokeRect(-localW*0.30, -localD*0.25, localW*0.60, localD*0.50);
            ctx2d.strokeRect(-localW*0.22, -localD*0.18, localW*0.44, localD*0.34);
        } else if (['range','cooktop','induction'].includes(appliance)) {
            ctx2d.strokeRect(-localW*0.30, -localD*0.23, localW*0.60, localD*0.46);
            const rr = Math.min(localW, localD) * 0.07;
            [[-.15,-.12],[.15,-.12],[-.15,.12],[.15,.12]].forEach(([px,py])=>{
                ctx2d.beginPath(); ctx2d.arc(localW*px, localD*py, rr, 0, Math.PI*2); ctx2d.stroke();
            });
        } else if (appliance === 'dishwasher') {
            ctx2d.strokeRect(-localW*0.34, -localD*0.28, localW*0.68, localD*0.56);
            ctx2d.fillText('식기세척기', 0, 4);
        } else if (appliance === 'washer') {
            ctx2d.beginPath(); ctx2d.arc(0, 0, Math.min(localW,localD)*0.22, 0, Math.PI*2); ctx2d.stroke();
            ctx2d.fillText('드럼', 0, 4);
        } else if (appliance === 'robot') {
            ctx2d.beginPath(); ctx2d.arc(0, localD*0.10, Math.min(localW,localD)*0.18, 0, Math.PI*2); ctx2d.stroke();
            ctx2d.fillText('로봇', 0, -localD*0.20);
        } else {
            ctx2d.fillText('기본장', 0, 4);
        }
        ctx2d.restore();
    }

    // 가구 중심 축 십자 표시
    ctx2d.strokeStyle = theme.gridMain;
    ctx2d.lineWidth = 0.5;
    ctx2d.beginPath();
    ctx2d.moveTo(-8, 0); ctx2d.lineTo(8, 0);
    ctx2d.moveTo(0, -8); ctx2d.lineTo(0, 8);
    ctx2d.stroke();
    
    // 텍스트 라벨 (가구명 및 너비 수치)
    ctx2d.fillStyle = theme.textPrimary;
    ctx2d.font = 'bold 14px Inter, sans-serif';
    ctx2d.textAlign = 'center';
    ctx2d.fillText(cab.name, 0, -4);
    
    ctx2d.fillStyle = theme.textSecondary;
    ctx2d.font = 'bold 11px monospace';
    ctx2d.fillText(`W:${cab.w} D:${cab.d} H:${cab.h}`, 0, 12);
    
    // 상세 치수 (목재 두께 T 및 우라홈 스펙) 표기
    if (state.detailsEnabled) {
        ctx2d.fillStyle = theme.cabT;
        ctx2d.font = 'bold 11px monospace';
        // 좌우 판재 두께 표시
        ctx2d.fillText(`${cab.t}T`, -halfW + cab.t/2, 24);
        ctx2d.fillText(`${cab.t}T`, halfW - cab.t/2, 24);
        
        if (cab.groove) {
            ctx2d.fillStyle = theme.cabGroove;
            ctx2d.font = 'bold 11px monospace';
            ctx2d.fillText(`홈:${cab.grooveDepth} / 뒤여유:${cab.grooveOffset}`, 0, -halfD + cab.grooveOffset + 12);
        }
    }
    
    // 만약 상부장이면 파선 빗금 추가하여 상부장임을 알아볼 수 있도록 함
    if (cab.type === 'sink_wall') {
        ctx2d.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx2d.lineWidth = 0.8;
        ctx2d.beginPath();
        ctx2d.moveTo(-halfW, -halfD);
        ctx2d.lineTo(halfW, halfD);
        ctx2d.moveTo(halfW, -halfD);
        ctx2d.lineTo(-halfW, halfD);
        ctx2d.stroke();
    }
    
    ctx2d.restore();
}

function drawFridgePlan(cab, isSelected) {
    const theme=getC2DTheme(), W=cab.w, D=cab.d, T=cab.t;
    const rotated=getCabinetRotatedDims(cab);
    ctx2d.save();
    ctx2d.translate(cab.x+rotated.w/2,cab.y+rotated.d/2); ctx2d.rotate((cab.rotation||0)*Math.PI/180);
    // 상부장은 천장 설치이므로 평면도에서 점선, EP는 실선으로 표시
    ctx2d.fillStyle=isSelected?'rgba(99,102,241,.22)':theme.wallFill;
    ctx2d.strokeStyle=isSelected?theme.cabSelectedBorder:theme.cabBorder; ctx2d.lineWidth=isSelected?3:1.5;
    ctx2d.setLineDash([18,10]); ctx2d.fillRect(-W/2,-D/2,W,D); ctx2d.strokeRect(-W/2,-D/2,W,D); ctx2d.setLineDash([]);
    ctx2d.fillStyle=theme.boardFill;
    ctx2d.fillRect(-W/2,-D/2,T,D); ctx2d.fillRect(W/2-T,-D/2,T,D);
    ctx2d.strokeRect(-W/2,-D/2,T,D); ctx2d.strokeRect(W/2-T,-D/2,T,D);
    ctx2d.fillStyle=theme.dimension; ctx2d.font='bold 12px sans-serif'; ctx2d.textAlign='center';
    ctx2d.fillText('냉장고 빈 공간',0,5); ctx2d.font='11px sans-serif'; ctx2d.fillText('상부장(천장 설치) · 좌/우 EP',0,22);
    ctx2d.restore();
}

function drawFridgeElevation(cab, isSelected) {
    const theme=getC2DTheme(), W=cab.w, H=cab.h, T=cab.t;
    const top=state.room.height, upperBottom=top-H, x=cab.x;
    ctx2d.save();
    // 냉장고 빈 공간
    ctx2d.fillStyle=theme.openingFill; ctx2d.fillRect(x,-upperBottom,W, -upperBottom);
    // 좌우 EP (바닥~천장)
    ctx2d.fillStyle=theme.boardFill; ctx2d.fillRect(x,-top,T,top); ctx2d.fillRect(x+W-T,-top,T,top);
    ctx2d.strokeStyle=isSelected?theme.cabSelectedBorder:theme.cabBorder; ctx2d.lineWidth=isSelected?3:1.5;
    ctx2d.strokeRect(x,-top,T,top); ctx2d.strokeRect(x+W-T,-top,T,top);
    // 상부장 몸통
    ctx2d.fillStyle=theme.cabFill; ctx2d.fillRect(x,-top,W,H); ctx2d.strokeRect(x,-top,W,H);
    ctx2d.fillStyle=theme.boardFill;
    ctx2d.fillRect(x,-top,W,T); ctx2d.fillRect(x,-upperBottom-T,W,T);
    ctx2d.fillRect(x,-top,T,H); ctx2d.fillRect(x+W-T,-top,T,H);
    // 플립 도어 + 위로 열림 표시
    ctx2d.fillStyle=theme.doorFill; ctx2d.fillRect(x+2,-top+2,W-4,H-4); ctx2d.strokeRect(x+2,-top+2,W-4,H-4);
    ctx2d.beginPath(); ctx2d.moveTo(x+W/2,-upperBottom-20); ctx2d.lineTo(x+W/2,-top+20); ctx2d.lineTo(x+W/2-9,-top+34); ctx2d.moveTo(x+W/2,-top+20); ctx2d.lineTo(x+W/2+9,-top+34); ctx2d.stroke();
    ctx2d.fillStyle=theme.dimension; ctx2d.font='bold 12px sans-serif'; ctx2d.textAlign='center';
    ctx2d.fillText(`플립 상부장 ${W}×${cab.d}×${H}`,x+W/2,-top+H/2);
    ctx2d.font='12px sans-serif'; ctx2d.fillText('냉장고 설치 공간',x+W/2,-upperBottom/2);
    ctx2d.restore();
}

// 2D 정면 입면도 개별 가구 그리기
// 정면 입면도는 룸 X축(가로)과 Z축(높이 - 화면상 y축 방향 역방향)을 사용
function drawCabinetElevation(cab, isSelected) {
    if (cab.type === 'fridge') return drawFridgeElevation(cab, isSelected);
    const theme = getC2DTheme();
    // 입면 뷰 상에서의 실제 가로/세로 영역 매핑
    // 회전에 따라 너비와 깊이가 보이는 모습이 달라짐
    let visualW = cab.w;
    let facesFront = true;
    
    if (cab.rotation === 90 || cab.rotation === 270) {
        visualW = cab.d; // 측면이 보임
        facesFront = false;
    }
    
    // Z축은 위로 향하므로 화면 상 마이너스 Y
    const drawX = cab.x;
    const drawY = -cab.z; // Z 위치에서
    const drawH = cab.h;
    
    ctx2d.save();
    
    // 기본 채우기
    ctx2d.fillStyle = isSelected ? (state.isExporting ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.25)') : theme.cabFill;
    ctx2d.fillRect(drawX, drawY, visualW, -drawH);
    
    // 테두리
    ctx2d.strokeStyle = isSelected ? theme.cabSelectedBorder : theme.cabBorder;
    ctx2d.lineWidth = isSelected ? 3 : 1.5;
    ctx2d.strokeRect(drawX, drawY, visualW, -drawH);
    
    // 하부 지지대 치수 계산
    if (cab.supportType === undefined) {
        cab.supportType = cab.kickplate > 0 ? 'plinth' : 'none';
        cab.plinthHeight = cab.kickplate || 100;
        cab.plinthSetback = 40;
        cab.legType = 'plastic';
        cab.legHeight = 100;
    }
    const supportH = cab.supportType === 'none' ? 0 : (cab.supportType === 'legs' ? cab.legHeight : cab.plinthHeight);

    // 하부 지지대 (걸레받이/좌대 또는 다릿발) 표현
    if (cab.supportType === 'plinth' && supportH > 0) {
        ctx2d.fillStyle = theme.bg;
        ctx2d.fillRect(drawX + 2, drawY, visualW - 4, -supportH);
        
        ctx2d.strokeStyle = theme.gridMain;
        ctx2d.beginPath();
        ctx2d.moveTo(drawX, drawY - supportH);
        ctx2d.lineTo(drawX + visualW, drawY - supportH);
        ctx2d.stroke();
    } else if (cab.supportType === 'legs' && supportH > 0) {
        const legW = 20;
        ctx2d.fillStyle = theme.dimension;
        ctx2d.strokeStyle = theme.cabBorder;
        ctx2d.lineWidth = 1;
        
        // 좌측 앞 다릿발
        ctx2d.fillRect(drawX + 30, drawY, legW, -supportH);
        ctx2d.strokeRect(drawX + 30, drawY, legW, -supportH);
        
        // 우측 앞 다릿발
        ctx2d.fillRect(drawX + visualW - 30 - legW, drawY, legW, -supportH);
        ctx2d.strokeRect(drawX + visualW - 30 - legW, drawY, legW, -supportH);
    }
    
    // 가구 골조(Carcass) 판재 선 그리기 (정면일 때만 명확한 뼈대 노출)
    if (facesFront) {
        const bodyTop = drawY - drawH;
        const bodyBottom = drawY - supportH;
        const t = cab.t;

        // 판재 기반 골조 표현: 좌판/우판/상판/밑판을 실제 두께로 채움
        ctx2d.fillStyle = theme.boardFill;
        ctx2d.fillRect(drawX, bodyTop, t, bodyBottom - bodyTop);
        ctx2d.fillRect(drawX + visualW - t, bodyTop, t, bodyBottom - bodyTop);
        ctx2d.fillRect(drawX, bodyTop, visualW, t);
        ctx2d.fillRect(drawX, bodyBottom - t, visualW, t);
        drawBoardHatch(drawX, bodyTop, t, bodyBottom-bodyTop, theme);
        drawBoardHatch(drawX + visualW - t, bodyTop, t, bodyBottom-bodyTop, theme);
        ctx2d.strokeStyle = theme.boardEdge;
        ctx2d.lineWidth = 1.1;
        ctx2d.strokeRect(drawX, bodyTop, visualW, bodyBottom-bodyTop);
        ctx2d.strokeRect(drawX + t, bodyTop + t, visualW - t*2, bodyBottom - bodyTop - t*2);
        
        ctx2d.strokeStyle = theme.gridMain;
        ctx2d.lineWidth = 1;
        
        // 좌/우 측판 내부
        ctx2d.strokeRect(drawX + t, bodyTop + t, visualW - t*2, bodyBottom - bodyTop - t*2);
        
        // 찬넬 가공 높이 계산
        let channelH = 0;
        if (cab.handleType === 'mok_channel') channelH = 30;
        else if (cab.handleType === 'c_channel') channelH = 35;
        
        const cabinetInnerH = bodyBottom - bodyTop - t*2;
        
        const showDoorFronts = state.currentTab !== 'wireframe';
    if (showDoorFronts && (cab.doorType === 'swing_double' || cab.doorType === 'swing_single_left' || cab.doorType === 'swing_single_right')) {
            const doorTop = bodyTop + t + channelH;
            const doorBottom = bodyBottom - 3; // 3mm 바닥 공제
            const doorH = doorBottom - doorTop;
            
            // 찬넬 가공 표시
            if (channelH > 0) {
                ctx2d.fillStyle = cab.handleType === 'mok_channel' ? 'rgba(140, 108, 83, 0.6)' : 'rgba(148, 163, 184, 0.8)';
                ctx2d.fillRect(drawX + t, bodyTop + t, visualW - t*2, channelH);
                ctx2d.strokeStyle = theme.gridMain;
                ctx2d.strokeRect(drawX + t, bodyTop + t, visualW - t*2, channelH);
            }
            
            ctx2d.strokeStyle = theme.cabBorder;
            ctx2d.lineWidth = 1.2;
            
            if (cab.doorType === 'swing_double') {
                // 좌우 분할 도어 그리기
                ctx2d.fillStyle = theme.doorFill;
                ctx2d.fillRect(drawX + 2, doorTop, visualW/2 - 3, doorH);
                ctx2d.strokeRect(drawX + 2, doorTop, visualW/2 - 3, doorH);
                
                ctx2d.fillRect(drawX + visualW/2 + 1, doorTop, visualW/2 - 3, doorH);
                ctx2d.strokeRect(drawX + visualW/2 + 1, doorTop, visualW/2 - 3, doorH);
                
                // 스마트바 마킹
                if (cab.handleType === 'smart_bar') {
                    ctx2d.fillStyle = 'rgba(148, 163, 184, 0.9)';
                    ctx2d.fillRect(drawX + 2, doorTop, visualW/2 - 3, 8);
                    ctx2d.fillRect(drawX + visualW/2 + 1, doorTop, visualW/2 - 3, 8);
                }
                
                // 일반 손잡이
                drawHandle(drawX + visualW/2 - 15, doorTop + doorH/2, 'left', theme, cab.handleType);
                drawHandle(drawX + visualW/2 + 15, doorTop + doorH/2, 'right', theme, cab.handleType);
            } else if (cab.doorType === 'swing_single_left') {
                ctx2d.fillStyle = theme.doorFill;
                ctx2d.fillRect(drawX + 2, doorTop, visualW - 4, doorH);
                ctx2d.strokeRect(drawX + 2, doorTop, visualW - 4, doorH);
                
                // 스마트바 마킹
                if (cab.handleType === 'smart_bar') {
                    ctx2d.fillStyle = 'rgba(148, 163, 184, 0.9)';
                    ctx2d.fillRect(drawX + 2, doorTop, visualW - 4, 8);
                }
                
                drawHandle(drawX + visualW - 20, doorTop + doorH/2, 'right', theme, cab.handleType);
                
                // 경첩 점선
                ctx2d.strokeStyle = state.isExporting ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)';
                ctx2d.beginPath();
                ctx2d.moveTo(drawX + visualW, doorTop);
                ctx2d.lineTo(drawX, doorTop + doorH/2);
                ctx2d.lineTo(drawX + visualW, doorBottom);
                ctx2d.stroke();
            } else if (cab.doorType === 'swing_single_right') {
                ctx2d.fillStyle = theme.doorFill;
                ctx2d.fillRect(drawX + 2, doorTop, visualW - 4, doorH);
                ctx2d.strokeRect(drawX + 2, doorTop, visualW - 4, doorH);
                
                // 스마트바 마킹
                if (cab.handleType === 'smart_bar') {
                    ctx2d.fillStyle = 'rgba(148, 163, 184, 0.9)';
                    ctx2d.fillRect(drawX + 2, doorTop, visualW - 4, 8);
                }
                
                drawHandle(drawX + 20, doorTop + doorH/2, 'left', theme, cab.handleType);
                
                // 경첩 점선
                ctx2d.strokeStyle = state.isExporting ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)';
                ctx2d.beginPath();
                ctx2d.moveTo(drawX, doorTop);
                ctx2d.lineTo(drawX + visualW, doorTop + doorH/2);
                ctx2d.lineTo(drawX, doorBottom);
                ctx2d.stroke();
            }
        } else if (state.currentTab !== 'wireframe' && (cab.doorType === 'drawer_2' || cab.doorType === 'drawer_3')) {
            const N = cab.doorType === 'drawer_2' ? 2 : 3;
            // 각 칸막이당 찬넬 공제 높이 계산
            const drawerH = (cabinetInnerH - channelH * N) / N;
            
            ctx2d.strokeStyle = theme.cabBorder;
            ctx2d.lineWidth = 1.2;
            
            for (let i = 0; i < N; i++) {
                const yChan = bodyTop + t + i * (drawerH + channelH);
                // 찬넬 가공 바 그리기
                if (channelH > 0) {
                    ctx2d.fillStyle = cab.handleType === 'mok_channel' ? 'rgba(140, 108, 83, 0.6)' : 'rgba(148, 163, 184, 0.8)';
                    ctx2d.fillRect(drawX + t, yChan, visualW - t*2, channelH);
                    ctx2d.strokeStyle = theme.gridMain;
                    ctx2d.strokeRect(drawX + t, yChan, visualW - t*2, channelH);
                }
                
                const yFront = yChan + channelH;
                ctx2d.fillStyle = theme.doorFill;
                ctx2d.fillRect(drawX + 2, yFront, visualW - 4, drawerH);
                ctx2d.strokeRect(drawX + 2, yFront, visualW - 4, drawerH);
                
                // 스마트바 마킹
                if (cab.handleType === 'smart_bar') {
                    ctx2d.fillStyle = 'rgba(148, 163, 184, 0.9)';
                    ctx2d.fillRect(drawX + 2, yFront, visualW - 4, 8);
                }
                
                // 손잡이
                drawHandle(drawX + visualW/2, yFront + drawerH/2, 'center', theme, cab.handleType);
            }
        }
        
        // 내부 구성 v0.5: 가로 분할 통 + 각 통의 세로 분할
        const rows2D = ensureCabinetRows(cab);
        const innerVisualW = visualW - t * 2;
        const totalRowH = rows2D.reduce((sum,row)=>sum+Number(row.height||0),0)||1;
        const availableRowVisualH = Math.max(0,cabinetInnerH-t*Math.max(0,rows2D.length-1));
        let rowBottom2D = bodyBottom - t;
        ctx2d.save(); ctx2d.textAlign='center';
        rows2D.forEach((row,rowIndex)=>{
            const rowVisualH=availableRowVisualH*(row.height/totalRowH), rowTop2D=rowBottom2D-rowVisualH;
            if(rowIndex>0){ctx2d.fillStyle=theme.cabFill;ctx2d.fillRect(drawX+t,rowBottom2D,innerVisualW,Math.max(2,t));ctx2d.strokeStyle=theme.cabBorder;ctx2d.strokeRect(drawX+t,rowBottom2D,innerVisualW,Math.max(2,t));}
            const columns=row.columns,totalColumnW=columns.reduce((s,c)=>s+Number(c.width||0),0)||1,availableColW=Math.max(0,innerVisualW-t*Math.max(0,columns.length-1));let colX=drawX+t;
            columns.forEach((column,colIndex)=>{
                const colW=availableColW*(column.width/totalColumnW);
                if(colIndex>0){ctx2d.fillStyle=theme.cabFill;ctx2d.fillRect(colX-t,rowTop2D,t,rowVisualH);ctx2d.strokeStyle=theme.cabBorder;ctx2d.strokeRect(colX-t,rowTop2D,t,rowVisualH);}
                const secTotal=column.sections.reduce((s,x)=>s+Number(x.height||0),0)||1;let secBottom=rowBottom2D;
                column.sections.forEach((section,index)=>{const sh=rowVisualH*(section.height/secTotal),st=secBottom-sh;ctx2d.strokeStyle=theme.cabShelf;ctx2d.setLineDash([5,4]);if(index<column.sections.length-1){ctx2d.beginPath();ctx2d.moveTo(colX,st);ctx2d.lineTo(colX+colW,st);ctx2d.stroke();}ctx2d.setLineDash([]);ctx2d.fillStyle=theme.textSecondary;ctx2d.font='bold 9px Noto Sans KR, sans-serif';ctx2d.fillText(`${getSectionTypeName(section.type)} ${Math.round(section.height)}mm`,colX+colW/2,st+sh/2+3,Math.max(35,colW-6));if(section.type==='hanger'){ctx2d.strokeStyle=theme.dimension;ctx2d.lineWidth=3;const ry=st+Math.min(70,sh*.22);ctx2d.beginPath();ctx2d.moveTo(colX+15,ry);ctx2d.lineTo(colX+colW-15,ry);ctx2d.stroke();}else if(section.type==='drawer'){ctx2d.strokeStyle=theme.cabBorder;ctx2d.lineWidth=1;for(let d=1;d<(section.drawers||2);d++){const dy=st+sh*d/(section.drawers||2);ctx2d.beginPath();ctx2d.moveTo(colX+4,dy);ctx2d.lineTo(colX+colW-4,dy);ctx2d.stroke();}}else if(section.type==='umbrella'){ctx2d.strokeStyle=theme.dimension;ctx2d.strokeRect(colX+10,secBottom-Math.min(80,sh*.45)-15,Math.max(20,colW-20),Math.min(80,sh*.45));}secBottom=st;});
                ctx2d.fillStyle=theme.textPrimary;ctx2d.font='bold 8px monospace';ctx2d.fillText(`${Math.round(column.width)}mm`,colX+colW/2,rowTop2D+10,Math.max(30,colW-4));colX+=colW+t;
            });
            ctx2d.fillStyle=theme.dimension;ctx2d.font='bold 9px monospace';ctx2d.textAlign='left';ctx2d.fillText(`가로통 H:${Math.round(row.height)}`,drawX+t+4,rowTop2D+22);ctx2d.textAlign='center';rowBottom2D=rowTop2D-t;
        });
        ctx2d.restore();

        // --------------------------------------------------
        // 상세 부재 치수 노출 (골조 두께, 칸막이 높이, 도어/서랍별 상세 크기)
        // --------------------------------------------------
        if (state.detailsEnabled) {
            ctx2d.fillStyle = theme.textPrimary;
            ctx2d.font = 'bold 12px monospace';
            ctx2d.textAlign = 'center';
            
            const cabinetInnerW = visualW - t*2;
            
            // 1. 도어 및 서랍 개별 크기 기입
            if (cab.doorType === 'swing_double') {
                const singleDoorW = Math.round((visualW - 4) / 2);
                ctx2d.fillText(`${singleDoorW}`, drawX + visualW / 4, bodyBottom - 15);
                ctx2d.fillText(`${singleDoorW}`, drawX + (visualW * 3) / 4, bodyBottom - 15);
            } else if (cab.doorType === 'swing_single_left' || cab.doorType === 'swing_single_right') {
                const singleDoorW = Math.round(visualW - 4);
                ctx2d.fillText(`${singleDoorW}`, drawX + visualW / 2, bodyBottom - 15);
            } else if (showDoorFronts && cab.doorType === 'sliding') {
                const doorW = Math.round((visualW + 20) / 2);
                ctx2d.fillText(`문:${doorW}`, drawX + visualW / 4, bodyBottom - 15);
                ctx2d.fillText(`문:${doorW}`, drawX + (visualW * 3) / 4, bodyBottom - 30);
            } else if (cab.doorType === 'drawer_2') {
                const drawH = Math.round((cabinetInnerH - channelH * 2) / 2);
                ctx2d.fillText(`H:${drawH}`, drawX + visualW / 2, bodyTop + t + channelH + drawH / 2);
                ctx2d.fillText(`H:${drawH}`, drawX + visualW / 2, bodyTop + t + channelH + drawH * 1.5 + channelH);
            } else if (cab.doorType === 'drawer_3') {
                const drawH = Math.round((cabinetInnerH - channelH * 3) / 3);
                for (let i = 0; i < 3; i++) {
                    const textY = bodyTop + t + i * (drawH + channelH) + channelH + drawH / 2;
                    ctx2d.fillText(`H:${drawH}`, drawX + visualW / 2, textY);
                }
            }
            
            // 2. 가로/세로 분할 치수 기입
            const detailRows = ensureCabinetRows(cab);
            ctx2d.fillStyle = theme.cabShelf;
            ctx2d.font = 'bold 9px monospace';
            ctx2d.textAlign = 'center';
            detailRows.forEach((row, ri) => {
                ctx2d.fillText(`통${ri + 1}:H${Math.round(row.height)}`, drawX + visualW / 2, bodyTop + 14 + ri * 11);
            });

            // 3. 목재 두께(T) 기입
            ctx2d.fillStyle = theme.cabT; // Red for thickness
            ctx2d.font = 'bold 12px monospace';
            ctx2d.fillText(`${cab.t}T`, drawX + t/2, bodyBottom - 10);
            ctx2d.fillText(`${cab.t}T`, drawX + visualW - t/2, bodyBottom - 10);
            ctx2d.fillText(`${cab.t}T`, drawX + visualW/2, bodyTop + t/2 + 3); // 상판 두께
            
            // 4. 걸레받이/좌대 및 다릿발 높이 상세 치수 기입
            if (cab.supportType === 'plinth' && supportH > 0) {
                ctx2d.fillStyle = theme.cabGroove;
                ctx2d.font = 'bold 12px monospace';
                ctx2d.fillText(`좌대:${cab.plinthHeight} (인입:${cab.plinthSetback})`, drawX + visualW/2, drawY - supportH/2 + 4);
            } else if (cab.supportType === 'legs' && supportH > 0) {
                ctx2d.fillStyle = theme.cabGroove;
                ctx2d.font = 'bold 12px monospace';
                const legNameKR = cab.legType === 'plastic' ? '조절발' : (cab.legType === 'steel_round' ? '원형스틸' : (cab.legType === 'steel_square' ? '사각블랙' : '원목발'));
                ctx2d.fillText(`다릿발(${legNameKR}):${cab.legHeight}`, drawX + visualW/2, drawY - supportH/2 + 4);
            }
        }
    } else {
        // 측면이 보이는 경우
        ctx2d.strokeStyle = theme.cabBorder;
        ctx2d.beginPath();
        // 도어 두께 표시 (우측 또는 좌측에 얇은 선 추가)
        const doorIndicatorOffset = (cab.rotation === 90) ? visualW - 18 : 18;
        ctx2d.moveTo(drawX + doorIndicatorOffset, drawY - cab.kickplate);
        ctx2d.lineTo(drawX + doorIndicatorOffset, drawY - cab.h);
        ctx2d.stroke();
    }
    
    // 업로드 예시처럼 정면도에 얕은 깊이감을 추가
    if (facesFront) drawElevationDepthEffect(drawX, drawY, visualW, drawH, cab.d, theme);

    // 텍스트 라벨 (가구명 및 높이/폭 수치)
    ctx2d.fillStyle = theme.textPrimary;
    ctx2d.font = 'bold 14px Inter, sans-serif';
    ctx2d.textAlign = 'center';
    ctx2d.fillText(cab.name, drawX + visualW/2, drawY - drawH/2 - 2);
    
    ctx2d.fillStyle = theme.textSecondary;
    ctx2d.font = 'bold 11px monospace';
    ctx2d.fillText(`W:${cab.w} H:${cab.h}`, drawX + visualW/2, drawY - drawH/2 + 12);

    // 개별 가구 외곽 치수선
    if (state.detailsEnabled || isSelected) {
        drawDimensionLine(drawX, drawY + 42, drawX + visualW, drawY + 42, 'bottom', `${Math.round(visualW)} mm`);
        drawDimensionLine(drawX - 42, drawY, drawX - 42, drawY - drawH, 'left', `${Math.round(drawH)} mm`);
    }
    
    ctx2d.restore();
}

// 2D 입면도에 약한 사시도 깊이선을 추가하여 공장 제작도처럼 보이게 함
function drawElevationDepthEffect(x, y, w, h, depth, theme) {
    const maxOffset = Math.max(14, Math.min(95, Number(depth || 0) * 0.12));
    const dx = maxOffset;
    const dy = -maxOffset * 0.48;
    ctx2d.save();
    ctx2d.strokeStyle = theme.boardEdge;
    ctx2d.fillStyle = state.isExporting ? 'rgba(226,232,240,0.42)' : 'rgba(148,163,184,0.14)';
    ctx2d.lineWidth = state.isExporting ? 1.15 : 1;

    // 상판 사시면
    ctx2d.beginPath();
    ctx2d.moveTo(x, y - h);
    ctx2d.lineTo(x + dx, y - h + dy);
    ctx2d.lineTo(x + w + dx, y - h + dy);
    ctx2d.lineTo(x + w, y - h);
    ctx2d.closePath();
    ctx2d.fill();
    ctx2d.stroke();

    // 우측판 사시면
    ctx2d.beginPath();
    ctx2d.moveTo(x + w, y - h);
    ctx2d.lineTo(x + w + dx, y - h + dy);
    ctx2d.lineTo(x + w + dx, y + dy);
    ctx2d.lineTo(x + w, y);
    ctx2d.closePath();
    ctx2d.fill();
    ctx2d.stroke();

    // 깊이 치수 보조선
    if (state.detailsEnabled || state.isExporting) {
        ctx2d.strokeStyle = theme.dimension;
        ctx2d.fillStyle = theme.dimension;
        ctx2d.setLineDash([5, 4]);
        ctx2d.beginPath();
        ctx2d.moveTo(x + w + 8, y - h - 8);
        ctx2d.lineTo(x + w + dx + 8, y - h + dy - 8);
        ctx2d.stroke();
        ctx2d.setLineDash([]);
        ctx2d.save();
        ctx2d.translate(x + w + dx / 2 + 13, y - h + dy / 2 - 12);
        ctx2d.rotate(Math.atan2(dy, dx));
        ctx2d.font = 'bold 10px monospace';
        ctx2d.textAlign = 'center';
        ctx2d.fillText(`${Math.round(depth)} mm`, 0, 0);
        ctx2d.restore();
    }
    ctx2d.restore();
}

// 손잡이 그리기 보조 함수
function drawHandle(x, y, align, theme, handleType) {
    if (!theme) theme = getC2DTheme();
    if (!handleType || handleType === 'none' || handleType === 'mok_channel' || handleType === 'c_channel' || handleType === 'smart_bar') {
        // 빌트인/찬넬형/숨김형은 2D에서 노출형 손잡이를 그리지 않음
        return;
    }
    
    ctx2d.fillStyle = theme.dimension;
    ctx2d.strokeStyle = theme.cabBorder;
    ctx2d.lineWidth = 1;
    ctx2d.beginPath();
    
    if (handleType === 'button') {
        // 원형 버튼형 손잡이
        ctx2d.arc(x, y, 5, 0, Math.PI * 2);
    } else if (handleType === 'cup') {
        // 조개형 손잡이 (가로 반원)
        ctx2d.arc(x, y, 8, Math.PI, 0);
        ctx2d.lineTo(x + 8, y + 4);
        ctx2d.lineTo(x - 8, y + 4);
        ctx2d.closePath();
    } else if (handleType === 'bar_horizontal') {
        // 가로 바형
        ctx2d.rect(x - 20, y - 2, 40, 4);
    } else if (handleType === 'bar_vertical') {
        // 세로 바형
        ctx2d.rect(x - 2, y - 20, 4, 40);
    } else {
        // 기본 래퍼 분기
        if (align === 'left' || align === 'right') {
            ctx2d.rect(x - 2, y - 20, 4, 40);
        } else {
            ctx2d.rect(x - 25, y - 2, 50, 4);
        }
    }
    ctx2d.fill();
    ctx2d.stroke();
}

// 회전 상태에 따른 가구 2D 경계 박스 크기 반환
function getCabinetRotatedDims(cab) {
    if (cab.rotation === 90 || cab.rotation === 270) {
        return { w: cab.d, d: cab.w };
    }
    return { w: cab.w, d: cab.d };
}

// RGB 코드 헥사값 파싱
function varColorToRgb(hex) {
    return hex;
}

// 상태 메세지 표시
function showStatusMessage(text) {
    document.getElementById('status-message').innerText = text;
}

// 2D 마우스 핸들링
function onMouseDown(e) {
    const rect = canvas2d.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // 우클릭 또는 휠 클릭 또는 Shift+좌클릭 시 드래그 팬(Pan) 활성화
    if (e.button === 2 || e.button === 1 || (e.button === 0 && e.shiftKey)) {
        state.isPanning = true;
        const view = state.currentTab === 'plan' ? state.plan : state.elevation;
        state.panStartMouseX = mouseX;
        state.panStartMouseY = mouseY;
        state.panStartPanX = view.panX;
        state.panStartPanY = view.panY;
        canvas2d.style.cursor = 'grabbing';
        e.preventDefault();
        return;
    }
    
    // 좌클릭 시 오브젝트 선택 및 드래그 이동 시작
    if (e.button === 0) {
        const worldCoords = screenToWorld(mouseX, mouseY);
        const hitCab = findCabinetAt(worldCoords.x, worldCoords.y);
        
        if (hitCab) {
            pushHistory();
            selectCabinet(hitCab.id);
            state.isDragging = true;
            state.dragStartMouseX = worldCoords.x;
            state.dragStartMouseY = worldCoords.y;
            state.dragStartCabX = hitCab.x;
            state.dragStartCabY = hitCab.y;
            state.dragStartCabZ = hitCab.z;
        } else {
            // 허공 클릭 시 선택 해제
            selectCabinet(null);
            
            // 허공 상태에서 panning 시작용 (일반 드래그로 화면 움직임 유도)
            state.isPanning = true;
            const view = state.currentTab === 'plan' ? state.plan : state.elevation;
            state.panStartMouseX = mouseX;
            state.panStartMouseY = mouseY;
            state.panStartPanX = view.panX;
            state.panStartPanY = view.panY;
        }
    }
}

function onMouseMove(e) {
    const rect = canvas2d.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // 화면 드래그 스크롤(Panning) 중
    if (state.isPanning) {
        const dx = mouseX - state.panStartMouseX;
        const dy = mouseY - state.panStartMouseY;
        const view = state.currentTab === 'plan' ? state.plan : state.elevation;
        
        view.panX = state.panStartPanX + dx;
        view.panY = state.panStartPanY + dy;
        
        render2D();
        updateCoordsStatus(mouseX, mouseY);
        return;
    }
    
    // 가구 드래그 이동 중
    if (state.isDragging && state.selectedId) {
        const cab = state.cabinets.find(c => c.id === state.selectedId);
        if (!cab) return;
        
        const worldCoords = screenToWorld(mouseX, mouseY);
        const dx = worldCoords.x - state.dragStartMouseX;
        const dy = worldCoords.y - state.dragStartMouseY;
        
        if (state.currentTab === 'plan') {
            // 평면 뷰: X, Y 이동
            let targetX = state.dragStartCabX + dx;
            let targetY = state.dragStartCabY + dy;
            
            // 자동 흡착 및 스냅 알고리즘 적용
            if (state.snapEnabled) {
                const snapRes = applySnapping(cab, targetX, targetY);
                targetX = snapRes.x;
                targetY = snapRes.y;
            } else {
                // 단순 방 경계 검사
                const rotated = getCabinetRotatedDims(cab);
                targetX = Math.max(0, Math.min(state.room.width - rotated.w, targetX));
                targetY = Math.max(0, Math.min(state.room.depth - rotated.d, targetY));
            }
            
            cab.x = targetX;
            cab.y = targetY;
        } else if (state.currentTab === 'elevation') {
            // 입면 뷰: X(수평), Z(수직 높이) 이동
            let targetX = state.dragStartCabX + dx;
            let targetZ = state.dragStartCabZ - dy; // 화면 Y좌표 하강 = Z높이 상승이므로 -dy
            
            // 방 경계 제한
            let visualW = (cab.rotation === 90 || cab.rotation === 270) ? cab.d : cab.w;
            targetX = Math.max(0, Math.min(state.room.width - visualW, targetX));
            targetZ = Math.max(0, Math.min(state.room.height - cab.h, targetZ));
            
            // 스냅 (그리드 스냅)
            if (state.snapEnabled) {
                targetX = Math.round(targetX / 50) * 50;
                targetZ = Math.round(targetZ / 50) * 50;
            }
            
            cab.x = targetX;
            cab.z = targetZ;
        }
        
        syncPropFields(cab);
        render2D();
        update3DScene();
    }
    
    updateCoordsStatus(mouseX, mouseY);
}

function onMouseUp(e) {
    state.isDragging = false;
    state.isPanning = false;
    canvas2d.style.cursor = 'grab';
}

function onWheel(e) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    handleZoom(factor, e.clientX, e.clientY);
}

// 줌(Zoom) 제어
function handleZoom(factor, clientX, clientY) {
    const view = state.currentTab === 'plan' ? state.plan : state.elevation;
    const oldZoom = view.zoom;
    const newZoom = Math.max(0.02, Math.min(2.0, oldZoom * factor));
    
    // 마우스 포인터 위치 기준 줌 스케일링 보정
    if (clientX !== undefined && clientY !== undefined) {
        const rect = canvas2d.getBoundingClientRect();
        const mX = clientX - rect.left;
        const mY = clientY - rect.top;
        
        // 줌 중심축 월드 좌표 구하기
        const worldX = (mX - view.panX) / oldZoom;
        const worldY = (mY - view.panY) / oldZoom;
        
        view.zoom = newZoom;
        view.panX = mX - worldX * newZoom;
        view.panY = mY - worldY * newZoom;
    } else {
        // 화면 중심 기준 줌
        const centerX = canvas2d.width / 2;
        const centerY = canvas2d.height / 2;
        const worldX = (centerX - view.panX) / oldZoom;
        const worldY = (centerY - view.panY) / oldZoom;
        
        view.zoom = newZoom;
        view.panX = centerX - worldX * newZoom;
        view.panY = centerY - worldY * newZoom;
    }
    
    render2D();
}

// 화면 맞춤 (Zoom Fit)
function zoomToFit() {
    const isPlan = state.currentTab === 'plan';
    const view = isPlan ? state.plan : state.elevation;
    
    const targetW = state.room.width;
    const targetH = isPlan ? state.room.depth : state.room.height;
    
    // 캔버스 크기 대비 방 크기 비율
    const scaleX = (canvas2d.width - 150) / targetW;
    const scaleY = (canvas2d.height - 150) / targetH;
    const newZoom = Math.min(scaleX, scaleY);
    
    view.zoom = newZoom;
    
    // 정중앙 정렬 팬 좌표 계산
    if (isPlan) {
        view.panX = (canvas2d.width - targetW * newZoom) / 2;
        view.panY = (canvas2d.height - targetH * newZoom) / 2;
    } else {
        // 입면도는 하단 바닥(y=0) 기준선이 아래쪽에 있는것이 안정적이므로 다르게 보정
        view.panX = (canvas2d.width - targetW * newZoom) / 2;
        view.panY = (canvas2d.height + targetH * newZoom) / 2 - 50; 
    }
    
    render2D();
}

// 화면 마우스 좌표 -> 룸 가상 좌표(mm) 변환
function screenToWorld(sx, sy) {
    const isPlan = state.currentTab === 'plan';
    const view = isPlan ? state.plan : state.elevation;
    return {
        x: (sx - view.panX) / view.zoom,
        y: (sy - view.panY) / view.zoom
    };
}

// 월드 좌표 상 마우스 포인트 위치 가구 검색
function findCabinetAt(wx, wy) {
    const isPlan = state.currentTab === 'plan';
    
    // 거꾸로 순회하여 화면상 맨 위(가장 늦게 그려진) 가구 우선 감지
    for (let i = state.cabinets.length - 1; i >= 0; i--) {
        const cab = state.cabinets[i];
        
        if (isPlan) {
            const rotated = getCabinetRotatedDims(cab);
            if (wx >= cab.x && wx <= cab.x + rotated.w &&
                wy >= cab.y && wy <= cab.y + rotated.d) {
                return cab;
            }
        } else {
            // Elevation 뷰: X축과 Z축(높이 방향은 -wy) 감지
            let visualW = (cab.rotation === 90 || cab.rotation === 270) ? cab.d : cab.w;
            const realZ = -wy; // Elevation 캔버스 상에서는 음수 y가 양의 Z임
            
            if (wx >= cab.x && wx <= cab.x + visualW &&
                realZ >= cab.z && realZ <= cab.z + cab.h) {
                return cab;
            }
        }
    }
    return null;
}

// 상태바 좌표 갱신
function updateCoordsStatus(mx, my) {
    const world = screenToWorld(mx, my);
    const coordsEl = document.getElementById('status-coords');
    
    if (state.currentTab === 'plan') {
        if (world.x >= 0 && world.x <= state.room.width && world.y >= 0 && world.y <= state.room.depth) {
            coordsEl.innerText = `X: ${Math.round(world.x)}, Y: ${Math.round(world.y)} mm`;
        } else {
            coordsEl.innerText = `X: ${Math.round(world.x)}, Y: ${Math.round(world.y)} mm (외부)`;
        }
    } else {
        const realZ = -world.y;
        if (world.x >= 0 && world.x <= state.room.width && realZ >= 0 && realZ <= state.room.height) {
            coordsEl.innerText = `X: ${Math.round(world.x)}, Z(높이): ${Math.round(realZ)} mm`;
        } else {
            coordsEl.innerText = `X: ${Math.round(world.x)}, Z(높이): ${Math.round(realZ)} mm (외부)`;
        }
    }
}

// 가구 배치 자석 흡착(Snapping) 연산
function applySnapping(cab, tx, ty) {
    const rotated = getCabinetRotatedDims(cab);
    const cabW = rotated.w;
    const cabD = rotated.d;
    
    let resultX = tx;
    let resultY = ty;
    
    const snapThreshold = 50; // 흡착 반경(mm)
    const gridCell = 50; // 그리드 최소 단위 스냅
    
    // 1. 방 외벽에 대한 흡착 검사
    // X축 외벽
    if (Math.abs(tx) < snapThreshold) {
        resultX = 0;
    } else if (Math.abs(tx + cabW - state.room.width) < snapThreshold) {
        resultX = state.room.width - cabW;
    }
    
    // Y축 외벽
    if (Math.abs(ty) < snapThreshold) {
        resultY = 0;
    } else if (Math.abs(ty + cabD - state.room.depth) < snapThreshold) {
        resultY = state.room.depth - cabD;
    }
    
    // 2. 다른 인접 가구들과의 흡착 검사
    state.cabinets.forEach(other => {
        if (other.id === cab.id) return;
        const otherRot = getCabinetRotatedDims(other);
        
        // 가로방향(X축) 나란히 스냅
        // cab 우측 -> other 좌측 스냅
        if (Math.abs((resultX + cabW) - other.x) < snapThreshold) {
            resultX = other.x - cabW;
            // Y축 정렬도 근접하면 보정
            if (Math.abs(resultY - other.y) < snapThreshold) resultY = other.y;
        }
        // cab 좌측 -> other 우측 스냅
        if (Math.abs(resultX - (other.x + otherRot.w)) < snapThreshold) {
            resultX = other.x + otherRot.w;
            if (Math.abs(resultY - other.y) < snapThreshold) resultY = other.y;
        }
        
        // 세로방향(Y축) 밀착 스냅 (예: 뒤벽밀착 가구들끼리 앞뒤 밀착)
        // cab 하단 -> other 상단 스냅
        if (Math.abs((resultY + cabD) - other.y) < snapThreshold) {
            resultY = other.y - cabD;
            if (Math.abs(resultX - other.x) < snapThreshold) resultX = other.x;
        }
        // cab 상단 -> other 하단 스냅
        if (Math.abs(resultY - (other.y + otherRot.d)) < snapThreshold) {
            resultY = other.y + otherRot.d;
            if (Math.abs(resultX - other.x) < snapThreshold) resultX = other.x;
        }
    });
    
    // 3. 만약 위 스냅에 안 걸린 일반 좌표라면 50mm 그리드 단위로 미세 조절 스냅 적용
    if (resultX === tx) {
        resultX = Math.round(tx / gridCell) * gridCell;
    }
    if (resultY === ty) {
        resultY = Math.round(ty / gridCell) * gridCell;
    }
    
    // 룸 영역 이탈 절대 제어
    resultX = Math.max(0, Math.min(state.room.width - cabW, resultX));
    resultY = Math.max(0, Math.min(state.room.depth - cabD, resultY));
    
    return { x: resultX, y: resultY };
}

// 우측 사이드바 배치 가구 목록 UI 갱신
function updatePlacedList() {
    const listEl = document.getElementById('cabinet-list');
    const emptyEl = document.getElementById('cabinet-list-empty');
    listEl.innerHTML = '';
    
    if (state.cabinets.length === 0) {
        emptyEl.style.display = 'block';
        return;
    }
    
    emptyEl.style.display = 'none';
    
    state.cabinets.forEach((cab, index) => {
        const li = document.createElement('li');
        li.className = `cabinet-list-item ${cab.id === state.selectedId ? 'selected' : ''}`;
        
        li.innerHTML = `
            <div class="list-item-info">
                <span class="list-item-name">${index + 1}. ${cab.name}</span>
                <span class="list-item-dims">${cab.w} x ${cab.d} x ${cab.h} (T:${cab.t}) ${cab.groove ? ' | 우라홈' : ''}</span>
            </div>
            <div class="list-item-actions">
                <button class="list-action-btn" data-action="delete" title="삭제">
                    <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                </button>
            </div>
        `;
        
        // 리스트 클릭 이벤트
        li.addEventListener('click', (e) => {
            // 버튼 클릭 시 제외
            if (e.target.closest('.list-action-btn')) return;
            selectCabinet(cab.id);
            
            // 2D 뷰에서 해당 가구가 화면 중앙에 오도록 살짝 팬 조절 가능
            const isPlan = state.currentTab === 'plan';
            const view = isPlan ? state.plan : state.elevation;
            if (isPlan) {
                view.panX = canvas2d.width/2 - (cab.x + cab.w/2) * view.zoom;
                view.panY = canvas2d.height/2 - (cab.y + cab.d/2) * view.zoom;
            }
            render2D();
            update3DScene();
        });
        
        // 리스트 내 개별 삭제 아이콘
        li.querySelector('.list-action-btn[data-action="delete"]').addEventListener('click', (e) => {
            e.stopPropagation();
            state.selectedId = cab.id;
            deleteSelectedCabinet();
        });
        
        listEl.appendChild(li);
    });
    
    lucide.createIcons(); // 아이콘 렌더링 갱신
}

// ----------------------------------------------------
// THREE.JS 3D 시각화 엔진 소스
// ----------------------------------------------------

function init3D() {
    const container = document.getElementById('canvas-3d-container');
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;
    
    // 1. Scene 생성
    state.three.scene = new THREE.Scene();
    state.three.scene.background = new THREE.Color(0x0b0f19);
    
    // 2. Camera 생성
    state.three.camera = new THREE.PerspectiveCamera(45, width / height, 10, 50000);
    state.three.camera.position.set(0, 3000, 4500); // 룸 위쪽/대각선 위치 배치
    
    // 3. Renderer 생성
    state.three.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); // preserveDrawingBuffer: 이미지 캡쳐를 위해 필수
    state.three.renderer.setSize(width, height);
    state.three.renderer.shadowMap.enabled = true;
    state.three.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(state.three.renderer.domElement);
    state.three.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    
    // 4. Controls 세팅 (OrbitControls)
    state.three.controls = new THREE.OrbitControls(state.three.camera, state.three.renderer.domElement);
    state.three.controls.enableDamping = true;
    state.three.controls.dampingFactor = 0.05;
    state.three.controls.maxPolarAngle = Math.PI / 2 - 0.05; // 바닥 밑으로 카메라 못 내려가게
    state.three.controls.minDistance = 200;
    state.three.controls.maxDistance = 15000;

    // 컨테이너 크기가 바뀌면 3D 캔버스도 즉시 전체 영역으로 재계산
    if (window.ResizeObserver) {
        state.three.resizeObserver = new ResizeObserver(() => resize3DViewport());
        state.three.resizeObserver.observe(container);
    }

    // 3D 선택 및 바닥면 드래그 이동 준비
    setup3DInteraction();
    
    // 사용자가 직접 회전 드래그 시 프리셋 버튼 활성 해제
    state.three.controls.addEventListener('start', () => {
        document.querySelectorAll('.three-opt-btn-mini').forEach(btn => btn.classList.remove('active'));
    });
    
    // 5. Lighting 추가
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    state.three.scene.add(ambientLight);
    
    // 메인 방향성 조명 (정면 좌측 위)
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight1.position.set(2000, 4000, 3000);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 2048;
    dirLight1.shadow.mapSize.height = 2048;
    dirLight1.shadow.camera.near = 100;
    dirLight1.shadow.camera.far = 15000;
    const d = 5000;
    dirLight1.shadow.camera.left = -d;
    dirLight1.shadow.camera.right = d;
    dirLight1.shadow.camera.top = d;
    dirLight1.shadow.camera.bottom = -d;
    state.three.scene.add(dirLight1);
    
    // 보조 조명 (역광 채우기)
    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.2);
    dirLight2.position.set(-3000, 2000, -2000);
    state.three.scene.add(dirLight2);
    
    // 6. 가구 그룹 생성 및 룸 외형 초기 렌더링
    state.three.cabinetsGroup = new THREE.Group();
    state.three.scene.add(state.three.cabinetsGroup);
    
    update3DRoomGeometry();
    
    // 7. Animation Loop 실행
    function animate() {
        requestAnimationFrame(animate);
        state.three.controls.update();
        if (state.currentTab === 'wireframe') updateWireDimensionOverlay();
        state.three.renderer.render(state.three.scene, state.three.camera);
    }
    animate();
}

// 3D에서 가구 선택 및 X/Y 평면 이동
function setup3DInteraction() {
    const renderer = state.three.renderer;
    const camera = state.three.camera;
    if (!renderer || !camera) return;

    state.three.raycaster = new THREE.Raycaster();
    state.three.pointer = new THREE.Vector2();
    state.three.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const dom = renderer.domElement;

    function updatePointer(e) {
        const rect = dom.getBoundingClientRect();
        state.three.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        state.three.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        state.three.raycaster.setFromCamera(state.three.pointer, camera);
    }

    function getHitCabinetRoot(e) {
        updatePointer(e);
        const group = state.three.cabinetsGroup;
        if (!group) return null;
        const hits = state.three.raycaster.intersectObjects(group.children, true);
        if (!hits.length) return null;
        const id = hits[0].object.userData && hits[0].object.userData.cabinetId;
        if (!id) return null;
        return group.children.find(child => child.userData.cabinetId === id) || null;
    }

    function planePoint(e, height = 0) {
        updatePointer(e);
        state.three.dragPlane.set(new THREE.Vector3(0, 1, 0), -height);
        const point = new THREE.Vector3();
        return state.three.raycaster.ray.intersectPlane(state.three.dragPlane, point) ? point : null;
    }

    dom.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        const hitRoot = getHitCabinetRoot(e);
        if (!hitRoot) return; // 빈 공간은 OrbitControls가 회전 담당

        e.preventDefault();
        e.stopPropagation();
        const id = hitRoot.userData.cabinetId;
        const cab = state.cabinets.find(c => c.id === id);
        if (!cab) return;
        pushHistory();

        // 3D와 2D/속성 패널의 선택 상태 공유
        selectCabinet(id);
        update3DScene();
        const freshRoot = state.three.cabinetsGroup.children.find(c => c.userData.cabinetId === id);
        const point = planePoint(e, Number(cab.z || 0));
        if (!freshRoot || !point) return;

        state.three.isObjectDragging = true;
        state.three.dragCabinetId = id;
        state.three.dragOffsetX = freshRoot.position.x - point.x;
        state.three.dragOffsetZ = freshRoot.position.z - point.z;
        state.three.dragMoved = false;
        state.three.controls.enabled = false;
        dom.style.cursor = 'grabbing';
        try { dom.setPointerCapture(e.pointerId); } catch (_) {}
    }, true);

    dom.addEventListener('pointermove', (e) => {
        if (!state.three.isObjectDragging || !state.three.dragCabinetId) {
            const hit = getHitCabinetRoot(e);
            dom.style.cursor = hit ? 'move' : 'grab';
            return;
        }

        e.preventDefault();
        e.stopPropagation();
        const cab = state.cabinets.find(c => c.id === state.three.dragCabinetId);
        const root = state.three.cabinetsGroup.children.find(c => c.userData.cabinetId === state.three.dragCabinetId);
        const point = cab ? planePoint(e, Number(cab.z || 0)) : null;
        if (!cab || !root || !point) return;

        const rotated = getCabinetRotatedDims(cab);
        let centerX2D = point.x + state.three.dragOffsetX + state.room.width / 2;
        let centerY2D = point.z + state.three.dragOffsetZ + state.room.depth / 2;
        let targetX = centerX2D - rotated.w / 2;
        let targetY = centerY2D - rotated.d / 2;

        if (state.snapEnabled) {
            targetX = Math.round(targetX / 50) * 50;
            targetY = Math.round(targetY / 50) * 50;
        }
        targetX = Math.max(0, Math.min(state.room.width - rotated.w, targetX));
        targetY = Math.max(0, Math.min(state.room.depth - rotated.d, targetY));

        cab.x = targetX;
        cab.y = targetY;
        root.position.x = -state.room.width / 2 + targetX + rotated.w / 2;
        root.position.z = -state.room.depth / 2 + targetY + rotated.d / 2;
        state.three.dragMoved = true;

        syncPropFields(cab);
        render2D();
        updatePlacedList();
        showStatusMessage(`3D 이동: ${cab.name}  X ${Math.round(cab.x)} / Y ${Math.round(cab.y)} mm`);
    }, true);

    function finish3DDrag(e) {
        if (!state.three.isObjectDragging) return;
        e.preventDefault();
        e.stopPropagation();
        const id = state.three.dragCabinetId;
        const cab = state.cabinets.find(c => c.id === id);
        state.three.isObjectDragging = false;
        state.three.dragCabinetId = null;
        state.three.controls.enabled = true;
        dom.style.cursor = 'grab';
        try { dom.releasePointerCapture(e.pointerId); } catch (_) {}
        update3DScene();
        render2D();
        if (cab) showStatusMessage(`${cab.name} 위치가 2D·3D에 동기화되었습니다.`);
    }

    dom.addEventListener('pointerup', finish3DDrag, true);
    dom.addEventListener('pointercancel', finish3DDrag, true);
    dom.addEventListener('contextmenu', e => e.preventDefault());
}

// 방 외곽 테두리 및 벽면 3D 시각화
let roomFloorMesh = null;
let roomWallsMesh = null;
let roomGridHelper = null;

function update3DRoomGeometry() {
    const scene = state.three.scene;
    if (!scene) return;
    
    // 기존 요소 삭제
    if (roomFloorMesh) scene.remove(roomFloorMesh);
    if (roomWallsMesh) scene.remove(roomWallsMesh);
    if (roomGridHelper) scene.remove(roomGridHelper);
    
    const w = state.room.width;
    const d = state.room.depth;
    const h = state.room.height;
    
    // 1. 바닥(Floor) 판재 생성
    const floorGeo = new THREE.PlaneGeometry(w, d);
    const floorMat = new THREE.MeshStandardMaterial({ 
        color: 0x1e293b, 
        roughness: 0.8,
        metalness: 0.1,
        side: THREE.DoubleSide 
    });
    roomFloorMesh = new THREE.Mesh(floorGeo, floorMat);
    roomFloorMesh.rotation.x = Math.PI / 2;
    roomFloorMesh.position.set(0, 0, 0);
    roomFloorMesh.receiveShadow = true;
    scene.add(roomFloorMesh);
    
    // 2. 바닥 격자 그리드 추가
    roomGridHelper = new THREE.GridHelper(Math.max(w, d) * 1.5, 50, 0x6366f1, 0x334155);
    roomGridHelper.position.y = 1; // 바닥면 살짝 위
    scene.add(roomGridHelper);
    
    // 3. 투명도 있는 룸 외각 벽체박스 생성 (가구 설치 경계를 직관적으로 보여주기 위함)
    // 뒤벽(z = -d/2), 바닥(y=0), 좌벽(x = -w/2), 우벽(x = w/2)
    // 사용자 시야 차단을 막기 위해 프레임 와이어와 반투명한 뒤쪽 벽면만 생성
    const wallGroup = new THREE.Group();
    
    const wallMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide
    });
    
    // 뒤쪽 메인 벽 (가구들이 주로 기대어 정렬되는 벽)
    const backWallGeo = new THREE.PlaneGeometry(w, h);
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.set(0, h/2, -d/2);
    wallGroup.add(backWall);
    
    // 뒤벽 가이드 테두리 헬퍼
    const backEdges = new THREE.EdgesGeometry(backWallGeo);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x475569, linewidth: 2 });
    const backLine = new THREE.LineSegments(backEdges, lineMat);
    backLine.position.copy(backWall.position);
    wallGroup.add(backLine);
    
    // 바닥 테두리 헬퍼
    const floorEdges = new THREE.EdgesGeometry(floorGeo);
    const floorLine = new THREE.LineSegments(floorEdges, lineMat);
    floorLine.rotation.x = Math.PI/2;
    floorLine.position.set(0, 0, 0);
    wallGroup.add(floorLine);
    
    roomWallsMesh = wallGroup;
    scene.add(roomWallsMesh);
    
    // 카메라 바라보는 타겟 중심 조정
    state.three.controls.target.set(0, h/3, 0);
}

// 3D 가구 렌더링 업데이트
function update3DScene() {
    const scene = state.three.scene;
    if (!scene) return;
    
    // 도면 스타일(TechStyle) 또는 내보내기/인쇄 모드 일 때 흰색 바탕 적용
    if (state.three.techStyle || state.isExporting) {
        scene.background = new THREE.Color(0xffffff); // 내보내기/인쇄 시는 완전한 흰색
        if (roomGridHelper) roomGridHelper.visible = false;
        if (roomWallsMesh) roomWallsMesh.visible = false; // 투명 벽체 감춤
        if (roomFloorMesh) roomFloorMesh.visible = false; // 바닥 메쉬도 감추어 순백 바탕에 가구만 노출
    } else {
        scene.background = new THREE.Color(state.currentTab === 'wireframe' ? 0xffffff : 0x0b0f19); // 와이어프레임은 출력용 흰 배경
        if (roomGridHelper) roomGridHelper.visible = true;
        if (roomWallsMesh) roomWallsMesh.visible = true;
        if (roomFloorMesh) roomFloorMesh.visible = true;
    }
    
    const group = state.three.cabinetsGroup;
    if (!group) return;
    
    // 기존 배치 가구 3D 메쉬 전면 비우기
    while(group.children.length > 0) {
        const obj = group.children[0];
        group.remove(obj);
    }
    
    // 가구 데이터를 바탕으로 디테일 3D 메쉬 재생성
    state.cabinets.forEach(cab => {
        const cabMesh = createCabinet3DMesh(cab);
        group.add(cabMesh);
    });

    // 2D 와이어프레임은 재질 색상과 선택 강조를 모두 제거하고
    // 흰 바탕 + 검정 외곽선으로 통일한다.
    if (state.currentTab === 'wireframe') applyPureWireframeStyle();
}

function createFridgeInstallation3D(cab) {
    migrateFridgeCabinet(cab);
    const group=new THREE.Group(); group.name=cab.id;
    const W=cab.w,D=cab.d,H=cab.h,T=cab.t,totalH=state.room.height,upperY=totalH-H;
    const mat=state.three.techStyle?new THREE.MeshBasicMaterial({color:0xffffff,wireframe:state.three.wireframe}):new THREE.MeshStandardMaterial({color:new THREE.Color(cab.color),roughness:.7,metalness:.05,wireframe:state.three.wireframe});
    const doorMat=state.three.techStyle?new THREE.MeshBasicMaterial({color:0xffffff}):new THREE.MeshStandardMaterial({color:new THREE.Color(cab.color),roughness:.55});
    const add=(geo,x,y,z,m=mat)=>{const mesh=new THREE.Mesh(geo,m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;};
    // 좌·우 EP: 바닥에서 천장까지
    const leftEP=add(new THREE.BoxGeometry(T,totalH,D),T/2,totalH/2,0);
    add(new THREE.BoxGeometry(T,totalH,D),W-T/2,totalH/2,0);
    // 상부장 몸통
    add(new THREE.BoxGeometry(W-2*T,T,D),W/2,upperY+T/2,0);
    add(new THREE.BoxGeometry(W-2*T,T,D),W/2,totalH-T/2,0);
    add(new THREE.BoxGeometry(T,H,D),T/2,upperY+H/2,0);
    add(new THREE.BoxGeometry(T,H,D),W-T/2,upperY+H/2,0);
    add(new THREE.BoxGeometry(W-2*T,H-2*T,3),W/2,upperY+H/2,-D/2+2);
    // 플립업 도어: 2D 와이어프레임에서는 내부 구조 확인을 위해 숨김
    if (state.currentTab !== 'wireframe') {
        const doorT=18, doorGroup=new THREE.Group();
        doorGroup.position.set(W/2,totalH-T,D/2+doorT/2);
        const door= new THREE.Mesh(new THREE.BoxGeometry(W-4,H-4,doorT),doorMat);
        door.position.set(0,-(H-4)/2,0); door.castShadow=true; doorGroup.add(door);
        if(state.three.doorsOpen) doorGroup.rotation.x=-Math.PI/2.5;
        group.add(doorGroup);
    }
    if(cab.id===state.selectedId) group.add(new THREE.BoxHelper(leftEP,0x818cf8));
    const rotated=getCabinetRotatedDims(cab),rad=-(Number(cab.rotation||0)*Math.PI)/180;
    [...group.children].forEach(ch=>{ch.position.x-=W/2;ch.position.z-=D/2;});
    group.rotation.y=rad;
    group.position.set(-state.room.width/2+cab.x+rotated.w/2,0,-state.room.depth/2+cab.y+rotated.d/2);
    group.userData.cabinetId=cab.id; group.traverse(o=>o.userData.cabinetId=cab.id);
    const outlineColor=(state.three.techStyle||state.isExporting)?0x000000:0x475569;
    group.traverse(child=>{if(child.isMesh&&child.geometry){const edges=new THREE.EdgesGeometry(child.geometry);child.add(new THREE.LineSegments(edges,new THREE.LineBasicMaterial({color:outlineColor})));}});
    return group;
}

// 핵심 함수: 가구 규격(T, 우라홈 등) 물리적 보드를 반영한 캐비닛 조립 메쉬 생성
function createCabinet3DMesh(cab) {
    if (cab.type === 'fridge') return createFridgeInstallation3D(cab);
    const cabGroup = new THREE.Group();
    cabGroup.name = cab.id;
    
    const W = cab.w;
    const H = cab.h;
    const D = cab.d;
    const T = cab.t;
    // 하부 지지대 높이 연산 (하부장 전용 다릿발/좌대)
    if (cab.supportType === undefined) {
        cab.supportType = cab.kickplate > 0 ? 'plinth' : 'none';
        cab.plinthHeight = cab.kickplate || 100;
        cab.plinthSetback = 40;
        cab.legType = 'plastic';
        cab.legHeight = 100;
    }
    const kick = cab.supportType === 'none' ? 0 : (cab.supportType === 'legs' ? cab.legHeight : cab.plinthHeight);
    
    // 기본 목재 및 엣지 색상 조율
    const baseColor = new THREE.Color(cab.color);
    
    let woodMat, backboardMat, metalMat;
    if (state.three.techStyle) {
        // 도면 스타일: 그림자 및 광택 배제한 순백색 채우기
        woodMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: state.three.wireframe });
        backboardMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: state.three.wireframe });
        metalMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
    } else {
        // 일반 렌더링 스타일
        woodMat = new THREE.MeshStandardMaterial({
            color: baseColor,
            roughness: 0.7,
            metalness: 0.1,
            wireframe: state.three.wireframe
        });
        backboardMat = new THREE.MeshStandardMaterial({
            color: 0xd1d5db,
            roughness: 0.9,
            metalness: 0.05,
            wireframe: state.three.wireframe
        });
        metalMat = new THREE.MeshStandardMaterial({
            color: 0xbac2cb,
            roughness: 0.2,
            metalness: 0.8
        });
    }
    
    // 1. 좌측 측판 (Left Panel)
    // 크기: T(가로), H - kick(높이), D(깊이)
    // 위치: x = T/2, y = kick + (H-kick)/2, z = 0 (로컬 좌표 중심 기준)
    const sideH = H - kick;
    const leftPanel = new THREE.Mesh(new THREE.BoxGeometry(T, sideH, D), woodMat);
    leftPanel.position.set(T/2, kick + sideH/2, 0);
    leftPanel.castShadow = true;
    leftPanel.receiveShadow = true;
    cabGroup.add(leftPanel);
    
    // 2. 우측 측판 (Right Panel)
    const rightPanel = new THREE.Mesh(new THREE.BoxGeometry(T, sideH, D), woodMat);
    rightPanel.position.set(W - T/2, kick + sideH/2, 0);
    rightPanel.castShadow = true;
    rightPanel.receiveShadow = true;
    cabGroup.add(rightPanel);
    
    // 3. 밑판/지판 (Bottom Panel)
    // 크기: W - 2T, T, D
    // 위치: x = W/2, y = kick + T/2, z = 0
    // 우라홈이 있으면 깊이 가공 처리를 해야하나 비주얼적으로 판 안쪽에 위치하도록 렌더
    let bottomD = D;
    let bottomZ = 0;
    if (cab.groove) {
        // 우라홈이 적용되면 뒷판 두께(약 3mm) 및 뒷여유(grooveOffset) 만큼 밑판 깊이가 줄어듦
        bottomD = D - cab.grooveOffset - 3;
        bottomZ = (cab.grooveOffset + 3) / 2; // 앞으로 이동
    }
    const bottomPanel = new THREE.Mesh(new THREE.BoxGeometry(W - T*2, T, bottomD), woodMat);
    bottomPanel.position.set(W/2, kick + T/2, bottomZ);
    bottomPanel.castShadow = true;
    bottomPanel.receiveShadow = true;
    cabGroup.add(bottomPanel);
    
    // 4. 천판/천정판 (Top Panel)
    // 상부장 혹은 키큰장/옷장은 전체 덮는 천판이고, 하부 싱크대는 보통 뼈대용 보강목(스트레쳐) 2개로 고정
    const isBaseKitchen = (cab.type||'').startsWith('sink_base') || cab.type === 'island';
    
    if (isBaseKitchen) {
        // 싱크대 하부장은 보통 상단 앞/뒤에 가로로 얇은 찬넬/보강목만 들어감 (W-2T, T, 60)
        const frontStretcher = new THREE.Mesh(new THREE.BoxGeometry(W - T*2, T, 60), woodMat);
        frontStretcher.position.set(W/2, H - T/2, D/2 - 30);
        cabGroup.add(frontStretcher);
        
        const backStretcher = new THREE.Mesh(new THREE.BoxGeometry(W - T*2, T, 60), woodMat);
        // 뒷판 홈 깊이를 제외한 위치에 보강목 배치
        const backStretcherZ = cab.groove ? -D/2 + cab.grooveOffset + 30 : -D/2 + 30;
        backStretcher.position.set(W/2, H - T/2, backStretcherZ);
        cabGroup.add(backStretcher);
    } else {
        // 상부장, 신발장, 키큰장 등은 전체 천판 적용
        const topPanel = new THREE.Mesh(new THREE.BoxGeometry(W - T*2, T, bottomD), woodMat);
        topPanel.position.set(W/2, H - T/2, bottomZ);
        topPanel.castShadow = true;
        topPanel.receiveShadow = true;
        cabGroup.add(topPanel);
    }
    
    // 5. 하부 지지 구조 (걸레받이/좌대 또는 다릿발)
    if (cab.supportType === 'plinth' && kick > 0) {
        // 전면에서 plinthSetback 만큼 뒤로 밀착 고정된 좌대 박스
        const plinthD = D - cab.plinthSetback;
        const kickMesh = new THREE.Mesh(new THREE.BoxGeometry(W, kick, plinthD), woodMat);
        kickMesh.position.set(W/2, kick/2, -cab.plinthSetback/2);
        kickMesh.castShadow = true;
        kickMesh.receiveShadow = true;
        cabGroup.add(kickMesh);
    } else if (cab.supportType === 'legs' && kick > 0) {
        // 4개의 지지 다릿발 생성
        let legGeo, legMat;
        if (cab.legType === 'plastic') {
            // 플라스틱 조절발: 어두운 회색 실린더형
            legGeo = new THREE.CylinderGeometry(15, 20, kick, 16);
            legMat = state.three.techStyle ? 
                new THREE.MeshBasicMaterial({ color: 0xffffff }) :
                new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.9, metalness: 0.1 });
        } else if (cab.legType === 'steel_round') {
            // 원형 철제 조절발: 은색 실린더형
            legGeo = new THREE.CylinderGeometry(18, 18, kick, 16);
            legMat = state.three.techStyle ?
                new THREE.MeshBasicMaterial({ color: 0xffffff }) :
                new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.2, metalness: 0.8 });
        } else if (cab.legType === 'steel_square') {
            // 사각 블랙 조절발: 검은색 박스형
            legGeo = new THREE.BoxGeometry(30, kick, 30);
            legMat = state.three.techStyle ?
                new THREE.MeshBasicMaterial({ color: 0xffffff }) :
                new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.4, metalness: 0.6 });
        } else {
            // 원목 경사발: 약간 기울어진 밝은 나무색 실린더형
            legGeo = new THREE.CylinderGeometry(12, 22, kick, 16);
            legMat = state.three.techStyle ?
                new THREE.MeshBasicMaterial({ color: 0xffffff }) :
                new THREE.MeshStandardMaterial({ color: 0xd7ccc8, roughness: 0.6, metalness: 0.1 });
        }
        
        const legPositions = [
            [45, D/2 - 45],
            [W - 45, D/2 - 45],
            [45, -D/2 + 45],
            [W - 45, -D/2 + 45]
        ];
        legPositions.forEach(([lx, lz]) => {
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.set(lx, kick/2, lz);
            leg.castShadow = true;
            leg.receiveShadow = true;
            cabGroup.add(leg);
        });
    }
    
    // 6. 뒷판/우라판 (Backboard)
    // 우라홈 설정 유무에 따라 조립 깊이 조정
    if (cab.groove) {
        // 우라홈이 적용되면 좌우측판 안쪽 홈(grooveDepth: 9mm)에 끼워지므로 너비가 W - 2T + 2*depth 가 됨
        const backW = W - T*2 + cab.grooveDepth * 2;
        const backH = H - kick - T*2 + cab.grooveDepth * 2; // 상하 지판 홈 결합 가정
        const backT = 3; // 뒷판 두께 보통 3T 합판
        const backZ = -D/2 + cab.grooveOffset; // 뒤쪽에서 띄움
        
        const backboard = new THREE.Mesh(new THREE.BoxGeometry(backW, backH, backT), backboardMat);
        // 위치 센터 보정 (Y축 높이 보정)
        backboard.position.set(W/2, kick + T + (H - kick - T*2)/2, backZ);
        cabGroup.add(backboard);
    } else {
        // 우라홈 미적용시 맨 뒤에 바로 피스 고정형태 (W, H - kick, 3)
        const backT = 3;
        const backboard = new THREE.Mesh(new THREE.BoxGeometry(W - T*2, H - kick, backT), backboardMat);
        backboard.position.set(W/2, kick + sideH/2, -D/2 + backT/2);
        cabGroup.add(backboard);
    }
    
    // 7. 내부 구성 v0.5 (가로 분할 통 + 통별 세로 분할)
    const rows3D=ensureCabinetRows(cab),innerBottomY=kick+T,innerTopY=H-T,usableInnerH=Math.max(0,innerTopY-innerBottomY),totalRowsH=rows3D.reduce((s,r)=>s+Number(r.height||0),0)||1,availableRowsH=Math.max(0,usableInnerH-T*Math.max(0,rows3D.length-1));let rowCursorY=innerBottomY;
    rows3D.forEach((row,rowIndex)=>{
        const rowH3D=availableRowsH*(row.height/totalRowsH);
        if(rowIndex>0){const horizontalPanel=new THREE.Mesh(new THREE.BoxGeometry(W-T*2,T,Math.max(40,bottomD)),woodMat);horizontalPanel.position.set(W/2,rowCursorY+T/2,bottomZ);horizontalPanel.castShadow=true;horizontalPanel.receiveShadow=true;cabGroup.add(horizontalPanel);rowCursorY+=T;}
        const columns=row.columns,totalColW=columns.reduce((s,c)=>s+Number(c.width||0),0)||1,availableColW=Math.max(0,W-T*2-T*Math.max(0,columns.length-1));let colCursor=T;
        columns.forEach((column,colIndex)=>{const colW=availableColW*(column.width/totalColW);if(colIndex>0){const partition=new THREE.Mesh(new THREE.BoxGeometry(T,rowH3D,Math.max(40,bottomD)),woodMat);partition.position.set(colCursor-T/2,rowCursorY+rowH3D/2,bottomZ);partition.castShadow=true;cabGroup.add(partition);}const secTotal=column.sections.reduce((s,x)=>s+Number(x.height||0),0)||1;let sy=rowCursorY;column.sections.forEach((section,index)=>{const sh=rowH3D*(section.height/secTotal),top=sy+sh;if(index<column.sections.length-1){const shelf=new THREE.Mesh(new THREE.BoxGeometry(Math.max(20,colW),T,Math.max(40,bottomD-20)),woodMat);shelf.position.set(colCursor+colW/2,top-T/2,bottomZ+10);shelf.castShadow=true;cabGroup.add(shelf);}if(section.type==='hanger'){const rod=new THREE.Mesh(new THREE.CylinderGeometry(10,10,Math.max(40,colW-60),16),metalMat);rod.rotation.z=Math.PI/2;rod.position.set(colCursor+colW/2,top-Math.min(120,sh*.2),D/2-70);cabGroup.add(rod);}else if(section.type==='drawer'){const count=Math.max(1,Math.min(6,Number(section.drawers)||2)),dh=sh/count;for(let di=0;di<count;di++){const front=new THREE.Mesh(new THREE.BoxGeometry(Math.max(20,colW-8),Math.max(30,dh-5),18),woodMat);front.position.set(colCursor+colW/2,sy+dh*di+dh/2,D/2+9);front.castShadow=true;cabGroup.add(front);}}else if(section.type==='umbrella'){const th=Math.min(120,sh*.25),tray=new THREE.Mesh(new THREE.BoxGeometry(Math.max(30,colW-30),th,Math.max(80,D-120)),woodMat);tray.position.set(colCursor+colW/2,sy+th/2,D/2-70);cabGroup.add(tray);}sy=top;});colCursor+=colW+T;});rowCursorY+=rowH3D;
    });

    // 8. 밥통장/전자렌지장 특수 틈새 니치 및 악세서리 구현 (WOW 포인트)
    if (cab.hasNiche) {
        // 키큰장의 허리높이(약 800~1400)에 오픈 공간 생성
        const nicheStart = 850;
        const nicheEnd = 1350;
        const nicheH = nicheEnd - nicheStart;
        
        // 오픈 니치를 위해 측판 내부 보드 보강 (디테일)
        // 니치 하판
        const nicheBottom = new THREE.Mesh(new THREE.BoxGeometry(W - T*2, T, D - 20), woodMat);
        nicheBottom.position.set(W/2, nicheStart - T/2, 10);
        cabGroup.add(nicheBottom);
        
        // 니치 상판
        const nicheTop = new THREE.Mesh(new THREE.BoxGeometry(W - T*2, T, D - 20), woodMat);
        nicheTop.position.set(W/2, nicheEnd + T/2, 10);
        cabGroup.add(nicheTop);
        
        // 전자렌지/밥솥 간단 입체 소품 배치
        if (cab.nicheType === 'microwave') {
            const microGeo = new THREE.BoxGeometry(W - T*4, nicheH - 80, D - 100);
            const microMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.2, metalness: 0.9 });
            const microwave = new THREE.Mesh(microGeo, microMat);
            microwave.position.set(W/2, nicheStart + nicheH/2, 20);
            cabGroup.add(microwave);
        } else if (cab.nicheType === 'cooker') {
            // 밥솥용 인출식 슬라이드 레일판
            const slidePlate = new THREE.Mesh(new THREE.BoxGeometry(W - T*2 - 8, 15, D - 40), woodMat);
            // 도어 개폐 켜질 시 인출판이 앞으로 슥 밀려나오게 애니메이션 표현 연동! (WOW!)
            const slideOutOffset = state.three.doorsOpen ? 250 : 0;
            slidePlate.position.set(W/2, nicheStart + 15, 10 + slideOutOffset);
            cabGroup.add(slidePlate);
            
            // 밥솥 모양 실린더 소품
            const cookerGeo = new THREE.CylinderGeometry((W - T*4)/3, (W - T*4)/3, nicheH - 120, 16);
            const cooker = new THREE.Mesh(cookerGeo, metalMat);
            cooker.position.set(W/2, nicheStart + 30 + (nicheH - 120)/2, 10 + slideOutOffset);
            cabGroup.add(cooker);
        }
    }
    
    // 9. 싱크대 하부장 전용 싱크볼(상판 타공 및 메탈 볼) 3D 표현
    if ((cab.type || '').startsWith('sink_base')) {
        // 인조대리석 상판 (W, 40, D+10)
        const counterMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4, metalness: 0.1 });
        const countertop = new THREE.Mesh(new THREE.BoxGeometry(W + 4, 40, D + 15), counterMat);
        countertop.position.set(W/2, H + 20, 7.5);
        countertop.castShadow = true;
        countertop.receiveShadow = true;
        cabGroup.add(countertop);
        
        const appliance = getSinkApplianceType(cab);
        if (appliance === 'sink') {
            const sinkBowl = new THREE.Mesh(new THREE.BoxGeometry(W * 0.7, 5, D * 0.6), metalMat);
            sinkBowl.position.set(W/2, H + 40.5, 0);
            cabGroup.add(sinkBowl);
            const faucetGroup = new THREE.Group();
            const pipeVertical = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 120, 8), metalMat);
            pipeVertical.position.set(0, 60, 0);
            faucetGroup.add(pipeVertical);
            const pipeHorizontal = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 80, 8), metalMat);
            pipeHorizontal.rotation.x = Math.PI / 2;
            pipeHorizontal.position.set(0, 120, 30);
            faucetGroup.add(pipeHorizontal);
            faucetGroup.position.set(W/2, H + 40, -D*0.3);
            cabGroup.add(faucetGroup);
        } else if (['range','cooktop','induction'].includes(appliance)) {
            const topMat = new THREE.MeshStandardMaterial({ color: appliance === 'induction' ? 0x111827 : 0x2f3742, roughness: 0.25 });
            const plate = new THREE.Mesh(new THREE.BoxGeometry(W * 0.72, 8, D * 0.58), topMat);
            plate.position.set(W/2, H + 44, 0);
            cabGroup.add(plate);
            for (let i=0;i<4;i++) {
                const ring = new THREE.Mesh(new THREE.TorusGeometry(Math.min(W,D)*0.07, 3, 8, 24), metalMat);
                ring.rotation.x = Math.PI/2;
                ring.position.set(W/2 + (i%2 ? 1 : -1)*W*0.16, H+49, (i<2 ? -1 : 1)*D*0.14);
                cabGroup.add(ring);
            }
            if (appliance === 'range') {
                const grateMat = new THREE.MeshStandardMaterial({ color: 0x0b0f14, roughness: 0.7 });
                for (const sx of [-1,1]) {
                    const grate = new THREE.Mesh(new THREE.BoxGeometry(W*0.26, 5, D*0.05), grateMat);
                    grate.position.set(W/2 + sx*W*0.15, H+54, 0);
                    cabGroup.add(grate);
                }
            }
        } else if (appliance === 'dishwasher') {
            const applianceMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.35, metalness: 0.55 });
            const front = new THREE.Mesh(new THREE.BoxGeometry(Math.max(80,W-T*2-12), Math.max(120,H-kick-T-18), 24), applianceMat);
            front.position.set(W/2, kick+(H-kick)/2, D/2+14);
            cabGroup.add(front);
            const control = new THREE.Mesh(new THREE.BoxGeometry(Math.max(60,W-T*2-45), 42, 8), new THREE.MeshStandardMaterial({color:0x1f2937,roughness:0.35}));
            control.position.set(W/2,H-48,D/2+30); cabGroup.add(control);
            const handle = new THREE.Mesh(new THREE.BoxGeometry(W*0.55,12,15),metalMat);
            handle.position.set(W/2,H-92,D/2+35); cabGroup.add(handle);
        } else if (appliance === 'washer') {
            const applianceMat = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.3, metalness: 0.15 });
            const front = new THREE.Mesh(new THREE.BoxGeometry(Math.max(80,W-T*2-12), Math.max(120,H-kick-T-18), 24), applianceMat);
            front.position.set(W/2, kick+(H-kick)/2, D/2+14); cabGroup.add(front);
            const rim = new THREE.Mesh(new THREE.TorusGeometry(Math.min(W,H)*0.22,18,12,48), new THREE.MeshStandardMaterial({color:0x374151,metalness:0.7,roughness:0.25}));
            rim.position.set(W/2,kick+(H-kick)*0.46,D/2+34); cabGroup.add(rim);
            const glass = new THREE.Mesh(new THREE.CircleGeometry(Math.min(W,H)*0.18,48),new THREE.MeshStandardMaterial({color:0x0f172a,transparent:true,opacity:0.78,roughness:0.1}));
            glass.position.set(W/2,kick+(H-kick)*0.46,D/2+35); cabGroup.add(glass);
            const controls = new THREE.Mesh(new THREE.BoxGeometry(W*0.65,45,8),new THREE.MeshStandardMaterial({color:0xf8fafc}));
            controls.position.set(W/2,H-48,D/2+30); cabGroup.add(controls);
        } else if (appliance === 'robot') {
            const nicheMat = new THREE.MeshStandardMaterial({color:0x111827,roughness:0.75});
            const nicheBack = new THREE.Mesh(new THREE.BoxGeometry(Math.max(80,W-T*2-24),240,10),nicheMat);
            nicheBack.position.set(W/2,kick+120,-D/2+25); cabGroup.add(nicheBack);
            const robot = new THREE.Mesh(new THREE.CylinderGeometry(Math.min(W,D)*0.23,Math.min(W,D)*0.23,70,40),new THREE.MeshStandardMaterial({color:0x202833,roughness:0.35,metalness:0.3}));
            robot.position.set(W/2,kick+38,D/2-145); cabGroup.add(robot);
        }
    }
    
    // 10. 도어 및 서랍 프런트 판재 렌더링 (도어 회전 경첩 애니메이션 축 연동 포함)
    const doorT = 18;
    const openAngle = state.three.doorsOpen ? Math.PI / 2.3 : 0; // 문 열릴 때 약 80도 회전
    
    // 찬넬 가공 높이 계산
    let chH = 0;
    if (cab.handleType === 'mok_channel') chH = 30;
    else if (cab.handleType === 'c_channel') chH = 35;
    
    // 3D 손잡이 모델 생성 헬퍼 함수
    function attach3DHandle(parentMesh, hx, hy, hz, align) {
        if (cab.handleType === 'none' || cab.handleType === 'mok_channel' || cab.handleType === 'c_channel' || cab.handleType === 'smart_bar') {
            return;
        }
        
        let handleMesh;
        if (cab.handleType === 'button') {
            const group = new THREE.Group();
            const base = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 8, 8), metalMat);
            base.rotation.x = Math.PI / 2;
            base.position.set(0, 0, 4);
            const ball = new THREE.Mesh(new THREE.SphereGeometry(6, 8, 8), metalMat);
            ball.position.set(0, 0, 8);
            group.add(base, ball);
            handleMesh = group;
        } else if (cab.handleType === 'cup') {
            const cap = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 6, 8, 1, false, 0, Math.PI), metalMat);
            cap.rotation.y = Math.PI / 2;
            cap.rotation.z = Math.PI / 2;
            cap.position.set(0, 0, 5);
            handleMesh = cap;
        } else if (cab.handleType === 'bar_horizontal') {
            const group = new THREE.Group();
            const bar = new THREE.Mesh(new THREE.BoxGeometry(80, 8, 8), metalMat);
            bar.position.set(0, 0, 10);
            const postL = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 10), metalMat);
            postL.position.set(-25, 0, 5);
            const postR = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 10), metalMat);
            postR.position.set(25, 0, 5);
            group.add(bar, postL, postR);
            handleMesh = group;
        } else {
            // 기본/세로 바형
            const group = new THREE.Group();
            const bar = new THREE.Mesh(new THREE.BoxGeometry(8, 100, 8), metalMat);
            bar.position.set(0, 0, 10);
            const postT = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 10), metalMat);
            postT.position.set(0, 35, 5);
            const postB = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 10), metalMat);
            postB.position.set(0, -35, 5);
            group.add(bar, postT, postB);
            handleMesh = group;
        }
        
        handleMesh.position.set(hx, hy, hz);
        parentMesh.add(handleMesh);
    }
    
    if (state.currentTab !== 'wireframe' && (cab.doorType === 'swing_double' || cab.doorType === 'swing_single_left' || cab.doorType === 'swing_single_right')) {
        const doorH = H - kick - T*2 - chH - 6; // 천/지판 두께 및 찬넬 높이 제외
        const doorY = kick + T + doorH/2;
        
        // 3D 상부 찬넬 보강대 생성
        if (chH > 0) {
            const chanMat = cab.handleType === 'mok_channel' ? woodMat : metalMat;
            const chanMesh = new THREE.Mesh(new THREE.BoxGeometry(W - T*2, chH, 20), chanMat);
            chanMesh.position.set(W/2, H - T - chH/2, D/2 - T/2 - 10);
            chanMesh.castShadow = true;
            cabGroup.add(chanMesh);
        }
        
        if (cab.doorType === 'swing_double') {
            const singleDoorW = (W - 4) / 2;
            
            // 좌측 도어
            const leftDoorGroup = new THREE.Group();
            leftDoorGroup.position.set(0, doorY, D/2 + doorT/2);
            
            const leftDoorMesh = new THREE.Mesh(new THREE.BoxGeometry(singleDoorW, doorH, doorT), woodMat);
            leftDoorMesh.position.set(singleDoorW/2, 0, 0);
            leftDoorMesh.castShadow = true;
            leftDoorGroup.add(leftDoorMesh);
            
            // 스마트바 적용
            if (cab.handleType === 'smart_bar') {
                const sBar = new THREE.Mesh(new THREE.BoxGeometry(singleDoorW, 8, doorT + 2), metalMat);
                sBar.position.set(0, doorH/2 - 4, 1);
                leftDoorMesh.add(sBar);
            }
            
            attach3DHandle(leftDoorMesh, singleDoorW/2 - 15, 0, doorT/2);
            
            leftDoorGroup.rotation.y = -openAngle;
            cabGroup.add(leftDoorGroup);
            
            // 우측 도어
            const rightDoorGroup = new THREE.Group();
            rightDoorGroup.position.set(W, doorY, D/2 + doorT/2);
            
            const rightDoorMesh = new THREE.Mesh(new THREE.BoxGeometry(singleDoorW, doorH, doorT), woodMat);
            rightDoorMesh.position.set(-singleDoorW/2, 0, 0);
            rightDoorMesh.castShadow = true;
            rightDoorGroup.add(rightDoorMesh);
            
            // 스마트바 적용
            if (cab.handleType === 'smart_bar') {
                const sBar = new THREE.Mesh(new THREE.BoxGeometry(singleDoorW, 8, doorT + 2), metalMat);
                sBar.position.set(0, doorH/2 - 4, 1);
                rightDoorMesh.add(sBar);
            }
            
            attach3DHandle(rightDoorMesh, -singleDoorW/2 + 15, 0, doorT/2);
            
            rightDoorGroup.rotation.y = openAngle;
            cabGroup.add(rightDoorGroup);
            
        } else if (cab.doorType === 'swing_single_left') {
            const doorGroup = new THREE.Group();
            doorGroup.position.set(0, doorY, D/2 + doorT/2);
            
            const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(W - 4, doorH, doorT), woodMat);
            doorMesh.position.set(W/2, 0, 0);
            doorMesh.castShadow = true;
            doorGroup.add(doorMesh);
            
            if (cab.handleType === 'smart_bar') {
                const sBar = new THREE.Mesh(new THREE.BoxGeometry(W - 4, 8, doorT + 2), metalMat);
                sBar.position.set(0, doorH/2 - 4, 1);
                doorMesh.add(sBar);
            }
            
            attach3DHandle(doorMesh, W/2 - 20, 0, doorT/2);
            
            doorGroup.rotation.y = -openAngle;
            cabGroup.add(doorGroup);
            
        } else if (cab.doorType === 'swing_single_right') {
            const doorGroup = new THREE.Group();
            doorGroup.position.set(W, doorY, D/2 + doorT/2);
            
            const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(W - 4, doorH, doorT), woodMat);
            doorMesh.position.set(-W/2, 0, 0);
            doorMesh.castShadow = true;
            doorGroup.add(doorMesh);
            
            if (cab.handleType === 'smart_bar') {
                const sBar = new THREE.Mesh(new THREE.BoxGeometry(W - 4, 8, doorT + 2), metalMat);
                sBar.position.set(0, doorH/2 - 4, 1);
                doorMesh.add(sBar);
            }
            
            attach3DHandle(doorMesh, -W/2 + 20, 0, doorT/2);
            
            doorGroup.rotation.y = openAngle;
            cabGroup.add(doorGroup);
        }
        
    } else if (state.currentTab !== 'wireframe' && cab.doorType === 'sliding') {
        const doorH = H - kick - T*2 - 6;
        const doorY = kick + T + doorH/2;
        const slideW = (W + 20) / 2;
        const openSlideOffset = state.three.doorsOpen ? slideW - 50 : 0;
        
        const doorBack = new THREE.Mesh(new THREE.BoxGeometry(slideW, doorH - 4, doorT - 4), woodMat);
        doorBack.position.set(slideW/2 + openSlideOffset, doorY, D/2 + doorT/2 - 4);
        doorBack.castShadow = true;
        cabGroup.add(doorBack);
        
        const doorFront = new THREE.Mesh(new THREE.BoxGeometry(slideW, doorH - 4, doorT - 4), woodMat);
        doorFront.position.set(W - slideW/2 - openSlideOffset, doorY, D/2 + doorT*1.5);
        doorFront.castShadow = true;
        
        const handleCut = new THREE.Mesh(new THREE.BoxGeometry(15, 60, 4), metalMat);
        handleCut.position.set(-slideW/2 + 30, 0, doorT/2 - 1);
        doorFront.add(handleCut);
        cabGroup.add(doorFront);
        
    } else if (state.currentTab !== 'wireframe' && (cab.doorType === 'drawer_2' || cab.doorType === 'drawer_3')) {
        const N = cab.doorType === 'drawer_2' ? 2 : 3;
        const innerCarcassH = H - kick - T*2;
        const drawH = (innerCarcassH - chH * N) / N;
        const drawerOut = state.three.doorsOpen ? 150 : 0;
        
        for (let i = 0; i < N; i++) {
            const yChan = kick + T + i * (drawH + chH);
            
            // 3D 찬넬 보강대 생성
            if (chH > 0) {
                const chanMat = cab.handleType === 'mok_channel' ? woodMat : metalMat;
                const chanMesh = new THREE.Mesh(new THREE.BoxGeometry(W - T*2, chH, 20), chanMat);
                chanMesh.position.set(W/2, yChan + chH/2, D/2 - T/2 - 10);
                chanMesh.castShadow = true;
                cabGroup.add(chanMesh);
            }
            
            const yFront = yChan + chH + drawH/2;
            const curOut = drawerOut > 0 ? drawerOut - (i * 30) : 0;
            
            const drawerFront = new THREE.Mesh(new THREE.BoxGeometry(W - 4, drawH - 2, doorT), woodMat);
            drawerFront.position.set(W/2, yFront, D/2 + doorT/2 + curOut);
            drawerFront.castShadow = true;
            
            // 스마트바 적용
            if (cab.handleType === 'smart_bar') {
                const sBar = new THREE.Mesh(new THREE.BoxGeometry(W - 4, 8, doorT + 2), metalMat);
                sBar.position.set(0, drawH/2 - 5, 1);
                drawerFront.add(sBar);
            }
            
            attach3DHandle(drawerFront, 0, 0, doorT/2);
            cabGroup.add(drawerFront);
        }
    }
    
    // 11. 만약 가구가 선택된 가구라면 노란색 바닥 윤곽선 데코 추가
    if (cab.id === state.selectedId) {
        const boxHelper = new THREE.BoxHelper(leftPanel, 0x818cf8);
        cabGroup.add(boxHelper);
    }
    
    // 12. 2D/3D 공통 좌표계 적용
    // cab.x, cab.y는 회전된 가구 경계박스의 좌측 상단 좌표이다.
    // 3D 그룹의 원점은 가구 중심이므로, 회전된 경계박스 중심을 그대로 사용한다.
    const roomW = state.room.width;
    const roomD = state.room.depth;
    const rotated = getCabinetRotatedDims(cab);
    const rad = -(Number(cab.rotation || 0) * Math.PI) / 180;

    // 0~W / 0~D로 제작된 모든 최상위 부재를 가구 중심 기준으로 이동
    [...cabGroup.children].forEach(child => {
        child.position.x -= W / 2;
        child.position.z -= D / 2;
    });

    cabGroup.rotation.y = rad;
    const centerX2D = Number(cab.x || 0) + rotated.w / 2;
    const centerY2D = Number(cab.y || 0) + rotated.d / 2;
    cabGroup.position.set(
        -roomW / 2 + centerX2D,
        Number(cab.z || 0),
        -roomD / 2 + centerY2D
    );

    // Raycaster가 어느 가구인지 즉시 찾을 수 있도록 루트와 모든 하위 객체에 ID 저장
    cabGroup.userData.cabinetId = cab.id;
    cabGroup.traverse(obj => { obj.userData.cabinetId = cab.id; });

    // 13. 모든 구성판재(Mesh)에 대해 외곽 실선(Edges) 테두리 생성 (도면 스타일화)
    const outlineColor = (state.three.techStyle || state.isExporting) ? 0x000000 : 0x475569;
    cabGroup.traverse(child => {
        if (child.isMesh && child.geometry) {
            // BoxHelper나 축 도면선 등은 제외
            if (child.constructor.name === 'Mesh') {
                const edges = new THREE.EdgesGeometry(child.geometry);
                const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: outlineColor }));
                line.name = "outline_line";
                child.add(line);
            }
        }
    });
    
    return cabGroup;
}

// ----------------------------------------------------
// 파일 로컬 저장 / 불러오기 / 이미지 내보내기 / 인쇄 기능
// ----------------------------------------------------

// 새 설계 초기화
function clearProject() {
    if (confirm('현재 설계중인 모든 내용이 삭제되고 초기화됩니다. 계속하시겠습니까?')) {
        pushHistory();
        state.cabinets = [];
        state.selectedId = null;
        
        // 룸 치수 초기값 복원
        state.room.width = 5000;
        state.room.depth = 4000;
        state.room.height = 2400;
        
        document.getElementById('room-width').value = 5000;
        document.getElementById('room-depth').value = 4000;
        document.getElementById('room-height').value = 2400;
        
        selectCabinet(null);
        updatePlacedList();
        update3DRoomGeometry();
        update3DScene();
        zoomToFit();
        
        showStatusMessage('프로젝트가 초기화되었습니다.');
    }
}

// 프로젝트 JSON 내보내기 (다운로드)
function saveProjectJSON() {
    const data = {
        room: state.room,
        cabinets: state.cabinets
    };
    
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    
    const now = new Date();
    const dateStr = now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') + '_' +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0');
    
    a.download = `가구도면설계_${dateStr}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    showStatusMessage('프로젝트 데이터(.json)가 저장되었습니다.');
}

// 프로젝트 JSON 로드 (파일 읽기)
function loadProjectJSON(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const data = JSON.parse(evt.target.result);
            if (data.room && Array.isArray(data.cabinets)) {
                pushHistory();
                state.room = data.room;
                state.cabinets = data.cabinets;
                state.cabinets.forEach(c => { migrateFridgeCabinet(c); ensureCabinetRows(c); });
                state.selectedId = null;
                
                // UI 갱신
                document.getElementById('room-width').value = state.room.width;
                document.getElementById('room-depth').value = state.room.depth;
                document.getElementById('room-height').value = state.room.height;
                
                selectCabinet(null);
                updatePlacedList();
                update3DRoomGeometry();
                update3DScene();
                zoomToFit();
                
                showStatusMessage('프로젝트 데이터를 정상적으로 불러왔습니다.');
            } else {
                alert('올바르지 않은 프로젝트 파일 형식입니다.');
            }
        } catch(err) {
            alert('파일을 해석하는 중 오류가 발생했습니다: ' + err.message);
        }
        
        // input 초기화
        e.target.value = '';
    };
    reader.readAsText(file);
}

// 캔버스 이미지 저장
function exportImage() {
    let imgUrl = '';
    let filename = '';
    
    // 선택 하이라이팅 없는 깔끔한 출력을 위해 임시로 선택 해제 및 내보내기 모드 전환
    const prevSelectedId = state.selectedId;
    state.selectedId = null;
    state.isExporting = true;
    
    if (state.currentTab === 'plan' || state.currentTab === 'elevation') {
        render2D();
        imgUrl = canvas2d.toDataURL('image/png');
        filename = state.currentTab === 'plan' ? '가구배치평면도.png' : '가구정면입면도.png';
    } else {
        update3DScene();
        state.three.renderer.render(state.three.scene, state.three.camera);
        imgUrl = state.three.renderer.domElement.toDataURL('image/png');
        filename = '가구배치3D도면.png';
    }
    
    // 복원
    state.selectedId = prevSelectedId;
    state.isExporting = false;
    
    if (state.currentTab === 'plan' || state.currentTab === 'elevation') {
        render2D();
    } else {
        update3DScene();
    }
    
    const a = document.createElement('a');
    a.href = imgUrl;
    a.download = filename;
    a.click();
    
    showStatusMessage('도면 이미지가 다운로드되었습니다.');
}

// 도면 데이터 생성 및 미리보기 영역 동기화
function getSelectedPrintViews() {
    const selected = [];
    const plan = document.getElementById('print-check-plan');
    const elevation = document.getElementById('print-check-elevation');
    const three = document.getElementById('print-check-3d');
    if (!plan || plan.checked) selected.push('plan');
    if (!elevation || elevation.checked) selected.push('elevation');
    if (!three || three.checked) selected.push('3d');
    return selected;
}

function capturePrintView(type) {
    const previousTab = state.currentTab;
    const previousSelected = state.selectedId;
    const previousExporting = state.isExporting;
    const savedPlan = { ...state.plan };
    const savedElevation = { ...state.elevation };
    let url = '';
    try {
        state.selectedId = null;
        state.isExporting = true;
        if (type === 'plan' || type === 'elevation') {
            state.currentTab = type;
            zoomToFit();
            render2D();
            url = canvas2d.toDataURL('image/png');
        } else {
            state.currentTab = '3d';
            update3DScene();
            state.three.renderer.render(state.three.scene, state.three.camera);
            url = state.three.renderer.domElement.toDataURL('image/png');
        }
    } finally {
        state.currentTab = previousTab;
        state.selectedId = previousSelected;
        state.isExporting = previousExporting;
        Object.assign(state.plan, savedPlan);
        Object.assign(state.elevation, savedElevation);
        if (previousTab === 'plan' || previousTab === 'elevation') render2D();
        else update3DScene();
    }
    return url;
}

function printViewTitle(type) {
    if (type === 'plan') return '2D 평면도 (TOP VIEW)';
    if (type === 'elevation') return '2D 입면·제작도 (ELEVATION / SHOP DRAWING)';
    return '3D 입체도 (3D VIEW)';
}

// 도면 데이터 생성 및 선택한 도면 미리보기/인쇄 영역 동기화
function generatePrintData() {
    const now = new Date();
    const dateStr = `${now.getFullYear()}. ${String(now.getMonth() + 1).padStart(2, '0')}. ${String(now.getDate()).padStart(2, '0')}`;
    const dimsStr = `${state.room.width} x ${state.room.depth} x ${state.room.height} mm`;
    document.getElementById('print-date').innerText = dateStr;
    document.getElementById('preview-date').innerText = dateStr;
    document.getElementById('print-room-dims').innerText = dimsStr;
    document.getElementById('preview-room-dims').innerText = dimsStr;
    const printTableChecked = !!document.getElementById('print-check-table')?.checked;
    const printTableSection = document.getElementById('print-table-section');
    const previewTableSection = document.getElementById('preview-table-section');
    if (printTableSection) printTableSection.classList.toggle('is-enabled', printTableChecked);
    if (previewTableSection) previewTableSection.classList.toggle('is-enabled', printTableChecked);

    let views = getSelectedPrintViews();
    if (views.length === 0) {
        const fallback = state.currentTab === '3d' ? '3d' : state.currentTab;
        views = [fallback];
    }
    const captures = views.map(type => ({ type, title: printViewTitle(type), url: capturePrintView(type) }));
    const makePages = (isPreview) => captures.map((item, index) => `
        <section class="print-view-page ${index > 0 ? 'print-page-break' : ''}">
            <div class="print-view-title">${item.title}</div>
            <div class="print-canvas-area"><img src="${item.url}" alt="${item.title}"></div>
        </section>`).join('');
    document.getElementById('print-view-pages').innerHTML = makePages(false);
    document.getElementById('preview-view-pages').innerHTML = makePages(true);

    const printTbody = document.querySelector('#print-cabinet-table tbody');
    const previewTbody = document.querySelector('#preview-cabinet-table tbody');
    printTbody.innerHTML = '';
    previewTbody.innerHTML = '';
    if (state.cabinets.length === 0) {
        const emptyRow = `<tr><td colspan="9" style="text-align:center;">배치된 가구가 없습니다.</td></tr>`;
        printTbody.innerHTML = emptyRow;
        previewTbody.innerHTML = emptyRow;
    } else {
        const summary = [];
        state.cabinets.forEach(cab => {
            const doorName = getDoorTypeNameKR(cab.doorType);
            const key = `${cab.name}_${cab.w}_${cab.d}_${cab.h}_${cab.t}_${cab.groove ? 'Y' : 'N'}_${doorName}`;
            const existing = summary.find(item => item.key === key);
            if (existing) existing.count++;
            else summary.push({ key, name: cab.name, w: cab.w, d: cab.d, h: cab.h, t: cab.t, groove: cab.groove ? '적용' : '미적용', door: doorName, count: 1 });
        });
        summary.forEach((item, index) => {
            const rowContent = `<td>${index + 1}</td><td><strong>${item.name}</strong></td><td>${item.w}</td><td>${item.d}</td><td>${item.h}</td><td>${item.t}T</td><td>${item.groove}</td><td>${item.door}</td><td><strong>${item.count}</strong></td>`;
            const trPrint = document.createElement('tr');
            const trPreview = document.createElement('tr');
            trPrint.innerHTML = rowContent;
            trPreview.innerHTML = rowContent;
            printTbody.appendChild(trPrint);
            previewTbody.appendChild(trPreview);
        });
    }
}

// 도면 인쇄 최적화 (레거시/래퍼용)
function printDrawing() {
    generatePrintData();
    window.print();
}

// 가구 도면 국문 표기 도우미
function getDoorTypeNameKR(type) {
    switch(type) {
        case 'none': return '오픈 (문없음)';
        case 'swing_double': return '여닫이 (양개)';
        case 'swing_single_left': return '여닫이 (좌경첩)';
        case 'swing_single_right': return '여닫이 (우경첩)';
        case 'sliding': return '슬라이딩';
        case 'drawer_2': return '2단 서랍';
        case 'drawer_3': return '3단 서랍';
        default: return '-';
    }
}

// 출력용 2D 와이어프레임 시각 스타일 통일
function applyPureWireframeStyle() {
    if (!state.three.scene || !state.three.cabinetsGroup) return;

    // 방, 바닥, 그리드는 출력 도면에서 제외한다.
    if (roomGridHelper) roomGridHelper.visible = false;
    if (roomWallsMesh) roomWallsMesh.visible = false;
    if (roomFloorMesh) roomFloorMesh.visible = false;

    // 은선 제거의 핵심:
    // 판재 면은 불투명한 흰색으로 유지하여 뒤쪽 선을 가리고,
    // 보이는 모서리만 검정 EdgesGeometry로 겹쳐 그린다.
    const faceMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: false,
        opacity: 1,
        depthTest: true,
        depthWrite: true,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1
    });
    const edgeMaterial = new THREE.LineBasicMaterial({
        color: 0x000000,
        transparent: false,
        opacity: 1,
        depthTest: true,
        depthWrite: false
    });

    state.three.cabinetsGroup.children.forEach(cabinetRoot => {
        cabinetRoot.updateMatrixWorld(true);
        const rootInverse = new THREE.Matrix4().copy(cabinetRoot.matrixWorld).invert();
        const sourceMeshes = [];
        const linesToRemove = [];

        cabinetRoot.traverse(obj => {
            if (obj.userData && obj.userData.hiddenLineEdge) {
                linesToRemove.push(obj);
                return;
            }
            if (obj.isMesh && obj.geometry) sourceMeshes.push(obj);
            else if (obj.isLine || obj.isLineSegments || obj.isBoxHelper || obj.type === 'BoxHelper') {
                linesToRemove.push(obj);
            }
        });

        // 기존 외곽선·선택 박스는 제거하여 중복선을 방지한다.
        linesToRemove.forEach(line => {
            if (line.parent) line.parent.remove(line);
            if (line.geometry && line.userData && line.userData.hiddenLineEdge) line.geometry.dispose();
            if (line.material && line.userData && line.userData.hiddenLineEdge) line.material.dispose();
        });

        sourceMeshes.forEach(mesh => {
            mesh.updateMatrixWorld(true);
            const relativeMatrix = new THREE.Matrix4().multiplyMatrices(rootInverse, mesh.matrixWorld);

            // 흰 면이 뒤쪽 모서리를 가리는 깊이 마스크 역할을 한다.
            mesh.visible = true;
            mesh.material = faceMaterial.clone();
            mesh.castShadow = false;
            mesh.receiveShadow = false;
            mesh.renderOrder = 1;

            const edgeGeometry = new THREE.EdgesGeometry(mesh.geometry, 20);
            edgeGeometry.applyMatrix4(relativeMatrix);
            const line = new THREE.LineSegments(edgeGeometry, edgeMaterial.clone());
            line.name = 'hidden_line_edge';
            line.userData.hiddenLineEdge = true;
            line.userData.cabinetId = cabinetRoot.userData.cabinetId;
            line.renderOrder = 2;
            cabinetRoot.add(line);
        });
        updateWireframeInteriorBackEdge(cabinetRoot);
    });
}

// 문짝을 숨긴 뒤에도 내부가 실제로 노출되는 장인지 판정한다.
// 기구 전면이 막고 있는 장, 서랍장, 냉장고장, 코너장은 임의의 내부선을 추가하지 않는다.
function isWireframeInteriorVisibleCabinet(cab) {
    if (!cab || cab.type === 'fridge' || cab.isFridgeInstall || cab.isCorner) return false;
    if (cab.doorType === 'drawer_2' || cab.doorType === 'drawer_3') return false;
    const blockedAppliances = new Set(['dishwasher', 'washer']);
    if (blockedAppliances.has(cab.applianceType)) return false;
    return true;
}

// 시점 반대편의 내부 뒤 세로 모서리만 보강한다.
// 우측 각도(+): 좌측 내부 뒤선 / 좌측 각도(-): 우측 내부 뒤선
// 천판·선반·바닥판·상판(대리석)처럼 앞을 가리는 수평 부재 구간에서는 선을 끊는다.
function updateWireframeInteriorBackEdge(cabinetRoot) {
    if (!cabinetRoot) return;
    [...cabinetRoot.children]
        .filter(o => o.userData && o.userData.wireInteriorBackEdge)
        .forEach(o => {
            cabinetRoot.remove(o);
            if (o.geometry) o.geometry.dispose();
            if (o.material) o.material.dispose();
        });

    const cab = state.cabinets.find(c => c.id === cabinetRoot.userData.cabinetId);
    if (!isWireframeInteriorVisibleCabinet(cab)) return;

    const angle = Number(state.three.wireAngle || 0);
    // 정면에 가까운 각도에서는 한쪽 선을 억지로 추가하지 않는다.
    if (Math.abs(angle) < 2 || Math.abs(angle) > 88) return;

    const W = Number(cab.w) || 0;
    const D = Number(cab.d) || 0;
    const H = Number(cab.h) || 0;
    const T = Math.max(1, Number(cab.t) || 18);
    const support = getCabinetSupportHeight(cab);
    if (W <= T * 2 || H <= support + T * 2 || D <= 0) return;

    // createCabinet3DMesh에서 부재를 중심좌표로 옮긴 뒤의 로컬 좌표:
    // 전면 z=0, 후면 z=-D. 우라홈이 있으면 뒷판 앞면 쪽으로 약간 이동한다.
    const backInset = cab.groove ? Math.max(3, Number(cab.grooveOffset || 15)) : 3;
    const zBackInner = -D + backInset + 1.2;
    const xInner = angle > 0 ? (-W / 2 + T + 0.9) : (W / 2 - T - 0.9);
    const yBottom = support + T + 0.8;
    const yTop = H - T - 0.8;

    cabinetRoot.updateMatrixWorld(true);
    const rootInverse = new THREE.Matrix4().copy(cabinetRoot.matrixWorld).invert();
    const blocked = [];

    // 선택한 안쪽 뒤 모서리를 실제로 덮는 수평 부재의 Y 구간을 수집한다.
    // 세로 측판이나 칸막이는 제외하여 선 전체가 사라지는 것을 방지한다.
    cabinetRoot.traverse(obj => {
        if (!obj.isMesh || !obj.geometry || (obj.userData && obj.userData.hiddenLineEdge)) return;
        obj.geometry.computeBoundingBox();
        const bb = obj.geometry.boundingBox;
        if (!bb) return;

        obj.updateMatrixWorld(true);
        const rel = new THREE.Matrix4().multiplyMatrices(rootInverse, obj.matrixWorld);
        const xs = [bb.min.x, bb.max.x], ys = [bb.min.y, bb.max.y], zs = [bb.min.z, bb.max.z];
        const localBox = new THREE.Box3();
        localBox.makeEmpty();
        for (const x of xs) for (const y of ys) for (const z of zs) {
            localBox.expandByPoint(new THREE.Vector3(x, y, z).applyMatrix4(rel));
        }

        const size = new THREE.Vector3();
        localBox.getSize(size);
        const horizontalMaxThickness = Math.max(90, T * 5);
        const isHorizontalBoard = size.y <= horizontalMaxThickness && size.x > T * 2;
        if (!isHorizontalBoard) return;

        // 해당 부재가 보강할 뒤 모서리 위치를 실제로 통과할 때만 가림 구간으로 사용한다.
        const margin = 2.5;
        const crossesX = xInner >= localBox.min.x - margin && xInner <= localBox.max.x + margin;
        const crossesZ = zBackInner >= localBox.min.z - margin && zBackInner <= localBox.max.z + margin;
        if (!crossesX || !crossesZ) return;

        const lo = Math.max(yBottom, localBox.min.y - 0.6);
        const hi = Math.min(yTop, localBox.max.y + 0.6);
        if (hi > lo) blocked.push([lo, hi]);
    });

    // 겹치는 가림 구간을 합친 뒤, 남은 보이는 구간만 선분으로 만든다.
    blocked.sort((a, b) => a[0] - b[0]);
    const merged = [];
    blocked.forEach(([lo, hi]) => {
        const last = merged[merged.length - 1];
        if (!last || lo > last[1] + 0.8) merged.push([lo, hi]);
        else last[1] = Math.max(last[1], hi);
    });

    const visibleSegments = [];
    let cursor = yBottom;
    merged.forEach(([lo, hi]) => {
        if (lo > cursor + 1.2) visibleSegments.push([cursor, lo]);
        cursor = Math.max(cursor, hi);
    });
    if (yTop > cursor + 1.2) visibleSegments.push([cursor, yTop]);
    if (!visibleSegments.length) return;

    const points = [];
    visibleSegments.forEach(([lo, hi]) => {
        points.push(
            new THREE.Vector3(xInner, lo, zBackInner),
            new THREE.Vector3(xInner, hi, zBackInner)
        );
    });

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    // 보강선도 다른 부재와 동일하게 깊이 검사를 받도록 한다.
    // 천판·선반·바닥판·대리석 상판 뒤에 위치한 구간은 해당 면에 가려져 보이지 않는다.
    const material = new THREE.LineBasicMaterial({
        color: 0x000000,
        depthTest: true,
        depthWrite: false,
        transparent: false
    });
    const line = new THREE.LineSegments(geometry, material);
    line.name = 'wire_interior_back_edge';
    line.userData.wireInteriorBackEdge = true;
    line.userData.cabinetId = cab.id;
    line.renderOrder = 3;
    cabinetRoot.add(line);
}

function refreshWireframeInteriorBackEdges() {
    if (state.currentTab !== 'wireframe' || !state.three.cabinetsGroup) return;
    state.three.cabinetsGroup.children.forEach(updateWireframeInteriorBackEdge);
}

function projectWirePoint(v) {
    const container=document.getElementById('canvas-3d-container');
    if(!container || !state.three.camera) return null;
    const p=v.clone().project(state.three.camera);
    return {x:(p.x*.5+.5)*container.clientWidth,y:(-.5*p.y+.5)*container.clientHeight,visible:p.z>-1&&p.z<1};
}

function updateWireDimensionOverlay() {
    const layer=document.getElementById('wire-dimension-layer');
    if(!layer) return;
    const opt=state.three.wireDimensions;
    if(state.currentTab!=='wireframe' || !opt || !opt.enabled){
        layer.innerHTML='';
        layer.style.display='none';
        return;
    }

    layer.style.display='block';
    layer.style.fontSize=opt.fontSize+'px';
    const parts=[];

    // 브라우저 CSS 계산식에 의존하지 않고 화면 좌표, 길이와 회전각을 직접 계산한다.
    const addDimension=(kind,label,a,b,offsetX=0,offsetY=0)=>{
        const pa=projectWirePoint(a), pb=projectWirePoint(b);
        if(!pa || !pb || !pa.visible || !pb.visible) return;

        const x1=pa.x+offsetX, y1=pa.y+offsetY;
        const x2=pb.x+offsetX, y2=pb.y+offsetY;
        const dx=x2-x1, dy=y2-y1;
        const length=Math.hypot(dx,dy);
        if(!Number.isFinite(length) || length<8) return;
        const angle=Math.atan2(dy,dx)*180/Math.PI;

        // 원래 가구 모서리에서 치수선까지 이어지는 보조선
        const ext1Len=Math.hypot(offsetX,offsetY);
        const ext1Angle=Math.atan2(offsetY,offsetX)*180/Math.PI;
        const ext2Len=ext1Len;

        parts.push(`
            <div class="wire-dim wire-dim-${kind}" style="left:${x1}px;top:${y1}px;width:${length}px;transform:rotate(${angle}deg)">
                <i class="wire-dim-main"></i>
                <i class="wire-dim-tick wire-dim-tick-start"></i>
                <i class="wire-dim-tick wire-dim-tick-end"></i>
                <span>${label}</span>
            </div>
            ${ext1Len>1?`<i class="wire-dim-extension" style="left:${pa.x}px;top:${pa.y}px;width:${ext1Len}px;transform:rotate(${ext1Angle}deg)"></i>`:''}
            ${ext2Len>1?`<i class="wire-dim-extension" style="left:${pb.x}px;top:${pb.y}px;width:${ext2Len}px;transform:rotate(${ext1Angle}deg)"></i>`:''}
        `);
    };

    state.cabinets.forEach(cab=>{
        const root=state.three.cabinetsGroup && state.three.cabinetsGroup.children.find(c=>c.userData.cabinetId===cab.id);
        if(!root) return;
        root.updateMatrixWorld(true);
        const box=new THREE.Box3().setFromObject(root);
        if(box.isEmpty()) return;
        const min=box.min, max=box.max;

        // 폭은 하단, 높이는 왼쪽, 깊이는 우측 상단에 고정 배치한다.
        if(opt.width) addDimension('h',`폭 ${Math.round(cab.w)} mm`,
            new THREE.Vector3(min.x,min.y,max.z),new THREE.Vector3(max.x,min.y,max.z),0,34);
        if(opt.height) addDimension('v',`높이 ${Math.round(cab.h)} mm`,
            new THREE.Vector3(min.x,min.y,max.z),new THREE.Vector3(min.x,max.y,max.z),-42,0);
        if(opt.depth) addDimension('d',`깊이 ${Math.round(cab.d)} mm`,
            new THREE.Vector3(max.x,max.y,min.z),new THREE.Vector3(max.x,max.y,max.z),28,-18);

        const support=getCabinetSupportHeight(cab);
        if(opt.support && support>0) addDimension('v',`${cab.supportType==='legs'?'다릿발':'걸레받이'} ${Math.round(support)} mm`,
            new THREE.Vector3(max.x,min.y,max.z),new THREE.Vector3(max.x,min.y+support,max.z),38,0);

        const molding=Number(cab.ceilingMolding||cab.crownMolding||cab.topMolding||cab.moldingHeight||0);
        if(opt.molding && molding>0) addDimension('v',`천장마감 ${Math.round(molding)} mm`,
            new THREE.Vector3(max.x,max.y-molding,max.z),new THREE.Vector3(max.x,max.y,max.z),50,0);
    });

    layer.innerHTML=parts.join('');
}

// 3D 캔버스를 현재 작업창 전체 크기에 정확히 맞춤
function resize3DViewport() {
    if (!state.three.renderer || !state.three.camera) return;
    const container = document.getElementById('canvas-3d-container');
    if (!container) return;
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    state.three.camera.aspect = width / height;
    state.three.camera.updateProjectionMatrix();
    state.three.renderer.setSize(width, height, false);
}

function set3DViewportMode(mode) {
    if (!state.three.scene) return;
    const wire = mode === 'wireframe';
    state.three.techStyle = wire;
    state.three.wireframe = false; // 전용 와이어프레임은 은선 제거 방식으로 표현
    state.three.lockRotate = wire;
    // 와이어프레임에서는 원근감을 크게 줄여 평행투영 도면처럼 보이게 한다.
    state.three.camera.fov = wire ? 12 : 45;
    state.three.camera.updateProjectionMatrix();
    if (state.three.controls) {
        state.three.controls.enableRotate = !wire;
        state.three.controls.enablePan = true;
        state.three.controls.screenSpacePanning = true;
        if (wire && THREE.MOUSE) {
            state.three.controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
            state.three.controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
        }
    }
    state.three.scene.background = new THREE.Color(wire ? 0xffffff : 0x0b0f19);
    const lockBtn = document.getElementById('btn-3d-lock-rotate');
    const techBtn = document.getElementById('btn-3d-tech-style');
    const wireBtn = document.getElementById('btn-3d-wireframe');
    if (lockBtn) lockBtn.classList.toggle('active', state.three.lockRotate);
    if (techBtn) techBtn.classList.toggle('active', state.three.techStyle);
    if (wireBtn) wireBtn.classList.toggle('active', state.three.wireframe);
}

// 현재 카메라 방향을 유지하면서 방과 가구 전체가 잘리지 않도록 맞춤
function fit3DView(options = {}) {
    if (!state.three.camera || !state.three.controls || !state.three.scene) return;
    resize3DViewport();
    const box = new THREE.Box3();
    if (state.three.cabinetsGroup && state.three.cabinetsGroup.children.length) {
        box.expandByObject(state.three.cabinetsGroup);
    }
    // 일반 3D는 방 전체를 맞추고, 2D 와이어프레임은 가구만 크게 맞춘다.
    if (state.currentTab !== 'wireframe') {
        const roomBox = new THREE.Box3(
            new THREE.Vector3(-state.room.width / 2, 0, -state.room.depth / 2),
            new THREE.Vector3(state.room.width / 2, state.room.height, state.room.depth / 2)
        );
        box.union(roomBox);
    }
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 1000);
    const fov = state.three.camera.fov * Math.PI / 180;
    const distance = (maxDim / (2 * Math.tan(fov / 2))) * (state.currentTab === 'wireframe' ? 1.08 : 1.28);
    const direction = state.three.camera.position.clone().sub(state.three.controls.target).normalize();
    if (!Number.isFinite(direction.length()) || direction.lengthSq() < 0.01) direction.set(1, .65, 1).normalize();
    state.three.controls.target.copy(center);
    state.three.camera.position.copy(center).add(direction.multiplyScalar(distance));
    state.three.camera.near = Math.max(1, distance / 100);
    state.three.camera.far = Math.max(50000, distance * 20);
    state.three.camera.updateProjectionMatrix();
    state.three.controls.update();
    if (state.currentTab === 'wireframe') state.three.wireDistance = distance;
}

// 출력용 2D 와이어프레임: 좌우 각도만 바꾸고 높이/축척은 안정적으로 유지
function applyWireframeAngle(angle, refit = false) {
    if (!state.three.camera || !state.three.controls) return;
    const target = state.three.controls.target.clone();
    const distance = state.three.wireDistance || Math.max(state.room.width, state.room.depth, state.room.height) * 1.65;
    const rad = THREE.MathUtils.degToRad(Number(angle) || 0);
    const elevation = THREE.MathUtils.degToRad(8);
    const horizontal = distance * Math.cos(elevation);
    state.three.controls.target.copy(target);
    state.three.camera.position.set(
        target.x + Math.sin(rad) * horizontal,
        target.y + Math.sin(elevation) * distance,
        target.z + Math.cos(rad) * horizontal
    );
    state.three.camera.lookAt(target);
    state.three.controls.update();
    refreshWireframeInteriorBackEdges();
    if (refit) fit3DView({ keepDirection: true });
    document.querySelectorAll('.wire-angle-btn').forEach(btn => btn.classList.toggle('active', Number(btn.dataset.angle) === Number(angle)));
}

// 3D 뷰어 카메라 방향 프리셋 적용
function applyPresetView(preset) {
    if (!state.three.camera || !state.three.controls) return;
    
    // 프리셋 버튼 active 스타일 초기화
    document.querySelectorAll('.three-opt-btn-mini').forEach(btn => btn.classList.remove('active'));
    
    const w = state.room.width;
    const h = state.room.height;
    const d = state.room.depth;
    
    // 바라보는 기준 축을 방 중앙 높이로 고정
    state.three.controls.target.set(0, h / 3, 0);
    
    switch(preset) {
        case 'iso':
            // 등각 투영 (대각 3D 뷰)
            state.three.camera.position.set(w * 0.9, h * 1.5, d * 1.2);
            document.getElementById('btn-3d-preset-iso').classList.add('active');
            break;
        case 'front':
            // 정면 뷰
            state.three.camera.position.set(0, h / 2, d * 1.6);
            document.getElementById('btn-3d-preset-front').classList.add('active');
            break;
        case 'top':
            // 평면 뷰 (위에서 수직 하강)
            state.three.camera.position.set(0, h * 2.5, 0);
            state.three.controls.target.set(0, 0, 0);
            document.getElementById('btn-3d-preset-top').classList.add('active');
            break;
        case 'side':
            // 측면 뷰
            state.three.camera.position.set(w * 1.4, h / 2, 0);
            document.getElementById('btn-3d-preset-side').classList.add('active');
            break;
    }
    
    state.three.controls.update();
    showStatusMessage(`3D 뷰어가 ${preset.toUpperCase()} 방향 프리셋으로 정렬되었습니다.`);
}


// ============================================================
// v0.6 판재 자동 생성 엔진
// ============================================================
const PART_ROLE_LABELS = {
    EP_LEFT:'좌측 EP', EP_RIGHT:'우측 EP', FLIP_DOOR:'플립 도어',
    SIDE_LEFT:'좌판', SIDE_RIGHT:'우판', TOP:'상판', BOTTOM:'밑판',
    HORIZONTAL_DIVIDER:'가로분할판', PARTITION:'세로칸막이',
    ADJUSTABLE_SHELF:'이동선반', FIXED_SHELF:'고정선반',
    BACK_PANEL:'뒤판', DOOR:'문짝', DRAWER_FRONT:'서랍앞판',
    LEFT_FILLER:'좌멍판', RIGHT_FILLER:'우멍판'
};

function makePart(cab, role, name, thickness, width, height, qty=1, material='몸통재') {
    return {
        id:`part_${cab.id}_${role}_${Math.random().toString(36).slice(2,8)}`,
        cabinetId:cab.id, cabinetName:cab.name, role, name,
        material, thickness:Math.max(1,Math.round(thickness)),
        width:Math.max(1,Math.round(width)), height:Math.max(1,Math.round(height)),
        qty:Math.max(1,Math.round(qty))
    };
}

function getDoorLeafCount(doorType){
    if(doorType==='swing_double'||doorType==='sliding') return 2;
    if(doorType==='swing_single_left'||doorType==='swing_single_right') return 1;
    return 0;
}

function generateCabinetParts(cab){
    if(!cab) return [];
    if(cab.type==='fridge'){
        migrateFridgeCabinet(cab);
        const t=Math.max(1,Number(cab.t)||18), w=Number(cab.w)||1000, d=Number(cab.d)||650, h=Number(cab.h)||400;
        const parts=[
            makePart(cab,'EP_LEFT','좌측 EP',t,state.room.height,d),
            makePart(cab,'EP_RIGHT','우측 EP',t,state.room.height,d),
            makePart(cab,'TOP','상부장 상판',t,Math.max(1,w-2*t),d),
            makePart(cab,'BOTTOM','상부장 밑판',t,Math.max(1,w-2*t),d),
            makePart(cab,'SIDE_LEFT','상부장 좌판',t,h,d),
            makePart(cab,'SIDE_RIGHT','상부장 우판',t,h,d),
            makePart(cab,'BACK_PANEL','상부장 뒤판',9,Math.max(1,w-2*t),Math.max(1,h-2*t),1,'뒤판재'),
            makePart(cab,'FLIP_DOOR','플립 도어',t,Math.max(1,w-4),Math.max(1,h-4),1,'도어재')
        ]; cab.parts=parts; return parts;
    }
    ensureCabinetRows(cab);
    const t=Math.max(1,Number(cab.t)||18);
    const w=Math.max(t*2+1,Number(cab.w)||1);
    const h=Math.max(t*2+1,Number(cab.h)||1);
    const d=Math.max(1,Number(cab.d)||1);
    const supportH=getCabinetSupportHeight(cab);
    const bodyH=Math.max(t*2+1,h-supportH);
    const innerW=Math.max(1,w-t*2);
    const innerH=Math.max(1,bodyH-t*2);
    const backT=Number(cab.backThickness)||9;
    const bodyDepth=Math.max(1,d-(cab.groove?Math.max(0,Number(cab.grooveOffset)||0):0));
    const parts=[];

    parts.push(makePart(cab,'SIDE_LEFT','좌판',t,bodyH,bodyDepth));
    parts.push(makePart(cab,'SIDE_RIGHT','우판',t,bodyH,bodyDepth));
    parts.push(makePart(cab,'TOP','상판',t,innerW,bodyDepth));
    parts.push(makePart(cab,'BOTTOM','밑판',t,innerW,bodyDepth));

    const rows=ensureCabinetRows(cab);
    if(rows.length>1) parts.push(makePart(cab,'HORIZONTAL_DIVIDER','가로분할판',t,innerW,bodyDepth,rows.length-1));

    let shelfQty=0, drawerFrontQty=0;
    rows.forEach((row,ri)=>{
        const cols=row.columns||[];
        if(cols.length>1) parts.push(makePart(cab,'PARTITION',`세로칸막이 R${ri+1}`,t,row.height,bodyDepth,cols.length-1));
        cols.forEach((col,ci)=>{
            const clearW=Math.max(1,Number(col.width)||innerW);
            (col.sections||[]).forEach(sec=>{
                if(sec.type==='shelf') shelfQty += 1;
                if(sec.type==='drawer') drawerFrontQty += Math.max(1,Number(sec.drawers)||2);
            });
            const colShelfQty=(col.sections||[]).filter(sec=>sec.type==='shelf').length;
            if(colShelfQty) parts.push(makePart(cab,'ADJUSTABLE_SHELF',`이동선반 R${ri+1}-C${ci+1}`,t,clearW,bodyDepth,colShelfQty));
            const colDrawerQty=(col.sections||[]).filter(sec=>sec.type==='drawer').reduce((sum,sec)=>sum+Math.max(1,Number(sec.drawers)||2),0);
            if(colDrawerQty){
                const frontH=Math.max(80,Math.floor(row.height/Math.max(1,colDrawerQty))-3);
                parts.push(makePart(cab,'DRAWER_FRONT',`서랍앞판 R${ri+1}-C${ci+1}`,t,Math.max(1,clearW-3),frontH,colDrawerQty,'도어재'));
            }
        });
    });

    const fillerSide=cab.fillerSide||'none';
    if(((cab.type||'').startsWith('sink_base')||cab.type==='sink_corner') && (fillerSide==='left'||fillerSide==='both')){
        parts.push(makePart(cab,'LEFT_FILLER','좌멍판',t,Math.max(1,Number(cab.leftFillerWidth)||50),bodyH,1,'도어재'));
    }
    if(((cab.type||'').startsWith('sink_base')||cab.type==='sink_corner') && (fillerSide==='right'||fillerSide==='both')){
        parts.push(makePart(cab,'RIGHT_FILLER','우멍판',t,Math.max(1,Number(cab.rightFillerWidth)||50),bodyH,1,'도어재'));
    }

    parts.push(makePart(cab,'BACK_PANEL','뒤판',backT,w,h-supportH,1,'뒤판재'));

    const leafCount=getDoorLeafCount(cab.doorType);
    if(leafCount){
        const gap=2;
        const doorW=Math.max(1,(w-gap*(leafCount+1))/leafCount);
        const doorH=Math.max(1,bodyH-gap*2);
        parts.push(makePart(cab,'DOOR','문짝',t,doorW,doorH,leafCount,'도어재'));
    } else if(/^drawer_/.test(cab.doorType||'')){
        const count=Math.max(1,Number((cab.doorType||'').split('_')[1])||2);
        parts.push(makePart(cab,'DRAWER_FRONT','서랍앞판',t,w-4,Math.max(80,(bodyH-4-count*2)/count),count,'도어재'));
    }

    cab.parts=parts;
    return parts;
}

function refreshPartsPanel(){
    const body=document.getElementById('parts-table-body');
    if(!body) return;
    const cab=state.cabinets.find(c=>c.id===state.selectedId);
    if(!cab){
        body.innerHTML='<tr><td colspan="6">가구를 선택하세요.</td></tr>';
        const kc=document.getElementById('parts-kind-count'), tq=document.getElementById('parts-total-qty');
        if(kc)kc.textContent='0'; if(tq)tq.textContent='0'; return;
    }
    const parts=generateCabinetParts(cab);
    body.innerHTML=parts.map(p=>`<tr data-part-id="${p.id}"><td>${p.name}</td><td>${PART_ROLE_LABELS[p.role]||p.role}</td><td>${p.thickness}T</td><td>${p.width}</td><td>${p.height}</td><td>${p.qty}</td></tr>`).join('');
    document.getElementById('parts-kind-count').textContent=parts.length;
    document.getElementById('parts-total-qty').textContent=parts.reduce((s,p)=>s+p.qty,0);
}

function generateAllCabinetParts(){
    return state.cabinets.flatMap(c=>generateCabinetParts(c));
}
