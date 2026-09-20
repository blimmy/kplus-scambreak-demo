# K PLUS ScamBreak — Interactive Phone Demo

เดโม **มือถือเครื่องเดียว** กดปุ่มบนหน้าจอเพื่อเปลี่ยนหน้าในเครื่องเดิม ตามคำขอปรับล่าสุด ไม่แสดงมือถือสามเครื่องพร้อมกัน กรอบมือถืออยู่ที่เดิมตลอด ใช้ภาพหน้าจอที่ crop จากสไลด์ PowerPoint โดยตรง ไม่สร้าง UI ธนาคารใหม่

เปิดเดโม: [K PLUS ScamBreak บน GitHub Pages](https://blimmy.github.io/kplus-scambreak-demo/)

## วิธีเล่น

เปิดมาแล้วกดบนมือถือได้เลย ไม่ต้องกดปุ่มเล่น:

- ฉาก 1: **ตรวจสอบความเสี่ยง → เลือกคำตอบ 3 ข้อ → ดูคำแนะนำ → พักรายการโอน**
- ฉาก 2: เลือกฉากจากแถบล่าง แล้วกด **ฉันอาจถูกหลอก → รอสถานะป้องกันบัญชี → เลือกรายการและแจ้งเหตุ → ติดตามเรื่อง**
- เลือก “ใช่” และ “ไม่ใช่” ได้จริง เปลี่ยนคำตอบได้ ลูกศรกลับในมือถือจะย้อนหน้าและเก็บคำตอบไว้
- หน้าจอรอให้ผู้ใช้กด ไม่เดินหน้าหรือเปลี่ยนฉากเองในโหมดปกติ
- ปุ่มติดต่อ/ดูหลักฐาน/เพิ่มหลักฐานเปิดเพียงข้อความจำลอง ไม่โทร เลือกไฟล์ หรือส่งข้อมูลจริง

ตัวเลือกทั้งสองคำตอบใช้รูปลักษณ์จาก shape เดิมใน PPTX เส้นทางสาธิตยังใช้เหตุการณ์เสี่ยงและหน้าพักรายการจากสไลด์ แม้เลือก “ไม่ใช่” ทั้งหมดก็ไม่ได้สร้างผลอนุมัติโอนหรือระบบประเมินความเสี่ยงใหม่

เวลาตั้งสติ `00:45` สาธิตแบบย่อให้จบใน 15 วินาที เมื่อถึงศูนย์ **รายการยังพักไว้ ไม่มีการโอนเงินต่ออัตโนมัติ** เงินที่โอนไปก่อนหน้ายังอยู่ระหว่างตรวจสอบ ไม่อ้างว่ากู้เงินคืนหรืออายัดบัญชีปลายทางสำเร็จ

## แถบควบคุมนอกมือถือ

- **เล่นอัตโนมัติ** เป็นตัวเลือกสำหรับผู้บรรยาย: สาธิตเคอร์เซอร์ ไฮไลต์ คำตอบ และการเปลี่ยนหน้าในมือถือเครื่องเดียว รวม 26 ขั้น (12 + 14)
- **หยุด / เล่นต่อ** หยุดและเดินต่อนาฬิกาเดียวกัน ทั้งภาพเปลี่ยนหน้า ripple countdown และการทยอยแสดงสถานะ
- **← / →** ย้อน/หน้าถัดไปในฉากปัจจุบัน ใช้ข้ามหน้าสำหรับนำเสนอได้
- **R / เริ่มใหม่** คืนหน้าแรกของฉากที่เลือก ล้างคำตอบ เวลา และการเคลื่อนไหวเดิม
- **Space** เล่น/หยุด, **F** เต็มจอ, **H** ซ่อน/แสดงแถบควบคุม
- **เล่นต่อเนื่อง** ใช้กับโหมดอัตโนมัติเท่านั้น: เปิดเพื่อเล่นต่อถึงฉาก 2 แล้วหยุด; ปิดเพื่อหยุดเมื่อจบแต่ละขั้น
- มือถือเริ่มแบบพอดีจอ ซูม 150% / 200% หรือขนาดจริงแล้วเลื่อนดูได้ ทั้งเครื่องปรับด้วยสัดส่วนเดียว ไม่มี responsive reflow ภายในหน้าจอ
- เปลี่ยนแท็บแล้วกลับมาเดโมจะหยุดรอ กดเล่นต่อเพื่อดำเนินต่อ

## เปิดในเครื่อง / Build

ใช้ Node.js 20 ขึ้นไป ไม่ต้องติดตั้งแพ็กเกจ:

~~~sh
npm start
~~~

เปิด `http://127.0.0.1:4173/` ผ่าน HTTP server ไม่ใช่การดับเบิลคลิก HTML เนื่องจากใช้ ES modules

~~~sh
npm test
npm run build
npm run preview
~~~

Build คัดลอกไฟล์เว็บไปที่ `dist/` โดยไม่แปลงภาพหรือฟอนต์ Preview เสิร์ฟ `dist/` ที่พอร์ตเดียวกัน ให้หยุด server เดิมก่อนเปิดอีกตัว หรือกำหนดตัวแปร `PORT`

## GitHub Pages / Deploy

Repository: [blimmy/kplus-scambreak-demo](https://github.com/blimmy/kplus-scambreak-demo)

ใช้ static HTML/CSS/JavaScript จึงให้ Pages เสิร์ฟจาก **Settings → Pages → Deploy from a branch → main → / (root)** ได้โดยไม่ต้องมี build workflow เพิ่ม GitHub สร้างงาน `pages-build-deployment` เอง เมื่อ push ไป `main` จะเผยแพร่อัตโนมัติ มี `.nojekyll` ป้องกันการประมวลผล Jekyll

ทุก asset ใช้ URL แบบสัมพัทธ์ `./assets/...` ฉากใช้ `#scene-1` / `#scene-2` รองรับ project path และรีเฟรชได้โดยไม่ต้องมี routing server

นำขึ้นเฉพาะโค้ด ฟอนต์ licenses และภาพของเดโม ไม่รวม PPTX, ไฟล์บน Desktop อื่น, credential หรือภาพทดสอบ `.work/` และ `dist/` อยู่ใน `.gitignore`

## ที่มาของภาพและความต่างจากสไลด์

ต้นฉบับคือ `KPLUS_ScamBreak_Canva_2pages (2).pptx` ใน Downloads เนื่องจาก `Desktop/draft kbtg` ว่างเมื่อเริ่มงาน ไฟล์ `(1)` และ `(2)` เหมือนกันทุกไบต์และใหม่กว่าไฟล์ไม่มีวงเล็บ

- SHA-256: `aad8faa15e46fb619e3250e974b5200418f84959b16dcff5c53d44be96d22ebd`
- สไลด์จริง: `14630400 × 9753600 EMU` อัตราส่วน 3:2; native PowerPoint export ที่ `3072 × 2048`
- ฟอนต์ใน PPTX: **Kanit ExtraBold**, **Noto Sans Thai Looped**, **Noto Sans Thai Looped SemiBold** ใช้ชื่อเดิมและไฟล์ฟอนต์ครบไทย/Latin ไม่แทนด้วยฟอนต์คล้ายกัน
- ภาพหน้าจอแต่ละหน้าเป็นชิ้นภาพจากต้นฉบับ ขนาด `776 × 1556` แสดงในพิกัด `388 × 778`
- กรอบมือถือจากต้นฉบับขนาด `880 × 1656` ใช้พิกัด `440 × 828`; หน้าจออยู่ที่ `(26, 24)` ภายในกรอบ ไม่ย้ายกรอบเมื่อเปลี่ยนหน้า
- countdown ทั้ง 46 ค่าใช้ textbox เดิมใน PowerPoint เรนเดอร์เป็น atlas ไม่วาดตัวเลขใหม่ใน browser
- ตัวเลือกคำตอบและแถวป้องกันบัญชีใช้ชิ้นภาพจาก native source shapes
- ข้อความยอด `50,000.00 บาท` และเลขเคส `SB-2026-00128` คงตามต้นฉบับ

**ความต่างที่ตั้งใจตามคำขอล่าสุด:** ไม่แสดงองค์ประกอบทั้งสไลด์/หัวข้อบนสไลด์และมือถือสามเครื่อง แต่แสดงทีละหน้าในมือถือเครื่องเดียว เพิ่มการเปลี่ยนหน้าจอแบบ fade, click ripple, คำตอบที่เลือกได้ และสถานะที่ค่อย ๆ แสดง ส่วนข้อความภาพจำลองและแถบควบคุมอยู่ภายนอกเครื่อง ภาพในสถานะอ้างอิงยังใช้หน้าจอเดิม ไม่อ้างว่าหน้าทั้งเว็บเหมือนสไลด์ทั้งหน้า

ข้อมูลต้นฉบับอยู่ใน [assets/source.json](assets/source.json) และพิกัด crop/checksum ของเวอร์ชันมือถือเดียวอยู่ใน [assets/phone/source.json](assets/phone/source.json)

## ขอบเขตข้อมูล

ทำงานใน browser เท่านั้น ไม่มี backend, database, API, analytics, CDN, login, persistent storage หรือช่องรับรหัสผ่าน PIN OTP/ข้อมูลจริง สถานะอยู่ในหน่วยความจำ ใช้ `requestAnimationFrame` ชุดเดียว Reset และเปลี่ยนฉากยกเลิก frame เดิม

Content Security Policy กำหนด `connect-src 'none'`, `form-action 'none'` และรับ script/font/image จากเว็บไซต์เดียวกันเท่านั้น

## ตรวจสอบด้วย browser

เครื่องมือทดสอบไม่ใช่ dependency ของเว็บ ใช้ Python + Playwright + Pillow และ Chrome ที่ติดตั้งอยู่:

~~~sh
python -m pip install playwright Pillow
python tests/browser_check.py http://127.0.0.1:4173/
~~~

ทดสอบ crop ต้นฉบับและ snapshot ของหน้าจอทั้งหก, กรอบเครื่องไม่ขยับ, กดปุ่มจริง, ตอบใช่/ไม่ใช่, pause/resume/reset, countdown, การเปลี่ยนฉาก, เล่นอัตโนมัติ, keyboard, fullscreen, resize, mobile touch/zoom และ console/network

กำหนด `BROWSER_CHANNEL=msedge` เพื่อใช้ Edge ได้ ภาพและรายงานอยู่ใน `.work/phone-browser/` รายละเอียดผลล่าสุดอยู่ใน [VERIFICATION.md](VERIFICATION.md)

## สร้างภาพใหม่จาก PPTX (ไม่จำเป็นสำหรับเปิดเว็บ)

ใช้ Windows + PowerPoint, Python `python-pptx`, `pywin32`, `Pillow`, `lxml` และอินเทอร์เน็ตเฉพาะครั้งแรกที่ดาวน์โหลดฟอนต์:

~~~sh
python tools/prepare_fonts.py
python tools/inspect_slides.py "path/to/KPLUS_ScamBreak_Canva_2pages (2).pptx" .work/reference
python tools/prepare_assets.py "path/to/KPLUS_ScamBreak_Canva_2pages (2).pptx"
python tools/prepare_phone_assets.py "path/to/KPLUS_ScamBreak_Canva_2pages (2).pptx"
~~~

เปิด PPTX read-only และไม่บันทึกกลับ เปลี่ยนตัวเลข/สถานะในหน่วยความจำ ฟอนต์ register ชั่วคราวเฉพาะระหว่าง export แล้วถอนออก ไม่แก้ registry/โฟลเดอร์ฟอนต์ระบบ

ฟอนต์มาจาก [Noto Thai](https://github.com/notofonts/thai) และ [Google Fonts / Kanit](https://github.com/google/fonts/tree/main/ofl/kanit) พร้อม OFL licenses ใน `assets/fonts/`
