const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // ตัวอย่าง: ส่งข้อความไปหา main process
  sendMessage: (message) => ipcRenderer.send('message', message),
  
  // ตัวอย่าง: รับข้อมูลจาก main process
  onMessage: (callback) => ipcRenderer.on('message', callback),

  // ตัวอย่าง: เรียก function แล้วรอผลลัพธ์
  getData: () => ipcRenderer.invoke('get-data'),
})