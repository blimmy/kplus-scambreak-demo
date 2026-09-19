# K PLUS ScamBreak — Animated Demo

เดโมนำเสนอจากสไลด์สองหน้า ใช้ภาพที่ export จาก PowerPoint เป็นฐาน วางจุดกดและเลเยอร์เคลื่อนไหวตามพิกัดต้นฉบับ ไม่มีการสร้างหน้าจอธนาคารใหม่ด้วย HTML

เปิดเดโม: [K PLUS ScamBreak บน GitHub Pages](https://blimmy.github.io/kplus-scambreak-demo/)

## เปิดและเล่น

- เลือกฉาก 1 “เบรกก่อนโอน” หรือฉาก 2 “หยุดเงินทันเมื่อรู้ตัว”
- กด **เล่น** เพื่อเริ่ม หรือกดปุ่มเดิมในภาพเพื่อเดินเรื่องเอง
- **Space** เล่น/หยุด, **← / →** ย้อน/ขั้นถัดไป, **R** คืนภาพต้นฉบับและเริ่มใหม่
- **เล่นต่อเนื่อง** เปิด: เล่นทุกขั้นต่อถึงฉาก 2 แล้วหยุด; ปิด: เล่นจนจบขั้นปัจจุบันแล้วหยุด
- **F** เต็มจอ, **H** ซ่อน/แสดงแถบควบคุม แถบนี้อยู่ข้างนอกพื้นที่สไลด์
- มือถือเริ่มด้วยภาพทั้งสไลด์ เลือกซูม 150–300% แล้วเลื่อนดูรายละเอียดได้ ไม่มีการจัดข้อความในมือถือใหม่
- กด Reset หรือย้อนก่อนขั้นแรกเพื่อดูภาพอ้างอิงที่ไม่มีเลเยอร์เคลื่อนไหว Pause จะหยุดทุกอย่างไว้ ณ จุดเดิม
- เปลี่ยนแท็บแล้วกลับมา เดโมจะหยุดรอ ให้กดเล่นเพื่อเดินต่อ

ฉาก 1 มี 12 ขั้น ฉาก 2 มี 14 ขั้น รวมเวลาประมาณ 2 นาที 15 วินาที เวลาตั้งสติ `00:45` ย่อให้เล่นจบใน 15 วินาที เมื่อถึงศูนย์รายการยังพักไว้ ไม่มีการโอนเงินต่ออัตโนมัติ

ปุ่มติดต่อเจ้าหน้าที่/หลักฐานแสดงเพียงข้อความจำลอง ไม่มีการโทร เลือกไฟล์ อัปโหลด หรือส่งข้อมูลจริง ส่วนตัวเลือก “ไม่ใช่” อธิบายว่าเส้นทางสาธิตนี้ใช้คำตอบ “ใช่” ตามสไลด์ ไม่สร้างผลประเมินเส้นทางใหม่

## เปิดในเครื่อง

ใช้ Node.js 20 ขึ้นไป ไม่ต้องติดตั้งแพ็กเกจใด ๆ:

```sh
npm start
```

เปิด `http://127.0.0.1:4173/` ต้องเปิดผ่าน HTTP server เพื่อให้ ES modules ทำงาน ไม่ใช้การดับเบิลคลิกไฟล์ HTML

```sh
npm test
npm run build
npm run preview
```

`npm run build` คัดลอกเฉพาะไฟล์เว็บลง `dist/` ไม่แปลงภาพหรือฟอนต์ `npm run preview` เปิดไฟล์ใน `dist/` ที่พอร์ตเดียวกัน หยุด server เดิมก่อนเปิดอีกตัว หากต้องการเปลี่ยนพอร์ตให้ตั้งตัวแปร `PORT`

เว็บไซต์จริงเป็น static HTML/CSS/JavaScript อยู่แล้ว จึงให้ GitHub Pages เสิร์ฟจาก branch `main` โฟลเดอร์ `/` ได้โดยไม่ต้องมีขั้น build เพิ่ม ไฟล์ `.nojekyll` ป้องกันการประมวลผล Jekyll

## GitHub Pages

Repository: [blimmy/kplus-scambreak-demo](https://github.com/blimmy/kplus-scambreak-demo)

ตั้งค่า **Settings → Pages → Deploy from a branch → main → / (root)** แล้วบันทึก GitHub จะสร้างงาน `pages-build-deployment` ให้เอง เมื่อแก้เว็บแล้ว push ไป `main` จะเผยแพร่อัตโนมัติ

ทุก asset ใช้ URL แบบสัมพัทธ์ `./assets/...` และเส้นทางฉากเป็น `#scene-1` / `#scene-2` จึงรองรับ project repository path และการรีเฟรชโดยไม่ต้องมี routing server

ไฟล์ต้นฉบับ PPTX, ไฟล์บน Desktop อื่น, ภาพตรวจสอบ และ credential ไม่อยู่ใน repository `.work/` และ `dist/` ถูก ignore

## ต้นฉบับและความเหมือน

ใช้ `KPLUS_ScamBreak_Canva_2pages (2).pptx` ที่พบใน Downloads เนื่องจาก `Desktop/draft kbtg` ว่างในเวลาที่เริ่มงาน ไฟล์ `(1)` และ `(2)` เป็นข้อมูลเดียวกันทุกไบต์ และใหม่กว่าไฟล์ไม่มีวงเล็บ

- SHA-256 ต้นฉบับ: `aad8faa15e46fb619e3250e974b5200418f84959b16dcff5c53d44be96d22ebd`
- สไลด์จริง: `14630400 × 9753600 EMU` = 16 × 10⅔ นิ้ว = **3:2**
- พิกัดเว็บ: **1536 × 1024**; ภาพจาก PowerPoint: **3072 × 2048 PNG**
- ฟอนต์ที่ระบุใน PPTX: **Kanit ExtraBold**, **Noto Sans Thai Looped**, **Noto Sans Thai Looped SemiBold** ใช้ชื่อและน้ำหนักเดิม ไม่แทนด้วยฟอนต์คล้ายกัน
- ภาพหลักเก็บรูปตัวอักษรทั้งหมดไว้แล้ว จึงไม่ขึ้นกับฟอนต์ที่ติดตั้งบนเครื่องผู้ชม
- ตัวเลข countdown ทั้ง 46 ค่า เรนเดอร์จาก textbox เดิมใน PowerPoint แล้ว crop รวมเป็น atlas ไม่วาดตัวเลขใหม่ใน browser
- สถานะคำตอบและแถวป้องกันบัญชีใช้ชิ้นภาพที่ export จากต้นฉบับ เพื่อแสดงผลทีละรายการโดยไม่มีข้อความขยับ
- ภาพเริ่มต้น/Reset ไม่มีเลเยอร์เคลื่อนไหว แถบควบคุมอยู่ข้างนอกพื้นที่สไลด์เสมอ

รายละเอียดแหล่งภาพ พิกัด ชื่อฟอนต์ และ checksum อยู่ใน [`assets/source.json`](assets/source.json)

ความต่างที่ตั้งใจมีเฉพาะช่วงเล่น: กรอบเน้น เคอร์เซอร์ click ripple การทยอยแสดงคำตอบ/สถานะ และตัวเลขเวลาจำลอง ส่วนภาพฐานไม่มีการออกแบบใหม่ ข้อความยอด `50,000.00 บาท`, เลขเคส `SB-2026-00128` และข้อความข้อมูลสมมติคงตามสไลด์ล่าสุด

## ขอบเขตข้อมูล

เป็น presentation demo ฝั่ง browser เท่านั้น ไม่มี backend, database, API, analytics, CDN, login, storage หรือแบบฟอร์มรับข้อมูลจริง สถานะทั้งหมดอยู่ในหน่วยความจำ มีนาฬิกา `requestAnimationFrame` เพียงชุดเดียว ส่วน countdown คำนวณจากเวลาของขั้นปัจจุบัน Reset/เปลี่ยนฉากยกเลิก frame เดิม

Content Security Policy ตั้ง `connect-src 'none'`, `form-action 'none'` และอนุญาต script/font/image จากเว็บไซต์เดียวกัน เงินที่โอนไปก่อนหน้ายังแสดงว่าอยู่ระหว่างตรวจสอบ ไม่อ้างว่ากู้เงินคืนหรืออายัดบัญชีปลายทางสำเร็จ

## ตรวจสอบด้วย browser

เครื่องมือทดสอบไม่ได้เป็น dependency ของเว็บ ใช้ Python + Playwright + Pillow และ Google Chrome ที่ติดตั้งอยู่:

```sh
python -m pip install playwright Pillow
python tests/browser_check.py http://127.0.0.1:4173/
```

ทดสอบ snapshot ทั้งสองฉากที่ขนาด 1536×1024, playback ทุกขั้นด้วย browser clock, pause/resume/reset, hotspot, keyboard, single-step, switch scene, fullscreen, desktop resize, mobile fit/zoom และตรวจ console/network ภาพและรายงานออกใน `.work/browser/`

กำหนด `BROWSER_CHANNEL=msedge` เพื่อใช้ Edge แทน Chrome ได้ รายงานการตรวจงานอยู่ใน [`VERIFICATION.md`](VERIFICATION.md)

## สร้างภาพใหม่จาก PPTX (ไม่จำเป็นสำหรับเปิดเว็บ)

ขั้นตอนนี้ใช้ Windows + Microsoft PowerPoint, Python `python-pptx`, `pywin32`, `Pillow`, `lxml` และอินเทอร์เน็ตเฉพาะครั้งที่ดาวน์โหลดฟอนต์:

```sh
python tools/prepare_fonts.py
python tools/inspect_slides.py "path/to/KPLUS_ScamBreak_Canva_2pages (2).pptx" .work/reference
python tools/prepare_assets.py "path/to/KPLUS_ScamBreak_Canva_2pages (2).pptx"
```

เปิด PPTX แบบ read-only ไม่บันทึกกลับ การเปลี่ยนตัวเลข/สถานะเกิดในหน่วยความจำ ฟอนต์ถูก register ชั่วคราวระหว่าง export และถอน register เมื่อจบ ไม่แก้ registry หรือโฟลเดอร์ฟอนต์ระบบ

ฟอนต์นำมาจาก [Noto Thai](https://github.com/notofonts/thai) และ [Google Fonts / Kanit](https://github.com/google/fonts/tree/main/ofl/kanit) พร้อม OFL licenses ใน `assets/fonts/` ใช้ Noto รุ่นที่มีอักขระครบทั้งไทยและ Latin เพื่อไม่ให้ยอดเงิน เลขเคส และ countdown กลายเป็นกล่อง
