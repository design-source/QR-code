import os
import re
import sys
import subprocess
import urllib.request
import urllib.parse

# 작업 범위는 현재 폴더 내부로 제한됨
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_FILE = os.path.join(BASE_DIR, "오디오 링크.txt")
OUTPUT_DIR = os.path.join(BASE_DIR, "qrcodes")
AUDIO_DIR = os.path.join(BASE_DIR, "audio")

def extract_drive_id(url):
    """구글 드라이브 URL에서 파일 ID를 추출합니다."""
    match = re.search(r"/file/d/([a-zA-Z0-9_-]+)", url)
    if match:
        return match.group(1)
    return None

def install_and_import(package):
    """라이브러리가 없으면 pip로 설치 후 임포트합니다."""
    try:
        __import__(package)
        return True
    except ImportError:
        print(f"[{package}] 라이브러리가 없어 자동 설치를 시도합니다...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", package])
            __import__(package)
            return True
        except Exception as e:
            print(f"[{package}] 자동 설치 실패: {e}")
            return False

def generate_qr_locally(data, output_path):
    """로컬 qrcode 라이브러리를 사용하여 QR 코드를 생성합니다."""
    import qrcode
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,  # 높은 오류 복구 레벨 (로고 삽입용)
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    
    # 흑백 기본 이미지 생성
    img = qr.make_image(fill_color="black", back_color="white")
    img.save(output_path)
    print(f"생성 완료: {output_path}")

def generate_qr_via_api(data, output_path):
    """온라인 QR Code API를 사용하여 QR 코드를 다운로드합니다 (Fallback)."""
    encoded_data = urllib.parse.quote(data)
    api_url = f"https://api.qrserver.com/v1/create-qr-code/?size=400x400&data={encoded_data}&ecc=H"
    
    try:
        req = urllib.request.Request(
            api_url, 
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        with urllib.request.urlopen(req) as response:
            with open(output_path, 'wb') as f:
                f.write(response.read())
        print(f"생성 완료 (온라인 API): {output_path}")
        return True
    except Exception as e:
        print(f"온라인 API 생성 실패: {e}")
        return False

def main():
    print("==================================================")
    print("   국가유산 오디오 QR 코드 생성기 (GA4 호환버전)   ")
    print("==================================================")
    
    # 기본 입력 확인
    if not os.path.exists(INPUT_FILE):
        print(f"오류: 입력 파일({INPUT_FILE})이 존재하지 않습니다.")
        return
        
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # 오디오 음원 보관용 폴더 자동 생성 (배포 안내용)
    os.makedirs(AUDIO_DIR, exist_ok=True)
    print(f"* 오디오 파일 보관 폴더 생성됨: {AUDIO_DIR}")
    print("  (이 폴더 안에 audio_1.mp3 ~ audio_4.mp3 형식으로 파일을 저장하세요.)\n")
    
    # 배포용 URL 설정 입력 받기
    print("[옵션 입력]")
    print("GitHub Pages 배포 주소를 입력하면 통계 추적이 가능한 QR 코드가 생성됩니다.")
    print("입력 예시: https://username.github.io/my-heritage-guide")
    print("(아무것도 입력하지 않고 엔터를 치면, 구글 드라이브 미리보기 모드로 기본 생성됩니다.)\n")
    
    # 사용자 프롬프트
    try:
        deploy_url = input("배포 주소 입력: ").strip()
    except (KeyboardInterrupt, EOFError):
        deploy_url = ""
        
    is_hosting_mode = False
    if deploy_url:
        # http/https 자동 보정
        if not deploy_url.startswith("http://") and not deploy_url.startswith("https://"):
            deploy_url = "https://" + deploy_url
        if deploy_url.endswith("/"):
            deploy_url = deploy_url[:-1]
        is_hosting_mode = True
        print(f"\n=> [웹 호스팅 모드 적용] 주소: {deploy_url}")
    else:
        print("\n=> [구글 드라이브 미리보기 모드 적용] (통계 비활성화)")

    # 파일 읽기 및 링크 추출
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        lines = f.readlines()
        
    links = []
    for line in lines:
        line_clean = line.strip().rstrip(',')
        if line_clean.startswith("http"):
            links.append(line_clean)
            
    if not links:
        print("오류: 오디오 링크.txt 파일에서 유효한 링크를 찾을 수 없습니다.")
        return
        
    print(f"총 {len(links)}개의 오디오 링크를 처리합니다.")
    
    # qrcode와 pillow 라이브러리 임포트 시도
    has_qrcode = install_and_import("qrcode")
    has_pil = install_and_import("PIL")
    
    print("\n--------------------------------------------------")
    for i, link in enumerate(links, 1):
        file_id = extract_drive_id(link)
        if not file_id:
            print(f"경고: {i}번째 링크에서 구글 드라이브 ID를 추출할 수 없습니다: {link}")
            continue
            
        # 모드 선택 분기
        if is_hosting_mode:
            target_url = f"{deploy_url}/index.html?track={i}"
        else:
            # 구글 드라이브 미리보기 플레이어 주소 (/preview)
            target_url = f"https://drive.google.com/file/d/{file_id}/preview"
            
        output_file = os.path.join(OUTPUT_DIR, f"audio_{i}_qr.png")
        
        print(f"[{i}/4] QR 대상 URL: {targetUrl}" if 'targetUrl' in locals() else f"[{i}/4] QR 대상 URL: {target_url}")
        
        # 생성 실행
        if has_qrcode and has_pil:
            try:
                generate_qr_locally(target_url, output_file)
            except Exception as e:
                print(f"로컬 생성 에러({e}), API 백업을 사용합니다.")
                generate_qr_via_api(target_url, output_file)
        else:
            generate_qr_via_api(target_url, output_file)
            
    print("--------------------------------------------------")
    print("\n=== QR 코드 생성 작업이 완료되었습니다 ===")
    print(f"1. 생성된 QR 이미지 저장 위치: {OUTPUT_DIR}")
    print(f"2. 실제 재생할 MP3 음원은 {AUDIO_DIR} 폴더에 넣어주세요.")
    print("   (파일명 예시: audio_1.mp3, audio_2.mp3, ...)")

if __name__ == "__main__":
    main()
