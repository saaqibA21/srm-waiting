import cv2
import numpy as np
import pytesseract
import re
import os

# Auto-detect Tesseract binary path on Windows
tesseract_candidates = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    os.path.expanduser(r"~\AppData\Local\Programs\Tesseract-OCR\tesseract.exe")
]
for candidate in tesseract_candidates:
    if os.path.exists(candidate):
        pytesseract.pytesseract.tesseract_cmd = candidate
        break

def preprocess_image(image_bytes: bytes) -> np.ndarray:
    np_arr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not decode image")
    
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
    
    # Adaptive thresholding
    thresh = cv2.adaptiveThreshold(
        denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )
    
    # Upscale 2x
    height, width = thresh.shape
    upscaled = cv2.resize(thresh, (width * 2, height * 2), interpolation=cv2.INTER_CUBIC)
    
    return upscaled

def run_ocr(image_bytes: bytes) -> str:
    try:
        processed_img = preprocess_image(image_bytes)
        custom_config = r'--psm 6 --oem 3'
        text = pytesseract.image_to_string(processed_img, config=custom_config)
        return text
    except Exception as e:
        # Fallback to direct OCR on original image if preprocessing fails
        try:
            np_arr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            return pytesseract.image_to_string(img)
        except Exception as inner_e:
            return f"OCR processing error: {str(e)}"

def parse_vitals(ocr_text: str) -> dict:
    vitals = {
        "bp_systolic": None,
        "bp_diastolic": None,
        "pulse": None,
        "temperature": None,
        "spo2": None,
        "weight": None,
        "height": None,
        "chief_complaint": None
    }
    
    if not ocr_text:
        return vitals

    normalized = ocr_text.replace('\r', '\n')
    text_lower = normalized.lower()
    
    # --- 1. Blood Pressure ---
    # Matches BP: 120/80, B/P 130 / 85, B/D 140/90, Systolic/Diastolic
    bp_match = re.search(r'\b(?:b[\.\/\s\-]?p|b[\/d]p?|blood\s*press?u?r?e?)\b[^\n\r\d]*?(\d{2,3})\s*[\/\\\-]\s*(\d{2,3})', text_lower)
    if not bp_match:
        bp_match = re.search(r'\b(9\d|1\d{2}|2[0-1]\d)\s*[\/\\\-]\s*([5-9]\d|1[0-1]\d)\b', text_lower)
    
    if bp_match:
        s, d = int(bp_match.group(1)), int(bp_match.group(2))
        # Handle inverted OCR ranges (e.g. 40-140 -> 140/40 or 140/80)
        if s < d and 80 <= d <= 260:
            s, d = d, s
        if 60 <= s <= 260 and 30 <= d <= 160:
            vitals["bp_systolic"] = s
            vitals["bp_diastolic"] = d
    else:
        # Check individual Systolic and Diastolic tags
        m_sys = re.search(r'\b(?:syst|systolic|sys)\b[^\d]*?(\d{2,3})', text_lower)
        m_dia = re.search(r'\b(?:diast|diastolic|dia)\b[^\d]*?(\d{2,3})', text_lower)
        if m_sys and 60 <= int(m_sys.group(1)) <= 260:
            vitals["bp_systolic"] = int(m_sys.group(1))
        if m_dia and 30 <= int(m_dia.group(1)) <= 160:
            vitals["bp_diastolic"] = int(m_dia.group(1))

    # --- 2. Pulse / Heart Rate ---
    pulse_patterns = [
        r'\b(?:pulse|heart\s*rate|hr|pr)\b[^\n\r\d]*?(\d{2,3})',
        r'(\d{2,3})\s*(?:bpm|beats?[\/\s]?min)',
        r'\b(?:p|pulse)\s*[:=\-]?\s*(\d{2,3})\b'
    ]
    for pat in pulse_patterns:
        m = re.search(pat, text_lower)
        if m:
            p_val = int(m.group(1))
            if 40 <= p_val <= 220:
                vitals["pulse"] = p_val
                break

    # --- 3. Temperature ---
    temp_patterns = [
        r'\b(?:temp|temperature|femp|t[\.\s]?emp?)\b[^\n\r\d]*?(\d{2,3}(?:\.\d+)?)',
        r'(\d{2,3}\.\d+)\s*(?:°?\s*[fc]|deg\s*[fc])',
        r'\b(9[5-9]\.\d|10[0-6]\.\d)\b',
        r'\b(3[5-9]\.\d|4[0-2]\.\d)\b'
    ]
    for pat in temp_patterns:
        m = re.search(pat, text_lower)
        if m:
            t_val = float(m.group(1))
            if 90.0 <= t_val <= 112.0:
                vitals["temperature"] = round(t_val, 1)
                break
            elif 34.0 <= t_val <= 44.0:
                vitals["temperature"] = round((t_val * 9/5) + 32, 1)
                break

    # --- 4. SpO2 / Oxygen ---
    spo2_patterns = [
        r'\b(?:sp\s*o\s*2|s\s*p\s*o\s*2|o\s*2|oxygen|sat|sats)\b[^\n\r\d]*?(\d{2,3})\s*%?',
        r'(\d{2,3})\s*%\s*(?:spo2|o2|sat)?',
        r'\b(8[5-9]|9\d|100)\s*%'
    ]
    for pat in spo2_patterns:
        m = re.search(pat, text_lower)
        if m:
            s_val = int(m.group(1))
            if 65 <= s_val <= 100:
                vitals["spo2"] = s_val
                break

    # --- 5. Weight ---
    weight_patterns = [
        r'\b(?:weight|wt)\b[^\n\r\d]*?(\d{2,3}(?:\.\d+)?)',
        r'(\d{2,3}(?:\.\d+)?)\s*(?:kg|kgs|kilo)',
        r'(\d{2,3}(?:\.\d+)?)\s*(?:lbs|pounds)'
    ]
    for pat in weight_patterns:
        m = re.search(pat, text_lower)
        if m:
            w_val = float(m.group(1))
            if 15.0 <= w_val <= 250.0:
                vitals["weight"] = round(w_val, 1)
                break

    # --- 6. Height ---
    height_patterns = [
        r'\b(?:height|ht)\b[^\n\r\d]*?(\d{2,3}(?:\.\d+)?)',
        r'(\d{2,3}(?:\.\d+)?)\s*(?:cm|cms|centimeters?)'
    ]
    for pat in height_patterns:
        m = re.search(pat, text_lower)
        if m:
            h_val = float(m.group(1))
            if 50.0 <= h_val <= 250.0:
                vitals["height"] = round(h_val, 1)
                break

    # --- 7. Chief Complaint ---
    cc_patterns = [
        r'\b(?:complaint|c[\.\/]c|presenting|symptoms|pain|reason|dx|rx)\b[:\s\-]+([^\n\r;]+)',
        r'\b(fever[^\n\r]*|cough[^\n\r]*|headache[^\n\r]*|chest pain[^\n\r]*|cold[^\n\r]*|pain[^\n\r]*)'
    ]
    for pat in cc_patterns:
        m = re.search(pat, text_lower)
        if m:
            cleaned = m.group(1).strip(' :;-,~')
            if len(cleaned) > 2:
                vitals["chief_complaint"] = cleaned[:100].capitalize()
                break

    return vitals

def process_image(image_bytes: bytes) -> dict:
    raw_ocr_text = run_ocr(image_bytes)
    vitals_data = parse_vitals(raw_ocr_text)
    return {
        "raw_ocr_text": raw_ocr_text,
        "vitals_data": vitals_data
    }
