// 어플리케이션 상태 관리
const state = {
    customDomain: "",
    gaMeasurementId: "",
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

// 3. 정밀 통계 추적용 GA4 이벤트 보고 트리거
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
        sendGA4Event("audio_play", {
            'track': `Track 0${trackNum}`,
            'track_title': trackData.title
        });
    }

    // 마일스톤 구간 분석 (25%, 50%, 75% 이탈 지점 집계)
    milestones.slice(0, 3).forEach(stone => {
        if (percent >= stone && !sentMilestones[trackNum].has(stone)) {
            sentMilestones[trackNum].add(stone);
            sendGA4Event(`audio_progress_${stone}`, {
                'track': `Track 0${trackNum}`,
                'track_title': trackData.title,
                'progress_percent': stone
            });
        }
    });

    // 완독 이벤트 (재생 완료 시)
    if (percent >= 99 && !sentMilestones[trackNum].has(100)) {
        sentMilestones[trackNum].add(100);
        sendGA4Event("audio_complete", {
            'track': `Track 0${trackNum}`,
            'track_title': trackData.title
        });
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
