// 어플리케이션 상태 관리
const state = {
    customDomain: "https://design-source.github.io/QR-code",
    gaMeasurementId: "G-E6NHSEPSGD",
    currentTrack: 1,
    audioTracks: {
        1: {
            id: "1N5FzknWvcMo4zoxlpbFPWMwGVHjYUeRx",
            title: "국가유산 오디오 가이드 #1",
            filename: "audio_1.mp3"
        },
        2: {
            id: "1AdVHyNYNjGkymwfsTaJ7BUBnmDyKN3Cf",
            title: "국가유산 오디오 가이드 #2",
            filename: "audio_2.mp3"
        },
        3: {
            id: "137GjXhaqetY6Nlo7DM62Ja9oOP1vjfpZ",
            title: "국가유산 오디오 가이드 #3",
            filename: "audio_3.mp3"
        },
        4: {
            id: "14e5ZW37CGAjfj8gZpS3fk41bcVDsf8GG",
            title: "국가유산 오디오 가이드 #4",
            filename: "audio_4.mp3"
        }
    }
};

// DOM 로드 시 실행
document.addEventListener("DOMContentLoaded", () => {
    // 기존에 저장된 시드 목업 데이터가 있다면 강제로 지워 초기화합니다.
    const statsStr = localStorage.getItem("audio_analytics_stats");
    if (statsStr && (statsStr.includes("182") || statsStr.includes("156"))) {
        localStorage.removeItem("audio_analytics_stats");
    }

    // 로컬스토리지 저장 데이터 불러오기
    loadSavedSettings();

    // 쿼리 스트링에 ?track=N 파라미터가 있는지 검사하여 모바일 화면인지 판별
    const urlParams = new URLSearchParams(window.location.search);
    const trackParam = urlParams.get("track");

    if (trackParam) {
        const trackNum = parseInt(trackParam);
        if (trackNum >= 1 && trackNum <= 4) {
            // 모바일 플레이어 전용 모드로 실행
            runMobilePlayer(trackNum);
            return; // 관리자 모드 초기화 스킵
        }
    }

    // 관리자 대시보드 모드 실행
    runAdminDashboard();
});

// 1. 설정값 불러오기
function loadSavedSettings() {
    const savedDomain = localStorage.getItem("customDomain");
    const savedGaId = localStorage.getItem("gaMeasurementId");

    if (savedDomain) {
        state.customDomain = savedDomain;
        const domainInput = document.getElementById("custom-domain-input");
        if (domainInput) domainInput.value = savedDomain;
    }

    if (savedGaId) {
        state.gaMeasurementId = savedGaId;
        const gaInput = document.getElementById("ga-id-input");
        if (gaInput) gaInput.value = savedGaId;
        
        // 구글 애널리틱스 트래커 동적 초기화
        initializeGA4(savedGaId);
    }
}

// 구글 애널리틱스 (GA4) 동적 초기화 로직
function initializeGA4(measurementId) {
    if (!measurementId || !measurementId.startsWith("G-")) return;

    try {
        const gaScript = document.getElementById("google-analytics-script");
        if (gaScript) {
            gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
            
            // 기존 gtag 설정 업데이트
            gtag('config', measurementId);
            console.log(`%c[GA4 Tracker] 구글 애널리틱스 연동 활성화: ${measurementId}`, "color: #3b7a57; font-weight: bold;");
        }
    } catch (e) {
        console.error("구글 애널리틱스 로드 실패:", e);
    }
}

// 2. 모바일 플레이어 제어 모드 실행
function runMobilePlayer(trackNum) {
    // 뷰 전환
    document.getElementById("admin-dashboard-view").classList.add("hide");
    document.getElementById("mobile-player-view").classList.remove("hide");

    const trackData = state.audioTracks[trackNum];
    const audio = document.getElementById("mobile-audio-element");
    const vinyl = document.getElementById("mobile-vinyl");
    
    // UI 텍스트 채우기
    document.getElementById("mobile-track-badge").textContent = `TRACK 0${trackNum}`;
    document.getElementById("mobile-track-title").textContent = trackData.title;
    
    // 오디오 파일 설정 (동일 도메인 상대경로 지정)
    audio.src = `audio/audio_${trackNum}.mp3`;
    
    // 모바일 플레이어 컨트롤 버튼 연동
    const btnPlayPause = document.getElementById("btn-mobile-play-pause");
    const progressBar = document.getElementById("mobile-progress-bar");
    const progressContainer = document.getElementById("mobile-progress-container");
    const timeCurrent = document.getElementById("mobile-time-current");
    const timeTotal = document.getElementById("mobile-time-total");

    // 재생 속도 제어
    const speedButtons = document.querySelectorAll(".btn-speed");
    speedButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            speedButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const speed = parseFloat(btn.getAttribute("data-speed"));
            audio.playbackRate = speed;
        });
    });

    // 10초 스킵 제어
    document.getElementById("btn-skip-back").addEventListener("click", () => {
        audio.currentTime = Math.max(0, audio.currentTime - 10);
    });
    
    document.getElementById("btn-skip-forward").addEventListener("click", () => {
        if (audio.duration) {
            audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
        }
    });

    // 재생 토글
    btnPlayPause.addEventListener("click", () => {
        if (audio.paused) {
            audio.play().then(() => {
                btnPlayPause.textContent = "⏸";
                vinyl.classList.add("playing");
            }).catch(err => {
                console.error("오디오 재생 실패:", err);
                alert("음원 파일을 불러올 수 없거나 재생이 차단되었습니다. 로컬 audio/ 폴더에 음원이 올바르게 올라와 있는지 확인해 주세요.");
            });
        } else {
            audio.pause();
            btnPlayPause.textContent = "▶";
            vinyl.classList.remove("playing");
        }
    });

    // 프로그레스 바 시간 업데이트 연동
    audio.addEventListener("timeupdate", () => {
        if (audio.duration) {
            const percent = (audio.currentTime / audio.duration) * 100;
            progressBar.style.width = `${percent}%`;
            timeCurrent.textContent = formatTime(audio.currentTime);
            timeTotal.textContent = formatTime(audio.duration);

            // 정밀 청취 통계 추적 수집 모듈 실행
            trackAnalyticsMilestones(trackNum, audio.currentTime, audio.duration);
        }
    });

    // 로드 메타데이터 시 총 길이 채우기
    audio.addEventListener("loadedmetadata", () => {
        timeTotal.textContent = formatTime(audio.duration);
    });

    // 탐색 바 클릭 이동
    progressContainer.addEventListener("click", (e) => {
        const rect = progressContainer.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const percentage = clickX / width;
        if (audio.duration) {
            audio.currentTime = percentage * audio.duration;
        }
    });

    // 오디오 종료 처리
    audio.addEventListener("ended", () => {
        btnPlayPause.textContent = "▶";
        vinyl.classList.remove("playing");
    });

    // [GA4 이벤트 보고] 스캔 유입 감지
    sendGA4Event("audio_scan", {
        'track': `Track 0${trackNum}`,
        'track_title': trackData.title
    });
}

// 3. 정밀 통계 추적용 GA4 이벤트 보고 및 로컬 저장소 연동 트리거
const sentMilestones = {};
function trackAnalyticsMilestones(trackNum, currentTime, duration) {
    if (!duration || duration <= 0) return;
    
    const percent = Math.floor((currentTime / duration) * 100);
    const milestones = [25, 50, 75, 100];
    const trackData = state.audioTracks[trackNum];

    if (!sentMilestones[trackNum]) {
        sentMilestones[trackNum] = new Set();
    }

    // 재생 시작 이벤트 (첫 구동 시 1회 전송)
    if (currentTime > 0.5 && !sentMilestones[trackNum].has(0)) {
        sentMilestones[trackNum].add(0);
        
        // 1. GA4 이벤트 보고
        sendGA4Event("audio_play", {
            'track': `Track 0${trackNum}`,
            'track_title': trackData.title
        });
        
        // 2. 로컬 통계 데이터 저장
        recordLocalPlay(trackNum);
    }

    // 마일스톤 구간 분석 (25%, 50%, 75% 이탈 지점 집계)
    milestones.slice(0, 3).forEach(stone => {
        if (percent >= stone && !sentMilestones[trackNum].has(stone)) {
            sentMilestones[trackNum].add(stone);
            
            // 1. GA4 이벤트 보고
            sendGA4Event(`audio_progress_${stone}`, {
                'track': `Track 0${trackNum}`,
                'track_title': trackData.title,
                'progress_percent': stone
            });
            
            // 2. 로컬 통계 데이터 저장
            recordLocalMilestone(trackNum, stone);
        }
    });

    // 완독 이벤트 (재생 완료 시)
    if (percent >= 99 && !sentMilestones[trackNum].has(100)) {
        sentMilestones[trackNum].add(100);
        
        // 1. GA4 이벤트 보고
        sendGA4Event("audio_complete", {
            'track': `Track 0${trackNum}`,
            'track_title': trackData.title
        });
        
        // 2. 로컬 통계 데이터 저장 (완독 처리 및 듣는 시간 기록)
        recordLocalMilestone(trackNum, 100, duration);
    }
}

// GA4 원격 보고 + 개발자 도구 디버그 로그용 공통 래퍼
function sendGA4Event(eventName, params) {
    // 1. 브라우저 콘솔창 로깅 (모바일 테스트 검증용)
    console.log(`%c[GA4 Event Fired] Event: ${eventName}`, "color: #d4af37; font-weight: bold; padding: 2px;", params);

    // 2. GA4 SDK 연동되어 있을 경우 이벤트 전송
    if (state.gaMeasurementId) {
        try {
            gtag('event', eventName, params);
        } catch (e) {
            console.warn("GA4 이벤트 전송 누락 (SDK 미기동):", e);
        }
    }
}

// 4. 관리자 대시보드 제어 모드 실행
function runAdminDashboard() {
    initNavigation();
    initAdminAudioPlayers();
    initQRGenerator();
    initDomainConfig();
    initAnalyticsDashboard(); // 신규 추가: 실시간 차트 대시보드
}

// 관리자 네비게이션
function initNavigation() {
    const navItems = document.querySelectorAll(".nav-item");
    const sections = document.querySelectorAll(".content-section");

    navItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const targetId = item.getAttribute("href").substring(1);

            navItems.forEach(nav => nav.classList.remove("active"));
            item.classList.add("active");

            sections.forEach(sec => {
                if (sec.id === targetId) {
                    sec.classList.remove("hide");
                } else {
                    sec.classList.add("hide");
                }
            });
        });
    });
}

// 관리자 오디오 플레이어 (로컬 개발 서버 음원 테스트용)
function initAdminAudioPlayers() {
    const audioElements = document.querySelectorAll("audio");

    audioElements.forEach(audio => {
        if (audio.id === "mobile-audio-element") return; // 모바일 플레이어 리스너 별도 처리
        
        const trackNum = audio.id.split("-").pop();
        const progressBar = document.getElementById(`progress-${trackNum}`);
        const timeDisplay = document.getElementById(`time-${trackNum}`);

        audio.addEventListener("timeupdate", () => {
            if (audio.duration) {
                const percent = (audio.currentTime / audio.duration) * 100;
                progressBar.style.width = `${percent}%`;
                timeDisplay.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
                
                // 관리자 대시보드에서 재생 시에도 로컬 통계 갱신 및 차트 업데이트
                trackAnalyticsMilestones(trackNum, audio.currentTime, audio.duration);
            }
        });

        audio.addEventListener("loadedmetadata", () => {
            timeDisplay.textContent = `00:00 / ${formatTime(audio.duration)}`;
        });
    });
}

// 오디오 시간 포맷팅 (mm:ss)
function formatTime(seconds) {
    if (isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// 관리자 재생/일시정지 토글
function togglePlay(trackNum) {
    const audio = document.getElementById(`audio-element-${trackNum}`);
    const playBtn = document.getElementById(`play-btn-${trackNum}`);

    if (audio.paused) {
        document.querySelectorAll("audio").forEach(otherAudio => {
            if (otherAudio.id !== `audio-element-${trackNum}` && otherAudio.id !== "mobile-audio-element") {
                otherAudio.pause();
                const otherTrackNum = otherAudio.id.split("-").pop();
                const btn = document.getElementById(`play-btn-${otherTrackNum}`);
                if (btn) btn.textContent = "▶";
            }
        });

        audio.play().then(() => {
            playBtn.textContent = "⏸";
        }).catch(err => {
            console.error("로컬 오디오 재생 실패:", err);
            alert("로컬 오디오 재생 실패. 프로젝트 폴더 아래에 'audio/' 폴더를 만들고 'audio_1.mp3' 파일 등을 복사해 주세요.");
        });
    } else {
        audio.pause();
        playBtn.textContent = "▶";
    }
}

// 관리자 프로그레스 탐색
function seekAudio(event, trackNum) {
    const audio = document.getElementById(`audio-element-${trackNum}`);
    const container = event.currentTarget;
    const rect = container.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const width = rect.width;
    const percentage = clickX / width;

    if (audio.duration) {
        audio.currentTime = percentage * audio.duration;
    }
}

// 5. 호스팅 도메인 및 GA4 설정 컨트롤바 연동
function initDomainConfig() {
    // 도메인설정
    const btnApplyDomain = document.getElementById("btn-apply-domain");
    const domainInput = document.getElementById("custom-domain-input");
    const domainMsg = document.getElementById("domain-status-msg");
    const radioHosting = document.getElementById("radio-hosting");
    const hostingLabel = document.getElementById("hosting-radio-container");

    // 불러왔던 도메인이 있으면 라디오 활성화 처리
    if (state.customDomain) {
        radioHosting.disabled = false;
        hostingLabel.classList.remove("disabled-label");
    }

    btnApplyDomain.addEventListener("click", () => {
        let val = domainInput.value.trim();
        if (!val) {
            alert("GitHub Pages 도메인 주소를 올바르게 입력해 주세요.");
            return;
        }

        if (!val.startsWith("http://") && !val.startsWith("https://")) {
            val = "https://" + val;
            domainInput.value = val;
        }

        // 끝자리 슬래시 제거
        if (val.endsWith("/")) {
            val = val.substring(0, val.length - 1);
        }

        state.customDomain = val;
        localStorage.setItem("customDomain", val);
        
        radioHosting.disabled = false;
        hostingLabel.classList.remove("disabled-label");

        domainMsg.classList.remove("hide");
        domainMsg.style.display = "flex";
        setTimeout(() => { domainMsg.style.display = "none"; }, 3000);

        generateCustomQR();
    });

    // GA4 설정 연동
    const btnApplyGa = document.getElementById("btn-apply-ga");
    const gaInput = document.getElementById("ga-id-input");
    const gaMsg = document.getElementById("ga-status-msg");

    btnApplyGa.addEventListener("click", () => {
        const val = gaInput.value.trim().toUpperCase();
        if (!val || !val.startsWith("G-")) {
            alert("구글 애널리틱스 측정 ID는 'G-'로 시작해야 합니다. 올바른 형식으로 입력해 주세요.");
            return;
        }

        state.gaMeasurementId = val;
        localStorage.setItem("gaMeasurementId", val);

        initializeGA4(val);

        gaMsg.classList.remove("hide");
        gaMsg.style.display = "flex";
        setTimeout(() => { gaMsg.style.display = "none"; }, 3000);
    });
}

// 6. QR 코드 생성기 디자인 커스터마이징 로직
function initQRGenerator() {
    const trackSelect = document.getElementById("track-select");
    const urlTypeRadios = document.querySelectorAll("input[name='url-type']");
    const colorFg = document.getElementById("qr-color-fg");
    const colorBg = document.getElementById("qr-color-bg");
    const labelInput = document.getElementById("qr-label-input");
    const insertLogoCheck = document.getElementById("insert-logo");
    const btnDownload = document.getElementById("btn-download-qr");

    trackSelect.addEventListener("change", (e) => {
        state.currentTrack = parseInt(e.target.value);
        labelInput.value = `국가유산 오디오 가이드 0${state.currentTrack}`;
        generateCustomQR();
    });

    urlTypeRadios.forEach(radio => {
        radio.addEventListener("change", generateCustomQR);
    });

    colorFg.addEventListener("input", generateCustomQR);
    colorBg.addEventListener("input", generateCustomQR);
    labelInput.addEventListener("input", generateCustomQR);
    insertLogoCheck.addEventListener("change", generateCustomQR);

    btnDownload.addEventListener("click", () => {
        const downloadCanvas = document.getElementById("qr-download-canvas");
        const dataUrl = downloadCanvas.toDataURL("image/png");
        
        const link = document.createElement("a");
        link.download = `heritage_audio_track_0${state.currentTrack}_qr.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    generateCustomQR();
}

// 실시간 QR 코드 디자인 캔버스 그리기 함수
function generateCustomQR() {
    const trackNum = state.currentTrack;
    const trackData = state.audioTracks[trackNum];
    const urlType = document.querySelector("input[name='url-type']:checked").value;
    
    let targetUrl = "";
    
    if (urlType === "preview") {
        // 구글 드라이브 미리보기 플레이어
        targetUrl = `https://drive.google.com/file/d/${trackData.id}/preview`;
    } else if (urlType === "hosting") {
        // 사용자가 설정한 GitHub Pages 주소 (예: https://username.github.io/repo-name/index.html?track=1)
        targetUrl = `${state.customDomain}/index.html?track=${trackNum}`;
    }

    document.getElementById("current-qr-target").textContent = targetUrl;

    const fgColor = document.getElementById("qr-color-fg").value;
    const bgColor = document.getElementById("qr-color-bg").value;
    const labelText = document.getElementById("qr-label-input").value;
    const insertLogo = document.getElementById("insert-logo").checked;

    const qrDisplay = document.getElementById("qrcode-display");
    qrDisplay.innerHTML = "";

    const qrcode = new QRCode(qrDisplay, {
        text: targetUrl,
        width: 320,
        height: 320,
        colorDark: fgColor,
        colorLight: bgColor,
        correctLevel: QRCode.CorrectLevel.H
    });

    setTimeout(() => {
        const qrCanvas = qrDisplay.querySelector("canvas");
        const qrImg = qrDisplay.querySelector("img");
        
        const downloadCanvas = document.getElementById("qr-download-canvas");
        const ctx = downloadCanvas.getContext("2d");
        
        const canvasWidth = downloadCanvas.width;
        const canvasHeight = downloadCanvas.height;

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // 테두리 드로잉
        ctx.strokeStyle = "#d4af37";
        ctx.lineWidth = 6;
        ctx.strokeRect(15, 15, canvasWidth - 30, canvasHeight - 30);
        
        // 한국 전통 가양 모서리 데코
        ctx.fillStyle = "#d4af37";
        const cornerSize = 12;
        ctx.fillRect(15, 15, cornerSize, cornerSize);
        ctx.fillRect(canvasWidth - 15 - cornerSize, 15, cornerSize, cornerSize);
        ctx.fillRect(15, canvasHeight - 15 - cornerSize, cornerSize, cornerSize);
        ctx.fillRect(canvasWidth - 15 - cornerSize, canvasHeight - 15 - cornerSize, cornerSize, cornerSize);

        const source = qrCanvas ? qrCanvas : qrImg;
        if (source) {
            ctx.drawImage(source, 90, 60, 320, 320);
        }

        // 중앙 헤드폰 로고 삽입
        if (insertLogo) {
            const logoSize = 64;
            const logoX = (canvasWidth / 2) - (logoSize / 2);
            const logoY = 220 - (logoSize / 2);

            ctx.fillStyle = bgColor;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(logoX, logoY, logoSize, logoSize, 12);
            } else {
                ctx.rect(logoX, logoY, logoSize, logoSize);
            }
            ctx.fill();
            
            ctx.strokeStyle = fgColor;
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = "#d4af37";
            ctx.font = "34px Inter";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("🎧", canvasWidth / 2, 220);
        }

        // 하단 라벨 텍스트
        ctx.fillStyle = fgColor;
        ctx.font = "bold 24px 'Noto Serif KR', serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(labelText, canvasWidth / 2, 450);

        // 하단 서브 정보
        ctx.fillStyle = "#d4af37";
        ctx.font = "bold 15px 'Inter', sans-serif";
        ctx.fillText(`TRACK 0${trackNum}`, canvasWidth / 2, 490);
        
        ctx.strokeStyle = "#d4af37";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(canvasWidth / 2 - 80, 515);
        ctx.lineTo(canvasWidth / 2 + 80, 515);
        ctx.stroke();
        
        ctx.fillStyle = "#d4af37";
        ctx.beginPath();
        ctx.arc(canvasWidth / 2, 515, 3, 0, Math.PI * 2);
        ctx.fill();

    }, 150);
}

// ==========================================================================
// [신규] 실시간 로컬 및 GA4 시각화 대시보드 모듈 (Chart.js 연동)
// ==========================================================================

const emptyStats = {
    plays: { 1: 0, 2: 0, 3: 0, 4: 0 },
    milestones: {
        1: { 25: 0, 50: 0, 75: 0, 100: 0 },
        2: { 25: 0, 50: 0, 75: 0, 100: 0 },
        3: { 25: 0, 50: 0, 75: 0, 100: 0 },
        4: { 25: 0, 50: 0, 75: 0, 100: 0 }
    },
    listenTimes: { 1: [], 2: [], 3: [], 4: [] }
};

let playsChartInstance = null;
let retentionChartInstance = null;

// 로컬 스토리지 데이터 로드 및 초기화 (목업 시드 데이터 없이 0부터 시작)
function getLocalStats() {
    const statsStr = localStorage.getItem("audio_analytics_stats");
    if (!statsStr) {
        localStorage.setItem("audio_analytics_stats", JSON.stringify(emptyStats));
        return emptyStats;
    }
    return JSON.parse(statsStr);
}

// 로컬 재생 횟수 갱신
function recordLocalPlay(trackNum) {
    const stats = getLocalStats();
    stats.plays[trackNum] = (stats.plays[trackNum] || 0) + 1;
    localStorage.setItem("audio_analytics_stats", JSON.stringify(stats));
    
    // 차트 화면 열려있으면 갱신
    if (document.getElementById("analytics-section") && !document.getElementById("analytics-section").classList.contains("hide")) {
        updateAnalyticsUI();
    }
}

// 로컬 마일스톤 및 청취 시간 갱신
function recordLocalMilestone(trackNum, stone, duration = 0) {
    const stats = getLocalStats();
    if (!stats.milestones[trackNum]) {
        stats.milestones[trackNum] = { 25: 0, 50: 0, 75: 0, 100: 0 };
    }
    stats.milestones[trackNum][stone] = (stats.milestones[trackNum][stone] || 0) + 1;

    // 완독 시 평균 청취 시간 계산용 누적
    if (stone === 100 && duration > 0) {
        if (!stats.listenTimes[trackNum]) stats.listenTimes[trackNum] = [];
        stats.listenTimes[trackNum].push(duration);
    }

    localStorage.setItem("audio_analytics_stats", JSON.stringify(stats));

    // 차트 갱신
    if (document.getElementById("analytics-section") && !document.getElementById("analytics-section").classList.contains("hide")) {
        updateAnalyticsUI();
    }
}

// 대시보드 차트 & 수치 바인딩 초기화
function initAnalyticsDashboard() {
    const btnReset = document.getElementById("btn-reset-analytics");
    if (btnReset) {
        btnReset.addEventListener("click", () => {
            if (confirm("정말 테스트 세션 통계를 초기화하시겠습니까? 데이터가 0으로 리셋됩니다.")) {
                localStorage.setItem("audio_analytics_stats", JSON.stringify(emptyStats));
                updateAnalyticsUI();
            }
        });
    }

    // 탭 클릭하여 대시보드 들어올 때 차트 다시 그림 (크기 조정 이슈 예방)
    document.getElementById("nav-analytics").addEventListener("click", () => {
        setTimeout(updateAnalyticsUI, 100);
    });

    // 최초 UI 렌더링
    updateAnalyticsUI();
}

// 데이터 수치 계산 및 Chart.js 캔버스 렌더링
function updateAnalyticsUI() {
    const stats = getLocalStats();

    // 1. 종합 요약 수치 계산
    let totalPlays = 0;
    let totalCompletionCount = 0;
    let allTimes = [];

    for (let t = 1; t <= 4; t++) {
        totalPlays += stats.plays[t] || 0;
        totalCompletionCount += stats.milestones[t]?.[100] || 0;
        if (stats.listenTimes[t]) {
            allTimes = allTimes.concat(stats.listenTimes[t]);
        }
    }

    // 평균 청취 시간 계산
    let avgTimeText = "0초";
    if (allTimes.length > 0) {
        const sumTime = allTimes.reduce((a, b) => a + b, 0);
        const avgSecs = sumTime / allTimes.length;
        avgTimeText = avgSecs >= 60 
            ? `${Math.floor(avgSecs / 60)}분 ${Math.floor(avgSecs % 60)}초` 
            : `${Math.floor(avgSecs)}초`;
    }

    // 평균 완독률 계산 (완독수 / 총재생수)
    let completionRateText = "0%";
    if (totalPlays > 0) {
        const rate = (totalCompletionCount / totalPlays) * 100;
        completionRateText = `${rate.toFixed(1)}%`;
    }

    // DOM 바인딩
    document.getElementById("stat-total-plays").textContent = `${totalPlays.toLocaleString()} 회`;
    document.getElementById("stat-avg-time").textContent = avgTimeText;
    document.getElementById("stat-completion-rate").textContent = completionRateText;

    // 2. Chart 1: 트랙별 재생수 차트 (Bar Chart)
    const ctxPlays = document.getElementById("chart-plays").getContext("2d");
    if (playsChartInstance) {
        playsChartInstance.destroy();
    }

    playsChartInstance = new Chart(ctxPlays, {
        type: 'bar',
        data: {
            labels: ['트랙 01', '트랙 02', '트랙 03', '트랙 04'],
            datasets: [{
                label: '재생 횟수',
                data: [stats.plays[1], stats.plays[2], stats.plays[3], stats.plays[4]],
                backgroundColor: [
                    'rgba(214, 175, 55, 0.75)',  // 금빛 황동
                    'rgba(59, 122, 87, 0.75)',   // 옥빛 녹색
                    'rgba(192, 64, 0, 0.75)',    // 단청 주홍
                    'rgba(82, 164, 119, 0.75)'   // 밝은 비취
                ],
                borderColor: [
                    '#d4af37', '#3b7a57', '#c04000', '#52a477'
                ],
                borderWidth: 1.5,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#2c3842' },
                    ticks: { color: '#9cb1c0' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#9cb1c0' }
                }
            }
        }
    });

    // 3. Chart 2: 청취 유지율 깔때기 분석 (Line/Area Chart)
    // 각 마일스톤 도달 비율 평균 계산 (시작=100% -> 25% -> 50% -> 75% -> 완료=100%)
    let pct25 = 0, pct50 = 0, pct75 = 0, pct100 = 0;
    if (totalPlays > 0) {
        let sum25 = 0, sum50 = 0, sum75 = 0, sum100 = 0;
        for (let t = 1; t <= 4; t++) {
            sum25 += stats.milestones[t]?.[25] || 0;
            sum50 += stats.milestones[t]?.[50] || 0;
            sum75 += stats.milestones[t]?.[75] || 0;
            sum100 += stats.milestones[t]?.[100] || 0;
        }
        pct25 = (sum25 / totalPlays) * 100;
        pct50 = (sum50 / totalPlays) * 100;
        pct75 = (sum75 / totalPlays) * 100;
        pct100 = (sum100 / totalPlays) * 100;
    }

    const ctxRetention = document.getElementById("chart-retention").getContext("2d");
    if (retentionChartInstance) {
        retentionChartInstance.destroy();
    }

    retentionChartInstance = new Chart(ctxRetention, {
        type: 'line',
        data: {
            labels: ['시작 (0%)', '구간 1 (25%)', '중간 (50%)', '구간 3 (75%)', '완료 (100%)'],
            datasets: [{
                label: '유지율 (%)',
                data: [totalPlays > 0 ? 100 : 0, pct25, pct50, pct75, pct100],
                borderColor: '#d4af37',
                backgroundColor: 'rgba(214, 175, 55, 0.12)',
                fill: true,
                tension: 0.38,
                borderWidth: 3,
                pointBackgroundColor: '#3b7a57',
                pointBorderColor: '#f0f4f8',
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    min: 0,
                    max: 100,
                    grid: { color: '#2c3842' },
                    ticks: { 
                        color: '#9cb1c0',
                        callback: function(value) { return value + '%'; }
                    }
                },
                x: {
                    grid: { color: '#2c3842' },
                    ticks: { color: '#9cb1c0' }
                }
            }
        }
    });
}

