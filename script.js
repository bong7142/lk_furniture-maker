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
    currentTab: 'plan', // 'plan', 'elevation', '3d'
    
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
        techStyle: false
    }
};

// 가구 종류별 기본 스펙 정의 (Default Dimensions)
const CAB_DEFAULTS = {
    sink_base: { name: '싱크대 (하부장)', w: 900, d: 600, h: 850, t: 18, color: '#ffffff', groove: true, grooveDepth: 9, grooveOffset: 15, doorType: 'swing_double', shelves: 1, kickplate: 100, z: 0 },
    sink_wall: { name: '싱크대 (상부장)', w: 900, d: 350, h: 700, t: 18, color: '#ffffff', groove: true, grooveDepth: 9, grooveOffset: 15, doorType: 'swing_double', shelves: 2, kickplate: 0, z: 1500 },
    fridge: { name: '냉장고장', w: 1000, d: 700, h: 2200, t: 18, color: '#3a3e45', groove: true, grooveDepth: 9, grooveOffset: 15, doorType: 'none', shelves: 1, kickplate: 80, z: 0 },
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
    
    updatePlacedList();
    render2D();
}

// 창 크기 변경에 따른 캔버스 리사이징
window.addEventListener('resize', () => {
    resizeCanvas();
    render2D();
    if (state.three.renderer) {
        const width = wrapper3d.clientWidth;
        const height = wrapper3d.clientHeight;
        state.three.camera.aspect = width / height;
        state.three.camera.updateProjectionMatrix();
        state.three.renderer.setSize(width, height);
    }
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
    
    document.getElementById('btn-modal-print').addEventListener('click', () => {
        window.print();
    });
    
    // 현장 치수 변경
    const roomInputs = ['room-width', 'room-depth', 'room-height'];
    roomInputs.forEach(id => {
        document.getElementById(id).addEventListener('input', (e) => {
            const prop = id.split('-')[1]; // width, depth, height
            state.room[prop] = Math.max(100, parseInt(e.target.value) || 0);
            update3DRoomGeometry();
            render2D();
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
            
            // 룸 중앙 벽 근처에 생성
            const defaultSpecs = CAB_DEFAULTS[type];
            const x = Math.min(state.room.width - defaultSpecs.w, Math.floor(state.room.width / 2 - defaultSpecs.w / 2));
            const y = 0; // 뒤벽 밀착 시작
            
            const newCab = addCabinet(type, category, x, y);
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
        'prop-leg-height': 'legHeight'
    };
    
    Object.keys(propFields).forEach(id => {
        const el = document.getElementById(id);
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
            if (key === 'supportType') {
                document.getElementById('plinth-settings').style.display = cab.supportType === 'plinth' ? 'grid' : 'none';
                document.getElementById('leg-settings').style.display = cab.supportType === 'legs' ? 'grid' : 'none';
            }
            
            // 좌표 이동 제약 조건 및 스냅
            if (key === 'x') cab.x = Math.max(0, Math.min(state.room.width - cab.w, cab.x));
            if (key === 'y') cab.y = Math.max(0, Math.min(state.room.depth - cab.d, cab.y));
            
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
        const cab = state.cabinets.find(c => c.id === state.selectedId);
        if (!cab) return;
        
        // 겹치지 않게 옆으로 약간 비껴서 생성
        const newX = Math.min(state.room.width - cab.w, cab.x + cab.w);
        const newY = cab.y;
        
        const clone = { ...cab, id: 'cab_' + Date.now(), name: cab.name + ' (복사)', x: newX, y: newY };
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
    document.getElementById('tab-2d-plan').addEventListener('click', (e) => switchTab('plan', e.target));
    document.getElementById('tab-2d-elevation').addEventListener('click', (e) => switchTab('elevation', e.target));
    document.getElementById('tab-3d').addEventListener('click', (e) => switchTab('3d', e.target));
    
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
    
    // 2D 마우스 드래그 / 팬 제어
    canvas2d.addEventListener('mousedown', onMouseDown);
    canvas2d.addEventListener('mousemove', onMouseMove);
    canvas2d.addEventListener('mouseup', onMouseUp);
    canvas2d.addEventListener('mouseleave', onMouseUp);
    canvas2d.addEventListener('wheel', onWheel);
    
    // 단축키 이벤트
    window.addEventListener('keydown', (e) => {
        // 인풋 포커스 체크 (인풋 편집 도중 단축키 오동작 방지)
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT')) {
            return;
        }
        
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
                cab.x = Math.max(0, cab.x - (e.shiftKey ? 100 : 10));
                syncPropFields(cab);
                render2D();
                update3DScene();
                break;
            case 'ArrowRight':
                cab.x = Math.min(state.room.width - cab.w, cab.x + (e.shiftKey ? 100 : 10));
                syncPropFields(cab);
                render2D();
                update3DScene();
                break;
            case 'ArrowUp':
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
    
    // 탭 버튼 active 클래스 수정
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    tabElement.classList.add('active');
    
    // 뷰포트 영역 보이기/숨기기
    if (tab === 'plan' || tab === 'elevation') {
        wrapper2d.classList.add('active');
        wrapper3d.classList.remove('active');
        
        // 범례 텍스트 수정
        const legend = document.getElementById('legend-view-type');
        legend.innerText = tab === 'plan' ? '2D 평면도 (TOP VIEW)' : '2D 정면도 (ELEVATION VIEW)';
        
        render2D();
    } else if (tab === '3d') {
        wrapper2d.classList.remove('active');
        wrapper3d.classList.add('active');
        
        update3DScene();
    }
}

// 가구 데이터 생성
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
        kickplate: specs.kickplate,
        supportType: specs.supportType || (specs.kickplate > 0 ? 'plinth' : 'none'),
        plinthHeight: specs.plinthHeight || specs.kickplate || 100,
        plinthSetback: specs.plinthSetback || 40,
        legType: specs.legType || 'plastic',
        legHeight: specs.legHeight || 100,
        x: x,
        y: y,
        z: specs.z,
        rotation: 0
    };
    
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
    
    // 우라홈 및 하부 지지대 서브패널 동적 노출 제어
    const grooveSettings = document.getElementById('groove-settings');
    grooveSettings.style.display = cab.groove ? 'grid' : 'none';
    
    const plinthSettings = document.getElementById('plinth-settings');
    const legSettings = document.getElementById('leg-settings');
    plinthSettings.style.display = cab.supportType === 'plinth' ? 'grid' : 'none';
    legSettings.style.display = cab.supportType === 'legs' ? 'grid' : 'none';
}

function deleteSelectedCabinet() {
    if (!state.selectedId) return;
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
        bg: isPrint ? '#ffffff' : '#0b0f19',
        gridMain: isPrint ? '#cbd5e1' : '#334155',
        gridSub: isPrint ? '#f1f5f9' : '#1a2236',
        wallFill: isPrint ? '#f8fafc' : 'rgba(30, 41, 59, 0.2)',
        wallBorder: isPrint ? '#475569' : '#64748b',
        dimension: isPrint ? '#334155' : '#94a3b8',
        cabFill: isPrint ? '#ffffff' : '#1e293b',
        cabBorder: isPrint ? '#000000' : '#475569',
        cabSelectedBorder: isPrint ? '#000000' : '#818cf8',
        cabT: isPrint ? '#dc2626' : '#ef4444',
        cabGroove: isPrint ? '#d97706' : '#f59e0b',
        cabShelf: isPrint ? '#059669' : '#10b981',
        textPrimary: isPrint ? '#000000' : '#f8fafc',
        textSecondary: isPrint ? '#334155' : '#94a3b8'
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

// 2D 평면도 개별 가구 그리기
function drawCabinetPlan(cab, isSelected) {
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
    
    // 기본 채우기
    ctx2d.fillStyle = isSelected ? (state.isExporting ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.25)') : theme.cabFill;
    ctx2d.fillRect(-halfW, -halfD, localW, localD);
    
    // 뼈대 테두리
    ctx2d.strokeStyle = isSelected ? theme.cabSelectedBorder : theme.cabBorder;
    ctx2d.lineWidth = isSelected ? 3 : 1.5;
    ctx2d.strokeRect(-halfW, -halfD, localW, localD);
    
    // 목재 두께(T) 내부선 그리기
    ctx2d.strokeStyle = isSelected ? (state.isExporting ? 'rgba(0, 0, 0, 0.15)' : 'rgba(129, 140, 248, 0.4)') : theme.gridMain;
    ctx2d.lineWidth = 1;
    ctx2d.strokeRect(-halfW + cab.t, -halfD + cab.t, localW - cab.t*2, localD - cab.t*2);
    
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

// 2D 정면 입면도 개별 가구 그리기
// 정면 입면도는 룸 X축(가로)과 Z축(높이 - 화면상 y축 방향 역방향)을 사용
function drawCabinetElevation(cab, isSelected) {
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
        
        ctx2d.strokeStyle = theme.gridMain;
        ctx2d.lineWidth = 1;
        
        // 좌/우 측판 내부
        ctx2d.strokeRect(drawX + t, bodyTop + t, visualW - t*2, bodyBottom - bodyTop - t*2);
        
        // 찬넬 가공 높이 계산
        let channelH = 0;
        if (cab.handleType === 'mok_channel') channelH = 30;
        else if (cab.handleType === 'c_channel') channelH = 35;
        
        const cabinetInnerH = bodyBottom - bodyTop - t*2;
        
        if (cab.doorType === 'swing_double' || cab.doorType === 'swing_single_left' || cab.doorType === 'swing_single_right') {
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
                ctx2d.fillStyle = theme.cabFill;
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
                ctx2d.fillStyle = theme.cabFill;
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
                ctx2d.fillStyle = theme.cabFill;
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
        } else if (cab.doorType === 'drawer_2' || cab.doorType === 'drawer_3') {
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
                ctx2d.fillStyle = theme.cabFill;
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
        
        // 내부 선반 점선 그리기 (도어가 닫혀있어도 투시선으로 보여줌)
        if (cab.shelves > 0) {
            ctx2d.strokeStyle = theme.cabShelf; // 선반 녹색 점선 표현
            ctx2d.setLineDash([4, 4]);
            const shelfStep = cabinetInnerH / (cab.shelves + 1);
            for (let i = 1; i <= cab.shelves; i++) {
                const shelfY = bodyTop + t + shelfStep * i;
                ctx2d.beginPath();
                ctx2d.moveTo(drawX + t, shelfY);
                ctx2d.lineTo(drawX + visualW - t, shelfY);
                ctx2d.stroke();
            }
            ctx2d.setLineDash([]); // 원복
        }
        
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
            } else if (cab.doorType === 'sliding') {
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
            
            // 2. 내부 선반 높이 간격 기입
            if (cab.shelves > 0) {
                ctx2d.fillStyle = theme.cabShelf; // Green for shelf heights
                ctx2d.font = 'bold 12px monospace';
                const shelfStep = cabinetInnerH / (cab.shelves + 1);
                const shelfSpaceH = Math.round(shelfStep - t);
                for (let i = 0; i <= cab.shelves; i++) {
                    const textY = bodyTop + t + shelfStep * i + shelfStep / 2 + 3;
                    ctx2d.fillText(`칸:${shelfSpaceH}`, drawX + 30, textY);
                }
            }
            
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
    
    // 텍스트 라벨 (가구명 및 높이/폭 수치)
    ctx2d.fillStyle = theme.textPrimary;
    ctx2d.font = 'bold 14px Inter, sans-serif';
    ctx2d.textAlign = 'center';
    ctx2d.fillText(cab.name, drawX + visualW/2, drawY - drawH/2 - 2);
    
    ctx2d.fillStyle = theme.textSecondary;
    ctx2d.font = 'bold 11px monospace';
    ctx2d.fillText(`W:${cab.w} H:${cab.h}`, drawX + visualW/2, drawY - drawH/2 + 12);
    
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
    
    // 4. Controls 세팅 (OrbitControls)
    state.three.controls = new THREE.OrbitControls(state.three.camera, state.three.renderer.domElement);
    state.three.controls.enableDamping = true;
    state.three.controls.dampingFactor = 0.05;
    state.three.controls.maxPolarAngle = Math.PI / 2 - 0.05; // 바닥 밑으로 카메라 못 내려가게
    state.three.controls.minDistance = 200;
    state.three.controls.maxDistance = 15000;
    
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
        state.three.renderer.render(state.three.scene, state.three.camera);
    }
    animate();
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
        scene.background = new THREE.Color(0x0b0f19); // 기존 모던 다크 블루
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
}

// 핵심 함수: 가구 규격(T, 우라홈 등) 물리적 보드를 반영한 캐비닛 조립 메쉬 생성
function createCabinet3DMesh(cab) {
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
    const isBaseKitchen = cab.type === 'sink_base' || cab.type === 'island';
    
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
    
    // 7. 선반 (Internal Shelves)
    if (cab.shelves > 0) {
        const shelfD = bottomD - 10; // 앞단 10mm 여유
        const shelfW = W - T*2 - 2; // 좌우 1mm씩 조립 여유
        const shelfH = T;
        const innerH = H - kick - T*2 - 20; // 상하단 여유
        const shelfStep = innerH / (cab.shelves + 1);
        
        for (let i = 1; i <= cab.shelves; i++) {
            const shelf = new THREE.Mesh(new THREE.BoxGeometry(shelfW, shelfH, shelfD), woodMat);
            // Z 위치는 밑판과 동일하게 앞정렬
            shelf.position.set(W/2, kick + T + shelfStep * i, bottomZ + 5);
            shelf.castShadow = true;
            shelf.receiveShadow = true;
            cabGroup.add(shelf);
        }
    }
    
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
    if (cab.type === 'sink_base') {
        // 인조대리석 상판 (W, 40, D+10)
        const counterMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4, metalness: 0.1 });
        const countertop = new THREE.Mesh(new THREE.BoxGeometry(W + 4, 40, D + 15), counterMat);
        countertop.position.set(W/2, H + 20, 7.5);
        countertop.castShadow = true;
        countertop.receiveShadow = true;
        cabGroup.add(countertop);
        
        // 싱크볼 (스텐 사각)
        const sinkBowl = new THREE.Mesh(new THREE.BoxGeometry(W * 0.7, 5, D * 0.6), metalMat);
        sinkBowl.position.set(W/2, H + 40.5, 0);
        cabGroup.add(sinkBowl);
        
        // 수전 (간단한 L자형 파이프 실린더)
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
    
    if (cab.doorType === 'swing_double' || cab.doorType === 'swing_single_left' || cab.doorType === 'swing_single_right') {
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
        
    } else if (cab.doorType === 'sliding') {
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
        
    } else if (cab.doorType === 'drawer_2' || cab.doorType === 'drawer_3') {
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
    
    // 12. 전체 가구를 2D 배치도(Plan)의 좌표 및 회전 연동
    // 2D의 좌표 origin은 룸 왼쪽위(X=0, Y=0), 3D의 origin은 방 정중앙(0,0,0)
    // 2D X -> 3D X: -roomWidth/2 + cab.x
    // 2D Y -> 3D Z: -roomDepth/2 + cab.y
    // 가구 중심축 회전 맞춤 변환
    const roomW = state.room.width;
    const roomD = state.room.depth;
    
    // 회전 고려한 3D 정렬 보정
    const rotated = getCabinetRotatedDims(cab);
    const rad = -(cab.rotation * Math.PI) / 180; // 방향 매핑 보정
    
    cabGroup.rotation.y = rad;
    
    // 회전된 피벗 중심 좌표 보정 계산
    const posX = -roomW/2 + cab.x;
    const posZ = -roomD/2 + cab.y;
    
    // Three.js 가구 pivot은 (0,0)이 좌하단 뒤가 아닌 가구 Group의 (0,0,0)이므로 보드 로컬 좌표계 오프셋 보정 필요
    // 기본적으로 로컬 배치 시 X축 0~W, Z축 0~D로 그렸음
    // 가구 기준점을 좌하단 구석으로 삼기 위해 Three.js 로컬 보드 그룹을 이동
    const children = [...cabGroup.children];
    children.forEach(child => {
        child.position.x -= W/2;
        child.position.z -= D/2;
    });
    
    // 최종 위치 지정
    cabGroup.position.set(posX + W/2, cab.z, posZ + D/2);
    
    // 회전 중심도 좌하단 구석 기준으로 수식 보정 처리
    cabGroup.position.x = posX + W/2;
    cabGroup.position.y = cab.z;
    cabGroup.position.z = posZ + D/2;
    
    // 로컬 오프셋 가구 구석 기준점 회전 변환 적용
    const pivotOffsetX = -W/2;
    const pivotOffsetZ = -D/2;
    
    // 회전 변환
    const cosR = Math.cos(rad);
    const sinR = Math.sin(rad);
    
    // 구석 배치 기준 Three.js 위치 세팅
    const finalX = posX - (pivotOffsetX * cosR - pivotOffsetZ * sinR);
    const finalZ = posZ - (pivotOffsetX * sinR + pivotOffsetZ * cosR);
    
    cabGroup.position.set(finalX, cab.z, finalZ);
    
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
                state.room = data.room;
                state.cabinets = data.cabinets;
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
function generatePrintData() {
    const now = new Date();
    const dateStr = `${now.getFullYear()}. ${String(now.getMonth() + 1).padStart(2, '0')}. ${String(now.getDate()).padStart(2, '0')}`;
    const dimsStr = `${state.room.width} x ${state.room.depth} x ${state.room.height} mm`;
    
    // 1. 날짜 및 치수 기입 (실제 인쇄용 + 화면 미리보기용 둘 다)
    document.getElementById('print-date').innerText = dateStr;
    document.getElementById('preview-date').innerText = dateStr;
    document.getElementById('print-room-dims').innerText = dimsStr;
    document.getElementById('preview-room-dims').innerText = dimsStr;
    
    // 2. 현재 활성화된 화면 캡쳐하여 인쇄/미리보기 이미지 영역에 삽입
    const prevSelectedId = state.selectedId;
    state.selectedId = null;
    state.isExporting = true;
    
    let capturedImgUrl = '';
    if (state.currentTab === 'plan' || state.currentTab === 'elevation') {
        render2D();
        capturedImgUrl = canvas2d.toDataURL('image/png');
    } else {
        update3DScene();
        state.three.renderer.render(state.three.scene, state.three.camera);
        capturedImgUrl = state.three.renderer.domElement.toDataURL('image/png');
    }
    
    document.getElementById('print-image').src = capturedImgUrl;
    document.getElementById('preview-image').src = capturedImgUrl;
    
    // 복원
    state.selectedId = prevSelectedId;
    state.isExporting = false;
    
    if (state.currentTab === 'plan' || state.currentTab === 'elevation') {
        render2D();
    } else {
        update3DScene();
    }
    
    // 3. 가구 자재 명세 일람 테이블 작성 (실제 인쇄용 + 화면 미리보기용 둘 다)
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
            
            const existing = summary.find(s => s.key === key);
            if (existing) {
                existing.count++;
            } else {
                summary.push({
                    key,
                    name: cab.name,
                    w: cab.w,
                    d: cab.d,
                    h: cab.h,
                    t: cab.t,
                    groove: cab.groove ? '적용' : '미적용',
                    door: doorName,
                    count: 1
                });
            }
        });
        
        summary.forEach((item, index) => {
            const trPrint = document.createElement('tr');
            const trPreview = document.createElement('tr');
            const rowContent = `
                <td>${index + 1}</td>
                <td><strong>${item.name}</strong></td>
                <td>${item.w}</td>
                <td>${item.d}</td>
                <td>${item.h}</td>
                <td>${item.t}T</td>
                <td>${item.groove}</td>
                <td>${item.door}</td>
                <td><strong>${item.count}</strong></td>
            `;
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
