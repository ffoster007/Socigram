เริ่มใช้งาน
หลังจาก Clone หรือ โหลด มาแล้ว ก่อนอื่นติดตั้ง Node.js (แนะนำเวอร์ชันล่าสุด) ลิ้งค์ด้านล่าง
```
https://nodejs.org/en/download
```
****
ถ้าเพื่อนๆใช้ Linux ไม่ใช่ Windows หรือ MacOS ให้เปิด Terminal แล้วพิมพ์คำสั่งต่อไปนี้
```
sudo apt update
sudo apt install nodejs
sudo apt install npm
```
****
จากนั้นเข้าไปที่โฟลเดอร์โปรเจคที่เรา Clone หรือ โหลดมา

ให้ทำการติดตั้ง dependencies ด้วยคำสั่ง

```
npm install | npm i force
```
** ถ้าติดตั้งไม่ได้ให้ลองรันคำสั่งนี้
```
npm install --force หรือ npm install --legacy-peer-deps ถ้าไม่ได้จริงๆใช้ npm i force
```
เริ่มต้นใช้งานให้รันคำสั่งใน Terminal

```
npm run dev
```

มันจะรันแอปพลิเคชันที่บราวเซอร์ให้ไปที่เช่น Chrome ให้พิมพ์ต่อไปนี้ที่ URL 
```
http://localhost:3000
```